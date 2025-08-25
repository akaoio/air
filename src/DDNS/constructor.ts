/**
 * Constructor for DDNS class
 */

import type { DDNSConfig, DDNSState } from "./types.js"

export function constructor(this: any, config?: DDNSConfig): void {
    this.config = config || null
    this.options = config || {} // Support both config and options
    this.state = null
}
