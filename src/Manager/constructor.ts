/**
 * Manager constructor - Initialize config manager instance
 */

import type { AirConfig } from "../types/index.js"

export interface ManagerOptions {
    rootArg?: string
    bashArg?: string
    configFile?: string
    path?: string // Support both configFile and path
}

export function constructor(this: any, options: ManagerOptions = {}) {
    this.options = options
    this.config = null as AirConfig | null

    // Support test environment isolation
    if (process.env.AIR_TEST_MODE === "true") {
        this.configFile = process.env.AIR_CONFIG || options.configFile || options.path
        this.testMode = true
        this.testId = process.env.AIR_TEST_ID
    } else {
        this.configFile = options.configFile || options.path
        this.testMode = false
    }

    this.configManager = null // Will be initialized when needed
}
