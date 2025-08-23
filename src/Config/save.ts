/**
 * Save configuration
 */

import fs from 'fs'
import { logger } from '../Logger/index.js'
import path from 'path'
import { getConfigPath } from '../paths.js'
import type { AirConfig } from '../types/index.js'

export function save(this: any, config: AirConfig, configPath?: string): boolean {
    const filepath = configPath || this.configFile || this.configPath || getConfigPath(null, config.root)
    
    try {
        // Create directory if it doesn't exist
        fs.mkdirSync(path.dirname(filepath), { recursive: true })
        fs.writeFileSync(filepath, JSON.stringify(config, null, 2))
        return true
    } catch (error) {
        logger.error('Failed to save config:', error)
        return false
    }
}

export default save