/**
 * Restart Air service using Platform abstraction
 */

import fs from "fs"
import path from "path"
import { Platform } from "../Platform/index.js"
import type { AirConfig } from "../types/index.js"

export interface RestartResult {
    success: boolean
    message: string
    details?: string
}

export async function restart(config: AirConfig): Promise<RestartResult> {
    try {
        const platform = Platform.getInstance()
        const root = config.root
        const pidFile = path.join(root, `.${config.name}.pid`)

        // Check PID file first
        if (fs.existsSync(pidFile)) {
            try {
                const pid = parseInt(fs.readFileSync(pidFile, "utf8"))

                // Check if process is running
                try {
                    process.kill(pid, 0)

                    // Stop the process
                    process.kill(pid, "SIGTERM")
                    await new Promise(resolve => setTimeout(resolve, 2000))

                    // Start again
                    const started = await startProcess(config)
                    if (started) {
                        return { success: true, message: "Process restarted" }
                    } else {
                        return { success: false, message: "Failed to restart" }
                    }
                } catch {
                    // Process not running
                    fs.unlinkSync(pidFile)
                    return { success: false, message: "Process not running" }
                }
            } catch (error: any) {
                return {
                    success: false,
                    message: "PID file error",
                    details: error.message
                }
            }
        }

        // Use Platform abstraction for service restart
        const serviceName = `air-${config.name}`
        const restarted = await platform.restartService(serviceName)

        if (restarted) {
            return { success: true, message: "Service restarted via platform abstraction" }
        }

        return { success: false, message: "No service configured" }
    } catch (error: any) {
        return {
            success: false,
            message: "Restart error",
            details: error.message
        }
    }
}

/**
 * Start Air process
 */
async function startProcess(config: AirConfig): Promise<boolean> {
    const platform = Platform.getInstance()
    const result = await platform.startService(`air-${config.name}`)
    return result.started
}

export default restart
