/**
 * Process constructor - Initialize Process manager instance
 */

import type { ProcessConfig } from "./getpidfile.js"

export function constructor(this: any, config: ProcessConfig = {}) {
    this.config = config
}
