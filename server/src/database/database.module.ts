import { Global, Module, OnModuleInit } from '@nestjs/common';
import { StoreService } from './store.service';
import { init as initStore } from '../db/store';

@Global()
@Module({
  providers: [StoreService],
  exports: [StoreService],
})
export class DatabaseModule implements OnModuleInit {
  onModuleInit() { initStore(); }
}
