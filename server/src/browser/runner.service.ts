import { Injectable } from '@nestjs/common';
import { isRunning, runTask, addTask, deleteTask, getRunningCount } from './runner';

@Injectable()
export class RunnerService {
  isRunning = isRunning;
  runTask = runTask;
  addTask = addTask;
  deleteTask = deleteTask;
  getRunningCount = getRunningCount;
}
