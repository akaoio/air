/**
 * Platform Detection and Factory
 * Automatically selects the appropriate platform strategy
 */
import { execSync } from 'child_process';
import { LinuxSystemdStrategy } from './LinuxSystemd/index.js';
import { WindowsStrategy } from './Windows/index.js';
export class Platform {
    static instance = null;
    strategy;
    constructor() {
        this.strategy = this.detectAndCreateStrategy();
    }
    /**
     * Singleton pattern - ensures one platform strategy per process
     */
    static getInstance() {
        if (!Platform.instance) {
            Platform.instance = new Platform();
        }
        return Platform.instance;
    }
    /**
     * Detects the current platform and creates appropriate strategy
     */
    detectAndCreateStrategy() {
        const platform = process.platform;
        switch (platform) {
            case 'linux':
                return this.createLinuxStrategy();
            case 'win32':
                return new WindowsStrategy();
            case 'darwin':
                // TODO: Implement MacOSStrategy
                // return new MacOSStrategy()
                return this.createGenericUnixStrategy();
            case 'freebsd':
            case 'openbsd':
            case 'sunos':
            case 'aix':
                return this.createGenericUnixStrategy();
            default:
                console.warn(`Unknown platform: ${platform}, using generic Unix strategy`);
                return this.createGenericUnixStrategy();
        }
    }
    /**
     * Creates Linux strategy based on init system
     */
    createLinuxStrategy() {
        // Check for various init systems
        if (this.hasSystemd()) {
            return new LinuxSystemdStrategy();
        }
        // TODO: Add more Linux init systems
        // if (this.hasUpstart()) return new LinuxUpstartStrategy()
        // if (this.hasOpenRC()) return new LinuxOpenRCStrategy()
        // if (this.hasSysV()) return new LinuxSysVStrategy()
        // Fallback to generic Unix
        return this.createGenericUnixStrategy();
    }
    /**
     * Creates generic Unix strategy (fallback)
     */
    createGenericUnixStrategy() {
        // TODO: Implement GenericUnixStrategy
        // For now, return LinuxSystemd as fallback
        // return new GenericUnixStrategy()
        console.warn('Using LinuxSystemdStrategy as fallback - GenericUnixStrategy not yet implemented');
        return new LinuxSystemdStrategy();
    }
    /**
     * Checks if systemd is available
     */
    hasSystemd() {
        try {
            execSync('which systemctl', { stdio: 'ignore' });
            // Also check if systemd is actually running
            execSync('systemctl --version', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get the current platform strategy
     */
    getStrategy() {
        return this.strategy;
    }
    /**
     * Get platform name
     */
    getName() {
        return this.strategy.getName();
    }
    /**
     * Force a specific strategy (useful for testing)
     */
    setStrategy(strategy) {
        this.strategy = strategy;
    }
    /**
     * Export all methods from strategy for convenience
     */
    async createService(config) {
        return this.strategy.createService(config);
    }
    async startService(name) {
        return this.strategy.startService(name);
    }
    async stopService(name) {
        return this.strategy.stopService(name);
    }
    async removeService(name) {
        return this.strategy.removeService(name);
    }
    async getServiceStatus(name) {
        return this.strategy.getServiceStatus(name);
    }
    async setupSSL(config) {
        return this.strategy.setupSSL(config);
    }
    getPaths() {
        return this.strategy.getPaths();
    }
    getCapabilities() {
        return this.strategy.getCapabilities();
    }
}
// Export types
export * from './types.js';
// Export strategies for direct use if needed
export { LinuxSystemdStrategy } from './LinuxSystemd/index.js';
export { WindowsStrategy } from './Windows/index.js';
// Export singleton instance
export default Platform.getInstance();
//# sourceMappingURL=index.js.map