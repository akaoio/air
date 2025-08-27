/**
 * @akaoio/air - Manager Framework Integration
 * 
 * TypeScript interface to the cortex Manager shell framework
 * Provides system management capabilities for Air's distributed P2P system
 * 
 * Following Access's pattern: Shell foundation with TypeScript coordination
 */

import { execSync, spawn, ChildProcess } from "child_process"
import fs from "fs"
import path from "path"
import { AIR_CONFIG_DIR, AIR_DATA_DIR, AIR_STATE_DIR } from "./xdg-paths.js"

/**
 * Manager Framework Interface
 * Bridges shell-based Manager with TypeScript Air system
 */
export class ManagerFramework {
    private managerPath: string
    private initialized: boolean = false
    
    constructor() {
        // Locate Manager framework
        this.managerPath = this.findManagerPath()
        
        if (!this.managerPath) {
            throw new Error("Manager framework not found. Please ensure Manager is available.")
        }
    }
    
    /**
     * Find Manager framework location
     */
    private findManagerPath(): string {
        const possiblePaths = [
            path.join(process.cwd(), "manager"),
            path.join(__dirname, "..", "manager"),
            path.join(process.env.HOME || "", "manager"),
            "/usr/local/lib/manager"
        ]
        
        for (const managerPath of possiblePaths) {
            if (fs.existsSync(path.join(managerPath, "manager.sh"))) {
                return managerPath
            }
        }
        
        return ""
    }
    
    /**
     * Initialize Manager for Air
     */
    async init(): Promise<void> {
        if (this.initialized) return
        
        try {
            // Source Manager framework and initialize for Air
            const initScript = `
                source "${this.managerPath}/manager.sh"
                manager_init "air" \\
                    "https://github.com/akaoio/air.git" \\
                    "air" \\
                    "Distributed P2P Database System"
            `
            
            execSync(initScript, { 
                shell: true,
                cwd: process.cwd(),
                stdio: 'inherit'
            })
            
            this.initialized = true
            console.log("✓ Manager framework initialized for Air")
            
        } catch (error) {
            console.error("Failed to initialize Manager framework:", error)
            throw error
        }
    }
    
    /**
     * Install Air using Manager framework
     * Handles systemd service, cron jobs, auto-updates
     */
    async install(options: {
        service?: boolean
        cron?: boolean
        autoUpdate?: boolean
        interval?: number
        port?: number
        redundant?: boolean
    } = {}): Promise<void> {
        await this.init()
        
        // Build installation arguments
        const args: string[] = []
        
        if (options.service || options.redundant) args.push("--service")
        if (options.cron || options.redundant) {
            args.push("--cron")
            if (options.interval) args.push(`--interval=${options.interval}`)
        }
        if (options.autoUpdate) args.push("--auto-update")
        if (options.port) args.push(`--port=${options.port}`)
        
        // Default to service mode for P2P reliability
        if (!options.service && !options.cron && !options.redundant) {
            args.push("--service")
        }
        
        const installScript = `
            source "${this.managerPath}/manager.sh"
            manager_install ${args.join(" ")}
        `
        
        try {
            execSync(installScript, {
                shell: true,
                cwd: process.cwd(),
                stdio: 'inherit'
            })
            
            console.log("✓ Air installed using Manager framework")
            
        } catch (error) {
            console.error("Air installation failed:", error)
            throw error
        }
    }
    
    /**
     * Start Air service using Manager
     */
    async startService(): Promise<void> {
        await this.init()
        
        const script = `
            source "${this.managerPath}/manager.sh"
            manager_service_start "air"
        `
        
        execSync(script, { shell: true, stdio: 'inherit' })
    }
    
    /**
     * Stop Air service using Manager
     */
    async stopService(): Promise<void> {
        await this.init()
        
        const script = `
            source "${this.managerPath}/manager.sh"
            manager_service_stop "air"
        `
        
        execSync(script, { shell: true, stdio: 'inherit' })
    }
    
    /**
     * Get service status using Manager
     */
    async serviceStatus(): Promise<string> {
        await this.init()
        
        const script = `
            source "${this.managerPath}/manager.sh"
            manager_service_status "air"
        `
        
        try {
            return execSync(script, { shell: true, encoding: 'utf8' }).trim()
        } catch (error) {
            return "Service not found or not running"
        }
    }
    
