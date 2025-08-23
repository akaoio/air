/**
 * Default configuration
 */

import type { AirConfig } from '../types/index.js'
import { DEFAULTS, IP_CONFIG, CONFIG_TEMPLATES } from '../constants.js'

export function defaults(this: any, options?: Partial<AirConfig>): AirConfig {
    const defaultConfig = {
        root: process.cwd(),
        bash: process.env.SHELL || '/bin/bash',
        name: process.env.AIR_NAME || 'air',
        env: (process.env.ENV || 'development') as 'development' | 'production',
        sync: process.env.AIR_SYNC || undefined,
        ip: IP_CONFIG,
        development: CONFIG_TEMPLATES.development,
        production: CONFIG_TEMPLATES.production
    } as AirConfig
    
    // Merge with options if provided
    if (options) {
        return { ...defaultConfig, ...options }
    }
    
    return defaultConfig
}

export default defaults