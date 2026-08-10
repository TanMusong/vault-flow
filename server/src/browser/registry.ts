import fs from 'fs';
import path from 'path';
import type { VaultProvider, LocalizedString } from '@vault-flow/provider-api';
import { config } from '../config/manager';

interface ProviderManifest {
	id: string;
	name: LocalizedString;
	description: LocalizedString;
	site: LocalizedString;
	icon: string;
	version?: string | string[];
	config?: unknown[];
}

interface RegisteredProvider {
	provider: VaultProvider | null;
	manifest: ProviderManifest;
	providerDir: string;
	version: string;
	installed: boolean;
}

const providers = new Map<string, RegisteredProvider>();

function register(providerDir: string, provider: VaultProvider, manifest: ProviderManifest, version: string): void {
	providers.set(manifest.id, { provider, manifest, providerDir, version, installed: true });
}

function getSite(name: string): RegisteredProvider | undefined {
	return providers.get(name);
}

function removeProvider(id: string): void {
	const reg = providers.get(id);
	if (reg && !reg.installed) return;
	if (reg) {
		// If it was installed (loaded from filesystem), mark as uninstalled
		// but keep it in registry if it's a built-in provider
		reg.installed = false;
		reg.provider = null;
		reg.version = '';
	} else {
		providers.delete(id);
	}
}

function getProviderIconPath(id: string): string | null {
	const reg = providers.get(id);
	if (!reg) return null;
	const iconPath = path.join(reg.providerDir || path.resolve(__dirname, '../../providers'), reg.manifest.icon);
	return fs.existsSync(iconPath) ? iconPath : null;
}

function getAllSites(): Array<{
	id: string;
	name: string | Record<string, string>;
	description: string | Record<string, string>;
	site: string | Record<string, string>;
	version: string;
	icon: string;
	config?: unknown[];
	installed: boolean;
	enabled: boolean;
}> {
	const result: Array<{
		id: string;
		name: string | Record<string, string>;
		description: string | Record<string, string>;
		site: string | Record<string, string>;
		version: string;
		icon: string;
		config?: unknown[];
		installed: boolean;
		enabled: boolean;
	}> = [];
	providers.forEach((reg) => {
		const iconPath = path.join(reg.providerDir || path.resolve(__dirname, '../../providers'), reg.manifest.icon);
		let iconBase64 = '';
		if (fs.existsSync(iconPath)) {
			const ext = path.extname(iconPath).toLowerCase();
			const mimeTypes: Record<string, string> = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
			const mime = mimeTypes[ext] || 'image/png';
			const data = fs.readFileSync(iconPath);
			iconBase64 = `data:${mime};base64,${data.toString('base64')}`;
		}
		result.push({
			id: reg.manifest.id,
			name: reg.manifest.name,
			description: reg.manifest.description,
			site: reg.manifest.site,
			version: reg.installed ? reg.version : '',
			icon: iconBase64,
			config: reg.manifest.config,
			installed: reg.installed,
			enabled: true,
		});
	});
	return result;
}

/**
 * Load built-in providers from server/providers/providers.json
 */
function initBuiltinProviders(): void {
	const builtinProvidersPath = path.resolve(__dirname, '../../providers/providers.json');
	if (!fs.existsSync(builtinProvidersPath)) {
		console.log('[provider-runtime] Built-in providers not found, skipping');
		return;
	}

	try {
		const rawData = JSON.parse(fs.readFileSync(builtinProvidersPath, 'utf-8'));
		const builtinProviders: ProviderManifest[] = Array.isArray(rawData) ? rawData : [rawData];
		for (const manifest of builtinProviders) {
			if (!manifest.id || !manifest.name || !manifest.icon) {
				console.warn(`[provider-runtime] Built-in provider missing required fields, skipping`);
				continue;
			}
			// Check if already loaded (installed version)
			if (providers.has(manifest.id)) continue;
			providers.set(manifest.id, {
				provider: null,
				manifest,
				providerDir: '',
				version: typeof manifest.version === 'string' ? manifest.version : '',
				installed: false,
			});
		}
		console.log(`[provider-runtime] Loaded ${builtinProviders.length} built-in providers`);
	} catch (err) {
		console.error('[provider-runtime] Failed to load built-in providers:', (err as Error).message);
	}
}

