/**
 * Check if another instance is running via PID file
 */

import fs from "fs"
import { logger } from "../Logger/index.js"
import { getpidfile, ProcessConfig } from "./getpidfile.js"
import { clean } from "./clean.js"

export function check(config: ProcessConfig = {}): boolean {
    const pidFile = getpidfile(config)

    try {
        if (fs.existsSync(pidFile)) {
            const oldPid = parseInt(fs.readFileSync(pidFile, "utf8"))

            // Check if process is actually running
            try {
                process.kill(oldPid, 0)
                logger.error(`Another instance is already running (PID: ${oldPid})`)
                logger.error(`PID file: ${pidFile}`)
                logger.error("To stop it: kill " + oldPid)
                logger.error("Or remove PID file if process is dead: rm " + pidFile)
                return true
            } catch {
                // Process is dead, clean up stale PID file
                logger.info("Found stale PID file, cleaning up...")
                fs.unlinkSync(pidFile)
            }
        }

        // Write new PID file
        fs.writeFileSync(pidFile, process.pid.toString())

        // Register cleanup on exit
        process.on("exit", () => {
            clean(config)
        })

        process.on("SIGINT", () => {
            clean(config)
            process.exit(0)
        })

        process.on("SIGTERM", () => {
            clean(config)
            process.exit(0)
        })

        return false
    } catch (error: any) {
        logger.error("Error checking PID:", error.message)
        return false
    }
}

export default check
