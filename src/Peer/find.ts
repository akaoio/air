/**
 * Find process using a specific port
 */

import { find as findProcess } from '../Process/index.js'

export interface ProcessInfo {
    pid: string
    name: string
}

export function find(port: number, _options?: { name?: string; root?: string }): ProcessInfo | null {
    // find doesn't need config, it just finds by port
    return findProcess(port)
}

export default find