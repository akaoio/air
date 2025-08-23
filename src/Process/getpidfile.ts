/**
 * Get PID file path
 */

import path from 'path'

export interface ProcessConfig {
    name?: string
    root?: string
    prefix?: string
    suffix?: string
}

export function getpidfile(this: any, config?: ProcessConfig): string {
    // Use this.config if available, otherwise use passed config
    const cfg = config || this?.config || {}
    const name = cfg.name || 'air'
    const root = cfg.root || process.cwd()
    const prefix = cfg.prefix || '.'
    const suffix = cfg.suffix || '.pid'
    
    return path.join(root, `${prefix}${name}${suffix}`)
}

export default getpidfile