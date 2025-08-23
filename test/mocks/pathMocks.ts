/**
 * Path Module Test Mocks - System Phase
 * Comprehensive system path operation test data and utilities
 */

import type { PathState, PathsConfig } from '../../src/Path/index.js'
import path from 'path'
import os from 'os'

// Operating system mocks
export const osMocks = {
    linux: {
        platform: 'linux' as NodeJS.Platform,
        homedir: '/home/testuser',
        tmpdir: '/tmp'
    },
    windows: {
        platform: 'win32' as NodeJS.Platform,
        homedir: 'C:\\Users\\testuser',
        tmpdir: 'C:\\Windows\\Temp'
    },
    macos: {
        platform: 'darwin' as NodeJS.Platform,
        homedir: '/Users/testuser',
        tmpdir: '/tmp'
    }
}

// Air configuration mocks
export const airConfigMocks = {
    valid: {
        complete: {
            name: 'test-peer',
            env: 'test',
            root: '/custom/root/path',
            bash: '/custom/script/path',
            test: {
                port: 8765,
                domain: 'test.local'
            }
        },
        minimal: {
            name: 'minimal-peer',
            env: 'test'
        },
        withRoot: {
            name: 'root-peer',
            root: '/specified/root'
        },
        withBash: {
            name: 'bash-peer',
            bash: '/specified/scripts'
        },
        relativePaths: {
            name: 'relative-peer',
            root: './relative/root',
            bash: './relative/scripts'
        }
    },
    invalid: {
        malformed: '{ invalid json',
        empty: {},
        null: null,
        wrongType: 'not-an-object'
    }
}

// Path state mocks
export const pathStateMocks = {
    linux: {
        platform: 'linux' as NodeJS.Platform,
        homedir: '/home/testuser',
        tmpdir: '/tmp',
        cache: {},
        airConfig: null
    } as PathState,
    linuxWithConfig: {
        platform: 'linux' as NodeJS.Platform,
        homedir: '/home/testuser',
        tmpdir: '/tmp',
        cache: {
            'root-cache': '/cached/root',
            'bash-cache': '/cached/bash'
        },
        airConfig: airConfigMocks.valid.complete
    } as PathState,
    windows: {
        platform: 'win32' as NodeJS.Platform,
        homedir: 'C:\\Users\\testuser',
        tmpdir: 'C:\\Windows\\Temp',
        cache: {},
        airConfig: null
    } as PathState,
    windowsWithConfig: {
        platform: 'win32' as NodeJS.Platform,
        homedir: 'C:\\Users\\testuser',
        tmpdir: 'C:\\Windows\\Temp',
        cache: {},
        airConfig: {
            ...airConfigMocks.valid.complete,
            root: 'C:\\custom\\root',
            bash: 'C:\\custom\\scripts'
        }
    } as PathState
}

// Expected paths for different configurations
export const expectedPaths = {
    linux: {
        noConfig: {
            root: '/current/working/directory',
            bash: '/current/working/directory/script',
            tmp: '/tmp',
            tmpWithFile: '/tmp/test.txt'
        },
        withConfig: {
            root: '/custom/root/path',
            bash: '/custom/script/path',
            config: '/custom/root/path/air.json',
            logs: '/custom/root/path/logs'
        }
    },
    windows: {
        noConfig: {
            root: 'C:\\current\\working\\directory',
            bash: 'C:\\current\\working\\directory\\script',
            tmp: 'C:\\Windows\\Temp',
            tmpWithFile: 'C:\\Windows\\Temp\\test.txt'
        },
        withConfig: {
            root: 'C:\\custom\\root',
            bash: 'C:\\custom\\scripts',
            config: 'C:\\custom\\root\\air.json',
            logs: 'C:\\custom\\root\\logs'
        }
    }
}

// File system mocks
export const fsMocks = {
    configExists: {
        existsSync: jest.fn((filePath: string) => {
            return filePath.includes('air.json')
        }),
        readFileSync: jest.fn((filePath: string) => {
            if (filePath.includes('air.json')) {
                return JSON.stringify(airConfigMocks.valid.complete)
            }
            throw new Error('ENOENT: no such file')
        })
    },
    configMissing: {
        existsSync: jest.fn(() => false),
        readFileSync: jest.fn(() => {
            throw new Error('ENOENT: no such file')
        })
    },
    configCorrupted: {
        existsSync: jest.fn(() => true),
        readFileSync: jest.fn(() => airConfigMocks.invalid.malformed)
    },
    configEmpty: {
        existsSync: jest.fn(() => true),
        readFileSync: jest.fn(() => '{}')
    },
    mixedResults: {
        existsSync: jest.fn((filePath: string) => {
            // First location missing, second exists
            if (filePath.includes('current/working/directory')) return false
            if (filePath.includes('env/path')) return true
            return false
        }),
        readFileSync: jest.fn((filePath: string) => {
            if (filePath.includes('env/path')) {
                return JSON.stringify(airConfigMocks.valid.withRoot)
            }
            throw new Error('ENOENT')
        })
    }
}

// Process mocks
export const processMocks = {
    linux: {
        cwd: () => '/current/working/directory',
        env: {
            AIR_CONFIG: null
        }
    },
    linuxWithEnv: {
        cwd: () => '/current/working/directory',
        env: {
            AIR_CONFIG: '/env/path/air.json'
        }
    },
    windows: {
        cwd: () => 'C:\\current\\working\\directory',
        env: {
            AIR_CONFIG: null
        }
    },
    windowsWithEnv: {
        cwd: () => 'C:\\current\\working\\directory',
        env: {
            AIR_CONFIG: 'C:\\env\\path\\air.json'
        }
    }
}

