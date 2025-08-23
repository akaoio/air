/**
 * Check process status without creating/modifying PID files
 * Used by status script to safely check if process is running
 */

import fs from 'fs'
import { getpidfile, ProcessConfig } from './getpidfile.js'
import { isrunning } from './isrunning.js'

export interface ProcessStatus {
    pidFile: string
    exists: boolean
    running: boolean
    pid: number | null
    stale: boolean
}

export function status(config: ProcessConfig = {}): ProcessStatus {
    const pidFile = getpidfile(config)
    
    const result: ProcessStatus = {
        pidFile,
        exists: false,
        running: false,
        pid: null,
        stale: false
    }
    
    try {
        if (fs.existsSync(pidFile)) {
            result.exists = true
            const pidContent = fs.readFileSync(pidFile, 'utf8').trim()
            const pid = parseInt(pidContent)
            
            if (!isNaN(pid)) {
                result.pid = pid
                result.running = isrunning(pid)
                result.stale = !result.running
            } else {
                // Invalid PID file content
                result.stale = true
            }
        }
    } catch (error) {
        // File system error, treat as not running
        result.exists = false
    }
    
    return result
}

export default status