/**
 * Uninstaller Class - Uninstallation processes
 * Pattern: Class = Directory + Method-per-file
 */

import type { UninstallerOptions } from "./constructor.js"
import type { StopResult } from "./stop.js"
import type { RemoveResult } from "./remove.js"
import type { CleanResult } from "./clean.js"

import { constructor } from "./constructor.js"
import { stop } from "./stop.js"
import { remove } from "./remove.js"
import { clean } from "./clean.js"

export class Uninstaller {
    private options: UninstallerOptions
    private completed: string[]
    private errors: string[]

    constructor(options: UninstallerOptions = {}) {
        constructor.call(this, options)
    }

    async stop(): Promise<StopResult> {
        return stop.call(this)
    }

    async remove(): Promise<RemoveResult> {
        return remove.call(this)
    }

    async clean(): Promise<CleanResult> {
        return clean.call(this)
    }
}

export default Uninstaller

// Re-export types
export type { UninstallerOptions } from "./constructor.js"
export type { StopResult } from "./stop.js"
export type { RemoveResult } from "./remove.js"
export type { CleanResult } from "./clean.js"
