/**
 * @akaoio/air - Main Server Entry Point
 * Stacker-integrated P2P Database System
 */

import { db } from "./db.js"
// Stacker integration disabled - using shell-level integration via air.sh
// import { stacker, StackerUtils } from "./stacker.js"
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
        // Initialize Stacker framework integration with error boundary
        await initializeStacker().catch(error => {
            console.warn("Stacker integration failed, continuing without:", error.message)
        })
        
        // Write PID file for process management with error boundary
        try {
            writePidFile()
        } catch (error) {
            console.warn("PID file creation failed:", error.message)
        }
        
        // Log startup information with error boundary
        try {
            logStartupInfo()
        } catch (error) {
            console.warn("Startup logging failed:", error.message)
        }
        
        // Start the Air P2P database with comprehensive error handling
        await db.start().catch(error => {
            console.error("Database startup failed:", error.message)
            throw error // Re-throw as this is critical
        })
        
        // Success logging with error boundaries
        try {
            console.log("✅ Air P2P Database started successfully")
            console.log(`📡 Port: ${config.load().port || 8765}`)
            console.log(`📁 Data: ${config.load().dataDir || process.env.HOME + '/.local/share/air'}`)
        } catch (error) {
            console.warn("Success logging failed:", error.message)
        }
        
    } catch (error) {
        console.error("❌ Failed to start Air:", error)
        // Graceful shutdown attempt
        try {
            if (fs.existsSync(PID_FILE)) {
                fs.unlinkSync(PID_FILE)
            }
        } catch (cleanupError) {
            console.error("Cleanup failed:", cleanupError.message)
        }
        process.exit(1)
    }
}

main().catch(console.error)