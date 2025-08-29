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
    console.log("✓ Air running in standalone mode")
}

/**
 * Write process PID for Stacker framework
 */
function writePidFile(): void {
    try {
        fs.writeFileSync(PID_FILE, process.pid.toString())
        console.log(`✓ PID file written: ${PID_FILE}`)
        
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
    
    console.log("")
    console.log("==============================================")
    console.log("  Air Distributed P2P Database v2.1.0")
    console.log(`  ${isStackerEnabled ? "Stacker-Powered" : "Standalone Mode"}`)
    console.log("==============================================")
    console.log("")
    console.log(`🌐 Network: ${cfg.host}:${cfg.port}`)
    console.log(`⚙️  Environment: ${cfg.env}`)
    console.log(`📁 Config: ${config.file}`)
    
    if (isStackerEnabled) {
        const stackerConfig = config.getStackerConfig()
        console.log(`🔧 Stacker: Enabled (${stackerConfig.serviceMode})`)
        console.log(`📊 Monitoring: ${stackerConfig.monitoringEnabled ? "Enabled" : "Disabled"}`)
        
        if (stackerConfig.autoUpdate) {
            console.log(`🔄 Auto-update: Every ${stackerConfig.updateInterval} minutes`)
        }
    }
    
    console.log("")
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
        console.log("🚀 Starting Air P2P database...")
        await db.start()
        
        console.log("✅ Air P2P database started successfully")
        
        // Register success with Stacker if available
        if (StackerUtils.isAvailable() && config.isStackerEnabled()) {
            console.log("📡 Air running under Stacker framework supervision")
        }
        
    } catch (error) {
        console.error("❌ Failed to start Air:", error)
        process.exit(1)
    }
}

main().catch(console.error)