/**
 * Smart Config Merger
 * Merges only user-provided values, preserves existing config
 */

import fs from 'fs'
import path from 'path'
import type { AirConfig } from './types/index.js'

export interface ConfigPaths {
    candidates: string[]
    found?: string
}

export interface MergeResult {
    success: boolean
    config: AirConfig
    backupPath?: string
    changes: string[]
    errors?: string[]
}

/**
 * Detect possible config file locations
 */
export function detectConfigPaths(customPath?: string): ConfigPaths {
    const candidates: string[] = []
    
    if (customPath) {
        candidates.push(path.resolve(customPath))
    }
    
    // Common locations
    candidates.push(
        path.join(process.cwd(), 'air.json'),
        path.join(process.cwd(), 'config', 'air.json'),
        path.join(process.env.HOME || '/tmp', '.config', 'air', 'config.json'),
        path.join('/etc', 'air', 'config.json')
    )
    
    // Find first existing file
    const found = candidates.find(p => fs.existsSync(p))
    
    return { candidates, found }
}

/**
 * Get default config structure
 */
function getDefaults(): AirConfig {
    return {
        name: 'air',
        env: 'development',
        root: process.cwd(),
        bash: process.env.SHELL || '/bin/bash',
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
}

/**
 * Deep merge objects, only overriding with non-empty values
 */
function smartMerge(existing: any, updates: any, path = ''): { result: any, changes: string[] } {
    const result = { ...existing }
    const changes: string[] = []
    
    for (const [key, value] of Object.entries(updates)) {
        const fullPath = path ? `${path}.${key}` : key
        
        if (value === null || value === undefined || value === '') {
            // Skip empty values - don't override existing
            continue
        }
        
        if (Array.isArray(value)) {
            if (value.length > 0) {
                result[key] = [...value]
                changes.push(`${fullPath}: updated array (${value.length} items)`)
            }
        } else if (typeof value === 'object' && value !== null) {
            if (typeof existing[key] === 'object' && existing[key] !== null) {
                // Recursively merge objects
                const nested = smartMerge(existing[key] || {}, value, fullPath)
                result[key] = nested.result
                changes.push(...nested.changes)
            } else {
                result[key] = { ...value }
                changes.push(`${fullPath}: added object`)
            }
        } else {
            // Primitive value - only update if different
            if (existing[key] !== value) {
                result[key] = value
                changes.push(`${fullPath}: ${existing[key]} → ${value}`)
            }
        }
    }
    
    return { result, changes }
}

/**
 * Smart merge config with selective updates
 */
export function mergeConfig(
    configPath: string,
    userUpdates: Partial<AirConfig>,
    options: {
        createBackup?: boolean
        forceCreate?: boolean
    } = {}
): MergeResult {
    try {
        const defaults = getDefaults()
        let existingConfig: AirConfig = defaults
        let backupPath: string | undefined
        
        // Read existing config if exists
        if (fs.existsSync(configPath)) {
            try {
                existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                
                // Create backup if requested
                if (options.createBackup) {
                    backupPath = `${configPath}.backup.${Date.now()}`
                    fs.copyFileSync(configPath, backupPath)
                }
            } catch (error) {
                return {
                    success: false,
                    config: defaults,
                    errors: [`Failed to parse existing config: ${error}`]
                }
            }
        } else if (!options.forceCreate) {
            return {
                success: false,
                config: defaults,
                errors: [`Config file not found: ${configPath}`]
            }
        }
        
        // Start with existing config merged with any missing defaults
        const baseConfig = smartMerge(defaults, existingConfig).result
        
        // Apply user updates selectively
        const { result: finalConfig, changes } = smartMerge(baseConfig, userUpdates)
        
        // Ensure directory exists
        const dir = path.dirname(configPath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        
        // Write final config
        fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2))
        
        return {
            success: true,
            config: finalConfig,
            backupPath,
            changes
        }
        
    } catch (error: any) {
        return {
            success: false,
            config: getDefaults(),
            errors: [`Config merge failed: ${error.message}`]
        }
    }
}

/**
 * Load config from detected path
 */
export function loadConfig(customPath?: string): { config: AirConfig, path?: string } {
    const paths = detectConfigPaths(customPath)
    
    if (paths.found) {
        try {
            const config = JSON.parse(fs.readFileSync(paths.found, 'utf8'))
            return { config, path: paths.found }
        } catch {
            // Fall through to defaults
        }
    }
    
    return { config: getDefaults() }
}