/**
 * Write configuration to file
 */

import fs from 'fs'
import { logger } from '../Logger/index.js'
import path from 'path'
import { getpaths } from '../Path/index.js'
import { getConfigPath } from '../paths.js'
import type { AirConfig } from '../types/index.js'

export interface WriteOptions {
    rootArg?: string
    bashArg?: string
    configFile?: string
    validate?: boolean
}

export function write(this: any, config: AirConfig, options: WriteOptions = {}): boolean {
    // Validate if requested
    if (options.validate) {
        // Use configManager if available for validation
        if (this?.configManager && this.configManager.validate) {
            const validation = this.configManager.validate(config)
            if (!validation.valid) {
                logger.error('Config validation failed:', validation.errors)
                return false
            }
        } else {
            // Basic validation without configManager
            if (!config.name || !config.env) {
                logger.error('Config validation failed: missing required fields')
                return false
            }
        }
    }
    
    // Use configManager if available
    if (this?.configManager && this.configManager.save) {
        return this.configManager.save(config)
    }
    
    const paths = getpaths(options.rootArg, options.bashArg)
    const configFile = this?.configFile || this?.options?.path || options.configFile || paths.config || getConfigPath()
    
    try {
        // Ensure directory exists
        const dir = path.dirname(configFile)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        
        // Write config
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
        logger.info(`Configuration saved to ${configFile}`)
        
        return true
    } catch (error: any) {
        logger.error(`Error writing config to ${configFile}:`, error.message)
        return false
    }
}

export default write