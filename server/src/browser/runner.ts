import { getSite } from './registry';
import * as store from '../db/store';
import type { TaskResult } from '../types';
import type { ProviderContext, TaskConfig, DownloadData, DownloadFile } from '@vault-flow/provider-api';
import { config } from '../config/manager';
import { getLocale } from '../config/manager';
import { events } from '../events';

const APP_VERSION = require('../../package.json').version;
import { ProviderStorageService } from '../provider/provider-storage.service';
import fs from 'fs';
import path from 'path';

const providerStorage = new ProviderStorageService();
const runningTasks = new Set<string>();

function isRunning(taskId: string): boolean { return runningTasks.has(taskId); }
function getRunningCount(): number { return runningTasks.size; }

function createProviderContext(taskId: string, cfg: TaskConfig): ProviderContext {
	return {
		taskId,
		config: cfg,
		downloadDir: config.downloadDir,
		locale: getLocale(),
		version: APP_VERSION,
		storage: {
			get: <T = unknown>(key: string) => providerStorage.get<T>(taskId, key),
			set: <T = unknown>(key: string, value: T) => providerStorage.set<T>(taskId, key, value),
			remove: (key: string) => providerStorage.remove(taskId, key),
			keys: () => providerStorage.keys(taskId),
			clear: () => providerStorage.clear(taskId),
		},
		addDownloadRecord: (data: DownloadData) => {
			store.addDownload(taskId, data);
			events.emitDownloadAdded(taskId, data);
		},
		updateDownloadRecord: (postId: string, data: { state?: number; stateMessage?: string; files?: DownloadFile[] }) => {
			store.updateDownload(taskId, postId, data);
			events.emitDownloadProgress(taskId, postId, data.files || [], data.state);
		},
		emitDownloadProgress: (postId: string, files: DownloadFile[]) => {
			events.emitDownloadProgress(taskId, postId, files);
		},
		emitTaskProgress: (processed: number, total: number) => {
			events.emitTaskProgress(taskId, processed, total);
		},
		hasSuccessfulDownloadRecord: (postId: string) => store.hasSuccessfulDownload(taskId, postId),
		hasPostDownloadRecord: (postId: string) => store.hasPostDownload(taskId, postId),
		addLog: (level: string, message: string) => store.addLog(taskId, level, message),
		fs: {
			existsSync: (p: string) => fs.existsSync(p),
			mkdirSync: (p: string, opts?: { recursive?: boolean }) => fs.mkdirSync(p, opts),
			readFileSync: (p: string) => fs.readFileSync(p, 'utf-8'),
			writeFileSync: (p: string, data: string) => fs.writeFileSync(p, data, 'utf-8'),
		},
		path: {
			join: (...paths: string[]) => path.join(...paths),
		},
	};
}

async function runTask(taskId: string): Promise<TaskResult> {
	if (runningTasks.has(taskId)) throw new Error('error.task_running');
	const task = store.getTask(taskId);
	if (!task) throw new Error(`Task ${taskId} not found`);
	if (task.paused) throw new Error(`Task ${taskId} is paused`);
	const registered = getSite(task.site);
	if (!registered) throw new Error(`Site "${task.site}" not registered`);
	const site = registered.provider;
	if (!site) throw new Error(`Site "${task.site}" not installed`);

	runningTasks.add(taskId);
	store.setTaskRunState(taskId, { nextRun: new Date().toISOString(), run_state: 1 });
	events.emitTaskStarted(taskId, task.name);
	const startTime = Date.now();

	try {
		const ctx = createProviderContext(taskId, task.config);
		const result = await site.executeTask(ctx);

		store.setTaskRunState(taskId, { last_state: result.state, nextRun: new Date(Date.now() + (task.interval || 1800) * 1000).toISOString(), run_state: 0 });
		store.updateTaskRunStats(result.state === 1);
		store.addLog(taskId, 'info', `Task completed: ${task.name}, downloaded ${result.downloaded}, failed ${result.failed}, duration ${result.duration}ms`);
		events.emitTaskCompleted(taskId, result);
		return result;

	} catch (err) {
		const message = (err as Error).message;
		store.addLog(taskId, 'error', message);
		const result: TaskResult = { state: 2 as any, message, downloaded: 0, failed: 0, total: 0, duration: Date.now() - startTime };
		store.setTaskRunState(taskId, { last_state: 2, run_state: 0 });
		store.updateTaskRunStats(false);
		events.emitTaskFailed(taskId, message);
		throw err;
	} finally {
		runningTasks.delete(taskId);
	}
}

async function addTask(siteId: string, config: TaskConfig, taskId: string): Promise<{ name: string }> {
	const registered = getSite(siteId);
	if (!registered) throw new Error(`Site "${siteId}" not registered`);
	const site = registered.provider;
	if (!site) throw new Error(`Site "${siteId}" not installed`);

	const ctx = createProviderContext(taskId, config);
	const result = await site.addTask(ctx);

	if (!result.success) {
		throw new Error(result.message);
	}

	return { name: result.name };
}

async function deleteTask(taskId: string): Promise<void> {
	const task = store.getTask(taskId);
	if (!task) throw new Error(`Task ${taskId} not found`);
	const registered = getSite(task.site);
	if (!registered) throw new Error(`Site "${task.site}" not registered`);
	const site = registered.provider;
	if (!site) throw new Error(`Site "${task.site}" not installed`);

	const ctx = createProviderContext(taskId, task.config);
	const result = await site.deleteTask(ctx, taskId);

	if (!result.success) {
		throw new Error(result.message);
	}
}

async function updateTaskConfig(taskId: string): Promise<void> {
	const task = store.getTask(taskId);
	if (!task) throw new Error(`Task ${taskId} not found`);
	const registered = getSite(task.site);
	if (!registered) throw new Error(`Site "${task.site}" not registered`);
	const site = registered.provider;
	if (!site) throw new Error(`Site "${task.site}" not installed`);

	const ctx = createProviderContext(taskId, task.config);
	await site.onTaskConfigUpdate(ctx, taskId);
}

export { runTask, addTask, deleteTask, updateTaskConfig, isRunning, getRunningCount };
