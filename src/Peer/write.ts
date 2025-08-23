/**
 * Write configuration to file
 */

import type { AirConfig } from '../types/index.js'
import { write as writeConfig } from '../Manager/index.js'

export interface WriteResult {
    success: boolean
    error?: string
}

export function write(this: any, config: AirConfig): boolean {
    try {
        // Use configManager from this instance if available
        if (this.configManager) {
            const options = this.configManager.configFile ? 
                { configFile: this.configManager.configFile } : {}
            return this.configManager.write(config, options)
        }
        
        // Otherwise use the imported function
        return writeConfig(config)
    } catch (error: any) {
        return false
    }
}

export default write