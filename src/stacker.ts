/**
 * @akaoio/air - Stacker Framework Integration (v0.0.1)
 * 
 * Updated to use the published @akaoio/stacker npm package
 * Features hybrid TypeScript + Shell architecture with multi-format support
 * Provides system management capabilities for Air's distributed P2P system
 */

// Using @akaoio/stacker from workspace
import type { StackerInstallOptions, StackerConfig } from "@akaoio/stacker"
import { Stacker, StackerUtils as OriginalStackerUtils, stacker as stackerInstance } from "@akaoio/stacker"
import { AIR_CONFIG_DIR, AIR_DATA_DIR, AIR_STATE_DIR } from "./xdg-paths.js"
import fs from "fs"
import path from "path"

/**
 * Air-specific Stacker Framework Wrapper
 * Uses the published @akaoio/stacker npm package for all operations
 */
export class StackerFramework {
    private stacker: Stacker
    private initialized: boolean = false
    private version: string = "0.0.1"
    
    constructor() {
        // Use the published @akaoio/stacker package
        try {
            this.stacker = new Stacker()
        } catch (error) {
            throw new Error("@akaoio/stacker package not installed. Run: npm install @akaoio/stacker")
        }
    }
    
    /**
     * Check if Stacker is available
     */
    isAvailable(): boolean {
        return Stacker.isAvailable()
    }
    
    /**
     * Initialize Stacker for Air
     */
    async init(): Promise<void> {
        if (this.initialized) return
        
        try {
            await this.stacker.init({
                name: "air",
                repository: "https://github.com/akaoio/air.git",
                executable: "air",
                description: "Distributed P2P Database System",
                serviceType: "forking",
                pidFile: "/home/x/.local/state/air/air.pid"
            })
            
            this.initialized = true
            
        } catch (error) {
            console.error("Failed to initialize Stacker:", error)
            throw error
        }
    }
    
    /**
     * Install Air using Stacker framework
     */
    async install(options: StackerInstallOptions = {}): Promise<void> {
        await this.init()
        
        try {
            // Set service configuration for Air's forking behavior
            process.env.STACKER_SERVICE_TYPE = "forking"
            process.env.STACKER_PID_FILE = "/home/x/.local/state/air/air.pid"
            
            await this.stacker.install(options)
            
        } catch (error) {
            console.error("Air installation failed:", error)
            throw error
        }
    }
    
    /**
     * Service management using Stacker
     */
    async startService(): Promise<void> {
        await this.init()
        await this.stacker.service("start")
    }
    
    async stopService(): Promise<void> {
        await this.init()
        await this.stacker.service("stop")
    }
    
    async serviceStatus(): Promise<string> {
        await this.init()
        try {
            return await this.stacker.service("status")
        } catch (error) {
            return "Service not found or not running"
        }
    }
    
    /**
     * Auto-update Air using Stacker
     */
    async autoUpdate(): Promise<void> {
        await this.init()
        await this.stacker.update()
    }
    
    /**
     * Setup network monitoring (simplified without shell scripts)
     */
    async setupNetworkMonitoring(): Promise<void> {
        await this.init()
    }
    
    /**
     * Get Stacker configuration for Air
     */
    getStackerConfig(): StackerConfig {
        return {
            name: "air",
            description: "Distributed P2P Database System",
            repository: "https://github.com/akaoio/air.git",
            executable: "air",
            version: this.version,
            configDir: AIR_CONFIG_DIR,
            dataDir: AIR_DATA_DIR,
            stackerPath: "/usr/local/bin/stacker" // Will be resolved by @akaoio/stacker package
        }
    }
    
    /**
     * Validate Stacker framework availability
     */
    static validate(): boolean {
        return Stacker.isAvailable()
    }
    
    /**
     * Get Stacker version info
     */
    async getVersion(): Promise<string> {
        try {
            return await this.stacker.version()
        } catch (error) {
            return this.version
        }
    }
    
    /**
     * Use Stacker CLI interface directly
     */
    async exec(command: string, args: string[] = []): Promise<string> {
        await this.init()
        return await this.stacker.exec(command, args)
    }
    
    /**
     * Health check with Stacker diagnostics
     */
    async healthCheck(verbose: boolean = false): Promise<any> {
        await this.init()
        return await this.stacker.health(verbose)
    }
}

/**
 * Singleton Stacker instance
 */
export const manager = new StackerFramework()

/**
 * Enhanced StackerUtils with isAvailable method
 */
export const StackerUtils = {
    ...OriginalStackerUtils,
    isAvailable: () => Stacker.isAvailable(),
    getVersion: () => Stacker.getVersion()
}

/**
 * Export the singleton stacker instance
 */
export const stacker = stackerInstance

/**
 * Re-export types from @akaoio/stacker for compatibility
 */
export type { StackerInstallOptions, StackerConfig }