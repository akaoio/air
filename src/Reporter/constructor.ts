/**
 * Reporter constructor - Initialize status reporter instance
 */

import type { StatusState } from "./state.js"

export interface ReporterOptions {
    interval?: number
    timeout?: number
    retries?: number
}

export function constructor(this: any, options: ReporterOptions = {}) {
    this.options = options
    this.state = null as StatusState | null
    this.active = false
}
