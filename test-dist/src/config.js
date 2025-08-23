#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { merge } from './lib/utils.js';
import { getPaths } from './paths.js';
/**
 * Configuration management for Air
 * Handles reading, writing, and syncing configuration
 */
class ConfigManager {
    paths;
    configFile;
    syncUrl;
    cache;
    lastSync;
    constructor(options = {}) {
        const paths = getPaths(options.rootArg, options.bashArg);
        this.paths = {
            root: paths.root || process.cwd(),
            bash: paths.bash || path.join(process.cwd(), 'script'),
            config: paths.config || path.join(process.cwd(), 'air.json')
        };
        this.configFile = options.configFile || this.paths.config;
        this.syncUrl = options.syncUrl || null;
        this.cache = null;
        this.lastSync = null;
    }
    /**
     * Read configuration from file
     */
    read() {
        try {
            if (!fs.existsSync(this.configFile)) {
                console.log(`Config file not found: ${this.configFile}`);
                return this.getDefaultConfig();
            }
            const content = fs.readFileSync(this.configFile, 'utf8');
            const config = JSON.parse(content);
            // Merge with defaults
            this.cache = merge(this.getDefaultConfig(), config);
            return this.cache;
        }
        catch (error) {
            console.error(`Error reading config from ${this.configFile}:`, error.message);
            return this.getDefaultConfig();
        }
    }
    /**
     * Write configuration to file
     */
    write(config) {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.configFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Write config
            fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
            console.log(`Configuration saved to ${this.configFile}`);
            // Update cache
            this.cache = config;
            return true;
        }
        catch (error) {
            console.error(`Error writing config to ${this.configFile}:`, error.message);
            return false;
        }
    }
    /**
     * Sync configuration from remote URL
     */
    async sync(url) {
        const syncUrl = url || this.syncUrl;
        if (!syncUrl) {
            return null;
        }
        // Rate limit: only sync once per hour
        if (this.lastSync && Date.now() - this.lastSync < 3600000) {
            return this.cache;
        }
        try {
            console.log(`Syncing configuration from ${syncUrl}...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(syncUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Air-GUN-Peer/2.0'
                }
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const remoteConfig = await response.json();
            // Merge remote config with local (local takes precedence for certain fields)
            const localConfig = this.read();
            const merged = merge(remoteConfig, {
                name: localConfig.name,
                root: localConfig.root,
                bash: localConfig.bash
            });
            // Save merged config
            this.write(merged);
            this.lastSync = Date.now();
            console.log('Configuration synced successfully');
            return merged;
        }
        catch (error) {
            console.error('Configuration sync failed:', error.message);
            return null;
        }
    }
    /**
     * Get default configuration
     */
    getDefaultConfig() {
        const paths = this.paths;
        const config = {
            root: paths.root,
            bash: paths.bash,
            env: (process.env.ENV || 'development'),
            name: process.env.NAME || 'air',
            sync: undefined,
            ip: {
                timeout: 5000,
                dnsTimeout: 3000,
                userAgent: 'Air-GUN-Peer/2.0',
                dns: [
                    { resolver: 'resolver1.opendns.com', hostname: 'myip.opendns.com' },
                    { resolver: '1.1.1.1', hostname: 'whoami.cloudflare' }
                ],
                http: [
                    { url: 'https://api.ipify.org', format: 'text' },
                    { url: 'https://icanhazip.com', format: 'text' }
                ]
            },
            development: {
                port: 8765,
                domain: 'localhost',
                peers: []
            },
            production: {
                port: 443,
                domain: '',
                peers: []
            }
        };
        return config;
    }
    /**
     * Merge environment variables into config
     */
    mergeEnvVars(config) {
        // Root-level environment variables
        if (process.env.ROOT)
            config.root = process.env.ROOT;
        if (process.env.BASH)
            config.bash = process.env.BASH;
        if (process.env.ENV)
            config.env = process.env.ENV;
        if (process.env.NAME)
            config.name = process.env.NAME;
        if (process.env.SYNC)
            config.sync = process.env.SYNC;
        // Environment-specific variables
        const env = config.env;
        const envConfig = config[env] || {};
        if (process.env.PORT)
            envConfig.port = parseInt(process.env.PORT);
        if (process.env.DOMAIN)
            envConfig.domain = process.env.DOMAIN;
        // SSL configuration
        if (process.env.SSL_KEY || process.env.SSL_CERT) {
            envConfig.ssl = {
                key: process.env.SSL_KEY || '',
                cert: process.env.SSL_CERT || ''
            };
        }
        // SEA pair
        if (process.env.PUB && process.env.PRIV) {
            envConfig.pair = {
                pub: process.env.PUB,
                priv: process.env.PRIV,
                epub: process.env.EPUB || '',
                epriv: process.env.EPRIV || ''
            };
        }
        // Peers
        if (process.env.PEERS) {
            envConfig.peers = process.env.PEERS.split(',').map(s => s.trim());
        }
        config[env] = envConfig;
        return config;
    }
    /**
     * Validate configuration
     */
    validate() {
        const errors = [];
        const config = this.cache || this.read();
        // Check required fields
        if (!config.env) {
            errors.push('Environment not specified');
        }
        if (!config.name) {
            errors.push('Name not specified');
        }
        // Check environment config exists
        const envConfig = config[config.env];
        if (!envConfig) {
            errors.push(`Environment config for '${config.env}' not found`);
        }
        else {
            // Check port
            if (!envConfig.port || envConfig.port < 1 || envConfig.port > 65535) {
                errors.push('Invalid port number');
            }
            // Check SSL if production
            if (config.env === 'production' && envConfig.ssl) {
                if (!fs.existsSync(envConfig.ssl.key)) {
                    errors.push(`SSL key file not found: ${envConfig.ssl.key}`);
                }
                if (!fs.existsSync(envConfig.ssl.cert)) {
                    errors.push(`SSL cert file not found: ${envConfig.ssl.cert}`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Update cached config (for runtime updates)
     */
    updateCache(config) {
        this.cache = config;
    }
    /**
     * Get cached config
     */
    getCache() {
        return this.cache;
    }
}
export { ConfigManager };
export default ConfigManager;
//# sourceMappingURL=config.js.map