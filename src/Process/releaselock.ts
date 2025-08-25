/**
 * Release singleton lock for Air process
 */

import { releaseLock, type SingletonLock } from "../Path/singleton.js"
import { logger } from "../Logger/index.js"

export function release(this: any, lock: SingletonLock): boolean {
    try {
        const result = releaseLock(lock)

        if (result) {
            logger.info(`Singleton lock released: ${lock.instanceName} (PID: ${lock.pid})`)
        } else {
            logger.warn(`Failed to release singleton lock: ${lock.instanceName}`)
        }

        return result
    } catch (error: any) {
        logger.error("Lock release error:", error.message)
        return false
    }
}

export default release
