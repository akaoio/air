#!/usr/bin/env node
/**
 * @akaoio/air - Command Line Interface with Manager Integration
 * 
 * Provides CLI commands for Air management, including Manager framework features
 */

import { manager, ManagerUtils } from "./manager.js"
import { config, enableManagerIntegration, disableManagerIntegration, isManagerEnabled } from "./config.js"
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
        name: "manager:enable",
        description: "Enable Manager framework integration",
        handler: async (args) => {
            if (!ManagerUtils.isAvailable()) {
                console.error("❌ Manager framework not available")
                console.log("Install Manager first: npm run install:manager")
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
            
            await enableManagerIntegration(options)
            console.log("✅ Manager integration enabled")
        }
    },
    {
        name: "manager:disable",
        description: "Disable Manager framework integration",
        handler: async (args) => {
            disableManagerIntegration()
            console.log("✅ Manager integration disabled")
        }
    },
    {
        name: "manager:status",
        description: "Show Manager framework status",
        handler: async (args) => {
            console.log("🔧 Manager Framework Status:")
            console.log("Available:", ManagerUtils.isAvailable())
            console.log("Enabled:", isManagerEnabled())
            
            if (ManagerUtils.isAvailable()) {
                try {
                    const version = await manager.getVersion()
                    console.log("Version:", version)
                    
                    const managerConfig = manager.getManagerConfig()
                    console.log("Configuration:", JSON.stringify(managerConfig, null, 2))
                } catch (error) {
                    console.warn("Could not get Manager details:", error)
                }
            }
        }
    },
    {
        name: "manager:install",
        description: "Install Air using Manager framework",
        handler: async (args) => {
            if (!ManagerUtils.isAvailable()) {
                console.error("❌ Manager framework not available")
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
            
            console.log("🔧 Installing Air with Manager framework...")
            await manager.install(options)
            console.log("✅ Air installation completed")
        }
    },
    {
        name: "manager:service:start",
        description: "Start Air service via Manager",
        handler: async (args) => {
            if (!isManagerEnabled()) {
                console.error("❌ Manager integration not enabled")
                return
            }
            
            await manager.startService()
            console.log("✅ Air service started")
        }
    },
    {
        name: "manager:service:stop", 
        description: "Stop Air service via Manager",
        handler: async (args) => {
            if (!isManagerEnabled()) {
                console.error("❌ Manager integration not enabled")
                return
            }
            
            await manager.stopService()
            console.log("✅ Air service stopped")
        }
    },
    {
        name: "manager:service:status",
        description: "Check Air service status via Manager",
        handler: async (args) => {
            if (!isManagerEnabled()) {
                console.error("❌ Manager integration not enabled")
                return
            }
            
            const status = await manager.serviceStatus()
            console.log("🔍 Service Status:", status)
        }
    },
    {
        name: "manager:monitor",
        description: "Setup network monitoring via Manager",
        handler: async (args) => {
            if (!isManagerEnabled()) {
                console.error("❌ Manager integration not enabled")
                return
            }
            
            await manager.setupNetworkMonitoring()
            console.log("✅ Network monitoring setup completed")
        }
    },
    {
        name: "manager:update",
        description: "Update Air via Manager framework",
        handler: async (args) => {
            if (!isManagerEnabled()) {
                console.error("❌ Manager integration not enabled")
                return
            }
            
            await manager.autoUpdate()
            console.log("✅ Air update completed")
        }
    },
    {
        name: "help",
        description: "Show available commands",
        handler: async (args) => {
            console.log("🌟 Air P2P Database CLI with Manager Integration\n")
            console.log("Available commands:")
            
            const maxNameLength = Math.max(...commands.map(cmd => cmd.name.length))
            
            for (const cmd of commands) {
                const paddedName = cmd.name.padEnd(maxNameLength)
                console.log(`  ${paddedName}  ${cmd.description}`)
            }
            
            console.log("\nManager Integration:")
            console.log("  Air integrates with the Manager framework for system management")
            console.log("  Use 'manager:*' commands for Manager-specific functionality")
            console.log("  Install: npm run install:manager")
            console.log("\nExamples:")
            console.log("  air start                          # Start Air server")
            console.log("  air manager:enable --auto-update  # Enable Manager with auto-updates")
            console.log("  air manager:install --redundant   # Install with systemd + cron")
            console.log("  air manager:service:status         # Check service status")
            console.log("  air discovery                      # Show peer discovery status")
            console.log("  air discovery start                # Start peer discovery")
        }
    },
    {
        name: "discovery",
        description: "Domain-agnostic P2P peer discovery system",
        handler: async (args) => {
            const { Peer } = await import("./peer.js")
            const peer = new Peer()
            
            const subcommand = args[0] || "status"
            
            switch (subcommand) {
                case "status":
                    console.log("🌍 Air Domain-Agnostic Peer Discovery")
                    peer.showPeerStatus()
                    break
                    
                case "start":
                    console.log("🚀 Starting peer discovery...")
                    await peer.startPeerDiscovery()
                    console.log("✅ Peer discovery started")
                    break
                    
                case "global":
                    console.log("🌐 Configuring for global DHT discovery...")
                    // Configure for DHT-based global discovery
                    process.env.AIR_MULTICAST_ENABLED = 'false'
                    process.env.AIR_DHT_ENABLED = 'true'
                    process.env.AIR_DNS_ENABLED = 'false'
                    await peer.startPeerDiscovery()
                    console.log("✅ Global discovery configured")
                    break
                    
                case "local":
                    console.log("🏠 Configuring for local network discovery...")
                    // Configure for multicast local discovery
                    process.env.AIR_MULTICAST_ENABLED = 'true'
                    process.env.AIR_DHT_ENABLED = 'false'
                    process.env.AIR_DNS_ENABLED = 'false'
                    await peer.startPeerDiscovery()
                    console.log("✅ Local discovery configured")
                    break
                    
                case "add":
                    const peerAddr = args[1]
                    if (!peerAddr) {
                        console.error("❌ Peer address required: air discovery add <host:port>")
                        return
                    }
                    console.log(`🔗 Adding manual peer: ${peerAddr}`)
                    await peer.addDiscoveredPeer(peerAddr)
                    console.log("✅ Peer added successfully")
                    break
                    
                default:
                    console.log("Air Discovery Commands:")
                    console.log("  discovery [status]     Show current discovery status")
                    console.log("  discovery start        Start peer discovery")
                    console.log("  discovery global       Configure for global DHT discovery") 
                    console.log("  discovery local        Configure for local network discovery")
                    console.log("  discovery add HOST:PORT Add manual peer")
                    console.log("\nAir is designed for the world - domain-agnostic P2P discovery")
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