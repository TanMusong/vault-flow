import { Injectable } from '@nestjs/common';
import { scheduleTask, clearTask, rescheduleTask, startAll, stopAll } from './scheduler';
import type { Task } from '../types';

@Injectable()
export class SchedulerService {
  scheduleTask = scheduleTask;
  clearTask = clearTask;
  rescheduleTask = rescheduleTask;
  startAll = startAll;
  stopAll = stopAll;
}
