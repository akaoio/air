/**
 * Network Class Test Mocks - Services Phase
 * Comprehensive network operation test data and utilities
 */

import type { IPResult } from '../../src/Network/get.js'
import type { InterfaceInfo } from '../../src/Network/interfaces.js'
import type { UpdateResult } from '../../src/Network/update.js'

// IP Address test data
export const ipMocks = {
    valid: {
        ipv4: {
            public1: '1.2.3.4',
            public2: '8.8.8.8',
            public3: '203.0.113.1',
            cloudflare: '1.1.1.1',
            google: '8.8.4.4'
        },
        ipv6: {
            public1: '2001:db8::1',
            public2: '2606:4700:4700::1111',
            public3: '2001:4860:4860::8888',
            cloudflare: '2606:4700:4700::1001',
            google: '2001:4860:4860::8844'
        }
    },
    invalid: {
        ipv4: {
            private1: '192.168.1.1',
            private2: '10.0.0.1',
            private3: '172.16.1.1',
            loopback: '127.0.0.1',
            linkLocal: '169.254.1.1',
            multicast: '224.0.0.1',
            reserved: '240.0.0.1',
            zero: '0.0.0.0'
        },
        ipv6: {
            linkLocal: 'fe80::1',
            uniqueLocal: 'fc00::1',
            loopback: '::1',
            unspecified: '::',
            multicast: 'ff02::1'
        },
        malformed: {
            empty: '',
            tooManyOctets: '1.2.3.4.5',
            tooFewOctets: '1.2.3',
            invalidChars: '1.2.3.a',
            outOfRange: '256.1.1.1',
            notString: 123,
            nullValue: null,
            undefined: undefined
        }
    }
}

// IP Detection Results
export const ipResults = {
    both: {
        ipv4: ipMocks.valid.ipv4.public1,
        ipv6: ipMocks.valid.ipv6.public1,
        primary: ipMocks.valid.ipv4.public1,
        hasIPv6: true
    } as IPResult,
    ipv4Only: {
        ipv4: ipMocks.valid.ipv4.public1,
        ipv6: null,
        primary: ipMocks.valid.ipv4.public1,
        hasIPv6: false
    } as IPResult,
    ipv6Only: {
        ipv4: null,
        ipv6: ipMocks.valid.ipv6.public1,
        primary: ipMocks.valid.ipv6.public1,
        hasIPv6: true
    } as IPResult,
    none: {
        ipv4: null,
        ipv6: null,
        primary: null,
        hasIPv6: false
    } as IPResult
}

// Network interfaces mock data
export const interfaceMocks = {
    ethernet: {
        name: 'eth0',
        address: ipMocks.valid.ipv4.public1,
        family: 'IPv4',
        mac: '00:11:22:33:44:55',
        netmask: '255.255.255.0',
        cidr: '1.2.3.4/24'
    } as InterfaceInfo,
    wifi: {
        name: 'wlan0',
        address: ipMocks.valid.ipv4.public2,
        family: 'IPv4',
        mac: '66:77:88:99:aa:bb',
        netmask: '255.255.255.0',
        cidr: '8.8.8.8/24'
    } as InterfaceInfo,
    ipv6: {
        name: 'eth0',
        address: ipMocks.valid.ipv6.public1,
        family: 'IPv6',
        mac: '00:11:22:33:44:55',
        netmask: 'ffff:ffff:ffff:ffff::',
        cidr: '2001:db8::1/64'
    } as InterfaceInfo
}

// DNS resolution mocks
export const dnsMocks = {
    successful: {
        ipv4: [ipMocks.valid.ipv4.public1],
        ipv6: [ipMocks.valid.ipv6.public1]
    },
    failed: {
        error: new Error('ENOTFOUND'),
        timeout: new Error('ETIMEOUT'),
        noData: new Error('ENODATA')
    }
}

// HTTP request mocks for IP detection
export const httpMocks = {
    successful: {
        ipv4: {
            text: () => Promise.resolve(ipMocks.valid.ipv4.public1),
            ok: true,
            status: 200
        },
        ipv6: {
            text: () => Promise.resolve(ipMocks.valid.ipv6.public1),
            ok: true,
            status: 200
        }
    },
    failed: {
        networkError: {
            ok: false,
            status: 500,
            text: () => Promise.resolve('Server Error')
        },
        timeout: {
            ok: false,
            status: 408,
            text: () => Promise.resolve('Request Timeout')
        }
    }
}

