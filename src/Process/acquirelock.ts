/**
 * Acquire singleton lock for Air process
 */

import { acquireLock, type SingletonLock } from "../Path/singleton.js"
import { logger } from "../Logger/index.js"

export function acquire(this: any): SingletonLock {
    const instanceName = this.config?.name || "air"

    try {
        const lock = acquireLock(instanceName)

        if (!lock.acquired) {
            const error = new Error(`Failed to acquire lock for instance '${instanceName}'. Another instance may be running.`)
            logger.error("Singleton lock acquisition failed:", error.message)
            throw error
        }

        logger.info(`Singleton lock acquired: ${instanceName} (PID: ${lock.pid})`)
        return lock
    } catch (error: any) {
        logger.error("Lock acquisition error:", error.message)
        throw error
    }
}

export default acquire