    /**
     * Auto-update Air using Manager
     */
    async autoUpdate(): Promise<void> {
        await this.init()
        
        const script = `
            source "${this.managerPath}/manager.sh"
            manager_update "air"
        `
        
        execSync(script, { shell: true, stdio: 'inherit' })
    }
    
    /**
     * Setup Manager-based monitoring for Air P2P network
     */
    async setupNetworkMonitoring(): Promise<void> {
        await this.init()
        
        // Create Air network monitoring script
        const monitorScript = `#!/bin/sh
# Air Network Monitor - Manager Framework Integration
# Monitors P2P network health and peer connectivity

source "${this.managerPath}/manager.sh"

# Check if Air is running
if ! pgrep -f "air" > /dev/null; then
    manager_warn "Air process not running - attempting restart"
    manager_service_restart "air"
    exit 1
fi

# Check port connectivity
PORT=\${AIR_PORT:-8765}
if ! netstat -ln | grep ":$PORT" > /dev/null 2>&1; then
    manager_error "Air port $PORT not listening"
    exit 1
fi

# Check peer connections (basic connectivity)
PEERS=\$(curl -s http://localhost:$PORT/peers 2>/dev/null | wc -l || echo "0")
if [ "$PEERS" -lt 1 ]; then
    manager_warn "No peer connections detected"
fi

manager_log "Air network healthy - $PEERS peer connections"
`
        
        const monitorPath = path.join(AIR_DATA_DIR, "air-network-monitor")
        fs.writeFileSync(monitorPath, monitorScript, { mode: 0o755 })
        
        // Setup cron job for network monitoring
        const cronScript = `
            source "${this.managerPath}/manager.sh"
            manager_cron_add "*/5 * * * *" "${monitorPath}" "Air Network Monitor"
        `
        
        execSync(cronScript, { shell: true, stdio: 'inherit' })
        console.log("✓ Air network monitoring setup complete")
    }
    
    /**
     * Get Manager configuration for Air
     */
    getManagerConfig(): any {
        return {
            name: "air",
            description: "Distributed P2P Database System",
            repository: "https://github.com/akaoio/air.git",
            executable: "air",
            port: 8765,
            configDir: AIR_CONFIG_DIR,
            dataDir: AIR_DATA_DIR,
            stateDir: AIR_STATE_DIR,
            managerPath: this.managerPath,
            initialized: this.initialized
        }
    }
    
    /**
     * Validate Manager framework availability
     */
    static validate(): boolean {
        const managerPath = new ManagerFramework().managerPath
        return fs.existsSync(path.join(managerPath, "manager.sh"))
    }
    
    /**
     * Get Manager version info
     */
    async getVersion(): Promise<string> {
        const script = `
            source "${this.managerPath}/manager.sh"
            manager_version
        `
        
        try {
            return execSync(script, { shell: true, encoding: 'utf8' }).trim()
        } catch (error) {
            return "Manager version unknown"
        }
    }
}

/**
 * Singleton Manager instance
 */
export const manager = new ManagerFramework()

/**
 * Manager integration utilities for Air
 */
export const ManagerUtils = {
    /**
     * Check if Manager is available
     */
    isAvailable(): boolean {
        return ManagerFramework.validate()
    },
    
    /**
     * Initialize Manager for Air with error handling
     */
    async safeInit(): Promise<boolean> {
        try {
            await manager.init()
            return true
        } catch (error) {
            console.warn("Manager framework not available:", error)
            return false
        }
    },
    
    /**
     * Install Air with Manager if available, fallback otherwise
     */
    async install(options: any = {}): Promise<void> {
        if (await this.safeInit()) {
            await manager.install(options)
        } else {
            console.log("Installing Air without Manager framework")
            // Fallback installation logic would go here
        }
    }
}

/**
 * Export types for TypeScript integration
 */
export interface ManagerInstallOptions {
    service?: boolean
    cron?: boolean
    autoUpdate?: boolean
    interval?: number
    port?: number
    redundant?: boolean
}

export interface ManagerConfig {
    name: string
    description: string
    repository: string
    executable: string
    port: number
    configDir: string
    dataDir: string
    stateDir: string
    managerPath: string
    initialized: boolean
}