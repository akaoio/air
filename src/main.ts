/**
 * @akaoio/air - Main Server Entry Point
 * Manager-integrated P2P Database System
 */

import { db } from "./db.js"
import { manager, ManagerUtils } from "./manager.js"
import { config } from "./config.js"
import { PID_FILE } from "./xdg-paths.js"
import fs from "fs"

/**
 * Initialize Manager integration if available
 */
async function initializeManager(): Promise<void> {
    if (ManagerUtils.isAvailable()) {
        console.log("🔧 Manager framework detected - initializing integration...")
        
        try {
            await ManagerUtils.safeInit()
            const managerConfig = manager.getManagerConfig()
            console.log(`✓ Air integrated with Manager framework`)
            console.log(`  Config: ${managerConfig.configDir}`)
            console.log(`  Data: ${managerConfig.dataDir}`)
            console.log(`  State: ${managerConfig.stateDir}`)
        } catch (error) {
            console.warn("Manager integration failed:", error)
        }
    }
}

/**
 * Write process PID for Manager framework
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
 * Log startup information with Manager awareness
 */
function logStartupInfo(): void {
    const cfg = config.load()
    const isManagerEnabled = config.isManagerEnabled()
    
    console.log("")
    console.log("==============================================")
    console.log("  Air Distributed P2P Database v2.1.0")
    console.log(`  ${isManagerEnabled ? "Manager-Powered" : "Standalone Mode"}`)
    console.log("==============================================")
    console.log("")
    console.log(`🌐 Network: ${cfg.host}:${cfg.port}`)
    console.log(`⚙️  Environment: ${cfg.env}`)
    console.log(`📁 Config: ${config.file}`)
    
    if (isManagerEnabled) {
        const managerConfig = config.getManagerConfig()
        console.log(`🔧 Manager: Enabled (${managerConfig.serviceMode})`)
        console.log(`📊 Monitoring: ${managerConfig.monitoringEnabled ? "Enabled" : "Disabled"}`)
        
        if (managerConfig.autoUpdate) {
            console.log(`🔄 Auto-update: Every ${managerConfig.updateInterval} minutes`)
        }
    }
    
    console.log("")
}

/**
 * Main Air server entry point with Manager integration
 */
const main = async () => {
    try {
        // Initialize Manager framework integration
        await initializeManager()
        
        // Write PID file for process management
        writePidFile()
        
        // Log startup information
        logStartupInfo()
        
        // Start the Air P2P database
        console.log("🚀 Starting Air P2P database...")
        await db.start()
        
        console.log("✅ Air P2P database started successfully")
        
        // Register success with Manager if available
        if (ManagerUtils.isAvailable() && config.isManagerEnabled()) {
            console.log("📡 Air running under Manager framework supervision")
        }
        
    } catch (error) {
        console.error("❌ Failed to start Air:", error)
        process.exit(1)
    }
}

main().catch(console.error)