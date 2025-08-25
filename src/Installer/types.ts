/**
 * Installer-specific types
 */

import type { AirConfig, GoDaddyConfig } from "../types/index.js"

export interface InstallOptions {
    name?: string
    env?: string
    root?: string
    bash?: string
    domain?: string
    port?: number
    sync?: string
    godaddy?: GoDaddyConfig
    [key: string]: unknown
}

export interface InstallContext {
    rootDir: string
    isRoot: boolean
    platform: NodeJS.Platform
    hasSystemd: boolean
    hasBun: boolean
    hasNode: boolean
}

export interface SystemInfo {
    nodeVersion: string
    npmVersion?: string
    gitVersion?: string
    platform: NodeJS.Platform
    hostname: string
    hasSudo: boolean
    hasSystemd: boolean
    isLinux: boolean
    isWindows: boolean
    isMac: boolean
    isTermux: boolean
}

export interface ServiceResult {
    created: boolean
    enabled: boolean
    error?: string
}

export interface StartResult {
    started: boolean
    pid?: number
    error?: string
}
