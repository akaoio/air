/**
 * @akaoio/air - Default Database Instance with Auto-Initialization
 * Enhanced with Stacker framework integration for system management
 */

import { Peer } from "./peer.js"
import { isStackerEnabled, getStackerConfig } from "./config.js"
// import { stacker, StackerUtils } from "./stacker.js"  // Disabled: Stacker is separate cortex

// Create singleton instance
const _db = new Peer()

// Track initialization
let initialized = false
let initPromise: Promise<void> | null = null

// Auto-initialize on first use
async function ensureInit() {
    if (initialized) return
    if (initPromise) return initPromise
    
    initPromise = initializeWithStacker()
    await initPromise
}

// Initialize Air with Stacker framework integration
async function initializeWithStacker(): Promise<void> {
    try {
        // Stacker integration disabled - Air runs standalone
        
        // Initialize Air database
        await _db.auto()
        initialized = true
        
        
    } catch (error) {
        console.error("Failed to initialize Air with Stacker:", error)
        // Fallback to basic initialization
        await _db.auto()
        initialized = true
    }
}

// Create proxy for auto-initialization
const dbProxy = new Proxy(_db, {
    get(target, prop) {
        // Handle gun property specially to ensure initialization
        if (prop === 'gun') {
            // Return a proxy that will auto-init on any method call
            if (!initialized && !initPromise) {
                return new Proxy({}, {
                    get(gunTarget, gunProp) {
                        return async (...args: any[]) => {
                            await ensureInit()
                            const gun = target.gun
                            if (typeof gun[gunProp] === 'function') {
                                return gun[gunProp](...args)
                            }
                            return gun[gunProp]
                        }
                    }
                })
            }
            return target.gun
        }
        
        // Handle async methods
        if (prop === 'start' || prop === 'connect' || prop === 'auto') {
            return async (...args: any[]) => {
                const method = target[prop as keyof typeof target] as any
                const result = await method.apply(target, args)
                initialized = true
                return result
            }
        }
        
        return target[prop as keyof typeof target]
    }
})

// Export the proxied instance
export const db = dbProxy

export default { db }