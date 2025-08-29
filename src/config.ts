/**
 * Simple configuration management for Air
 * One config file. One location. That's it.
 * 
 * Enhanced with Stacker framework integration for system-wide management
 */

import fs from "fs"
import { CONFIG_FILE, ensureDirectories } from "./xdg-paths.js"
import { StackerUtils, type StackerConfig } from "./stacker.js"
interface AirConfig {
    name?: string
    env?: string
    root?: string
    bash?: string
    port?: number
    host?: string
    production?: any
    development?: any
    stacker?: {
        enabled?: boolean
        autoUpdate?: boolean
        serviceMode?: 'systemd' | 'cron' | 'redundant'
        monitoringEnabled?: boolean
        updateInterval?: number
    }
    [key: string]: any
}

// Default configuration
const DEFAULT_CONFIG: any = {
    name: "air",
    env: "production",
    root: process.cwd(),
    bash: process.cwd(),
    port: 8765,
    host: "0.0.0.0",
    stacker: {
        enabled: StackerUtils.isAvailable(),
        autoUpdate: false,
        serviceMode: 'systemd',
        monitoringEnabled: true,
        updateInterval: 5
    },
    ip: {
        timeout: 5000,
        dnsTimeout: 3000,
        userAgent: "Air/2.0",
        dns: [],
        http: []
    },
    production: {
        port: 8765,
        domain: "localhost",
        ssl: undefined,
        peers: []
    },
    development: {
        port: 8765,
        domain: "localhost",
        ssl: undefined,
        peers: []
    }
}

/**
 * Load configuration from disk
 * Priority: CONFIG_FILE > defaults
 */
export function loadConfig(): AirConfig {
    ensureDirectories()
    
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"))
            
            // Merge with defaults
            const config = {
                ...DEFAULT_CONFIG,
                ...fileConfig,
                production: {
                    ...DEFAULT_CONFIG.production,
                    ...(fileConfig.production || {})
                },
                development: {
                    ...DEFAULT_CONFIG.development,
                    ...(fileConfig.development || {})
                }
            }
            
            // Remove any DDNS/IP garbage
            delete (config as any).godaddy
            delete (config as any).ddns
            delete (config as any).ip
            delete (config as any).ipSync
            
            return config
        }
    } catch (error) {
        console.warn("Failed to load config file, using defaults:", error)
    }
    
    return DEFAULT_CONFIG
}

/**
 * Save configuration to disk
 */
export function saveConfig(config: AirConfig): void {
    ensureDirectories()
    
    // Clean config before saving
    const cleanConfig = {
        ...config,
        // Remove any DDNS/IP garbage
        godaddy: undefined,
        ddns: undefined,
        ip: undefined,
        ipSync: undefined
    }
    
    // Remove undefined values
    const removeUndefined = (obj: any): any => {
        const cleaned: any = {}
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = typeof value === "object" && value !== null 
                    ? removeUndefined(value)
                    : value
            }
        }
        return cleaned
    }
    
    const finalConfig = removeUndefined(cleanConfig)
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(finalConfig, null, 2))
    console.log(`✓ Configuration saved to ${CONFIG_FILE}`)
}

/**
 * Update specific config values
 */
export function updateConfig(updates: Partial<AirConfig>): AirConfig {
    const current = loadConfig()
    const updated = {
        ...current,
        ...updates
    }
    saveConfig(updated)
    return updated
}

/**
 * Get current environment config (production/development)
 */
export function getEnvConfig(config?: AirConfig): any {
    const cfg = config || loadConfig()
    const env = cfg.env || "production"
    return cfg[env as keyof AirConfig] || cfg.production
}

/**
 * Reset to default configuration
 */
export function resetConfig(): void {
    saveConfig(DEFAULT_CONFIG)
    console.log("✓ Configuration reset to defaults")
}

/**
 * Validate configuration
 */
export function validateConfig(config: AirConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check required fields
    const port = config.port as number
    if (!port || port < 1 || port > 65535) {
        errors.push("Invalid port number")
    }
    
    if (!config.host) {
        errors.push("Host is required")
    }
    
    if (!config.env || !["production", "development"].includes(config.env)) {
        errors.push("Environment must be 'production' or 'development'")
    }
    
    // Check SSL if enabled
    const envConfig = getEnvConfig(config)
    if (envConfig.ssl) {
        if (!envConfig.ssl.key || !envConfig.ssl.cert) {
            errors.push("SSL enabled but key/cert paths not configured")
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Stacker-aware configuration functions
 */
export async function enableStackerIntegration(options: {
    autoUpdate?: boolean
    serviceMode?: 'systemd' | 'cron' | 'redundant'
    monitoringEnabled?: boolean
    updateInterval?: number
} = {}): Promise<void> {
    if (!StackerUtils.isAvailable()) {
        console.warn("Stacker framework not available - cannot enable integration")
        return
    }
    
    const current = loadConfig()
    const updated = updateConfig({
        stacker: {
            enabled: true,
            autoUpdate: options.autoUpdate ?? false,
            serviceMode: options.serviceMode ?? 'systemd',
            monitoringEnabled: options.monitoringEnabled ?? true,
            updateInterval: options.updateInterval ?? 5
        }
    })
    
    console.log("✓ Stacker integration enabled in Air configuration")
}

/**
 * Disable Stacker integration
 */
export function disableStackerIntegration(): void {
    const updated = updateConfig({
        stacker: {
            enabled: false
        }
    })
    
    console.log("✓ Stacker integration disabled")
}

/**
 * Check if Stacker integration is enabled
 */
export function isStackerEnabled(): boolean {
    const config = loadConfig()
    return config.stacker?.enabled === true
}

/**
 * Get Stacker-specific configuration
 */
export function getStackerConfig(): any {
    const config = loadConfig()
    return config.stacker || DEFAULT_CONFIG.stacker
}

// Export a singleton instance for convenience
export const config = {
    load: loadConfig,
    save: saveConfig,
    update: updateConfig,
    getEnv: getEnvConfig,
    reset: resetConfig,
    validate: validateConfig,
    file: CONFIG_FILE,
    // Stacker integration functions
    enableStacker: enableStackerIntegration,
    disableStacker: disableStackerIntegration,
    isStackerEnabled: isStackerEnabled,
    getStackerConfig: getStackerConfig
}