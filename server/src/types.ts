// ─── Enums ───

export enum TaskState {
  Error = 0,
  Success = 1,
  LoginExpired = 2,
}

export enum RunState {
  Idle = 0,
  Running = 1,
  Waiting = 2,
}

export enum DownloadStatus {
  Success = 1,
  Failed = 2,
  Downloading = 3,
}

export enum MediaType {
  Video = 'video',
  Image = 'image',
  Text = 'text',
}

export enum FileStatus {
  Downloading = 'downloading',
  Success = 'success',
  Failed = 'failed',
}

export enum LogLevel {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

// ─── Task (display-only, managed by server) ───

export interface Task {
  id: string;
  name: string;
  site: string;
  paused: boolean;
  interval: number;
  config: Record<string, unknown>;
  next_run: string | null;
  last_state: TaskState;
  run_state: RunState;
  totalSize: number;
  downloadCount?: number;
}

// ─── Task Result ───

export interface TaskResult {
  state: TaskState;
  message: string;
  downloaded: number;
  failed: number;
  total: number;
  duration: number;
}

// ─── Download Types ───

export interface DownloadFile {
  type: MediaType;
  filename: string;
  url: string;
  fileSize: number;
  fileExpectedSize: number;
  fileStatus: FileStatus;
}

export interface DownloadData {
  id: string;
  author: string;
  authorId: string;
  desc: string;
  state: DownloadStatus;
  stateMessage: string;
  files: DownloadFile[];
  dataJson: Record<string, unknown>;
}

export interface DownloadRecord {
  id: number;
  post_id: string;
  author: string;
  author_id: string;
  desc: string;
  state: DownloadStatus;
  state_message: string;
  files: DownloadFile[];
  data_json: Record<string, unknown>;
  created_at: string;
}

// ─── Site / Provider Info ───

export interface SiteMeta {
  label: string;
  icon: string;
  color: string;
  enabled?: boolean;
}

export interface SiteInfo {
  id: string;
  name: string | Record<string, string>;
  description: string | Record<string, string>;
  site: string | Record<string, string>;
  version: string;
  icon: string;
  enabled: boolean;
}

export interface GlobalConfig {
  port: number;
  downloadDir: string;
  dbPath: string;
  maxConcurrent: number;
  maxRunningTasks: number;
  chromePath: string;
}
