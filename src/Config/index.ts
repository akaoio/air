/**
 * Config Class - Configuration management class
 * Each method is in separate file following "Một hàm một file" principle
 */

import type { AirConfig } from '../types/index.js'
import { constructor } from './constructor.js'
import { load } from './load.js'
import { save } from './save.js'
import { merge } from './merge.js'
import { defaults } from './defaults.js'
import { validate } from './validate.js'

export class Config {
    constructor(configPath?: string) {
        constructor.call(this, configPath)
    }
    
    load(configPath?: string) {
        return load.call(this, configPath)
    }
    
    save(config: AirConfig, configPath?: string) {
        return save.call(this, config, configPath)
    }
    
    merge(...configs: any[]) {
        return merge.call(this, ...configs)
    }
    
    defaults() {
        return defaults.call(this)
    }
    
    validate(config: AirConfig) {
        return validate.call(this, config)
    }
}

export default Config

// Export types
export type { ValidationResult } from './validate.js'