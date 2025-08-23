/**
 * Restart Air service
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import type { AirConfig } from '../types/index.js'

export interface RestartResult {
    success: boolean
    message: string
    details?: string
}

export async function restart(config: AirConfig): Promise<RestartResult> {
    try {
        const root = config.root
        const pidFile = path.join(root, `.${config.name}.pid`)
        
        // Check PID file
        if (fs.existsSync(pidFile)) {
            try {
                const pid = parseInt(fs.readFileSync(pidFile, 'utf8'))
                
                // Check if process is running
                try {
                    process.kill(pid, 0)
                    
                    // Stop the process
                    process.kill(pid, 'SIGTERM')
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    
                    // Start again
                    const started = await startProcess(config)
                    if (started) {
                        return { success: true, message: 'Process restarted' }
                    } else {
                        return { success: false, message: 'Failed to restart' }
                    }
                    
                } catch {
                    // Process not running
                    fs.unlinkSync(pidFile)
                    return { success: false, message: 'Process not running' }
                }
            } catch (error: any) {
                return {
                    success: false,
                    message: 'PID file error',
                    details: error.message
                }
            }
        }
        
        // Try platform-specific service restart
        const platform = process.platform
        
        if (platform === 'darwin') {
            try {
                execSync(`launchctl stop com.air.${config.name}`, { stdio: 'ignore' })
                await new Promise(resolve => setTimeout(resolve, 1000))
                execSync(`launchctl start com.air.${config.name}`, { stdio: 'ignore' })
                return { success: true, message: 'launchd service restarted' }
            } catch {
                return { success: false, message: 'launchd service not found' }
            }
        } else if (platform === 'linux') {
            // Check for systemd
            try {
                execSync(`systemctl --user restart air-${config.name}`, { stdio: 'ignore' })
                
                const status = execSync(
                    `systemctl --user is-active air-${config.name}`,
                    { encoding: 'utf8' }
                ).trim()
                
                if (status === 'active') {
                    return { success: true, message: 'User service restarted' }
                } else {
                    return { success: false, message: `Service status: ${status}` }
                }
            } catch {
                // Try system-level
                if (hasSudo()) {
                    try {
                        execSync(`sudo systemctl restart air-${config.name}`, { stdio: 'ignore' })
                        return { success: true, message: 'System service restarted' }
                    } catch {
                        return { success: false, message: 'Service not found' }
                    }
                }
                return { success: false, message: 'Service not found' }
            }
        } else if (platform === 'win32') {
            return { success: true, message: 'Will restart on next login' }
        }
        
        return { success: false, message: 'No service configured' }
        
    } catch (error: any) {
        return {
            success: false,
            message: 'Service restart failed',
            details: error.message
        }
    }
}

async function startProcess(config: AirConfig): Promise<boolean> {
    try {
        const runtime = typeof (global as any).Bun !== 'undefined' ? 'bun' : 'node'
        const mainFile = runtime === 'bun' ? 'src/main.ts' : 'dist/main.js'
        const startCmd = `${runtime} ${path.join(config.root, mainFile)}`
        
        if (process.platform === 'win32') {
            execSync(`start /B ${startCmd}`, {
                cwd: config.root,
                shell: 'cmd.exe',
                stdio: 'ignore'
            })
        } else {
            execSync(`${startCmd} > /dev/null 2>&1 &`, {
                cwd: config.root,
                shell: '/bin/bash',
                stdio: 'ignore'
            })
        }
        
        // Wait for startup
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Check if PID file was created
        const pidFile = path.join(config.root, `.${config.name}.pid`)
        if (fs.existsSync(pidFile)) {
            const pid = parseInt(fs.readFileSync(pidFile, 'utf8'))
            try {
                process.kill(pid, 0)
                return true
            } catch {
                return false
            }
        }
        
        return false
    } catch {
        return false
    }
}

function hasSudo(): boolean {
    if (process.platform === 'win32') return false
    
    try {
        execSync('sudo -n true', { stdio: 'ignore' })
        return true
    } catch {
        return false
    }
}

export default restart