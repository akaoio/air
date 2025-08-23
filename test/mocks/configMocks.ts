/**
 * Configuration Mocks - Shared across all test suites
 * Provides consistent test data for Config and Manager testing
 */

import { DEFAULTS, IP_CONFIG, CONFIG_TEMPLATES } from '../../src/constants.js'
import type { AirConfig } from '../../src/types/index.js'

export const configMocks = {
    // Valid configurations
    valid: {
        basic: {
            root: '/tmp/test',
            bash: '/bin/bash',
            name: 'test-peer',
            env: 'development' as const,
            ip: IP_CONFIG,
            development: CONFIG_TEMPLATES.development,
            production: CONFIG_TEMPLATES.production
        } as AirConfig,
        
        production: {
            root: '/opt/air',
            bash: '/bin/bash',
            name: 'prod-peer',
            env: 'production' as const,
            ip: IP_CONFIG,
            development: CONFIG_TEMPLATES.development,
            production: {
                ...CONFIG_TEMPLATES.production,
                port: 443,
                domain: 'example.com',
                ssl: {
                    key: '/path/to/key.pem',
                    cert: '/path/to/cert.pem'
                },
                peers: ['wss://peer1.com/gun', 'wss://peer2.com/gun']
            }
        } as AirConfig,
        
        development: {
            root: '/tmp/dev',
            bash: '/bin/bash',
            name: 'dev-peer',
            env: 'development' as const,
            ip: {
                timeout: 5000,
                dnsTimeout: 3000,
                userAgent: 'Air/2.0.0',
                dns: [],
                http: []
            },
            development: {
                port: 8080,
                domain: 'dev.localhost',
                peers: []
            },
            production: {
                port: 8080,
                domain: 'dev.localhost',
                peers: []
            }
        } as AirConfig
    },
    
    // Invalid configurations
    invalid: {
        emptyName: {
            root: '/tmp/test',
            bash: '/bin/bash',
            name: '',
            env: 'development' as const,
            ip: { timeout: 5000, dnsTimeout: 3000, userAgent: 'Air/2.0.0', dns: [], http: [] },
            development: { port: 8765, domain: 'localhost', peers: [] },
            production: { port: 8765, domain: 'localhost', peers: [] }
        },
        
        invalidPort: {
            root: '/tmp/test',
            bash: '/bin/bash',
            name: 'test-peer',
            env: 'development' as const,
            ip: { timeout: 5000, dnsTimeout: 3000, userAgent: 'Air/2.0.0', dns: [], http: [] },
            development: { port: 'invalid' as any, domain: 'localhost', peers: [] },
            production: { port: 8765, domain: 'localhost', peers: [] }
        },
        
        missingName: {
            root: '/tmp/test',
            bash: '/bin/bash',
            env: 'development' as const,
            ip: { timeout: 5000, dnsTimeout: 3000, userAgent: 'Air/2.0.0', dns: [], http: [] },
            development: { port: 8765, domain: 'localhost', peers: [] },
            production: { port: 8765, domain: 'localhost', peers: [] }
        } as any,
        
        invalidPeers: {
            root: '/tmp/test',
            bash: '/bin/bash',
            name: 'test-peer',
            env: 'development' as const,
            ip: { timeout: 5000, dnsTimeout: 3000, userAgent: 'Air/2.0.0', dns: [], http: [] },
            development: { port: 8765, domain: 'localhost', peers: 'not-an-array' as any },
            production: { port: 8765, domain: 'localhost', peers: [] }
        }
    },
    
    // Edge cases
    edge: {
        empty: {},
        
        large: {
            root: '/tmp/test',
            bash: '/bin/bash',
            name: 'large-config',
            port: 8765,
            domain: 'localhost',
            largeData: 'x'.repeat(100000),
            peers: []
        } as AirConfig,
        
        specialChars: {
            root: '/tmp/test',
            bash: '/bin/bash',
            name: 'test-ñáme-üñïcödé',
            port: 8765,
            domain: 'localhost',
            description: '特殊文字テスト',
            peers: []
        } as AirConfig,
        
        deepNested: {
            root: '/tmp/test',
            bash: '/bin/bash',
            name: 'nested-test',
            port: 8765,
            domain: 'localhost',
            nested: {
                level1: {
                    level2: {
                        level3: {
                            value: 'deep'
                        }
                    }
                }
            }
        } as AirConfig
    },
    
    // Default configurations
    defaults: {
        base: {
            root: '/tmp/air',
            bash: '/bin/bash',
            name: 'air',
            env: 'development' as const,
            port: 8765,
            domain: 'localhost',
            peers: [],
            development: {
                port: 8765,
                domain: 'localhost',
                peers: []
            }
        } as AirConfig
    }
}

/**
 * Create a mock context for method testing
 */
export function createMockContext(overrides: any = {}) {
    return {
        name: 'test-peer',
        env: 'test',
        root: '/tmp/test',
        configPath: '/tmp/test/air.json',
        config: configMocks.valid.basic,
        ...overrides
    }
}

/**
 * Create corrupted JSON string for error testing
 */
export function createCorruptedJson(): string {
    return '{ "name": "test", invalid json here'
}

/**
 * Create mock file system operations
 */
export const fsMocks = {
    readSuccess: (content: any) => jest.fn().mockReturnValue(JSON.stringify(content)),
    readError: () => jest.fn().mockImplementation(() => {
        throw new Error('File not found')
    }),
    writeSuccess: () => jest.fn().mockReturnValue(undefined),
    writeError: () => jest.fn().mockImplementation(() => {
        throw new Error('Permission denied')
    }),
    existsTrue: () => jest.fn().mockReturnValue(true),
    existsFalse: () => jest.fn().mockReturnValue(false)
}