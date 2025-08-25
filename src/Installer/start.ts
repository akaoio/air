/**
 * Start the Air service - Refactored with Platform abstraction
 */

import { Platform } from "../Platform/index.js"
import type { AirConfig } from "../types/index.js"
import type { StartResult } from "./types.js"

export async function start(this: any, config: AirConfig): Promise<StartResult> {
    // Use Platform abstraction for starting service
    const platform = Platform.getInstance()

    // Platform handles all OS-specific logic internally
    return platform.startService(config.name)
}

export default start
