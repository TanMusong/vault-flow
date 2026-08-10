import os from 'os';
import path from 'path';

const HOME = os.homedir();

let currentLocale = 'zh-CN';

function getLocale(): string { return currentLocale; }
function setLocale(locale: string): void { currentLocale = locale; }

interface Config {
	readonly port: number;
	readonly downloadDir: string;
	readonly databaseDir: string;
	readonly providerDir: string;
	readonly maxRunningTasks: number;
	readonly chromePath: string;
}

const config: Config = {
	get port(): number { return parseInt(process.env.SERVER_PORT || '', 10) || 3000; },
	get downloadDir(): string { return process.env.DOWNLOAD_DIR || path.join(HOME, 'vault-flow', 'downloads'); },
	get databaseDir(): string { return process.env.DATA_DIR || path.join(HOME, 'vault-flow', 'data'); },
	get providerDir(): string { return process.env.PROVIDER_DIR || path.join(HOME, 'vault-flow', 'providers'); },
	get maxRunningTasks(): number { return parseInt(process.env.MAX_RUNNING_TASKS || '', 10) || 2; },
	get chromePath(): string { return process.env.CHROME_PATH || ''; }
};

interface GlobalConfig {
	port: number;
	downloadDir: string;
	dbPath: string;
	providerPath: string;
	maxRunningTasks: number;
	chromePath: string;
}

function getGlobal(): GlobalConfig {
	return { port: config.port, downloadDir: config.downloadDir, dbPath: config.databaseDir, providerPath: config.providerDir,  maxRunningTasks: config.maxRunningTasks, chromePath: config.chromePath };
}

export { config, getGlobal, GlobalConfig, getLocale, setLocale };
