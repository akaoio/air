/**
 * Read configuration from file
 */

import fs from "fs"
import { merge } from "../lib/utils.js"
import { getpaths } from "../Path/index.js"
import { getConfigPath } from "../paths.js"
import { defaults } from "./defaults.js"
import { logger } from "../Logger/index.js"
import type { AirConfig } from "../types/index.js"

export interface ReadOptions {
    rootArg?: string
    bashArg?: string
    configFile?: string
}

export function read(this: any, options: ReadOptions = {}): AirConfig {
    // Use configManager if available (from test context)
    if (this?.configManager && this.configManager.load) {
        const config = this.configManager.load()
        if (config) return config
    }

    const paths = getpaths(options.rootArg, options.bashArg)
    const configFile = this?.configFile || this?.options?.path || options.configFile || paths.config || getConfigPath()

    try {
        if (!fs.existsSync(configFile)) {
            logger.debug(`Config file not found: ${configFile}`)
            return defaults(options)
        }

        const content = fs.readFileSync(configFile, "utf8")
        const config = JSON.parse(content) as AirConfig

        // Merge with defaults
        return merge(defaults(options), config) as AirConfig
    } catch (error: any) {
        logger.error(`Error reading config from ${configFile}:`, error.message)
        return defaults(options)
    }
}

export default read
