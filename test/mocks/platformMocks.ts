/**
 * Platform Mocks for Testing
 */

import type { 
    PlatformStrategy, 
    ServiceResult, 
    StartResult, 
    SSLResult,
    PlatformCapabilities,
    PlatformPaths 
} from '../../src/Platform/types.js'
import type { AirConfig } from '../../src/types/index.js'

/**
 * Mock Platform Strategy for testing
 */
export class MockPlatformStrategy implements PlatformStrategy {
    private mockResults: {
        createService?: ServiceResult
        startService?: StartResult
        setupSSL?: SSLResult
        stopService?: boolean
        removeService?: boolean
        serviceStatus?: 'running' | 'stopped' | 'unknown'
    } = {}
    
    constructor(mockResults?: any) {
        if (mockResults) {
            this.mockResults = mockResults
        }
    }
    
    async createService(config: AirConfig): Promise<ServiceResult> {
        return this.mockResults.createService || {
            success: true,
            type: 'systemd',
            message: 'Mock service created'
        }
    }
    
    async startService(name: string): Promise<StartResult> {
        return this.mockResults.startService || {
            started: true,
            pid: 12345,
            method: 'systemd'
        }
    }
    
    async stopService(name: string): Promise<boolean> {
        return this.mockResults.stopService ?? true
    }
    
    async removeService(name: string): Promise<boolean> {
        return this.mockResults.removeService ?? true
    }
    
    async getServiceStatus(name: string): Promise<'running' | 'stopped' | 'unknown'> {
        return this.mockResults.serviceStatus || 'running'
    }
    
    async setupSSL(config: AirConfig): Promise<SSLResult> {
        return this.mockResults.setupSSL || {
            success: true,
            keyPath: '/mock/ssl/key.pem',
            certPath: '/mock/ssl/cert.pem'
        }
    }
    
    getPaths(): PlatformPaths {
        return {
            serviceDir: '/mock/service',
            configDir: '/mock/config',
            logDir: '/mock/log',
            dataDir: '/mock/data',
            tempDir: '/mock/temp'
        }
    }
    
    getCapabilities(): PlatformCapabilities {
        return {
            platform: 'linux',
            hasSystemd: true,
            hasLaunchd: false,
            hasWindowsService: false,
            hasPM2: false,
            hasDocker: false,
            hasBun: false,
            hasNode: true,
            hasDeno: false,
            isRoot: false,
            canSudo: true
        }
    }
    
    getName(): string {
        return 'Mock Platform'
    }
}

/**
 * Mock Platform results for different scenarios
 */
export const platformMockResults = {
    success: {
        createService: { success: true, type: 'systemd' as const },
        startService: { started: true, pid: 12345 },
        setupSSL: { success: true, keyPath: '/ssl/key.pem', certPath: '/ssl/cert.pem' }
    },
    
    failure: {
        createService: { success: false, error: 'Permission denied' },
        startService: { started: false, error: 'Service not found' },
        setupSSL: { success: false, error: 'OpenSSL not available' }
    },
    
    noSystemd: {
        createService: { success: false, error: 'Systemd not available' },
        startService: { started: true, method: 'spawn' as const }
    },
    
    windows: {
        createService: { success: true, type: 'windows-service' as const },
        startService: { started: true, method: 'windows-service' as const }
    }
}