/**
 * Load providers from configured provider directory.
 * Each provider must have:
 * - manifest.json in project root
 * - package.json with "main" entry point
 * - dist/index.js (compiled)
 */
function init(): void {
	const providersDir = config.providerDir;
	if (!fs.existsSync(providersDir)) {
		console.log(`[provider-runtime] Providers directory not found: ${providersDir}, skipping provider loading`);
	} else {
		const entries = fs.readdirSync(providersDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const providerDir = path.join(providersDir, entry.name);

			// Validate manifest.json exists
			const manifestPath = path.join(providerDir, 'manifest.json');
			if (!fs.existsSync(manifestPath)) {
				console.warn(`[provider-runtime] Provider ${entry.name}: manifest.json not found, skipping`);
				continue;
			}

			// Validate package.json exists
			const packageJsonPath = path.join(providerDir, 'package.json');
			if (!fs.existsSync(packageJsonPath)) {
				console.warn(`[provider-runtime] Provider ${entry.name}: package.json not found, skipping`);
				continue;
			}

			try {
				const manifest: ProviderManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

				if (!manifest.id || !manifest.name || !manifest.icon) {
					console.warn(`[provider-runtime] Provider ${entry.name}: manifest.json missing required fields, skipping`);
					continue;
				}

				const iconPath = path.join(providerDir, manifest.icon);
				if (!fs.existsSync(iconPath)) {
					console.warn(`[provider-runtime] Provider ${entry.name}: icon file not found: ${manifest.icon}`);
				}

				const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
				const mainEntry = packageJson.main || './dist/index.js';
				const providerIndexPath = path.join(providerDir, mainEntry);

				if (!fs.existsSync(providerIndexPath)) {
					console.warn(`[provider-runtime] Provider ${entry.name}: entry point not found: ${providerIndexPath}`);
					continue;
				}

				const providerModule = require(providerIndexPath);
				const createProvider = providerModule.default;

				if (typeof createProvider !== 'function') {
					console.warn(`[provider-runtime] Provider ${entry.name}: default export is not a function`);
					continue;
				}

				const provider = createProvider();
				register(providerDir, provider, manifest, packageJson.version || '0.0.0');
				console.log(`[provider-runtime] Loaded provider: ${manifest.id} (${manifest.name})`);
			} catch (err) {
				console.error(`[provider-runtime] Failed to load provider ${entry.name}:`, (err as Error).message);
			}
		}
	}

	// Load built-in providers after installed ones
	initBuiltinProviders();

	const names: string[] = [];
	providers.forEach((_, k) => names.push(k));
	console.log(`Registered providers: ${names.join(', ')}`);
}

/**
 * Load a single provider by id from the provider directory.
 */
async function loadProvider(id: string): Promise<void> {
	const providerDir = path.join(config.providerDir, id);
	if (!fs.existsSync(providerDir)) {
		throw new Error(`Provider directory not found: ${id}`);
	}

	const manifestPath = path.join(providerDir, 'manifest.json');
	if (!fs.existsSync(manifestPath)) {
		throw new Error(`manifest.json not found for provider: ${id}`);
	}

	const manifest: ProviderManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
	if (!manifest.id || !manifest.name || !manifest.icon) {
		throw new Error(`manifest.json missing required fields for provider: ${id}`);
	}

	const packageJsonPath = path.join(providerDir, 'package.json');
	if (!fs.existsSync(packageJsonPath)) {
		throw new Error(`package.json not found for provider: ${id}`);
	}

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
	const mainEntry = packageJson.main || './dist/index.js';
	const providerIndexPath = path.join(providerDir, mainEntry);

	if (!fs.existsSync(providerIndexPath)) {
		throw new Error(`Entry point not found: ${mainEntry}`);
	}

	delete require.cache[require.resolve(providerIndexPath)];

	const providerModule = require(providerIndexPath);
	const createProvider = providerModule.default;

	if (typeof createProvider !== 'function') {
		throw new Error('Default export is not a function');
	}

	const provider = createProvider();
	register(providerDir, provider, manifest, packageJson.version || '0.0.0');
	console.log(`[provider-runtime] Loaded provider: ${manifest.id} (${manifest.name})`);
}

export { init, register, getSite, removeProvider, getProviderIconPath, getAllSites, loadProvider };
