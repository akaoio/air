/**
 * Find process using a specific port via Platform abstraction
 */

import { Platform } from "../Platform/index.js"

export interface ProcessInfo {
    pid: string
    name: string
}

export function find(port: number): ProcessInfo | null {
    // Use Platform abstraction instead of direct platform checks
    const platform = Platform.getInstance()
    return platform.findProcessByPort(port)
}

export default find
