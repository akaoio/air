/**
 * Reporter Class - Status reporting
 * Pattern: Class = Directory + Method-per-file
 */

import type { ReporterOptions } from './constructor.js'
import type { StatusState } from './state.js'
import type { StatusInfo } from './get.js'

import { constructor } from './constructor.js'
import { start } from './start.js'
import { stop } from './stop.js'
import { alive } from './alive.js'
import { ip } from './ip.js'
import { ddns } from './ddns.js'
import { report } from './report.js'
import { activate } from './activate.js'
import { get } from './get.js'
import { config } from './config.js'
import { user } from './user.js'
import { state } from './state.js'

export class Reporter {
    // @ts-ignore - Used in method files
    private options: ReporterOptions = {}
    // @ts-ignore - Used in method files  
    private state: StatusState | null = null
    // @ts-ignore - Used in method files
    private active: boolean = false
    
    constructor(options: ReporterOptions = {}) {
        constructor.call(this, options)
    }
    
    start(): void {
        return start.call(this)
    }
    
    stop(): void {
        return stop.call(this)
    }
    
    alive(): void {
        return alive.call(this)
    }
    
    async ip(): Promise<void> {
        return ip.call(this)
    }
    
    async ddns(): Promise<void> {
        return ddns.call(this)
    }
    
    report(key: string, data: any): Promise<any> {
        return report.call(this, key, data)
    }
    
    activate(hubKey: string): Promise<any> {
        return activate.call(this, hubKey)
    }
    
    get(): StatusInfo {
        return get.call(this)
    }
    
    config(configData: any): void {
        return config.call(this, configData)
    }
    
    user(userData: any): void {
        return user.call(this, userData)
    }
    
    getState(): StatusState {
        return state
    }
}

export default Reporter

// Re-export individual functions for backward compatibility
export { activate } from './activate.js'
export { start } from './start.js'
export { stop } from './stop.js'
export { alive } from './alive.js'
export { ip } from './ip.js'
export { ddns } from './ddns.js'

// Re-export types
export type { ReporterOptions } from './constructor.js'
export type { StatusState } from './state.js'
export type { StatusInfo } from './get.js'