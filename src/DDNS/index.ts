/**
 * DDNS Class - Dynamic DNS management
 * Pattern: Class = Directory + Method-per-file
 */

import type { IPResult, UpdateResult, DDNSState, DDNSConfig } from "./types.js"
import type { AirConfig } from "../types/index.js"

import { constructor } from "./constructor.js"
import { detect } from "./detect.js"
import { update } from "./update.js"
import { load, save } from "./state.js"

export class DDNS {
    // @ts-ignore - Used in method files
    private state: DDNSState | null = null
    // @ts-ignore - Used in method files
    private config: DDNSConfig | null = null

    constructor(config?: DDNSConfig) {
        constructor.call(this, config)
    }

    async detect(): Promise<IPResult> {
        return detect.call(this)
    }

    async update(config: AirConfig, ips: IPResult): Promise<UpdateResult[]> {
        return update.call(this, config, ips)
    }

    load(): DDNSState | null {
        return load.call(this)
    }

    save(state: DDNSState): void {
        return save.call(this, state)
    }
}

export default DDNS

// Re-export types
export type { IPResult } from "./detect.js"
export type { UpdateResult, DDNSConfig } from "./update.js"
export type { DDNSState } from "./state.js"
