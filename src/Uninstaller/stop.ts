/**
 * Stop Air processes using Platform abstraction
 */

import fs from "fs"
import path from "path"
import { Platform } from "../Platform/index.js"
import type { AirConfig } from "../types/index.js"

export interface StopResult {
    success: boolean
    message: string
    stopped: boolean
}

export async function stop(config: AirConfig): Promise<StopResult> {
    let stopped = false
    const platform = Platform.getInstance()

    try {
        // Check PID file first
        const pidFile = path.join(config.root, `.${config.name}.pid`)

        if (fs.existsSync(pidFile)) {
            try {
                const pid = parseInt(fs.readFileSync(pidFile, "utf8"))

                // Use Platform abstraction to kill process
                stopped = platform.killProcess(pid)

                // Remove PID file
                if (stopped) {
                    fs.unlinkSync(pidFile)
                }
            } catch (e) {
                // Invalid PID file
            }
        }

        // Try to stop service via Platform
        const serviceName = `air-${config.name}`
        const serviceStopped = await platform.stopService(serviceName)

        if (serviceStopped) {
            stopped = true
        }

        // Try to stop by process name via Platform
        if (!stopped) {
            stopped = platform.killProcessByName(`air.*main\\.(ts|js)`)
        }

        if (stopped) {
            return { success: true, message: "Processes stopped", stopped: true }
        } else {
            return { success: true, message: "No running processes found", stopped: false }
        }
    } catch (error: any) {
        return { success: false, message: error.message, stopped: false }
    }
}

export default stop
