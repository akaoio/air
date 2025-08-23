/**
 * Platform Detection and Factory
 * Automatically selects the appropriate platform strategy
 */

import { execSync } from 'child_process'
import { LinuxSystemdStrategy } from './LinuxSystemd/index.js'
import { WindowsStrategy } from './Windows/index.js'
// Import other strategies when implemented
// import { MacOSStrategy } from './MacOS/index.js'
// import { GenericUnixStrategy } from './GenericUnix/index.js'

import type { PlatformStrategy } from './types.js'

export class Platform {
    private static instance: Platform | null = null
    private strategy: PlatformStrategy
    
    constructor() {
        this.strategy = this.detectAndCreateStrategy()
    }
    
    /**
     * Singleton pattern - ensures one platform strategy per process
     */
    static getInstance(): Platform {
        if (!Platform.instance) {
            Platform.instance = new Platform()
        }
        return Platform.instance
    }
    
    /**
     * Detects the current platform and creates appropriate strategy
     */
    private detectAndCreateStrategy(): PlatformStrategy {
        const platform = process.platform
        
        switch (platform) {
            case 'linux':
                return this.createLinuxStrategy()
            
            case 'win32':
                return new WindowsStrategy()
            
            case 'darwin':
                // MacOS support uses generic Unix strategy for now
                return this.createGenericUnixStrategy()
            
            case 'freebsd':
            case 'openbsd':
            case 'sunos':
            case 'aix':
                return this.createGenericUnixStrategy()
            
            default:
                console.warn(`Unknown platform: ${platform}, using generic Unix strategy`)
                return this.createGenericUnixStrategy()
        }
    }
    
    /**
     * Creates Linux strategy based on init system
     */
    private createLinuxStrategy(): PlatformStrategy {
        // Check for various init systems
        if (this.hasSystemd()) {
            return new LinuxSystemdStrategy()
        }
        
        // Additional Linux init systems (Upstart, OpenRC, SysV) can be added here
        // Currently only systemd is supported
        
        // Fallback to generic Unix
        return this.createGenericUnixStrategy()
    }
    
    /**
     * Creates generic Unix strategy (fallback)
     */
    private createGenericUnixStrategy(): PlatformStrategy {
        // Uses LinuxSystemd strategy as it works on most Unix-like systems
        console.warn('Using LinuxSystemdStrategy as generic Unix fallback')
        return new LinuxSystemdStrategy()
    }
    
    /**
     * Checks if systemd is available
     */
    private hasSystemd(): boolean {
        try {
            execSync('which systemctl', { stdio: 'ignore' })
            // Also check if systemd is actually running
            execSync('systemctl --version', { stdio: 'ignore' })
            return true
        } catch {
            return false
        }
    }
    
    /**
     * Get the current platform strategy
     */
    getStrategy(): PlatformStrategy {
        return this.strategy
    }
    
    /**
     * Get platform name
     */
    getName(): string {
        return this.strategy.getName()
    }
    
    /**
     * Force a specific strategy (useful for testing)
     */
    setStrategy(strategy: PlatformStrategy): void {
        this.strategy = strategy
    }
    
    /**
     * Export all methods from strategy for convenience
     */
    async createService(config: any) {
        return this.strategy.createService(config)
    }
    
    async startService(name: string) {
        return this.strategy.startService(name)
    }
    
    async stopService(name: string) {
        return this.strategy.stopService(name)
    }
    
    async removeService(name: string) {
        return this.strategy.removeService(name)
    }
    
    async getServiceStatus(name: string) {
        return this.strategy.getServiceStatus(name)
    }
    
    async setupSSL(config: any) {
        return this.strategy.setupSSL(config)
    }
    
    getPaths() {
        return this.strategy.getPaths()
    }
    
    getCapabilities() {
        return this.strategy.getCapabilities()
    }
}

// Export types
export * from './types.js'

// Export strategies for direct use if needed
export { LinuxSystemdStrategy } from './LinuxSystemd/index.js'
export { WindowsStrategy } from './Windows/index.js'

// Export singleton instance
export default Platform.getInstance()