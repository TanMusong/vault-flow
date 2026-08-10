import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config/manager';
import type { Task, DownloadData, DownloadRecord, DownloadFile } from '../types';
import { TaskState, RunState } from '../types';

function ensureDir(dir: string): void {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let rootDb: Database.Database;

interface DbRow {
	id: string;
	name: string;
	site: string;
	paused: number;
	interval: number;
	config: string;
	next_run: string | null;
	last_state: number;
	run_state: number;
	total_size: number;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
	if (!raw) return fallback;
	try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function init(): void {
	ensureDir(config.databaseDir);
	const dbPath = path.join(config.databaseDir, 'vault-flow.db');
	rootDb = new Database(dbPath);
	rootDb.pragma('journal_mode = WAL');

	// Check if tasks table exists and if it has old columns
	const tableExists = rootDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").get();

	if (!tableExists) {
		// Create new clean schema
		rootDb.exec(`
			CREATE TABLE tasks (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				site TEXT NOT NULL,
				paused INTEGER DEFAULT 0,
				interval INTEGER DEFAULT 1800,
				config TEXT DEFAULT '{}',
				next_run TEXT,
				last_state INTEGER DEFAULT 0,
				run_state INTEGER DEFAULT 0,
				total_size INTEGER DEFAULT 0
			)
		`);
	} else {
		// Migration: ensure clean schema
		const taskCols = rootDb.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
		const colNames = taskCols.map(c => c.name);

		// Drop old columns if they exist (SQLite doesn't support DROP COLUMN before 3.35.0)
		// We'll recreate the table if old columns exist
		const oldColumns = ['cookies', 'custom_config_json', 'download_path', 'max_concurrent',
			'timeout', 'max_retries', 'proxy_enabled', 'proxy_type', 'proxy_host', 'proxy_port', 'user_id'];
		const hasOldColumns = oldColumns.some(c => colNames.includes(c));

		if (hasOldColumns) {
			// Recreate table with new schema
			rootDb.exec(`
				CREATE TABLE tasks_new (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					site TEXT NOT NULL,
					paused INTEGER DEFAULT 0,
					interval INTEGER DEFAULT 1800,
					next_run TEXT,
					last_state INTEGER DEFAULT 0,
					run_state INTEGER DEFAULT 0,
					total_size INTEGER DEFAULT 0
				)
			`);
			// Copy data
			const existingCols = ['id', 'name', 'site', 'paused', 'interval', 'next_run', 'last_state', 'run_state', 'total_size'];
			const selectCols = existingCols.filter(c => colNames.includes(c)).join(', ');
			if (selectCols) {
				rootDb.exec(`INSERT INTO tasks_new (${selectCols}) SELECT ${selectCols} FROM tasks`);
			}
			rootDb.exec('DROP TABLE tasks');
			rootDb.exec('ALTER TABLE tasks_new RENAME TO tasks');
		}
	}

	rootDb.exec(`
		CREATE TABLE IF NOT EXISTS downloads (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			task_id TEXT NOT NULL,
			post_id TEXT,
			author TEXT,
			author_id TEXT,
			[desc] TEXT,
			state INTEGER DEFAULT 0,
			state_message TEXT DEFAULT '',
			files_json TEXT DEFAULT '[]',
			data_json TEXT DEFAULT '{}',
			created_at TEXT DEFAULT (datetime('now'))
		)
	`);
	rootDb.exec('CREATE INDEX IF NOT EXISTS idx_downloads_task_id ON downloads(task_id)');
	rootDb.exec('CREATE INDEX IF NOT EXISTS idx_downloads_state ON downloads(state)');
	rootDb.exec('CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at)');

	// Ensure run_state column exists
	const taskCols = rootDb.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
	if (!taskCols.some(c => c.name === 'run_state')) {
		rootDb.exec('ALTER TABLE tasks ADD COLUMN run_state INTEGER DEFAULT 0');
	}
	// Ensure config column exists
	if (!taskCols.some(c => c.name === 'config')) {
		rootDb.exec("ALTER TABLE tasks ADD COLUMN config TEXT DEFAULT '{}'");
	}

	rootDb.exec(`
		CREATE TABLE IF NOT EXISTS logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			level TEXT NOT NULL DEFAULT 'error',
			time TEXT DEFAULT (datetime('now')),
			task_id TEXT DEFAULT '',
			message TEXT NOT NULL
		)
	`);

	rootDb.exec(`
		CREATE TABLE IF NOT EXISTS stats (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			completed_count INTEGER DEFAULT 0,
			total_size INTEGER DEFAULT 0,
			task_runs_success INTEGER DEFAULT 0,
			task_runs_failed INTEGER DEFAULT 0,
			updated_at TEXT DEFAULT (datetime('now'))
		)
	`);
	rootDb.exec(`INSERT OR IGNORE INTO stats (id) VALUES (1)`);
}

function mapRowToTask(row: DbRow, downloadCount?: number): Task {
	return {
		id: row.id,
		name: row.name,
		site: row.site,
		paused: !!row.paused,
		interval: row.interval,
		config: safeJsonParse(row.config, {}),
		next_run: row.next_run,
		last_state: row.last_state,
		run_state: row.run_state || 0,
		downloadCount,
		totalSize: row.total_size || 0
	};
}

function getTasks(): Task[] {
	const rows = rootDb.prepare('SELECT * FROM tasks ORDER BY next_run DESC').all() as DbRow[];
	return rows.map(row => {
		const countRow = rootDb.prepare('SELECT COUNT(*) as c FROM downloads WHERE task_id = ?').get(row.id) as Record<string, number>;
		return mapRowToTask(row, countRow.c as number);
	});
}

function getTask(id: string): Task | null {
	const row = rootDb.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as DbRow | undefined;
	if (!row) return null;
	const countRow = rootDb.prepare('SELECT COUNT(*) as c FROM downloads WHERE task_id = ?').get(id) as Record<string, number>;
	return mapRowToTask(row, countRow.c as number);
}

function generateTaskId(): string {
	return crypto.randomUUID();
}

function addTask(data: { id?: string; name: string; site: string; interval?: number; config?: Record<string, unknown> }): Task {
	const id = data.id || crypto.randomUUID();
	const configJson = JSON.stringify(data.config || {});
	rootDb.prepare('INSERT INTO tasks (id, name, site, interval, config) VALUES (?, ?, ?, ?, ?)').run(
		id, data.name || 'Unnamed', data.site, data.interval || 1800, configJson
	);
	return getTask(id)!;
}

function updateTask(id: string, data: Partial<{ name: string; interval: number; paused: boolean; config: Record<string, unknown> }>): Task | null {
	const fields: string[] = [];
	const values: unknown[] = [];
	if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
	if (data.interval !== undefined) { fields.push('interval = ?'); values.push(data.interval); }
	if (data.paused !== undefined) { fields.push('paused = ?'); values.push(data.paused ? 1 : 0); }
	if (data.config !== undefined) { fields.push('config = ?'); values.push(JSON.stringify(data.config)); }
	if (fields.length === 0) return getTask(id);
	values.push(id);
	rootDb.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
	return getTask(id);
}

function setTaskRunState(id: string, state: { last_state?: number; nextRun?: string | null; run_state?: number }): void {
	const fields: string[] = [];
	const values: unknown[] = [];
	if (state.last_state !== undefined) { fields.push('last_state = ?'); values.push(state.last_state); }
	if ('nextRun' in state) { fields.push('next_run = ?'); values.push(state.nextRun); }
	if (state.run_state !== undefined) { fields.push('run_state = ?'); values.push(state.run_state); }
	if (fields.length === 0) return;
	values.push(id);
	rootDb.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
	rootDb.pragma('wal_checkpoint(PASSIVE)');
}

function deleteTask(id: string): void {
	rootDb.prepare('DELETE FROM downloads WHERE task_id = ?').run(id);
	rootDb.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

function toggleTaskPause(taskId: string): boolean {
	const task = getTask(taskId);
	if (!task) return false;
	const newPaused = task.paused ? 0 : 1;
	rootDb.prepare('UPDATE tasks SET paused = ? WHERE id = ?').run(newPaused, taskId);
	return !!newPaused;
}

// ─── Downloads ──────────────────────────────────────────────────────

function addDownload(taskId: string, data: DownloadData): void {
	rootDb.prepare('INSERT INTO downloads (task_id, post_id, author, author_id, `desc`, state, state_message, files_json, data_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))').run(taskId, data.id, data.author, data.authorId, data.desc, data.state, data.stateMessage, JSON.stringify(data.files || []), JSON.stringify(data.dataJson || {}));
	if (data.state === 1) {
		const fileSize = (data.files || []).reduce((sum, f) => sum + (f.fileSize || 0), 0);
		updateStats(1, fileSize);
		rootDb.prepare('UPDATE tasks SET total_size = total_size + ? WHERE id = ?').run(fileSize, taskId);
	}
}

function updateDownload(taskId: string, postId: string, data: { state?: number; stateMessage?: string; files?: DownloadFile[] }): void {
	const current = rootDb.prepare('SELECT state, files_json FROM downloads WHERE task_id = ? AND post_id = ? ORDER BY id DESC LIMIT 1').get(taskId, postId) as { state: number; files_json: string } | undefined;
	const fields: string[] = [];
	const values: unknown[] = [];
	if (data.state !== undefined) { fields.push('state = ?'); values.push(data.state); }
	if (data.stateMessage !== undefined) { fields.push('state_message = ?'); values.push(data.stateMessage); }
	if (data.files !== undefined) { fields.push('files_json = ?'); values.push(JSON.stringify(data.files)); }
	if (fields.length === 0) return;
	values.push(taskId, postId);
	rootDb.prepare(`UPDATE downloads SET ${fields.join(', ')} WHERE task_id = ? AND post_id = ?`).run(...values);

	if (data.state !== undefined && current) {
		const wasSuccess = current.state === 1;
		const isNowSuccess = data.state === 1;
		if (!wasSuccess && isNowSuccess) {
			const fileSize = (data.files || safeJsonParse<DownloadFile[]>(current.files_json, [])).reduce((sum, f) => sum + (f.fileSize || 0), 0);
			updateStats(1, fileSize);
			rootDb.prepare('UPDATE tasks SET total_size = total_size + ? WHERE id = ?').run(fileSize, taskId);
		} else if (wasSuccess && !isNowSuccess) {
			const oldFiles = safeJsonParse<DownloadFile[]>(current.files_json, []);
			const fileSize = oldFiles.reduce((sum, f) => sum + (f.fileSize || 0), 0);
			updateStats(-1, -fileSize);
			rootDb.prepare('UPDATE tasks SET total_size = MAX(0, total_size - ?) WHERE id = ?').run(fileSize, taskId);
		}
	}
}

function fixStaleDownloading(taskId: string): number {
	const result = rootDb.prepare('UPDATE downloads SET state = 2, state_message = ? WHERE task_id = ? AND state = 3').run('status.interrupted', taskId);
	return result.changes;
}

function getDownloads(taskId: string, limit?: number, offset?: number): { total: number; items: DownloadRecord[] } {
	const total = (rootDb.prepare('SELECT COUNT(*) as c FROM downloads WHERE task_id = ?').get(taskId) as Record<string, number>).c;
	const query = limit !== undefined
		? 'SELECT id, task_id, post_id, author, author_id, `desc`, state, state_message, files_json, data_json, created_at FROM downloads WHERE task_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
		: 'SELECT id, task_id, post_id, author, author_id, `desc`, state, state_message, files_json, data_json, created_at FROM downloads WHERE task_id = ? ORDER BY created_at DESC';
	const rows = limit !== undefined
		? rootDb.prepare(query).all(taskId, limit, offset || 0)
		: rootDb.prepare(query).all(taskId);
	const items = (rows as Array<Record<string, unknown>>).map((r) => ({
		id: r.id as number,
		post_id: r.post_id as string,
		author: r.author as string,
		author_id: r.author_id as string,
		desc: r.desc as string,
		state: r.state as number,
		state_message: r.state_message as string,
		files: safeJsonParse<DownloadFile[]>(r.files_json as string, []),
		data_json: safeJsonParse<Record<string, unknown>>(r.data_json as string, {}),
		created_at: r.created_at as string
	}));
	return { total, items };
}

function clearDownloads(taskId: string): void {
	rootDb.prepare('DELETE FROM downloads WHERE task_id = ?').run(taskId);
}

function hasPostDownload(taskId: string, postId: string): boolean {
	if (!postId) return false;
	const row = rootDb.prepare('SELECT 1 FROM downloads WHERE task_id = ? AND post_id = ? LIMIT 1').get(taskId, postId);
	return !!row;
}

function hasSuccessfulDownload(taskId: string, postId: string): boolean {
	if (!postId) return false;
	const row = rootDb.prepare('SELECT 1 FROM downloads WHERE task_id = ? AND post_id = ? AND state = 1 LIMIT 1').get(taskId, postId);
	return !!row;
}

// ─── Stats ──────────────────────────────────────────────────────────

function getAllTaskStats(): { totalCompleted: number; totalSize: number; taskRunsSuccess: number; taskRunsFailed: number } {
	const row = rootDb.prepare('SELECT completed_count, total_size, task_runs_success, task_runs_failed FROM stats WHERE id = 1').get() as Record<string, number> | undefined;
	return {
		totalCompleted: row?.completed_count || 0,
		totalSize: row?.total_size || 0,
		taskRunsSuccess: row?.task_runs_success || 0,
		taskRunsFailed: row?.task_runs_failed || 0,
	};
}

function updateStats(completedDelta: number, sizeDelta: number): void {
	if (!rootDb) return;
	rootDb.prepare('UPDATE stats SET completed_count = completed_count + ?, total_size = MAX(0, total_size + ?), updated_at = datetime(\'now\') WHERE id = 1').run(completedDelta, sizeDelta);
}

function updateTaskRunStats(success: boolean): void {
	if (!rootDb) return;
	const field = success ? 'task_runs_success' : 'task_runs_failed';
	rootDb.prepare(`UPDATE stats SET ${field} = ${field} + 1, updated_at = datetime('now') WHERE id = 1`).run();
}

// ─── Logs ───────────────────────────────────────────────────────────

function addLog(taskId: string, level: string, message: string): void {
	rootDb.prepare('INSERT INTO logs (level, task_id, message) VALUES (?, ?, ?)').run(level, taskId, message);
}

function addSystemLog(level: string, message: string): void {
	rootDb.prepare('INSERT INTO logs (level, task_id, message) VALUES (?, ?, ?)').run(level, '', message);
}

function getLogs(taskId: string, limit = 100, offset = 0): { total: number; items: Array<{ id: number; level: string; time: string; message: string }> } {
	const total = (rootDb.prepare('SELECT COUNT(*) as c FROM logs WHERE task_id = ?').get(taskId) as Record<string, number>).c;
	const items = rootDb.prepare('SELECT * FROM logs WHERE task_id = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(taskId, limit, offset) as Array<{ id: number; level: string; time: string; message: string }>;
	return { total, items };
}

function getAllLogs(limit = 50, offset = 0, level?: string): { total: number; items: Array<{ id: number; level: string; time: string; message: string; taskName: string }> } {
	const whereClause = level ? ' WHERE l.level = ?' : '';
	const countSql = 'SELECT COUNT(*) as c FROM logs l' + whereClause;
	const querySql = 'SELECT l.id, l.level, l.time, l.message, CASE WHEN l.task_id = \'\' THEN \'\' ELSE COALESCE(t.name, l.task_id) END as taskName FROM logs l LEFT JOIN tasks t ON l.task_id = t.id' + whereClause + ' ORDER BY l.id DESC LIMIT ? OFFSET ?';
	const total = level
		? (rootDb.prepare(countSql).get(level) as Record<string, number>).c
		: (rootDb.prepare(countSql).get() as Record<string, number>).c;
	const rows = level
		? rootDb.prepare(querySql).all(level, limit, offset) as Array<{ id: number; level: string; time: string; message: string; taskName: string | null }>
		: rootDb.prepare(querySql).all(limit, offset) as Array<{ id: number; level: string; time: string; message: string; taskName: string | null }>;
	return { total, items: rows.map(r => ({ ...r, taskName: r.taskName || '' })) };
}

function clearLogs(): void {
	rootDb.prepare('DELETE FROM logs').run();
}

// ─── Unified Downloads ──────────────────────────────────────────────

interface DownloadDbRow {
	id: number;
	task_id: string;
	post_id: string;
	author: string;
	author_id: string;
	desc: string;
	state: number;
	state_message: string;
	files_json: string;
	data_json: string;
	created_at: string;
}

function mapUnifiedRow(r: Record<string, unknown>, taskMap: Map<string, { name: string; site: string }>): DownloadRecord & { taskId: string; taskName: string; taskSite: string } {
	const taskId = r.task_id as string;
	const task = taskMap.get(taskId);
	return {
		id: r.id as number,
		post_id: r.post_id as string,
		author: r.author as string,
		author_id: r.author_id as string,
		desc: r.desc as string,
		state: r.state as number,
		state_message: r.state_message as string,
		files: safeJsonParse<DownloadFile[]>(r.files_json as string, []),
		data_json: safeJsonParse(r.data_json as string, {}),
		created_at: r.created_at as string,
		taskId,
		taskName: task?.name || '',
		taskSite: task?.site || '',
	};
}

function getUnifiedDownloads(limit: number, cursor?: string): { items: Array<DownloadRecord & { taskId: string; taskName: string; taskSite: string }>; nextCursor: string | null } {
	const taskMap = new Map<string, { name: string; site: string }>();
	const tasks = getTasks();
	for (const t of tasks) taskMap.set(t.id, { name: t.name, site: t.site });

	if (cursor) {
		const c = JSON.parse(cursor) as { created_at: string; id: number };
		const batchSize = limit + 1;
		const rows = rootDb.prepare(
			'SELECT * FROM downloads WHERE (created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT ?'
		).all(c.created_at, c.created_at, c.id, batchSize) as Array<Record<string, unknown>>;
		const items = rows.slice(0, limit).map(r => mapUnifiedRow(r, taskMap));
		const hasMore = rows.length > limit;
		const lastRow = items[items.length - 1];
		const nextCursor = hasMore && lastRow ? JSON.stringify({ created_at: lastRow.created_at, id: lastRow.id }) : null;
		return { items, nextCursor };
	}

	const rows = rootDb.prepare(
		'SELECT * FROM downloads ORDER BY created_at DESC, id DESC LIMIT ?'
	).all(limit + 1) as Array<Record<string, unknown>>;
	const items = rows.slice(0, limit).map(r => mapUnifiedRow(r, taskMap));
	const hasMore = rows.length > limit;
	const lastRow = items[items.length - 1];
	const nextCursor = hasMore && lastRow ? JSON.stringify({ created_at: lastRow.created_at, id: lastRow.id }) : null;
	return { items, nextCursor };
}

// ─── File Size Cache ────────────────────────────────────────────────

let cachedTotalSize = 0;
let cachedTotalSizeTime = 0;
const SIZE_CACHE_TTL = 10000;

function getDirSize(dir: string): number {
	let size = 0;
	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const e of entries) {
			const full = path.join(dir, e.name);
			if (e.isDirectory()) size += getDirSize(full);
			else { try { size += fs.statSync(full).size; } catch {} }
		}
	} catch {}
	return size;
}

function getCachedTotalSize(): number {
	const now = Date.now();
	if (now - cachedTotalSizeTime > SIZE_CACHE_TTL) {
		cachedTotalSize = getDirSize(config.downloadDir);
		cachedTotalSizeTime = now;
	}
	return cachedTotalSize;
}

export type { Task, DownloadData, DownloadRecord, DownloadFile };
export { init, getTasks, getTask, addTask, generateTaskId, updateTask, setTaskRunState, deleteTask, addDownload, updateDownload, fixStaleDownloading, getDownloads, clearDownloads, hasPostDownload, hasSuccessfulDownload, getAllTaskStats, updateStats, updateTaskRunStats, getUnifiedDownloads, toggleTaskPause, addLog, addSystemLog, getLogs, getAllLogs, clearLogs };
