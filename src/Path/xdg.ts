/**
 * XDG Base Directory Specification implementation for Air
 * International standard for configuration and data directories
 * 
 * Reference: https://specifications.freedesktop.org/basedir-spec/latest/
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

export interface XDGDirectories {
    // XDG Base Directories
    configHome: string    // ~/.config or $XDG_CONFIG_HOME
    dataHome: string      // ~/.local/share or $XDG_DATA_HOME  
    cacheHome: string     // ~/.cache or $XDG_CACHE_HOME
    runtimeDir?: string   // /run/user/{uid} or $XDG_RUNTIME_DIR
    stateHome: string     // ~/.local/state or $XDG_STATE_HOME
    
    // Air-specific directories
    airConfig: string     // ~/.config/air
    airData: string       // ~/.local/share/air
    airCache: string      // ~/.cache/air
    airRuntime?: string   // /run/user/{uid}/air (if available)
    airState: string      // ~/.local/state/air (logs, pid files)
    
    // Windows equivalents
    appData?: string      // %APPDATA%/air (Windows)
    localAppData?: string // %LOCALAPPDATA%/air (Windows)
}

export interface AirModeConfig {
    mode: 'module' | 'super-peer'
    configPath: string    // Where air.json is stored
    dataPath: string      // Where data is stored
    statePath: string     // Where PID/logs are stored
    cachePath: string     // Where cache is stored
    runtimePath?: string  // Where runtime files are stored
}

/**
 * Get XDG Base Directories following international standards
 */
export function getXDGDirectories(): XDGDirectories {
    const home = os.homedir()
    const isWindows = process.platform === 'win32'
    
    if (isWindows) {
        // Windows: use %APPDATA% and %LOCALAPPDATA%
        const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
        const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
        
        return {
            configHome: appData,
            dataHome: localAppData,
            cacheHome: path.join(localAppData, 'cache'),
            stateHome: localAppData,
            
            airConfig: path.join(appData, 'air'),
            airData: path.join(localAppData, 'air'),
            airCache: path.join(localAppData, 'air', 'cache'),
            airState: path.join(localAppData, 'air'),
            
            appData: path.join(appData, 'air'),
            localAppData: path.join(localAppData, 'air')
        }
    }
    
    // Unix-like systems: XDG Base Directory Specification
    const configHome = process.env.XDG_CONFIG_HOME || path.join(home, '.config')
    const dataHome = process.env.XDG_DATA_HOME || path.join(home, '.local', 'share')
    const cacheHome = process.env.XDG_CACHE_HOME || path.join(home, '.cache')
    const stateHome = process.env.XDG_STATE_HOME || path.join(home, '.local', 'state')
    const runtimeDir = process.env.XDG_RUNTIME_DIR // Usually /run/user/{uid}
    
    return {
        configHome,
        dataHome,
        cacheHome,
        stateHome,
        runtimeDir,
        
        airConfig: path.join(configHome, 'air'),
        airData: path.join(dataHome, 'air'),
        airCache: path.join(cacheHome, 'air'),
        airState: path.join(stateHome, 'air'),
        airRuntime: runtimeDir ? path.join(runtimeDir, 'air') : undefined
    }
}

/**
 * Determine Air's runtime mode and appropriate paths
 */
export function detectAirMode(): AirModeConfig {
    const xdg = getXDGDirectories()
    const cwd = process.cwd()
    
    // Check if we're running from Air's source directory (super-peer mode)
    const isSuperPeer = fs.existsSync(path.join(cwd, 'package.json')) &&
                        fs.existsSync(path.join(cwd, 'src', 'main.ts')) &&
                        (JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')).name === '@akaoio/air')
    
    if (isSuperPeer) {
        // Super-peer mode: use XDG directories
        return {
            mode: 'super-peer',
            configPath: path.join(xdg.airConfig, 'air.json'),
            dataPath: xdg.airData,
            statePath: xdg.airState, // PID files, logs
            cachePath: xdg.airCache,
            runtimePath: xdg.airRuntime
        }
    } else {
        // Module mode: use current project directory
        return {
            mode: 'module',
            configPath: path.join(cwd, 'air.json'),
            dataPath: path.join(cwd, '.air', 'data'),
            statePath: path.join(cwd, '.air', 'state'), // PID files, logs
            cachePath: path.join(cwd, '.air', 'cache'),
            runtimePath: path.join(cwd, '.air', 'runtime')
        }
    }
}

/**
 * Ensure all required directories exist
 */
export function ensureDirectories(config: AirModeConfig): void {
    const dirs = [
        path.dirname(config.configPath),
        config.dataPath,
        config.statePath,
        config.cachePath
    ]
    
    if (config.runtimePath) {
        dirs.push(config.runtimePath)
    }
    
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o755 })
        }
    }
}

/**
 * Get singleton lock file path for Air instance management
 */
export function getLockFilePath(config: AirModeConfig, instanceName: string = 'air'): string {
    // Use runtime directory if available (preferred), otherwise state directory
    const lockDir = config.runtimePath || config.statePath
    return path.join(lockDir, `${instanceName}.lock`)
}

/**
 * Get PID file path following FHS standards
 */
export function getPIDFilePath(config: AirModeConfig, instanceName: string = 'air'): string {
    // PID files go in state directory (or runtime if available)
    const pidDir = config.runtimePath || config.statePath
    return path.join(pidDir, `${instanceName}.pid`)
}

/**
 * Get log directory path
 */
export function getLogDirectoryPath(config: AirModeConfig): string {
    return path.join(config.statePath, 'logs')
}

/**
 * Get socket file path for IPC (Unix domain sockets)
 */
export function getSocketPath(config: AirModeConfig, instanceName: string = 'air'): string {
    // Sockets go in runtime directory if available
    const socketDir = config.runtimePath || config.statePath
    return path.join(socketDir, `${instanceName}.sock`)
}

/**
 * Legacy compatibility: detect old-style paths and migrate
 */
export function migrateLegacyPaths(config: AirModeConfig): { migrated: boolean; messages: string[] } {
    const messages: string[] = []
    let migrated = false
    
    // Check for old air.json in current directory for super-peer mode
    if (config.mode === 'super-peer') {
        const legacyConfigPath = path.join(process.cwd(), 'air.json')
        if (fs.existsSync(legacyConfigPath) && !fs.existsSync(config.configPath)) {
            // Ensure target directory exists
            ensureDirectories(config)
            
            // Move config file
            fs.copyFileSync(legacyConfigPath, config.configPath)
            messages.push(`Migrated config: ${legacyConfigPath} → ${config.configPath}`)
            migrated = true
            
            // Keep legacy file for compatibility (with note)
            const legacyContent = JSON.parse(fs.readFileSync(legacyConfigPath, 'utf8'))
            legacyContent._migrated_to = config.configPath
            legacyContent._migration_note = 'This file is deprecated. Configuration moved to XDG-compliant location.'
            fs.writeFileSync(legacyConfigPath, JSON.stringify(legacyContent, null, 2))
        }
        
        // Check for old PID files
        const legacyPidPath = path.join(process.cwd(), '.air.pid')
        if (fs.existsSync(legacyPidPath)) {
            messages.push(`Found legacy PID file: ${legacyPidPath} (will be cleaned up on next start)`)
        }
    }
    
    return { migrated, messages }
}

export default {
    getXDGDirectories,
    detectAirMode,
    ensureDirectories,
    getLockFilePath,
    getPIDFilePath,
    getLogDirectoryPath,
    getSocketPath,
    migrateLegacyPaths
}