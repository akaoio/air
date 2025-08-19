#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { merge } from './lib/utils.js'
import { getPaths } from './paths.js'

/**
 * Configuration management for Air
 * Handles reading, writing, and syncing configuration
 */
class ConfigManager {
    constructor(options = {}) {
        const paths = getPaths(options.rootArg, options.bashArg)
        this.paths = paths
        this.configFile = options.configFile || paths.config
        this.syncUrl = options.syncUrl || null
        this.cache = null
        this.lastSync = null
    }

    /**
     * Read configuration from file
     */
    read() {
        try {
            if (!fs.existsSync(this.configFile)) {
                console.log(`Config file not found: ${this.configFile}`)
                return this.defaults()
            }

            const content = fs.readFileSync(this.configFile, 'utf8')
            const config = JSON.parse(content)
            
            // Cache the config
            this.cache = config
            
            // Merge with defaults to ensure all required fields exist
            return merge(this.defaults(), config)
        } catch (error) {
            console.error('Failed to read config file:', error.message)
            return this.defaults()
        }
    }

    /**
     * Write configuration to file
     */
    write(config) {
        try {
            // Create directory if it doesn't exist
            const dir = path.dirname(this.configFile)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }

            // Pretty print JSON
            const content = JSON.stringify(config, null, 4)
            fs.writeFileSync(this.configFile, content, 'utf8')
            
            // Update cache
            this.cache = config
            
            console.log(`Configuration saved to ${this.configFile}`)
            return true
        } catch (error) {
            console.error('Failed to write config file:', error.message)
            return false
        }
    }

    /**
     * Sync configuration from remote URL
     */
    async sync(url = null) {
        const syncUrl = url || this.syncUrl
        if (!syncUrl) {
            return null
        }

        try {
            console.log(`Syncing config from ${syncUrl}`)
            
            const response = await fetch(syncUrl, {
                timeout: 10000,
                headers: { 'User-Agent': 'Air-GUN-Peer/1.0' }
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const remoteConfig = await response.json()
            
            // Merge remote config with local (local takes precedence for certain fields)
            const localConfig = this.read()
            const preserveFields = ['pair', 'name', 'root', 'bash'] // Don't override these
            
            const merged = merge(remoteConfig, 
                preserveFields.reduce((acc, field) => {
                    if (localConfig[field]) acc[field] = localConfig[field]
                    if (localConfig[localConfig.env] && localConfig[localConfig.env][field]) {
                        if (!acc[localConfig.env]) acc[localConfig.env] = {}
                        acc[localConfig.env][field] = localConfig[localConfig.env][field]
                    }
                    return acc
                }, {})
            )
            
            // Save merged config
            this.write(merged)
            this.lastSync = new Date().toISOString()
            
            console.log('Config sync completed')
            return merged
        } catch (error) {
            console.error('Config sync failed:', error.message)
            return null
        }
    }

    /**
     * Get default configuration
     */
    defaults() {
        return {
            root: this.paths.root,
            bash: this.paths.bash,
            env: process.env.NODE_ENV || 'development',
            name: 'air',
            ip: {
                timeout: 5000,
                dnsTimeout: 3000,
                userAgent: 'Air-GUN-Peer/1.0',
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
                ssl: {
                    key: '',
                    cert: ''
                },
                peers: []
            }
        }
    }

    /**
     * Get environment-specific configuration
     */
    get(env = null) {
        const config = this.cache || this.read()
        const environment = env || config.env || 'development'
        
        // Merge base config with environment-specific config
        return merge(config, config[environment] || {})
    }

    /**
     * Update specific configuration field
     */
    update(path, value) {
        const config = this.read()
        
        // Navigate to the path and update value
        const keys = path.split('.')
        let current = config
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i]
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {}
            }
            current = current[key]
        }
        
        current[keys[keys.length - 1]] = value
        
        return this.write(config)
    }

    /**
     * Validate configuration
     */
    validate(config = null) {
        const cfg = config || this.read()
        const errors = []

        // Check required fields
        if (!cfg.env) errors.push('env is required')
        if (!cfg.name) errors.push('name is required')
        
        const env = cfg[cfg.env]
        if (!env) {
            errors.push(`Environment config for '${cfg.env}' not found`)
        } else {
            if (!env.port) errors.push('port is required')
            if (cfg.env === 'production' && !env.domain) {
                errors.push('domain is required in production')
            }
            if (env.ssl && (!env.ssl.key || !env.ssl.cert)) {
                errors.push('SSL key and cert are required when SSL is configured')
            }
        }

        return {
            valid: errors.length === 0,
            errors
        }
    }

    /**
     * Check if config file exists
     */
    exists() {
        return fs.existsSync(this.configFile)
    }

    /**
     * Get config file path
     */
    getPath() {
        return this.configFile
    }

    /**
     * Reset to defaults
     */
    reset() {
        return this.write(this.defaults())
    }
}

const configManager = new ConfigManager()
export default configManager
export { ConfigManager }