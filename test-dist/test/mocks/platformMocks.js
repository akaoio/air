/**
 * Platform Mocks for Testing
 */
/**
 * Mock Platform Strategy for testing
 */
export class MockPlatformStrategy {
    mockResults = {};
    constructor(mockResults) {
        if (mockResults) {
            this.mockResults = mockResults;
        }
    }
    async createService(config) {
        return this.mockResults.createService || {
            success: true,
            type: 'systemd',
            message: 'Mock service created'
        };
    }
    async startService(name) {
        return this.mockResults.startService || {
            started: true,
            pid: 12345,
            method: 'systemd'
        };
    }
    async stopService(name) {
        return this.mockResults.stopService ?? true;
    }
    async removeService(name) {
        return this.mockResults.removeService ?? true;
    }
    async getServiceStatus(name) {
        return this.mockResults.serviceStatus || 'running';
    }
    async setupSSL(config) {
        return this.mockResults.setupSSL || {
            success: true,
            keyPath: '/mock/ssl/key.pem',
            certPath: '/mock/ssl/cert.pem'
        };
    }
    getPaths() {
        return {
            serviceDir: '/mock/service',
            configDir: '/mock/config',
            logDir: '/mock/log',
            dataDir: '/mock/data',
            tempDir: '/mock/temp'
        };
    }
    getCapabilities() {
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
        };
    }
    getName() {
        return 'Mock Platform';
    }
}
/**
 * Mock Platform results for different scenarios
 */
export const platformMockResults = {
    success: {
        createService: { success: true, type: 'systemd' },
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
        startService: { started: true, method: 'spawn' }
    },
    windows: {
        createService: { success: true, type: 'windows-service' },
        startService: { started: true, method: 'windows-service' }
    }
};
//# sourceMappingURL=platformMocks.js.map