/**
 * Updater Class - Update processes
 * Pattern: Class = Directory + Method-per-file
 */

import type { UpdaterOptions } from './constructor.js'
import type { GitResult } from './git.js'
import type { PackagesResult } from './packages.js'
import type { RestartResult } from './restart.js'

import { constructor } from './constructor.js'
import { git } from './git.js'
import { packages } from './packages.js'
import { restart } from './restart.js'

export class Updater {
    private options: UpdaterOptions
    private updateStatus: {
        git: boolean
        packages: boolean
        restarted: boolean
    }
    
    constructor(options: UpdaterOptions = {}) {
        constructor.call(this, options)
    }
    
    async git(): Promise<GitResult> {
        return git.call(this)
    }
    
    async packages(): Promise<PackagesResult> {
        return packages.call(this)
    }
    
    async restart(): Promise<RestartResult> {
        return restart.call(this)
    }
}

export default Updater

// Re-export types
export type { UpdaterOptions } from './constructor.js'
export type { GitResult } from './git.js'
export type { PackagesResult } from './packages.js'
export type { RestartResult } from './restart.js'