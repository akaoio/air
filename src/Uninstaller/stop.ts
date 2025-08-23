/**
 * Stop Air processes
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import type { AirConfig } from '../types/index.js'

export interface StopResult {
    success: boolean
    message: string
    stopped: boolean
}

export function stop(config: AirConfig): StopResult {
    let stopped = false
    
    try {
        // Check PID file
        const pidFile = path.join(config.root, `.${config.name}.pid`)
        
        if (fs.existsSync(pidFile)) {
            try {
                const pid = parseInt(fs.readFileSync(pidFile, 'utf8'))
                
                // Check if process is running
                try {
                    process.kill(pid, 0) // Test if exists
                    process.kill(pid, 'SIGTERM') // Terminate
                    stopped = true
                    
                    // Wait and force kill if needed
                    setTimeout(() => {
                        try {
                            process.kill(pid, 0)
                            process.kill(pid, 'SIGKILL')
                        } catch {
                            // Process gone, good
                        }
                    }, 2000)
                    
                } catch {
                    // Process not running
                }
                
                // Remove PID file
                fs.unlinkSync(pidFile)
                
            } catch (e) {
                // Invalid PID file
            }
        }
        
        // Try to stop by name
        const platform = process.platform
        
        if (platform === 'win32') {
            try {
                execSync(`taskkill /F /IM node.exe /FI "WINDOWTITLE eq *air*"`, { stdio: 'ignore' })
                stopped = true
            } catch {}
        } else {
            try {
                execSync(`pkill -f "air.*main\\.(ts|js)"`, { stdio: 'ignore' })
                stopped = true
            } catch {}
        }
        
        if (stopped) {
            return { success: true, message: 'Processes stopped', stopped: true }
        } else {
            return { success: true, message: 'No running processes found', stopped: false }
        }
        
    } catch (error: any) {
        return { success: false, message: error.message, stopped: false }
    }
}

export default stop