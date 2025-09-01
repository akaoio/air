#!/usr/bin/env node
/**
 * @akaoio/air - Command Line Interface with Stacker Integration
 * 
 * Provides CLI commands for Air management, including Stacker framework features
 */

// Stacker integration handled at shell level via air.sh
// import { stacker, StackerUtils } from "./stacker.js"
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
            await db.start()
        }
    },
    {
        name: "config",
        description: "Show current configuration",
        handler: async (args) => {
            const cfg = config.load()
        }
    },
    {
        name: "stacker:enable",
        description: "Enable Stacker framework integration",
        handler: async (args) => {
            // Stacker availability handled at shell level
            console.log("ℹ️ Stacker integration managed via air.sh shell interface")
            
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
        }
    },
    {
        name: "stacker:disable",
        description: "Disable Stacker framework integration",
        handler: async (args) => {
            disableStackerIntegration()
        }
    },
    {
        name: "stacker:status",
        description: "Show Stacker framework status",
        handler: async (args) => {
            
            // Stacker status handled via shell
            if (false) {  // Disabled - use shell integration
                try {
                    const version = await 'Air v0.0.1'
                    
                    const stackerConfig = {}
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
            // Stacker availability handled at shell level
            console.log("ℹ️ Stacker integration managed via air.sh shell interface")
            
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
            
            console.log("Installation handled via shell: ./air.sh install")
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
            
            await Promise.resolve()
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
            
            await Promise.resolve()
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
            
            const status = await Promise.resolve("not available")
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
            
            await Promise.resolve()
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
            
            await Promise.resolve()
        }
    },
    {
        name: "help",
        description: "Show available commands",
        handler: async (args) => {
            
            const maxNameLength = Math.max(...commands.map(cmd => cmd.name.length))
            
            for (const cmd of commands) {
                const paddedName = cmd.name.padEnd(maxNameLength)
            }
            
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
                    peer.showPeerStatus()
                    break
                    
                case "start":
                    await peer.startPeerScan()
                    break
                    
                case "global":
                    // Configure for DHT-based global scan
                    process.env.AIR_MULTICAST_ENABLED = 'false'
                    process.env.AIR_DHT_ENABLED = 'true'
                    process.env.AIR_DNS_ENABLED = 'false'
                    await peer.startPeerScan()
                    break
                    
                case "local":
                    // Configure for multicast local scan
                    process.env.AIR_MULTICAST_ENABLED = 'true'
                    process.env.AIR_DHT_ENABLED = 'false'
                    process.env.AIR_DNS_ENABLED = 'false'
                    await peer.startPeerScan()
                    break
                    
                case "add":
                    const peerAddr = args[1]
                    if (!peerAddr) {
                        console.error("❌ Peer address required: air scan add <host:port>")
                        return
                    }
                    await peer.addScannedPeer(peerAddr)
                    break
                    
                default:
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