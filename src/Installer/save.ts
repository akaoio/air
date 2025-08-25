/**
 * Save configuration to file
 */

import fs from "fs"
import path from "path"
import os from "os"
import { getConfigPath } from "../paths.js"
import type { AirConfig } from "../types/index.js"

export function save(this: any, config: AirConfig, customPath?: string): void {
    // Use custom path if provided, otherwise use default
    let configPath = customPath || this.configPath || getConfigPath(null, config.root)

    // Expand ~ to home directory
    if (configPath.startsWith("~/")) {
        configPath = path.join(os.homedir(), configPath.slice(2))
    }

    // Ensure directory exists
    fs.mkdirSync(path.dirname(configPath), { recursive: true })

    // Save configuration
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    console.log(`Configuration saved to: ${configPath}`)
}

export default save
