/**
 * Singleton management for Air instances
 * Prevents multiple Air instances from running simultaneously
 * Follows Unix best practices for PID and lock file management
 */

import fs from 'fs'
import { detectAirMode, ensureDirectories, getLockFilePath, getPIDFilePath } from './xdg.js'

export interface SingletonLock {
    lockPath: string
    pidPath: string
    acquired: boolean
    instanceName: string
    pid: number
}

export interface SingletonStatus {
    isRunning: boolean
    pid?: number
    instanceName: string
    lockPath: string
    pidPath: string
    canAcquire: boolean
    conflictReason?: string
}

/**
 * Acquire singleton lock for Air instance
 * This ensures only one Air instance runs per configuration
 */
export function acquireLock(instanceName: string = 'air'): SingletonLock {
    const config = detectAirMode()
    ensureDirectories(config)
    
    const lockPath = getLockFilePath(config, instanceName)
    const pidPath = getPIDFilePath(config, instanceName)
    const currentPid = process.pid
    
    try {
        // Check if lock file exists and process is still running
        if (fs.existsSync(lockPath)) {
            const lockContent = fs.readFileSync(lockPath, 'utf8').trim()
            const existingPid = parseInt(lockContent)
            
            if (!isNaN(existingPid) && isProcessRunning(existingPid)) {
                throw new Error(`Another Air instance is already running (PID: ${existingPid})`)
            }
            
            // Stale lock file - remove it
            fs.unlinkSync(lockPath)
            if (fs.existsSync(pidPath)) {
                fs.unlinkSync(pidPath)
            }
        }
        
        // Create lock file with current PID
        fs.writeFileSync(lockPath, String(currentPid), { mode: 0o644 })
        fs.writeFileSync(pidPath, String(currentPid), { mode: 0o644 })
        
        // Set up cleanup on process exit
        const cleanup = () => {
            try {
                if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath)
                if (fs.existsSync(pidPath)) fs.unlinkSync(pidPath)
            } catch (err) {
                // Ignore cleanup errors
            }
        }
        
        process.on('exit', cleanup)
        process.on('SIGINT', () => {
            cleanup()
            process.exit(0)
        })
        process.on('SIGTERM', () => {
            cleanup()
            process.exit(0)
        })
        
        return {
            lockPath,
            pidPath,
            acquired: true,
            instanceName,
            pid: currentPid
        }
        
    } catch (error: any) {
        return {
            lockPath,
            pidPath,
            acquired: false,
            instanceName,
            pid: currentPid
        }
    }
}

/**
 * Release singleton lock
 */
export function releaseLock(lock: SingletonLock): boolean {
    if (!lock.acquired) return true
    
    try {
        if (fs.existsSync(lock.lockPath)) {
            fs.unlinkSync(lock.lockPath)
        }
        if (fs.existsSync(lock.pidPath)) {
            fs.unlinkSync(lock.pidPath)
        }
        lock.acquired = false
        return true
    } catch (error) {
        return false
    }
}

/**
 * Check singleton status without acquiring lock
 */
export function checkSingletonStatus(instanceName: string = 'air'): SingletonStatus {
    const config = detectAirMode()
    const lockPath = getLockFilePath(config, instanceName)
    const pidPath = getPIDFilePath(config, instanceName)
    
    // Check if lock file exists
    if (!fs.existsSync(lockPath)) {
        return {
            isRunning: false,
            instanceName,
            lockPath,
            pidPath,
            canAcquire: true
        }
    }
    
    try {
        const lockContent = fs.readFileSync(lockPath, 'utf8').trim()
        const pid = parseInt(lockContent)
        
        if (isNaN(pid)) {
            return {
                isRunning: false,
                instanceName,
                lockPath,
                pidPath,
                canAcquire: true,
                conflictReason: 'Invalid PID in lock file'
            }
        }
        
        const processRunning = isProcessRunning(pid)
        
        return {
            isRunning: processRunning,
            pid: processRunning ? pid : undefined,
            instanceName,
            lockPath,
            pidPath,
            canAcquire: !processRunning,
            conflictReason: processRunning ? `Process ${pid} is running` : 'Stale lock file'
        }
        
    } catch (error: any) {
        return {
            isRunning: false,
            instanceName,
            lockPath,
            pidPath,
            canAcquire: true,
            conflictReason: `Lock file read error: ${error.message}`
        }
    }
}

/**
 * Force release singleton lock (kill running process if necessary)
 * Use with caution!
 */
export function forceReleaseLock(instanceName: string = 'air', killProcess: boolean = false): {
    success: boolean,
    message: string,
    killedPid?: number
} {
    const status = checkSingletonStatus(instanceName)
    
    if (!status.isRunning) {
        // Just clean up stale files
        try {
            if (fs.existsSync(status.lockPath)) fs.unlinkSync(status.lockPath)
            if (fs.existsSync(status.pidPath)) fs.unlinkSync(status.pidPath)
            return { success: true, message: 'Cleaned up stale lock files' }
        } catch (error: any) {
            return { success: false, message: `Failed to clean up: ${error.message}` }
        }
    }
    
    if (!killProcess) {
        return {
            success: false,
            message: `Process ${status.pid} is running. Use killProcess=true to force terminate.`
        }
    }
    
    // Kill the running process
    try {
        if (status.pid) {
            process.kill(status.pid, 'SIGTERM')
            
            // Wait a bit for graceful shutdown
            setTimeout(() => {
                if (isProcessRunning(status.pid!)) {
                    process.kill(status.pid!, 'SIGKILL')
                }
            }, 5000)
            
            // Clean up files
            if (fs.existsSync(status.lockPath)) fs.unlinkSync(status.lockPath)
            if (fs.existsSync(status.pidPath)) fs.unlinkSync(status.pidPath)
            
            return {
                success: true,
                message: `Terminated process ${status.pid} and cleaned up lock`,
                killedPid: status.pid
            }
        }
        
        return { success: false, message: 'No PID to kill' }
        
    } catch (error: any) {
        return { success: false, message: `Failed to kill process: ${error.message}` }
    }
}

/**
 * Check if a process is running by PID
 */
function isProcessRunning(pid: number): boolean {
    try {
        // Signal 0 tests for process existence without sending a signal
        process.kill(pid, 0)
        return true
    } catch (error: any) {
        // ESRCH means process doesn't exist
        return error.code !== 'ESRCH'
    }
}

/**
 * Get all Air instances currently running
 */
export function getAllRunningInstances(): Array<{
    instanceName: string,
    pid: number,
    lockPath: string,
    mode: 'module' | 'super-peer'
}> {
    const config = detectAirMode()
    const instances: Array<{
        instanceName: string,
        pid: number,
        lockPath: string,
        mode: 'module' | 'super-peer'
    }> = []
    
    try {
        const lockDir = config.runtimePath || config.statePath
        if (!fs.existsSync(lockDir)) return instances
        
        const files = fs.readdirSync(lockDir)
        const lockFiles = files.filter(f => f.endsWith('.lock'))
        
        for (const lockFile of lockFiles) {
            const instanceName = lockFile.replace('.lock', '')
            const status = checkSingletonStatus(instanceName)
            
            if (status.isRunning && status.pid) {
                instances.push({
                    instanceName,
                    pid: status.pid,
                    lockPath: status.lockPath,
                    mode: config.mode
                })
            }
        }
        
    } catch (error) {
        // Ignore errors in discovery
    }
    
    return instances
}

export default {
    acquireLock,
    releaseLock,
    checkSingletonStatus,
    forceReleaseLock,
    getAllRunningInstances
}