/**
 * Load configuration
 */

import fs from "fs"
import { logger } from "../Logger/index.js"
import { getConfigPath } from "../paths.js"
import type { AirConfig } from "../types/index.js"
import { defaults } from "./defaults.js"

export function load(this: any, configPath?: string): AirConfig {
    const filepath = configPath || this.configFile || this.configPath || getConfigPath()

    try {
        if (fs.existsSync(filepath)) {
            const config = JSON.parse(fs.readFileSync(filepath, "utf8"))
            return config
        }
    } catch (error) {
        logger.error("Failed to load config:", error)
    }

    // Return defaults if no config exists
    return defaults.call(this)
}

export default load
