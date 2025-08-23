/**
 * Reporter Class Test Mocks - Services Phase
 * Comprehensive status reporting test data and utilities
 */

import type { ReporterOptions } from '../../src/Reporter/constructor.js'
import type { StatusState } from '../../src/Reporter/state.js'
import type { StatusInfo } from '../../src/Reporter/get.js'
import { ipResults } from './networkMocks.js'

// Reporter configuration options
export const reporterOptionMocks = {
    default: {
        interval: 60000,
        timeout: 30000,
        retries: 3
    } as ReporterOptions,
    custom: {
        interval: 30000,
        timeout: 15000,
        retries: 5
    } as ReporterOptions,
    minimal: {} as ReporterOptions,
    extreme: {
        interval: 1000,
        timeout: 5000,
        retries: 10
    } as ReporterOptions
}

// Status state mocks
export const statusStateMocks = {
    initial: {
        user: null,
        config: {},
        intervals: {
            alive: 60000,
            ip: 300000,
            ddns: 300000
        },
        timers: {
            alive: null,
            ip: null,
            ddns: null
        },
        lastStatus: {
            ip: null,
            alive: null,
            ddns: null
        }
    } as StatusState,
    authenticated: {
        user: {
            is: {
                pub: 'mock-pub-key'
            },
            get: jest.fn().mockReturnThis(),
            put: jest.fn()
        },
        config: {
            name: 'test-peer',
            env: 'test',
            version: '2.0.0',
            root: '/tmp/test',
            godaddy: {
                domain: 'example.com',
                host: '@',
                key: 'test-key',
                secret: 'test-secret'
            }
        },
        intervals: {
            alive: 60000,
            ip: 300000,
            ddns: 300000
        },
        timers: {
            alive: 'timer-alive' as any,
            ip: 'timer-ip' as any,
            ddns: 'timer-ddns' as any
        },
        lastStatus: {
            ip: {
                timestamp: Date.now(),
                ipv4: '1.2.3.4',
                ipv6: '2001:db8::1',
                primary: '1.2.3.4',
                hasIPv6: true,
                changed: false
            },
            alive: {
                timestamp: Date.now(),
                alive: true,
                name: 'test-peer',
                env: 'test',
                pid: process.pid,
                uptime: 3600,
                memory: {
                    rss: 50 * 1024 * 1024,
                    heapTotal: 40 * 1024 * 1024,
                    heapUsed: 30 * 1024 * 1024,
                    external: 1 * 1024 * 1024,
                    arrayBuffers: 0
                },
                version: '2.0.0'
            },
            ddns: {
                timestamp: Date.now(),
                domain: 'example.com',
                updates: [
                    { type: 'A', ip: '1.2.3.4', success: true, status: 200 },
                    { type: 'AAAA', ip: '2001:db8::1', success: true, status: 200 }
                ],
                success: true
            }
        }
    } as StatusState,
    unauthenticated: {
        user: null,
        config: {
            name: 'test-peer',
            env: 'test'
        },
        intervals: {
            alive: 60000,
            ip: 300000,
            ddns: 300000
        },
        timers: {
            alive: null,
            ip: null,
            ddns: null
        },
        lastStatus: {
            ip: null,
            alive: null,
            ddns: null
        }
    } as StatusState
}

// Status info mock data
export const statusInfoMocks = {
    allActive: {
        alive: statusStateMocks.authenticated.lastStatus.alive,
        ip: statusStateMocks.authenticated.lastStatus.ip,
        ddns: statusStateMocks.authenticated.lastStatus.ddns,
        timers: {
            alive: true,
            ip: true,
            ddns: true
        }
    } as StatusInfo,
    inactive: {
        alive: null,
        ip: null,
        ddns: null,
        timers: {
            alive: false,
            ip: false,
            ddns: false
        }
    } as StatusInfo,
    partialActive: {
        alive: statusStateMocks.authenticated.lastStatus.alive,
        ip: null,
        ddns: null,
        timers: {
            alive: true,
            ip: false,
            ddns: false
        }
    } as StatusInfo
}

// GUN user mocks
export const gunUserMocks = {
    authenticated: {
        is: {
            pub: 'mock-pub-key',
            alias: 'test-peer'
        },
        get: jest.fn().mockReturnThis(),
        put: jest.fn((data, callback) => {
            // Simulate successful put
            setTimeout(() => callback({ ok: true }), 10)
            return gunUserMocks.authenticated
        }),
        on: jest.fn()
    },
    unauthenticated: null,
    authError: {
        is: null,
        get: jest.fn().mockReturnThis(),
        put: jest.fn((data, callback) => {
            // Simulate authentication error
            setTimeout(() => callback({ err: 'Not authenticated' }), 10)
            return gunUserMocks.authError
        })
    },
    putError: {
        is: {
            pub: 'mock-pub-key'
        },
        get: jest.fn().mockReturnThis(),
        put: jest.fn((data, callback) => {
            // Simulate put error
            setTimeout(() => callback({ err: 'Put failed' }), 10)
            return gunUserMocks.putError
        })
    }
}

