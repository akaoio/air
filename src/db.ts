/**
 * @akaoio/air - Default Database Instance with Auto-Initialization
 * Enhanced with Manager framework integration for system management
 */

import { Peer } from "./peer.js"
import { isManagerEnabled, getManagerConfig } from "./config.js"
import { manager, ManagerUtils } from "./manager.js"

// Create singleton instance
const _db = new Peer()

// Track initialization
let initialized = false
let initPromise: Promise<void> | null = null

// Auto-initialize on first use
async function ensureInit() {
    if (initialized) return
    if (initPromise) return initPromise
    
    initPromise = initializeWithManager()
    await initPromise
}

// Initialize Air with Manager framework integration
async function initializeWithManager(): Promise<void> {
    try {
        // Initialize Manager if enabled
        if (isManagerEnabled()) {
            console.log("🔧 Initializing Manager framework integration...")
            await ManagerUtils.safeInit()
            
            const managerConfig = getManagerConfig()
            if (managerConfig.monitoringEnabled) {
                await manager.setupNetworkMonitoring()
                console.log("✓ Manager network monitoring enabled")
            }
        }
        
        // Initialize Air database
        await _db.auto()
        initialized = true
        
        console.log("✅ Air database initialized with Manager integration")
        
    } catch (error) {
        console.error("Failed to initialize Air with Manager:", error)
        // Fallback to basic initialization
        await _db.auto()
        initialized = true
        console.log("✅ Air database initialized (fallback mode)")
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