// Path module mock functions  
export const pathMocks = {
    resolve: jest.fn((pathStr: string) => {
        // Mock path.resolve behavior
        if (path.isAbsolute(pathStr)) return pathStr
        return path.join(process.cwd(), pathStr)
    }),
    join: jest.fn((...paths: string[]) => {
        return path.join(...paths)
    }),
    isAbsolute: jest.fn((pathStr: string) => {
        return path.isAbsolute(pathStr)
    })
}

// PathsConfig test scenarios
export const pathsConfigMocks = {
    linux: {
        default: {
            root: '/current/working/directory',
            bash: '/current/working/directory/script',
            config: '/current/working/directory/air.json',
            logs: '/current/working/directory/logs'
        } as PathsConfig,
        custom: {
            root: '/custom/root',
            bash: '/custom/scripts',
            config: '/custom/root/air.json',
            logs: '/custom/root/logs'
        } as PathsConfig,
        mixed: {
            root: '/custom/root',
            bash: '/current/working/directory/script',
            config: '/custom/root/air.json',
            logs: '/custom/root/logs'
        } as PathsConfig
    },
    windows: {
        default: {
            root: 'C:\\current\\working\\directory',
            bash: 'C:\\current\\working\\directory\\script',
            config: 'C:\\current\\working\\directory\\air.json',
            logs: 'C:\\current\\working\\directory\\logs'
        } as PathsConfig,
        custom: {
            root: 'C:\\custom\\root',
            bash: 'C:\\custom\\scripts',
            config: 'C:\\custom\\root\\air.json',
            logs: 'C:\\custom\\root\\logs'
        } as PathsConfig
    }
}

// Temporary file scenarios
export const tmpMocks = {
    scenarios: {
        noFilename: {
            input: null,
            linux: '/tmp',
            windows: 'C:\\Windows\\Temp'
        },
        withFilename: {
            input: 'test.log',
            linux: '/tmp/test.log',
            windows: 'C:\\Windows\\Temp\\test.log'
        },
        nestedFilename: {
            input: 'subdir/test.log',
            linux: '/tmp/subdir/test.log',
            windows: 'C:\\Windows\\Temp\\subdir\\test.log'
        },
        emptyFilename: {
            input: '',
            linux: '/tmp/',
            windows: 'C:\\Windows\\Temp\\'
        }
    },
    fallback: {
        // When os.tmpdir() is undefined/null
        state: {
            tmpdir: null
        },
        expected: '/tmp'
    }
}

// Create mock context for Path testing
export function createPathMockContext(overrides: any = {}) {
    return {
        os: { ...osMocks, ...overrides.os },
        airConfig: { ...airConfigMocks, ...overrides.airConfig },
        state: { ...pathStateMocks, ...overrides.state },
        paths: { ...expectedPaths, ...overrides.paths },
        fs: { ...fsMocks, ...overrides.fs },
        process: { ...processMocks, ...overrides.process },
        pathsConfig: { ...pathsConfigMocks, ...overrides.pathsConfig },
        tmp: { ...tmpMocks, ...overrides.tmp }
    }
}

// Utility functions for testing
export const pathTestUtils = {
    // Create mock OS environment
    mockOsEnvironment: (platform: 'linux' | 'windows' | 'macos') => {
        const osData = osMocks[platform]
        return {
            platform: () => osData.platform,
            homedir: () => osData.homedir,
            tmpdir: () => osData.tmpdir
        }
    },
    
    // Create mock process environment
    mockProcessEnvironment: (cwd: string, env: Record<string, any> = {}) => {
        return {
            cwd: () => cwd,
            env: { ...env }
        }
    },
    
    // Normalize path for cross-platform testing
    normalizePath: (pathStr: string, platform: NodeJS.Platform = 'linux') => {
        if (platform === 'win32') {
            return pathStr.replace(/\//g, '\\')
        }
        return pathStr.replace(/\\/g, '/')
    },
    
    // Create temporary state for testing
    createTempState: (overrides: Partial<PathState> = {}): PathState => ({
        platform: 'linux',
        homedir: '/home/test',
        tmpdir: '/tmp',
        cache: {},
        airConfig: null,
        ...overrides
    }),
    
    // Validate PathsConfig structure
    validatePathsConfig: (config: PathsConfig) => {
        expect(config).toEqual(expect.objectContaining({
            root: expect.any(String),
            bash: expect.any(String),
            config: expect.any(String),
            logs: expect.any(String)
        }))
        
        // Ensure config and logs are relative to root
        expect(config.config).toContain(config.root)
        expect(config.logs).toContain(config.root)
    },
    
    // Test cross-platform path consistency
    testCrossPlatform: (testFn: Function) => {
        const platforms = ['linux', 'windows', 'macos'] as const
        platforms.forEach(platform => {
            testFn(platform, osMocks[platform])
        })
    }
}

export default {
    os: osMocks,
    airConfig: airConfigMocks,
    state: pathStateMocks,
    paths: expectedPaths,
    fs: fsMocks,
    process: processMocks,
    pathsConfig: pathsConfigMocks,
    tmp: tmpMocks,
    createContext: createPathMockContext,
    utils: pathTestUtils
}