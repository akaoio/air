/**
 * Get PID file path
 */

import path from "path"

export interface ProcessConfig {
    name?: string
    root?: string
    prefix?: string
    suffix?: string
}

export function getpidfile(this: any, config?: ProcessConfig): string {
    // Support test environment isolation
    if (process.env.AIR_TEST_MODE === "true" && process.env.AIR_PID_FILE) {
        return process.env.AIR_PID_FILE
    }

    // Use this.config if available, otherwise use passed config
    const cfg = config || this?.config || {}
    const name = cfg.name || process.env.AIR_NAME || "air"
    const root = cfg.root || process.env.AIR_ROOT || process.cwd()
    const prefix = cfg.prefix || "."
    const suffix = cfg.suffix || ".pid"

    return path.join(root, `${prefix}${name}${suffix}`)
}

export default getpidfile