// Network IP change scenarios
export const ipChangeMocks = {
    noChange: {
        old: {
            ipv4: '1.2.3.4',
            ipv6: '2001:db8::1',
            primary: '1.2.3.4',
            hasIPv6: true
        },
        new: {
            ipv4: '1.2.3.4',
            ipv6: '2001:db8::1',
            primary: '1.2.3.4',
            hasIPv6: true
        },
        changed: false
    },
    ipv4Changed: {
        old: {
            ipv4: '1.2.3.4',
            ipv6: '2001:db8::1',
            primary: '1.2.3.4',
            hasIPv6: true
        },
        new: {
            ipv4: '5.6.7.8',
            ipv6: '2001:db8::1',
            primary: '5.6.7.8',
            hasIPv6: true
        },
        changed: true
    },
    ipv6Changed: {
        old: {
            ipv4: '1.2.3.4',
            ipv6: '2001:db8::1',
            primary: '1.2.3.4',
            hasIPv6: true
        },
        new: {
            ipv4: '1.2.3.4',
            ipv6: '2001:db8::2',
            primary: '1.2.3.4',
            hasIPv6: true
        },
        changed: true
    },
    bothChanged: {
        old: {
            ipv4: '1.2.3.4',
            ipv6: '2001:db8::1',
            primary: '1.2.3.4',
            hasIPv6: true
        },
        new: {
            ipv4: '5.6.7.8',
            ipv6: '2001:db8::2',
            primary: '5.6.7.8',
            hasIPv6: true
        },
        changed: true
    }
}

// DDNS update result mocks
export const ddnsResultMocks = {
    successful: [
        { type: 'A', ip: '1.2.3.4', success: true, status: 200 },
        { type: 'AAAA', ip: '2001:db8::1', success: true, status: 200 }
    ],
    partialSuccess: [
        { type: 'A', ip: '1.2.3.4', success: true, status: 200 },
        { type: 'AAAA', ip: '2001:db8::1', success: false, status: 401 }
    ],
    failed: [
        { type: 'A', ip: '1.2.3.4', success: false, error: 'Network error' }
    ],
    empty: []
}

// File system mocks for DDNS state
export const fsMocks = {
    successful: {
        writeFileSync: jest.fn(),
        readFileSync: jest.fn(() => JSON.stringify({
            timestamp: Date.now(),
            domain: 'example.com',
            ipv4: '1.2.3.4',
            ipv6: '2001:db8::1',
            lastUpdate: new Date().toISOString()
        }))
    },
    writeError: {
        writeFileSync: jest.fn(() => {
            throw new Error('EACCES: permission denied')
        }),
        readFileSync: jest.fn()
    },
    readError: {
        writeFileSync: jest.fn(),
        readFileSync: jest.fn(() => {
            throw new Error('ENOENT: no such file')
        })
    }
}

// Process mocks for alive status
export const processMocks = {
    normal: {
        pid: 12345,
        uptime: () => 3600,
        memoryUsage: () => ({
            rss: 50 * 1024 * 1024,
            heapTotal: 40 * 1024 * 1024,
            heapUsed: 30 * 1024 * 1024,
            external: 1 * 1024 * 1024,
            arrayBuffers: 0
        })
    },
    highMemory: {
        pid: 12345,
        uptime: () => 7200,
        memoryUsage: () => ({
            rss: 500 * 1024 * 1024,
            heapTotal: 400 * 1024 * 1024,
            heapUsed: 350 * 1024 * 1024,
            external: 10 * 1024 * 1024,
            arrayBuffers: 5 * 1024 * 1024
        })
    }
}

// Timer mocks
export const timerMocks = {
    create: () => {
        let callbacks: { [key: string]: Function } = {}
        let timeouts: { [key: string]: NodeJS.Timeout | null } = {}
        
        return {
            setTimeout: jest.fn((callback: Function, delay: number, name: string = 'default') => {
                callbacks[name] = callback
                timeouts[name] = setTimeout(() => {}, delay) // Mock timer
                return timeouts[name]
            }),
            clearTimeout: jest.fn((timer: NodeJS.Timeout | null) => {
                if (timer) {
                    Object.entries(timeouts).forEach(([name, t]) => {
                        if (t === timer) {
                            timeouts[name] = null
                            delete callbacks[name]
                        }
                    })
                }
            }),
            trigger: (name: string = 'default') => {
                if (callbacks[name]) callbacks[name]()
            },
            getCallbacks: () => callbacks,
            getTimeouts: () => timeouts
        }
    }
}

