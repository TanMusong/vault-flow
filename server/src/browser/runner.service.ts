import { Injectable } from '@nestjs/common';
import { isRunning, runTask, addTask, deleteTask, updateTaskConfig, getRunningCount } from './runner';

@Injectable()
export class RunnerService {
  isRunning = isRunning;
  runTask = runTask;
  addTask = addTask;
  deleteTask = deleteTask;
  updateTaskConfig = updateTaskConfig;
  getRunningCount = getRunningCount;
}
