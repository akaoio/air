/**
 * Process Class - Process management class
 * Each method is in separate file following "Một hàm một file" principle
 */

import type { ProcessConfig } from './getpidfile.js'
import { constructor } from './constructor.js'
import { getpidfile } from './getpidfile.js'
import { check } from './check.js'
import { clean } from './clean.js'
import { find } from './find.js'
import { kill } from './kill.js'
import { isrunning } from './isrunning.js'

export class Process {
    // @ts-ignore - Used in method files
    private config: ProcessConfig = {}
    
    constructor(config: ProcessConfig = {}) {
        constructor.call(this, config)
    }
    
    getpidfile() {
        return getpidfile.call(this, this.config)
    }
    
    check() {
        return check.call(this)
    }
    
    clean() {
        return clean.call(this)
    }
    
    find(port: number) {
        return find.call(this, port)
    }
    
    kill(pid: number | string) {
        return kill.call(this, pid)
    }
    
    isrunning(pid: number | string) {
        return isrunning.call(this, pid)
    }
}

export default Process

// Re-export individual functions for backward compatibility
export { check } from './check.js'
export { clean } from './clean.js'
export { find } from './find.js'
export { kill } from './kill.js'
export { isrunning } from './isrunning.js'

// Export types
export type { ProcessConfig } from './getpidfile.js'
export type { ProcessInfo } from './find.js'