// Hub activation mocks
export const hubMocks = {
    validKey: 'hub-key-12345',
    invalidKey: 'invalid-hub-key',
    activationData: {
        timestamp: Date.now(),
        peer: 'mock-pub-key',
        name: 'test-peer',
        domain: 'example.com',
        activated: true
    }
}

// Custom report mocks
export const customReportMocks = {
    valid: {
        key: 'custom-metric',
        data: {
            metric: 'cpu_usage',
            value: 45.6,
            unit: 'percent',
            threshold: 80
        }
    },
    system: {
        key: 'system-info',
        data: {
            os: 'linux',
            arch: 'x64',
            nodeVersion: '18.17.0',
            platform: 'production'
        }
    },
    error: {
        key: 'error-log',
        data: {
            level: 'error',
            message: 'Database connection failed',
            stack: 'Error at database.connect()',
            timestamp: Date.now()
        }
    }
}

// Create mock context for Reporter testing
export function createReporterMockContext(overrides: any = {}) {
    return {
        options: { ...reporterOptionMocks, ...overrides.options },
        state: { ...statusStateMocks, ...overrides.state },
        info: { ...statusInfoMocks, ...overrides.info },
        users: { ...gunUserMocks, ...overrides.users },
        ipChanges: { ...ipChangeMocks, ...overrides.ipChanges },
        ddns: { ...ddnsResultMocks, ...overrides.ddns },
        fs: { ...fsMocks, ...overrides.fs },
        process: { ...processMocks, ...overrides.process },
        timers: overrides.timers || timerMocks.create(),
        hubs: { ...hubMocks, ...overrides.hubs },
        reports: { ...customReportMocks, ...overrides.reports }
    }
}

// Utility functions for testing
export const reporterTestUtils = {
    // Create mock state with specific configuration
    createMockState: (config: any = {}, user: any = null): StatusState => ({
        user,
        config: { ...statusStateMocks.authenticated.config, ...config },
        intervals: statusStateMocks.initial.intervals,
        timers: { alive: null, ip: null, ddns: null },
        lastStatus: { ip: null, alive: null, ddns: null }
    }),
    
    // Create mock GUN user with callbacks
    createMockGunUser: (shouldFail: boolean = false) => ({
        is: shouldFail ? null : { pub: 'mock-pub-key' },
        get: jest.fn().mockReturnThis(),
        put: jest.fn((data, callback) => {
            setTimeout(() => {
                callback(shouldFail ? { err: 'Mock error' } : { ok: true })
            }, 10)
        })
    }),
    
    // Simulate timer execution
    simulateTimer: (callback: Function, delay: number = 0) => {
        return new Promise(resolve => {
            setTimeout(() => {
                callback()
                resolve(true)
            }, delay)
        })
    },
    
    // Create mock network result
    createMockNetworkResult: (ipv4: string | null = '1.2.3.4', ipv6: string | null = '2001:db8::1') => ({
        ipv4,
        ipv6,
        primary: ipv4 || ipv6,
        hasIPv6: !!ipv6
    }),
    
    // Validate status structure
    validateStatusStructure: (status: any, type: 'alive' | 'ip' | 'ddns') => {
        expect(status).toEqual(expect.objectContaining({
            timestamp: expect.any(Number)
        }))
        
        switch (type) {
            case 'alive':
                expect(status).toEqual(expect.objectContaining({
                    alive: true,
                    name: expect.any(String),
                    env: expect.any(String),
                    pid: expect.any(Number),
                    uptime: expect.any(Number),
                    memory: expect.any(Object),
                    version: expect.any(String)
                }))
                break
            case 'ip':
                expect(status).toEqual(expect.objectContaining({
                    ipv4: expect.anything(),
                    ipv6: expect.anything(),
                    primary: expect.anything(),
                    hasIPv6: expect.any(Boolean),
                    changed: expect.any(Boolean)
                }))
                break
            case 'ddns':
                expect(status).toEqual(expect.objectContaining({
                    domain: expect.any(String),
                    updates: expect.any(Array),
                    success: expect.any(Boolean)
                }))
                break
        }
    }
}

export default {
    options: reporterOptionMocks,
    state: statusStateMocks,
    info: statusInfoMocks,
    users: gunUserMocks,
    ipChanges: ipChangeMocks,
    ddns: ddnsResultMocks,
    fs: fsMocks,
    process: processMocks,
    timers: timerMocks,
    hubs: hubMocks,
    reports: customReportMocks,
    createContext: createReporterMockContext,
    utils: reporterTestUtils
}