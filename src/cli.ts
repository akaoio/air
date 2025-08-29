#!/usr/bin/env node
/**
 * @akaoio/air - Command Line Interface with Stacker Integration
 * 
 * Provides CLI commands for Air management, including Stacker framework features
 */

import { stacker, StackerUtils } from "./stacker.js"
import { config, enableStackerIntegration, disableStackerIntegration, isStackerEnabled } from "./config.js"
import { db } from "./db.js"

// CLI Command interface
interface CLICommand {
    name: string
    description: string
    handler: (args: string[]) => Promise<void>
}

// Available commands
const commands: CLICommand[] = [
    {
        name: "start",
        description: "Start Air P2P database server",
        handler: async (args) => {
            console.log("🚀 Starting Air P2P database...")
            await db.start()
            console.log("✅ Air database started successfully")
        }
    },
    {
        name: "config",
        description: "Show current configuration",
        handler: async (args) => {
            const cfg = config.load()
            console.log("📋 Air Configuration:")
            console.log(JSON.stringify(cfg, null, 2))
        }
    },
    {
        name: "stacker:enable",
        description: "Enable Stacker framework integration",
        handler: async (args) => {
            if (!StackerUtils.isAvailable()) {
                console.error("❌ Stacker framework not available")
                console.log("Install Stacker first: npm run install:stacker")
                return
            }
            
            const options: any = {}
            
            // Parse options
            for (const arg of args) {
                if (arg === "--auto-update") options.autoUpdate = true
                if (arg === "--service") options.serviceMode = 'systemd'
                if (arg === "--cron") options.serviceMode = 'cron'
                if (arg === "--redundant") options.serviceMode = 'redundant'
                if (arg === "--no-monitoring") options.monitoringEnabled = false
                if (arg.startsWith("--interval=")) {
                    options.updateInterval = parseInt(arg.split("=")[1])
                }
            }
            
            await enableStackerIntegration(options)
            console.log("✅ Stacker integration enabled")
        }
    },
    {
        name: "stacker:disable",
        description: "Disable Stacker framework integration",
        handler: async (args) => {
            disableStackerIntegration()
            console.log("✅ Stacker integration disabled")
        }
    },
    {
        name: "stacker:status",
        description: "Show Stacker framework status",
        handler: async (args) => {
            console.log("🔧 Stacker Framework Status:")
            console.log("Available:", StackerUtils.isAvailable())
            console.log("Enabled:", isStackerEnabled())
            
            if (StackerUtils.isAvailable()) {
                try {
                    const version = await stacker.getVersion()
                    console.log("Version:", version)
                    
                    const stackerConfig = stacker.getStackerConfig()
                    console.log("Configuration:", JSON.stringify(stackerConfig, null, 2))
                } catch (error) {
                    console.warn("Could not get Stacker details:", error)
                }
            }
        }
    },
    {
        name: "stacker:install",
        description: "Install Air using Stacker framework",
        handler: async (args) => {
            if (!StackerUtils.isAvailable()) {
                console.error("❌ Stacker framework not available")
                return
            }
            
            const options: any = {}
            
            // Parse options
            for (const arg of args) {
                if (arg === "--service") options.service = true
                if (arg === "--cron") options.cron = true
                if (arg === "--redundant") options.redundant = true
                if (arg === "--auto-update") options.autoUpdate = true
                if (arg.startsWith("--port=")) {
                    options.port = parseInt(arg.split("=")[1])
                }
                if (arg.startsWith("--interval=")) {
                    options.interval = parseInt(arg.split("=")[1])
                }
            }
            
            console.log("🔧 Installing Air with Stacker framework...")
            await stacker.install(options)
            console.log("✅ Air installation completed")
        }
    },
    {
        name: "stacker:service:start",
        description: "Start Air service via Stacker",
        handler: async (args) => {
            if (!isStackerEnabled()) {
                console.error("❌ Stacker integration not enabled")
                return
            }
            
            await stacker.startService()
            console.log("✅ Air service started")
        }
    },
    {
        name: "stacker:service:stop", 
        description: "Stop Air service via Stacker",
        handler: async (args) => {
            if (!isStackerEnabled()) {
                console.error("❌ Stacker integration not enabled")
                return
            }
            
            await stacker.stopService()
            console.log("✅ Air service stopped")
        }
    },
    {
        name: "stacker:service:status",
        description: "Check Air service status via Stacker",
        handler: async (args) => {
            if (!isStackerEnabled()) {
                console.error("❌ Stacker integration not enabled")
                return
            }
            
            const status = await stacker.serviceStatus()
            console.log("🔍 Service Status:", status)
        }
    },
    {
        name: "stacker:monitor",
        description: "Setup network monitoring via Stacker",
        handler: async (args) => {
            if (!isStackerEnabled()) {
                console.error("❌ Stacker integration not enabled")
                return
            }
            
            await stacker.setupNetworkMonitoring()
            console.log("✅ Network monitoring setup completed")
        }
    },
    {
        name: "stacker:update",
        description: "Update Air via Stacker framework",
        handler: async (args) => {
            if (!isStackerEnabled()) {
                console.error("❌ Stacker integration not enabled")
                return
            }
            
            await stacker.autoUpdate()
            console.log("✅ Air update completed")
        }
    },
    {
        name: "help",
        description: "Show available commands",
        handler: async (args) => {
            console.log("🌟 Air P2P Database CLI with Stacker Integration\n")
            console.log("Available commands:")
            
            const maxNameLength = Math.max(...commands.map(cmd => cmd.name.length))
            
            for (const cmd of commands) {
                const paddedName = cmd.name.padEnd(maxNameLength)
                console.log(`  ${paddedName}  ${cmd.description}`)
            }
            
            console.log("\nStacker Integration:")
            console.log("  Air integrates with the Stacker framework for system management")
            console.log("  Use 'stacker:*' commands for Stacker-specific functionality")
            console.log("  Install: npm run install:stacker")
            console.log("\nExamples:")
            console.log("  air start                          # Start Air server")
            console.log("  air stacker:enable --auto-update  # Enable Stacker with auto-updates")
            console.log("  air stacker:install --redundant   # Install with systemd + cron")
            console.log("  air stacker:service:status         # Check service status")
            console.log("  air scan                      # Show peer scan status")
            console.log("  air scan start                # Start peer scan")
        }
    },
    {
        name: "scan",
        description: "Domain-agnostic P2P peer scan system",
        handler: async (args) => {
            const { Peer } = await import("./peer.js")
            const peer = new Peer()
            
            const subcommand = args[0] || "status"
            
            switch (subcommand) {
                case "status":
                    console.log("🌍 Air Domain-Agnostic Peer Scan")
                    peer.showPeerStatus()
                    break
                    
                case "start":
                    console.log("🚀 Starting peer scan...")
                    await peer.startPeerScan()
                    console.log("✅ Peer scan started")
                    break
                    
                case "global":
                    console.log("🌐 Configuring for global DHT scan...")
                    // Configure for DHT-based global scan
                    process.env.AIR_MULTICAST_ENABLED = 'false'
                    process.env.AIR_DHT_ENABLED = 'true'
                    process.env.AIR_DNS_ENABLED = 'false'
                    await peer.startPeerScan()
                    console.log("✅ Global scan configured")
                    break
                    
                case "local":
                    console.log("🏠 Configuring for local network scan...")
                    // Configure for multicast local scan
                    process.env.AIR_MULTICAST_ENABLED = 'true'
                    process.env.AIR_DHT_ENABLED = 'false'
                    process.env.AIR_DNS_ENABLED = 'false'
                    await peer.startPeerScan()
                    console.log("✅ Local scan configured")
                    break
                    
                case "add":
                    const peerAddr = args[1]
                    if (!peerAddr) {
                        console.error("❌ Peer address required: air scan add <host:port>")
                        return
                    }
                    console.log(`🔗 Adding manual peer: ${peerAddr}`)
                    await peer.addScannedPeer(peerAddr)
                    console.log("✅ Peer added successfully")
                    break
                    
                default:
                    console.log("Air Scan Commands:")
                    console.log("  scan [status]     Show current scan status")
                    console.log("  scan start        Start peer scan")
                    console.log("  scan global       Configure for global DHT scan") 
                    console.log("  scan local        Configure for local network scan")
                    console.log("  scan add HOST:PORT Add manual peer")
                    console.log("\nAir is designed for the world - domain-agnostic P2P scan")
                    break
            }
        }
    }
]

// Main CLI handler
async function main() {
    const args = process.argv.slice(2)
    
    if (args.length === 0) {
        await commands.find(cmd => cmd.name === "help")?.handler([])
        return
    }
    
    const commandName = args[0]
    const commandArgs = args.slice(1)
    
    const command = commands.find(cmd => cmd.name === commandName)
    
    if (!command) {
        console.error(`❌ Unknown command: ${commandName}`)
        console.log("Run 'air help' to see available commands")
        process.exit(1)
    }
    
    try {
        await command.handler(commandArgs)
    } catch (error) {
        console.error(`❌ Command failed: ${error}`)
        process.exit(1)
    }
}

// Handle CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error)
}

export { commands, main }