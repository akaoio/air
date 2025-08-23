/**
 * Installer Class Test Mocks - System Phase
 * Comprehensive installation process test data and utilities
 */
// Installer options mocks
export const installerOptionMocks = {
    minimal: {},
    basic: {
        name: 'test-peer',
        env: 'development',
        port: 8765
    },
    production: {
        name: 'prod-peer',
        env: 'production',
        domain: 'example.com',
        port: 8765,
        root: '/opt/air',
        bash: '/bin/bash'
    },
    complete: {
        name: 'complete-peer',
        env: 'production',
        domain: 'complete.example.com',
        port: 9000,
        root: '/custom/root',
        bash: '/bin/zsh',
        sync: 'wss://sync.example.com/gun',
        godaddy: {
            domain: 'complete.example.com',
            host: '@',
            key: 'test-godaddy-key',
            secret: 'test-godaddy-secret'
        }
    }
};
// Install context mocks
export const installContextMocks = {
    linux: {
        rootDir: '/home/user/project',
        isRoot: false,
        platform: 'linux',
        hasSystemd: true,
        hasBun: false,
        hasNode: true
    },
    linuxRoot: {
        rootDir: '/opt/project',
        isRoot: true,
        platform: 'linux',
        hasSystemd: true,
        hasBun: true,
        hasNode: true
    },
    windows: {
        rootDir: 'C:\\project',
        isRoot: false,
        platform: 'win32',
        hasSystemd: false,
        hasBun: false,
        hasNode: true
    },
    mac: {
        rootDir: '/Users/user/project',
        isRoot: false,
        platform: 'darwin',
        hasSystemd: false,
        hasBun: true,
        hasNode: true
    },
    termux: {
        rootDir: '/data/data/com.termux/files/home/project',
        isRoot: false,
        platform: 'linux',
        hasSystemd: false,
        hasBun: false,
        hasNode: true
    }
};
// System info mocks
export const systemInfoMocks = {
    linux: {
        nodeVersion: 'v18.17.0',
        npmVersion: '9.6.7',
        gitVersion: 'git version 2.34.1',
        platform: 'linux',
        hostname: 'test-linux',
        hasSudo: true,
        hasSystemd: true,
        isWindows: false,
        isMac: false,
        isLinux: true,
        isTermux: false
    },
    linuxNoSudo: {
        nodeVersion: 'v18.17.0',
        platform: 'linux',
        hostname: 'test-linux-nosudo',
        hasSudo: false,
        hasSystemd: false,
        isWindows: false,
        isMac: false,
        isLinux: true,
        isTermux: false
    },
    windows: {
        nodeVersion: 'v18.17.0',
        npmVersion: '9.6.7',
        gitVersion: 'git version 2.41.0.windows.1',
        platform: 'win32',
        hostname: 'TEST-WINDOWS',
        hasSudo: false,
        hasSystemd: false,
        isWindows: true,
        isMac: false,
        isLinux: false,
        isTermux: false
    },
    mac: {
        nodeVersion: 'v18.17.0',
        npmVersion: '9.6.7',
        gitVersion: 'git version 2.39.3 (Apple Git-146)',
        platform: 'darwin',
        hostname: 'Test-MacBook',
        hasSudo: true,
        hasSystemd: false,
        isWindows: false,
        isMac: true,
        isLinux: false,
        isTermux: false
    },
    termux: {
        nodeVersion: 'v18.17.0',
        npmVersion: '9.6.7',
        platform: 'linux',
        hostname: 'localhost',
        hasSudo: false,
        hasSystemd: false,
        isWindows: false,
        isMac: false,
        isLinux: true,
        isTermux: true
    },
    minimal: {
        nodeVersion: 'v16.20.0',
        platform: 'linux',
        hostname: 'minimal-system',
        hasSudo: false,
        hasSystemd: false,
        isWindows: false,
        isMac: false,
        isLinux: true,
        isTermux: false
        // Missing optional fields like npmVersion, gitVersion
    }
};
// Air configuration mocks
export const airConfigMocks = {
    default: {
        root: '/home/user/project',
        bash: '/bin/bash',
        env: 'development',
        name: 'test-peer',
        domain: 'localhost',
        port: 8765,
        development: {
            domain: 'localhost',
            port: 8765,
            peers: []
        }
    },
    withSSL: {
        root: '/home/user/project',
        bash: '/bin/bash',
        env: 'production',
        name: 'ssl-peer',
        domain: 'secure.example.com',
        port: 8765,
        ssl: {
            key: '/path/to/key.pem',
            cert: '/path/to/cert.pem'
        },
        production: {
            domain: 'secure.example.com',
            port: 8765,
            peers: []
        }
    },
    development: {
        root: '/home/user/project',
        bash: '/bin/bash',
        env: 'development',
        name: 'test-peer',
        ip: {
            timeout: 5000,
            dnsTimeout: 2000,
            userAgent: 'Air/2.0',
            dns: [
                { hostname: 'resolver1.opendns.com', resolver: 'myip.opendns.com' },
                { hostname: '8.8.8.8', resolver: 'o-o.myaddr.l.google.com' }
            ],
            http: [
                { url: 'https://icanhazip.com', format: 'text' },
                { url: 'https://api.ipify.org', format: 'text' }
            ]
        },
        development: {
            domain: 'localhost',
            port: 8765,
            peers: []
        },
        production: {
            domain: 'example.com',
            port: 8765,
            peers: []
        }
    },
    production: {
        root: '/opt/air',
        bash: '/bin/bash',
        env: 'production',
        name: 'prod-peer',
        ip: {
            timeout: 5000,
            dnsTimeout: 2000,
            userAgent: 'Air/2.0',
            dns: [
                { hostname: 'resolver1.opendns.com', resolver: 'myip.opendns.com' },
                { hostname: '8.8.8.8', resolver: 'o-o.myaddr.l.google.com' }
            ],
            http: [
                { url: 'https://icanhazip.com', format: 'text' },
                { url: 'https://api.ipify.org', format: 'text' }
            ]
        },
        development: {
            domain: 'localhost',
            port: 8765,
            peers: []
        },
        production: {
            domain: 'example.com',
            port: 8765,
            peers: [],
            godaddy: {
                domain: 'example.com',
                host: '@',
                key: 'test-key',
                secret: 'test-secret'
            }
        }
    },
    custom: {
        root: '/custom/path',
        bash: '/bin/zsh',
        env: 'development',
        name: 'custom-peer',
        sync: 'wss://custom.sync.com/gun',
        ip: {
            timeout: 5000,
            dnsTimeout: 2000,
            userAgent: 'Air/2.0',
            dns: [
                { hostname: 'resolver1.opendns.com', resolver: 'myip.opendns.com' },
                { hostname: '8.8.8.8', resolver: 'o-o.myaddr.l.google.com' }
            ],
            http: [
                { url: 'https://icanhazip.com', format: 'text' },
                { url: 'https://api.ipify.org', format: 'text' }
            ]
        },
        development: {
            domain: 'custom.localhost',
            port: 9000,
            peers: ['ws://peer1.com/gun']
        },
        production: {
            domain: 'example.com',
            port: 8765,
            peers: []
        }
    }
};
// File system mocks for detection
export const detectionMocks = {
    existingConfig: {
        existsSync: jest.fn((filePath) => filePath.endsWith('air.json')),
        readFileSync: jest.fn((filePath) => {
            if (filePath.endsWith('air.json')) {
                return JSON.stringify(airConfigMocks.development);
            }
            throw new Error('File not found');
        })
    },
    noConfig: {
        existsSync: jest.fn(() => false),
        readFileSync: jest.fn(() => {
            throw new Error('ENOENT: no such file');
        })
    },
    corruptedConfig: {
        existsSync: jest.fn(() => true),
        readFileSync: jest.fn(() => '{ invalid json')
    },
    emptyConfig: {
        existsSync: jest.fn(() => true),
        readFileSync: jest.fn(() => '{}')
    }
};
// Child process mocks for system checks
export const childProcessMocks = {
    allToolsAvailable: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('npm --version'):
                    return '9.6.7\n';
                case command.includes('git --version'):
                    return 'git version 2.34.1\n';
                case command.includes('sudo -n true'):
                    return '';
                case command.includes('systemctl --version'):
                    return 'systemd 248 (248.3-1ubuntu8.6)\n';
                case command.includes('which systemctl'):
                    return '/bin/systemctl\n';
                default:
                    return '';
            }
        })
    },
    minimalTools: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('npm --version'):
                    throw new Error('npm: command not found');
                case command.includes('git --version'):
                    throw new Error('git: command not found');
                case command.includes('sudo -n true'):
                    throw new Error('sudo: password required');
                case command.includes('systemctl --version'):
                    throw new Error('systemctl: command not found');
                case command.includes('which systemctl'):
                    throw new Error('systemctl: command not found');
                default:
                    throw new Error('Command not found');
            }
        })
    },
    partialTools: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('npm --version'):
                    return '8.19.2\n';
                case command.includes('git --version'):
                    throw new Error('git: command not found');
                case command.includes('sudo -n true'):
                    return '';
                case command.includes('systemctl --version'):
                    throw new Error('systemctl: command not found');
                case command.includes('which systemctl'):
                    throw new Error('systemctl: command not found');
                default:
                    return '';
            }
        })
    }
};
// OS mocks for system detection
export const osMocks = {
    linux: {
        platform: () => 'linux',
        hostname: () => 'test-linux',
        version: () => 'Linux test-linux 5.15.0-72-generic #79-Ubuntu'
    },
    windows: {
        platform: () => 'win32',
        hostname: () => 'TEST-WINDOWS',
        version: () => 'Windows_NT TEST-WINDOWS 10.0.19045'
    },
    mac: {
        platform: () => 'darwin',
        hostname: () => 'Test-MacBook.local',
        version: () => 'Darwin Test-MacBook.local 22.5.0'
    }
};
// Process mocks for different environments
export const processMocks = {
    linux: {
        cwd: () => '/home/user/project',
        platform: 'linux',
        version: 'v18.17.0',
        getuid: () => 1000,
        env: {
            SHELL: '/bin/bash',
            HOME: '/home/user'
        }
    },
    linuxRoot: {
        cwd: () => '/opt/project',
        platform: 'linux',
        version: 'v18.17.0',
        getuid: () => 0,
        env: {
            SHELL: '/bin/bash',
            HOME: '/root'
        }
    },
    windows: {
        cwd: () => 'C:\\project',
        platform: 'win32',
        version: 'v18.17.0',
        getuid: undefined,
        env: {
            SHELL: undefined,
            USERPROFILE: 'C:\\Users\\user'
        }
    },
    termux: {
        cwd: () => '/data/data/com.termux/files/home/project',
        platform: 'linux',
        version: 'v18.17.0',
        getuid: () => 10162,
        env: {
            PREFIX: '/data/data/com.termux/files/usr',
            SHELL: '/data/data/com.termux/files/usr/bin/bash',
            HOME: '/data/data/com.termux/files/home'
        }
    }
};
// Path mocks
export const pathMocks = {
    join: jest.fn((...paths) => paths.join('/')),
    resolve: jest.fn((pathStr) => pathStr.startsWith('/') ? pathStr : `/current/${pathStr}`),
    dirname: jest.fn((pathStr) => pathStr.replace(/\/[^/]+$/, '')),
    basename: jest.fn((pathStr) => pathStr.split('/').pop() || '')
};
// Create mock context for Installer testing
export function createInstallerMockContext(overrides = {}) {
    return {
        options: { ...installerOptionMocks, ...overrides.options },
        context: { ...installContextMocks, ...overrides.context },
        systemInfo: { ...systemInfoMocks, ...overrides.systemInfo },
        airConfig: { ...airConfigMocks, ...overrides.airConfig },
        detection: { ...detectionMocks, ...overrides.detection },
        childProcess: { ...childProcessMocks, ...overrides.childProcess },
        os: { ...osMocks, ...overrides.os },
        process: { ...processMocks, ...overrides.process },
        path: { ...pathMocks, ...overrides.path }
    };
}
// Utility functions for testing
export const installerTestUtils = {
    // Create mock system environment
    mockSystemEnvironment: (platform) => {
        let mockProcess, mockOs, mockChildProcess;
        switch (platform) {
            case 'linux':
                mockProcess = processMocks.linux;
                mockOs = osMocks.linux;
                mockChildProcess = childProcessMocks.allToolsAvailable;
                break;
            case 'windows':
                mockProcess = processMocks.windows;
                mockOs = osMocks.windows;
                mockChildProcess = childProcessMocks.partialTools;
                break;
            case 'mac':
                mockProcess = { ...processMocks.linux, platform: 'darwin' };
                mockOs = osMocks.mac;
                mockChildProcess = childProcessMocks.allToolsAvailable;
                break;
            case 'termux':
                mockProcess = processMocks.termux;
                mockOs = { ...osMocks.linux, hostname: () => 'localhost' };
                mockChildProcess = childProcessMocks.minimalTools;
                break;
        }
        return { mockProcess, mockOs, mockChildProcess };
    },
    // Validate installer context structure
    validateInstallerContext: (context) => {
        expect(context).toEqual(expect.objectContaining({
            rootDir: expect.any(String),
            isRoot: expect.any(Boolean),
            platform: expect.any(String),
            hasSystemd: expect.any(Boolean),
            hasBun: expect.any(Boolean),
            hasNode: expect.any(Boolean)
        }));
    },
    // Validate system info structure
    validateSystemInfo: (systemInfo) => {
        expect(systemInfo).toEqual(expect.objectContaining({
            nodeVersion: expect.any(String),
            platform: expect.any(String),
            hostname: expect.any(String),
            hasSudo: expect.any(Boolean),
            hasSystemd: expect.any(Boolean),
            isWindows: expect.any(Boolean),
            isMac: expect.any(Boolean),
            isLinux: expect.any(Boolean),
            isTermux: expect.any(Boolean)
        }));
    },
    // Validate air config structure
    validateAirConfig: (config) => {
        expect(config).toEqual(expect.objectContaining({
            root: expect.any(String),
            bash: expect.any(String),
            env: expect.stringMatching(/^(development|production)$/),
            name: expect.any(String),
            ip: expect.objectContaining({
                timeout: expect.any(Number),
                dnsTimeout: expect.any(Number),
                userAgent: expect.any(String),
                dns: expect.any(Array),
                http: expect.any(Array)
            }),
            development: expect.objectContaining({
                domain: expect.any(String),
                port: expect.any(Number),
                peers: expect.any(Array)
            }),
            production: expect.objectContaining({
                domain: expect.any(String),
                port: expect.any(Number),
                peers: expect.any(Array)
            })
        }));
    },
    // Create temporary installer options
    createTempOptions: (overrides = {}) => ({
        name: 'temp-installer',
        env: 'development',
        port: 8765,
        ...overrides
    }),
    // Simulate different privilege levels
    simulatePrivileges: (isRoot, hasSudo) => {
        return {
            process: {
                getuid: isRoot ? () => 0 : () => 1000
            },
            execSync: jest.fn((command) => {
                if (command.includes('sudo -n true')) {
                    if (!hasSudo)
                        throw new Error('sudo: password required');
                    return '';
                }
                return 'success';
            })
        };
    }
};
export default {
    options: installerOptionMocks,
    context: installContextMocks,
    systemInfo: systemInfoMocks,
    airConfig: airConfigMocks,
    detection: detectionMocks,
    childProcess: childProcessMocks,
    os: osMocks,
    process: processMocks,
    path: pathMocks,
    createContext: createInstallerMockContext,
    utils: installerTestUtils
};
//# sourceMappingURL=installerMocks.js.map