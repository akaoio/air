/**
 * Get default configuration
 */

import { getpaths } from '../Path/index.js'
import { IP_CONFIG, CONFIG_TEMPLATES } from '../constants.js'
import type { AirConfig } from '../types/index.js'

export interface DefaultOptions {
    rootArg?: string
    bashArg?: string
}

export function defaults(options: DefaultOptions = {}): AirConfig {
    const paths = getpaths(options.rootArg, options.bashArg)
    
    const config: AirConfig = {
        root: paths.root || process.cwd(),
        bash: paths.bash || process.cwd() + '/script',
        name: process.env.AIR_NAME || process.env.NAME || 'air',
        env: (process.env.ENV || 'development') as 'development' | 'production',
        sync: process.env.AIR_SYNC || undefined,
        ip: IP_CONFIG,
        development: CONFIG_TEMPLATES.development,
        production: CONFIG_TEMPLATES.production
    }
    return config
}

export default defaults