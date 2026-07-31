import { Injectable, OnModuleInit } from '@nestjs/common';
import { init as initRegistry, getAllSites, getSite, removeProvider, getProviderIconPath, loadProvider } from './registry';

@Injectable()
export class RegistryService implements OnModuleInit {
  onModuleInit() { initRegistry(); }
  getAllSites = getAllSites;
  getSite = getSite;
  removeProvider = removeProvider;
  getProviderIconPath = getProviderIconPath;
  reloadProvider = loadProvider;
}
