/**
 * Manager constructor - Initialize config manager instance
 */

import type { AirConfig } from '../types/index.js'

export interface ManagerOptions {
    rootArg?: string
    bashArg?: string
    configFile?: string
    path?: string  // Support both configFile and path
}

export function constructor(this: any, options: ManagerOptions = {}) {
    this.options = options
    this.config = null as AirConfig | null
    this.configFile = options.configFile || options.path
    this.configManager = null  // Will be initialized when needed
}