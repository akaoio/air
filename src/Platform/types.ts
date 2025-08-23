/**
 * Platform abstraction types
 * Defines interfaces for cross-platform operations
 */

import type { AirConfig } from '../types/index.js'

/**
 * Result of service creation operation
 */
export interface ServiceResult {
    success: boolean
    type?: 'systemd' | 'windows-service' | 'launchd' | 'init.d' | 'npm'
    message?: string
    error?: string
}

/**
 * Result of service start operation
 */
export interface StartResult {
    started: boolean
    pid?: number
    method?: 'systemd' | 'windows-service' | 'launchd' | 'spawn' | 'npm'
    error?: string
}

/**
 * Result of SSL setup operation
 */
export interface SSLResult {
    success: boolean
    certPath?: string
    keyPath?: string
    error?: string
}

/**
 * Platform capabilities detection
 */
export interface PlatformCapabilities {
    platform: NodeJS.Platform
    hasSystemd: boolean
    hasLaunchd: boolean
    hasWindowsService: boolean
    hasPM2: boolean
    hasDocker: boolean
    hasBun: boolean
    hasNode: boolean
    hasDeno: boolean
    isRoot: boolean
    canSudo: boolean
}

/**
 * Platform-specific paths
 */
export interface PlatformPaths {
    serviceDir: string
    configDir: string
    logDir: string
    dataDir: string
    tempDir: string
}

/**
 * Main strategy interface for platform operations
 */
export interface PlatformStrategy {
    // Service management
    createService(config: AirConfig): Promise<ServiceResult>
    startService(name: string): Promise<StartResult>
    stopService(name: string): Promise<boolean>
    removeService(name: string): Promise<boolean>
    getServiceStatus(name: string): Promise<'running' | 'stopped' | 'unknown'>
    
    // SSL/TLS operations
    setupSSL(config: AirConfig): Promise<SSLResult>
    
    // Path operations
    getPaths(): PlatformPaths
    
    // Capability checking
    getCapabilities(): PlatformCapabilities
    
    // Platform name for identification
    getName(): string
}