// DDNS update mocks
export const ddnsMocks = {
    config: {
        valid: {
            godaddy: {
                domain: 'example.com',
                host: '@',
                key: 'test-key',
                secret: 'test-secret'
            }
        },
        invalid: {
            missing: {},
            incomplete: {
                godaddy: {
                    domain: 'example.com'
                    // Missing key and secret
                }
            }
        }
    },
    responses: {
        success: {
            ok: true,
            status: 200,
            text: () => Promise.resolve('Success')
        },
        authError: {
            ok: false,
            status: 401,
            text: () => Promise.resolve('Unauthorized')
        },
        rateLimited: {
            ok: false,
            status: 429,
            text: () => Promise.resolve('Rate Limited')
        }
    }
}

// Update results
export const updateResults = {
    successful: {
        both: [
            {
                type: 'A',
                ip: ipMocks.valid.ipv4.public1,
                success: true,
                status: 200
            } as UpdateResult,
            {
                type: 'AAAA',
                ip: ipMocks.valid.ipv6.public1,
                success: true,
                status: 200
            } as UpdateResult
        ],
        ipv4Only: [
            {
                type: 'A',
                ip: ipMocks.valid.ipv4.public1,
                success: true,
                status: 200
            } as UpdateResult
        ]
    },
    failed: {
        authError: [
            {
                type: 'A',
                ip: ipMocks.valid.ipv4.public1,
                success: false,
                status: 401
            } as UpdateResult
        ],
        networkError: [
            {
                type: 'A',
                ip: ipMocks.valid.ipv4.public1,
                success: false,
                error: 'Network error'
            } as UpdateResult
        ]
    }
}

// OS network interfaces mock data (for os.networkInterfaces())
export const osInterfacesMocks = {
    withIPv6: {
        eth0: [
            {
                address: ipMocks.valid.ipv4.public1,
                netmask: '255.255.255.0',
                family: 'IPv4',
                mac: '00:11:22:33:44:55',
                internal: false,
                cidr: '1.2.3.4/24'
            },
            {
                address: ipMocks.valid.ipv6.public1,
                netmask: 'ffff:ffff:ffff:ffff::',
                family: 'IPv6',
                mac: '00:11:22:33:44:55',
                internal: false,
                cidr: '2001:db8::1/64',
                scopeid: 0
            }
        ],
        lo: [
            {
                address: '127.0.0.1',
                netmask: '255.0.0.0',
                family: 'IPv4',
                mac: '00:00:00:00:00:00',
                internal: true,
                cidr: '127.0.0.1/8'
            }
        ]
    },
    ipv4Only: {
        eth0: [
            {
                address: ipMocks.valid.ipv4.public1,
                netmask: '255.255.255.0',
                family: 'IPv4',
                mac: '00:11:22:33:44:55',
                internal: false,
                cidr: '1.2.3.4/24'
            }
        ]
    },
    empty: {}
}

// Monitor mock data
export const monitorMocks = {
    initialState: ipResults.both,
    changedState: {
        ipv4: ipMocks.valid.ipv4.public2,
        ipv6: ipMocks.valid.ipv6.public2,
        primary: ipMocks.valid.ipv4.public2,
        hasIPv6: true
    } as IPResult,
    noChange: ipResults.both
}

// Socket mock for IPv6 availability test
export const socketMocks = {
    successful: {
        on: jest.fn(),
        destroy: jest.fn()
    },
    failed: {
        on: jest.fn(),
        destroy: jest.fn()
    }
}

// Create mock context for Network testing
export function createNetworkMockContext(overrides: any = {}) {
    return {
        ipResults: { ...ipResults, ...overrides.ipResults },
        interfaces: { ...interfaceMocks, ...overrides.interfaces },
        dns: { ...dnsMocks, ...overrides.dns },
        http: { ...httpMocks, ...overrides.http },
        ddns: { ...ddnsMocks, ...overrides.ddns },
        monitor: { ...monitorMocks, ...overrides.monitor }
    }
}

// Utility functions for testing
export const networkTestUtils = {
    // Simulate DNS resolution delay
    delayedResolve: (value: any, delay: number = 10) => {
        return new Promise(resolve => setTimeout(() => resolve(value), delay))
    },
    
    // Simulate network failure
    networkFailure: () => {
        throw new Error('ENOTFOUND')
    },
    
    // Create mock timer for monitor testing
    createMockTimer: () => {
        let callback: Function
        let interval: number
        
        return {
            setInterval: jest.fn((cb: Function, int: number) => {
                callback = cb
                interval = int
                return 'timer-id'
            }),
            trigger: () => callback && callback(),
            getInterval: () => interval
        }
    }
}

export default {
    ip: ipMocks,
    results: ipResults,
    interfaces: interfaceMocks,
    dns: dnsMocks,
    http: httpMocks,
    ddns: ddnsMocks,
    updates: updateResults,
    os: osInterfacesMocks,
    monitor: monitorMocks,
    sockets: socketMocks,
    createContext: createNetworkMockContext,
    utils: networkTestUtils
}