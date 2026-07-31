import { Injectable } from '@nestjs/common';
import * as store from '../db/store';

@Injectable()
export class StoreService {
  init = store.init;
  getTasks = store.getTasks;
  getTask = store.getTask;
  addTask = store.addTask;
  generateTaskId = store.generateTaskId;
  updateTask = store.updateTask;
  setTaskRunState = store.setTaskRunState;
  deleteTask = store.deleteTask;
  toggleTaskPause = store.toggleTaskPause;
  addDownload = store.addDownload;
  updateDownload = store.updateDownload;
  fixStaleDownloading = store.fixStaleDownloading;
  getDownloads = store.getDownloads;
  clearDownloads = store.clearDownloads;
  hasPostDownload = store.hasPostDownload;
  hasSuccessfulDownload = store.hasSuccessfulDownload;
  getAllTaskStats = store.getAllTaskStats;
  updateStats = store.updateStats;
  updateTaskRunStats = store.updateTaskRunStats;
  getUnifiedDownloads = store.getUnifiedDownloads;
  addLog = store.addLog;
  addSystemLog = store.addSystemLog;
  getLogs = store.getLogs;
  getAllLogs = store.getAllLogs;
  clearLogs = store.clearLogs;
}
