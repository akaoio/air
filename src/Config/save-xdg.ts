/**
 * XDG-compliant configuration saving for Air
 * Supports both module mode and super-peer mode
 */

import fs from 'fs'
import type { AirConfig } from '../types/index.js'
import { detectAirMode, ensureDirectories } from '../Path/xdg.js'
import { logger } from '../Logger/index.js'

export function saveXDG(this: any, config: AirConfig, configPath?: string): void {
    const modeConfig = detectAirMode()
    
    // Ensure all required directories exist
    ensureDirectories(modeConfig)
    
    // Use provided path or mode-appropriate default
    const configFilePath = configPath || (config._runtime as any)?.configPath || modeConfig.configPath
    
    try {
        // Clean config for serialization (remove runtime info)
        const cleanConfig = { ...config }
        delete cleanConfig._runtime
        
        // Add metadata
        cleanConfig._metadata = {
            version: '2.0.0',
            mode: modeConfig.mode,
            created: (cleanConfig._metadata as any)?.created || new Date().toISOString(),
            updated: new Date().toISOString(),
            xdgCompliant: true
        }
        
        // Write configuration file
        const configJson = JSON.stringify(cleanConfig, null, 2)
        fs.writeFileSync(configFilePath, configJson, { mode: 0o600 }) // Secure file permissions
        
        logger.info(`Configuration saved: ${configFilePath} (${modeConfig.mode} mode)`)
        
        // Update runtime info in the original config object
        config._runtime = {
            mode: modeConfig.mode,
            configPath: configFilePath,
            dataPath: modeConfig.dataPath,
            statePath: modeConfig.statePath,
            cachePath: modeConfig.cachePath,
            runtimePath: modeConfig.runtimePath,
            xdgCompliant: true
        }
        
    } catch (error: any) {
        const errorMessage = `Failed to save configuration to ${configFilePath}: ${error.message}`
        logger.error(errorMessage)
        throw new Error(errorMessage)
    }
}

export default saveXDG