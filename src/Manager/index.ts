/**
 * Manager Class - Configuration management
 * Pattern: Class = Directory + Method-per-file
 */

import type { AirConfig } from "../types/index.js"
import type { ManagerOptions } from "./constructor.js"
import type { ReadOptions } from "./read.js"
import type { WriteOptions } from "./write.js"
import type { SyncOptions } from "./sync.js"
import type { DefaultOptions } from "./defaults.js"
import type { ValidateOptions, ValidationResult } from "./validate.js"

import { constructor } from "./constructor.js"
import { read } from "./read.js"
import { write } from "./write.js"
import { sync } from "./sync.js"
import { defaults } from "./defaults.js"
import { validate } from "./validate.js"
import { mergeenv } from "./mergeenv.js"

export class Manager {
    // @ts-ignore - Used in method files
    private options!: ManagerOptions
    // @ts-ignore - Used in method files
    private config: AirConfig | null = null

    constructor(options: ManagerOptions = {}) {
        constructor.call(this, options)
    }

    read(options: ReadOptions = {}): AirConfig {
        return read.call(this, options)
    }

    write(config: AirConfig, options: WriteOptions = {}): boolean {
        return write.call(this, config, options) as any
    }

    async sync(url?: string, options: SyncOptions = {}): Promise<AirConfig | null> {
        return sync.call(this, url || "", options)
    }

    defaults(options: DefaultOptions = {}): AirConfig {
        return defaults.call(this, options)
    }

    validate(config: AirConfig, options: ValidateOptions = {}): ValidationResult {
        return validate.call(this, { ...options, config })
    }

    mergeenv(config: AirConfig): AirConfig {
        return mergeenv.call(this, config)
    }
}

export default Manager

// Re-export individual functions for backward compatibility
export { read } from "./read.js"
export { write } from "./write.js"
export { sync } from "./sync.js"
export { defaults } from "./defaults.js"
export { validate } from "./validate.js"
export { mergeenv } from "./mergeenv.js"

// Re-export types
export type { ManagerOptions } from "./constructor.js"
export type { ReadOptions } from "./read.js"
export type { WriteOptions } from "./write.js"
export type { SyncOptions } from "./sync.js"
export type { DefaultOptions } from "./defaults.js"
export type { ValidateOptions, ValidationResult } from "./validate.js"
