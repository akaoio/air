/**
 * Report alive status (heartbeat)
 */

import { state } from "./state.js"
import { logger } from "../Logger/index.js"

export function alive(): void {
    if (!state.user?.is) return

    const status = {
        timestamp: Date.now(),
        alive: true,
        name: state.config.name,
        env: state.config.env,
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: state.config.version || "1.0.0"
    }

    state.user
        .get("status")
        .get("alive")
        .put(status, (ack: any) => {
            if (ack.err) {
                logger.error("Failed to report alive status:", ack.err)
            } else {
                state.lastStatus.alive = status
            }
        })

    // Schedule next heartbeat
    state.timers.alive = setTimeout(() => alive(), state.intervals.alive)
}

export default alive
