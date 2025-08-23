/**
 * Fixed Config Mocks for All Test Scenarios
 * Provides complete, valid config objects for all test modules
 */
export const mockEnvironmentConfig = {
    port: 8765,
    domain: 'test.example.com',
    ssl: {
        cert: '/tmp/test-cert.pem',
        key: '/tmp/test-key.pem'
    },
    peers: ['peer1.test.com:8765', 'peer2.test.com:8765'],
    pair: {
        pub: 'mock-public-key',
        priv: 'mock-private-key'
    },
    godaddy: {
        apiKey: 'mock-api-key',
        apiSecret: 'mock-api-secret',
        domains: ['test.example.com']
    }
};
export const mockConfig = {
    name: 'test-air',
    env: 'development',
    root: '/tmp/air-test',
    bash: '/bin/bash',
    sync: 'test-sync-key',
    development: mockEnvironmentConfig,
    production: {
        ...mockEnvironmentConfig,
        port: 8766,
        domain: 'prod.example.com'
    }
};
export const mockDDNSConfig = {
    ...mockConfig,
    config: mockEnvironmentConfig // For DDNS methods that expect this.config
};
export const mockInstallerConfig = {
    ...mockConfig,
    // For installer methods
};
export const mockPeerConfig = {
    ...mockConfig,
    // For peer methods
};
export const mockPlatformConfig = {
    name: 'test-platform',
    root: '/tmp/platform-test',
    env: 'development'
};
// Helper function to create deep copies
export function createMockConfig(overrides = {}) {
    return {
        ...mockConfig,
        ...overrides,
        development: {
            ...mockConfig.development,
            ...(overrides.development || {})
        },
        production: {
            ...mockConfig.production,
            ...(overrides.production || {})
        }
    };
}
//# sourceMappingURL=config-mocks-fixed.js.map