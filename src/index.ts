/**
 * @akaoio/air - Main Entry Point
 * Distributed P2P Graph Database with Single Data Source
 */

import { Peer } from "./peer.js"

export { Peer }
export { acquireLock, releaseLock, forceCleanup } from "./lock-manager.js"  
export { loadConfig, saveConfig, updateConfig } from "./config.js"

// Default export - create a default peer instance
export { db } from "./db.js"

// Air 3.0 - Convenient API for quick starts
export const Air = {
    // Create new instance
    create: (config?: any) => new Peer(config),
    
    // Quick server start
    server: async (port = 8765) => {
        const peer = new Peer({ 
            development: { port },
            production: { port },
            staging: { port }
        })
        await peer.start()
        return peer
    },
    
    // Quick client connect
    client: async (peers?: string[]) => {
        const peer = new Peer()
        await peer.connect({ peers })
        return peer
    },
    
    // Smart auto mode
    auto: async () => {
        const peer = new Peer()
        await peer.auto()
        return peer
    }
}