/**
 * Simple, reliable lock management for Air
 * Based on Access's proven approach
 */

import fs from "fs"
import { LOCK_FILE, PID_FILE } from "./xdg-paths.js"

const LOCK_TIMEOUT = 10 * 60 * 1000 // 10 minutes
const MIN_INTERVAL = 4 * 60 * 1000  // 4 minutes

interface LockInfo {
    pid: number
    timestamp: number
    command: string
}

/**
 * Check if a process is still running
 */
function isProcessRunning(pid: number): boolean {
    try {
        // Signal 0 doesn't kill, just checks if process exists
        process.kill(pid, 0)
        return true
    } catch {
        return false
    }
}

/**
 * Acquire lock for Air process
 * Returns true if lock acquired, false if another instance is running
 * Set FORCE_AIR=true to bypass singleton check for development
 */
export function acquireLock(command: string = "air"): boolean {
    // Development bypass for testing - use with caution
    if (process.env.FORCE_AIR === "true" || process.env.NODE_ENV === "development") {
        console.log("🚧 Development mode: bypassing singleton lock")
        return true
    }
    try {
        // Check existing lock
        if (fs.existsSync(LOCK_FILE)) {
            const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as LockInfo
            const lockAge = Date.now() - lockData.timestamp
            
            // If lock is recent and process is alive, don't acquire
            if (lockAge < LOCK_TIMEOUT && isProcessRunning(lockData.pid)) {
                console.log(`Another Air instance is running (PID: ${lockData.pid}, Command: ${lockData.command})`)
                return false
            }
            
            // Lock is stale or process is dead, clean it up
            console.log("Cleaning up stale lock file")
            releaseLock()
        }
        
        // Write new lock
        const lockInfo: LockInfo = {
            pid: process.pid,
            timestamp: Date.now(),
            command: command
        }
        
        fs.writeFileSync(LOCK_FILE, JSON.stringify(lockInfo, null, 2))
        fs.writeFileSync(PID_FILE, process.pid.toString())
        
        // Set up cleanup handlers
        const cleanup = () => releaseLock()
        process.on("exit", cleanup)
        process.on("SIGINT", cleanup)
        process.on("SIGTERM", cleanup)
        process.on("uncaughtException", (err) => {
            console.error("Uncaught exception:", err)
            cleanup()
            process.exit(1)
        })
        
        return true
    } catch (error) {
        console.error("Failed to acquire lock:", error)
        return false
    }
}

/**
 * Release lock
 */
export function releaseLock(): void {
    try {
        if (fs.existsSync(LOCK_FILE)) {
            const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as LockInfo
            // Only release if we own the lock
            if (lockData.pid === process.pid) {
                fs.unlinkSync(LOCK_FILE)
            }
        }
        if (fs.existsSync(PID_FILE)) {
            const pidData = fs.readFileSync(PID_FILE, "utf8")
            // Only release if we own the PID file
            if (parseInt(pidData) === process.pid) {
                fs.unlinkSync(PID_FILE)
            }
        }
    } catch {
        // Silent fail - not critical
    }
}

/**
 * Check if we should skip this run due to recent execution
 */
export function shouldSkipRun(lastRunFile?: string): boolean {
    const lastRun = lastRunFile || `${LOCK_FILE}.last`
    
    try {
        if (fs.existsSync(lastRun)) {
            const lastTimestamp = parseInt(fs.readFileSync(lastRun, "utf8"))
            const timeSinceRun = Date.now() - lastTimestamp
            
            if (timeSinceRun < MIN_INTERVAL) {
                console.log(`Recent run detected (${Math.round(timeSinceRun/1000)}s ago), skipping to avoid conflicts`)
                return true
            }
        }
        
        // Update last run time
        fs.writeFileSync(lastRun, Date.now().toString())
        return false
    } catch {
        return false
    }
}

/**
 * Force cleanup of all lock files (for emergency use)
 */
export function forceCleanup(): void {
    try {
        [LOCK_FILE, PID_FILE, `${LOCK_FILE}.last`].forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file)
                console.log(`Removed ${file}`)
            }
        })
    } catch (error) {
        console.error("Failed to force cleanup:", error)
    }
}