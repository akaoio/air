#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { merge } from './lib/utils.js'
import { getPaths, getConfigPath } from './paths.js'
import type { AirConfig } from './types/index.js'

interface ConfigOptions {
    rootArg?: string
    bashArg?: string
    configArg?: string
    configFile?: string // Deprecated, use configArg
    syncUrl?: string | null
}

interface PathInfo {
    root: string
    bash: string
    config: string
    [key: string]: any // Allow other properties from getPaths
}

/**
 * Configuration management for Air
 * Handles reading, writing, and syncing configuration
 */
class ConfigManager {
    private paths: PathInfo
    private configFile: string
    private syncUrl: string | null
    private cache: AirConfig | null
    private lastSync: number | null
    
    constructor(options: ConfigOptions = {}) {
        const paths = getPaths(options.rootArg, options.bashArg, options.configArg || options.configFile)
        this.paths = {
            root: paths.root || process.cwd(),
            bash: paths.bash || path.join(process.cwd(), 'script'),
            config: paths.config || getConfigPath(options.configArg || options.configFile, paths.root)
        }
        this.configFile = this.paths.config
        this.syncUrl = options.syncUrl || null
        this.cache = null
        this.lastSync = null
    }

    /**
     * Read configuration from file
     */
    read(): AirConfig {
        try {
            console.log(`📁 Loading config from: ${this.configFile}`)
            
            if (!fs.existsSync(this.configFile)) {
                console.log(`⚠️  Config file not found: ${this.configFile}`)
                console.log(`📝 Using default configuration`)
                const defaultConfig = this.getDefaultConfig()
                console.log(`🔧 Config loaded: name=${defaultConfig.name}, env=${defaultConfig.env}`)
                return defaultConfig
            }
            
            const content = fs.readFileSync(this.configFile, 'utf8')
            const config = JSON.parse(content) as AirConfig
            console.log(`✅ Config file loaded successfully`)
            
            // Merge with defaults
            const defaultConfig = this.getDefaultConfig()
            this.cache = merge(defaultConfig, config) as AirConfig
            console.log(`🔄 Config merged with defaults`)
            
            // Apply environment variables
            const finalConfig = this.mergeEnvVars(this.cache)
            console.log(`🌍 Environment variables applied`)
            console.log(`🔧 Final config: name=${finalConfig.name}, env=${finalConfig.env}, port=${finalConfig[finalConfig.env]?.port}`)
            
            return finalConfig
        } catch (error: any) {
            console.error(`❌ Error reading config from ${this.configFile}:`, error.message)
            console.log(`📝 Falling back to default configuration`)
            return this.getDefaultConfig()
        }
    }

