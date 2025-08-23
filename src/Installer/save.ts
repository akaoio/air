/**
 * Save configuration to file
 */

import fs from 'fs'
import path from 'path'
import { getConfigPath } from '../paths.js'
import type { AirConfig } from '../types/index.js'

export function save(this: any, config: AirConfig): void {
    const configPath = getConfigPath(null, config.root)
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    
    // Save configuration
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

export default save