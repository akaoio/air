/**
 * @akaoio/air - Main Server Entry Point
 * Stacker-integrated P2P Database System
 */

import { db } from "./db.js"
import { stacker, StackerUtils } from "./stacker.js"
import { config } from "./config.js"
import { PID_FILE } from "./xdg-paths.js"
import fs from "fs"

/**
 * Initialize Stacker integration if available
 */
async function initializeStacker(): Promise<void> {
    // Stacker integration disabled - Air runs standalone  
}

/**
 * Write process PID for Stacker framework
 */
function writePidFile(): void {
    try {
        fs.writeFileSync(PID_FILE, process.pid.toString())
        
        // Clean up PID file on exit
        const cleanup = () => {
            try {
                fs.unlinkSync(PID_FILE)
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        
        process.on('exit', cleanup)
        process.on('SIGINT', cleanup)
        process.on('SIGTERM', cleanup)
        process.on('uncaughtException', cleanup)
        
    } catch (error) {
        console.warn("Failed to write PID file:", error)
    }
}

/**
 * Log startup information with Stacker awareness
 */
function logStartupInfo(): void {
    const cfg = config.load()
    const isStackerEnabled = config.isStackerEnabled()
    
    
    if (isStackerEnabled) {
        const stackerConfig = config.getStackerConfig()
        
        if (stackerConfig.autoUpdate) {
        }
    }
    
}

/**
 * Main Air server entry point with Stacker integration
 */
const main = async () => {
    try {
        // Initialize Stacker framework integration
        await initializeStacker()
        
        // Write PID file for process management
        writePidFile()
        
        // Log startup information
        logStartupInfo()
        
        // Start the Air P2P database
        await db.start()
        
        
        // Register success with Stacker if available
        if (StackerUtils.isAvailable() && config.isStackerEnabled()) {
        }
        
    } catch (error) {
        console.error("❌ Failed to start Air:", error)
        process.exit(1)
    }
}

main().catch(console.error)