    /**
     * Write configuration to file
     */
    write(config: AirConfig): boolean {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.configFile)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }
            
            // Write config
            fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2))
            console.log(`Configuration saved to ${this.configFile}`)
            
            // Update cache
            this.cache = config
            return true
        } catch (error: any) {
            console.error(`Error writing config to ${this.configFile}:`, error.message)
            return false
        }
    }

    /**
     * Sync configuration from remote URL
     */
    async sync(url?: string | null): Promise<AirConfig | null> {
        const syncUrl = url || this.syncUrl
        if (!syncUrl) {
            return null
        }
        
        // Rate limit: only sync once per hour
        if (this.lastSync && Date.now() - this.lastSync < 3600000) {
            return this.cache
        }
        
        try {
            console.log(`Syncing configuration from ${syncUrl}...`)
            
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000)
            
            const response = await fetch(syncUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Air-GUN-Peer/2.0'
                }
            })
            
            clearTimeout(timeoutId)
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const remoteConfig = await response.json() as AirConfig
            
            // Merge remote config with local (local takes precedence for certain fields)
            const localConfig = this.read()
            const merged = merge(remoteConfig, {
                name: localConfig.name,
                root: localConfig.root,
                bash: localConfig.bash
            }) as AirConfig
            
            // Save merged config
            this.write(merged)
            this.lastSync = Date.now()
            
            console.log('Configuration synced successfully')
            return merged
            
        } catch (error: any) {
            console.error('Configuration sync failed:', error.message)
            return null
        }
    }

    /**
     * Get default configuration
     */
    getDefaultConfig(): AirConfig {
        const paths = this.paths
        
        const config: AirConfig = {
            root: paths.root,
            bash: paths.bash,
            env: (process.env.ENV || 'development') as any,
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
        }
        return config
    }

    /**
     * Merge environment variables into config
     */
    mergeEnvVars(config: AirConfig): AirConfig {
        const envOverrides: string[] = []
        
        // Root-level environment variables
        if (process.env.ROOT) {
            config.root = process.env.ROOT
            envOverrides.push(`ROOT=${process.env.ROOT}`)
        }
        if (process.env.BASH) {
            config.bash = process.env.BASH
            envOverrides.push(`BASH=${process.env.BASH}`)
        }
        if (process.env.ENV) {
            config.env = process.env.ENV as any
            envOverrides.push(`ENV=${process.env.ENV}`)
        }
        if (process.env.NAME) {
            config.name = process.env.NAME
            envOverrides.push(`NAME=${process.env.NAME}`)
        }
        if (process.env.SYNC) {
            config.sync = process.env.SYNC
            envOverrides.push(`SYNC=${process.env.SYNC}`)
        }
        
        // Environment-specific variables
        const env = config.env
        const envConfig: any = config[env] || {}
        
        if (process.env.PORT) {
            envConfig.port = parseInt(process.env.PORT)
            envOverrides.push(`PORT=${process.env.PORT}`)
        }
        if (process.env.DOMAIN) {
            envConfig.domain = process.env.DOMAIN
            envOverrides.push(`DOMAIN=${process.env.DOMAIN}`)
        }
        
        // SSL configuration
        if (process.env.SSL_KEY || process.env.SSL_CERT) {
            envConfig.ssl = {
                key: process.env.SSL_KEY || '',
                cert: process.env.SSL_CERT || ''
            }
            if (process.env.SSL_KEY) envOverrides.push(`SSL_KEY=${process.env.SSL_KEY}`)
            if (process.env.SSL_CERT) envOverrides.push(`SSL_CERT=${process.env.SSL_CERT}`)
        }
        
        // SEA pair
        if (process.env.PUB && process.env.PRIV) {
            envConfig.pair = {
                pub: process.env.PUB,
                priv: process.env.PRIV,
                epub: process.env.EPUB || '',
                epriv: process.env.EPRIV || ''
            }
            envOverrides.push(`PUB=${process.env.PUB.substring(0, 10)}...`)
            envOverrides.push(`PRIV=***hidden***`)
        }
        
        // Peers
        if (process.env.PEERS) {
            envConfig.peers = process.env.PEERS.split(',').map(s => s.trim())
            envOverrides.push(`PEERS=${envConfig.peers.length} peers`)
        }
        
        config[env] = envConfig
        
        // Log environment overrides
        if (envOverrides.length > 0) {
            console.log(`🌍 Environment variables applied: ${envOverrides.join(', ')}`)
        } else {
            console.log(`🌍 No environment variables to apply`)
        }
        
        return config
    }

    /**
     * Validate configuration
     */
    validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = []
        const config = this.cache || this.read()
        
        // Check required fields
        if (!config.env) {
            errors.push('Environment not specified')
        }
        
        if (!config.name) {
            errors.push('Name not specified')
        }
        
        // Check environment config exists
        const envConfig: any = config[config.env]
        if (!envConfig) {
            errors.push(`Environment config for '${config.env}' not found`)
        } else {
            // Check port
            if (!envConfig.port || envConfig.port < 1 || envConfig.port > 65535) {
                errors.push('Invalid port number')
            }
            
            // Check SSL if production
            if (config.env === 'production' && envConfig.ssl) {
                if (!fs.existsSync(envConfig.ssl.key)) {
                    errors.push(`SSL key file not found: ${envConfig.ssl.key}`)
                }
                if (!fs.existsSync(envConfig.ssl.cert)) {
                    errors.push(`SSL cert file not found: ${envConfig.ssl.cert}`)
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        }
    }

    /**
     * Update cached config (for runtime updates)
     */
    updateCache(config: AirConfig): void {
        this.cache = config
    }

    /**
     * Get cached config
     */
    getCache(): AirConfig | null {
        return this.cache
    }
}

export { ConfigManager, type ConfigOptions, type AirConfig }
export default ConfigManager