/**
 * Uninstaller Class Test Mocks - System Phase
 * Comprehensive uninstallation process test data and utilities
 */
import { airConfigMocks } from './installerMocks.js';
// Uninstaller options mocks
export const uninstallerOptionMocks = {
    default: {},
    minimal: {
        force: false,
        keepData: false,
        dryRun: false
    },
    cautious: {
        force: false,
        keepData: true,
        dryRun: true
    },
    aggressive: {
        force: true,
        keepData: false,
        dryRun: false
    },
    dryRun: {
        force: false,
        keepData: true,
        dryRun: true
    }
};
// PID file scenarios
export const pidFileMocks = {
    validPid: {
        existsSync: jest.fn((filePath) => filePath.includes('.pid')),
        readFileSync: jest.fn(() => '12345'),
        unlinkSync: jest.fn(),
        readdirSync: jest.fn(() => [
            'air.json',
            '.test-peer.pid',
            '.air-backup.pid',
            'other.txt'
        ])
    },
    invalidPid: {
        existsSync: jest.fn((filePath) => filePath.includes('.pid')),
        readFileSync: jest.fn(() => 'not-a-number'),
        unlinkSync: jest.fn(),
        readdirSync: jest.fn(() => ['.test-peer.pid'])
    },
    noPid: {
        existsSync: jest.fn(() => false),
        readFileSync: jest.fn(() => {
            throw new Error('ENOENT: no such file');
        }),
        unlinkSync: jest.fn(),
        readdirSync: jest.fn(() => ['air.json'])
    },
    multiplePids: {
        existsSync: jest.fn((filePath) => filePath.includes('.test-peer.pid') ||
            filePath.includes('.air-backup.pid') ||
            filePath.includes('.air-dev.pid')),
        readFileSync: jest.fn((filePath) => {
            if (filePath.includes('.test-peer.pid'))
                return '12345';
            if (filePath.includes('.air-backup.pid'))
                return '54321';
            if (filePath.includes('.air-dev.pid'))
                return '99999';
            throw new Error('File not found');
        }),
        unlinkSync: jest.fn(),
        readdirSync: jest.fn(() => [
            'air.json',
            '.test-peer.pid',
            '.air-backup.pid',
            '.air-dev.pid',
            'other.txt'
        ])
    }
};
// Process killing scenarios
export const processKillMocks = {
    processRunning: {
        kill: jest.fn((pid, signal) => {
            if (signal === 0)
                return; // Test signal succeeds
            if (signal === 'SIGTERM' || signal === 'SIGKILL')
                return;
            throw new Error('Invalid signal');
        })
    },
    processNotRunning: {
        kill: jest.fn((pid, signal) => {
            if (signal === 0)
                throw new Error('ESRCH: No such process');
            throw new Error('Process not found');
        })
    },
    killPermissionDenied: {
        kill: jest.fn((pid, signal) => {
            throw new Error('EPERM: Operation not permitted');
        })
    },
    killTimeout: {
        kill: jest.fn((pid, signal) => {
            if (signal === 'SIGTERM')
                return; // First kill succeeds
            if (signal === 'SIGKILL')
                return; // Force kill succeeds
            if (signal === 0)
                return; // Process still running after SIGTERM
        })
    }
};
// Child process mocks for system commands
export const systemCommandMocks = {
    linux: {
        execSync: jest.fn((command) => {
            if (command.includes('pkill -f'))
                return '';
            if (command.includes('systemctl --version'))
                return 'systemd 248';
            if (command.includes('systemctl --user stop'))
                return '';
            if (command.includes('systemctl --user disable'))
                return '';
            if (command.includes('systemctl --user daemon-reload'))
                return '';
            if (command.includes('crontab -l'))
                return '@reboot /opt/air/start.sh\n# Other cron jobs';
            if (command.includes('crontab '))
                return '';
            if (command.includes('sv-disable'))
                return '';
            throw new Error('Command not found');
        })
    },
    linuxNoSystemd: {
        execSync: jest.fn((command) => {
            if (command.includes('pkill -f'))
                return '';
            if (command.includes('systemctl --version'))
                throw new Error('systemctl not found');
            if (command.includes('crontab -l'))
                return '@reboot /opt/air/start.sh';
            if (command.includes('crontab '))
                return '';
            throw new Error('Command not found');
        })
    },
    windows: {
        execSync: jest.fn((command) => {
            if (command.includes('taskkill'))
                return 'SUCCESS: Sent termination signal';
            throw new Error('Command not found');
        })
    },
    mac: {
        execSync: jest.fn((command) => {
            if (command.includes('launchctl unload'))
                return '';
            if (command.includes('pkill -f'))
                return '';
            throw new Error('Command not found');
        })
    },
    termux: {
        execSync: jest.fn((command) => {
            if (command.includes('sv-disable'))
                return '';
            if (command.includes('pkill -f'))
                return '';
            throw new Error('Command not found');
        })
    },
    commandFails: {
        execSync: jest.fn(() => {
            throw new Error('Command execution failed');
        })
    }
};
// File system mocks for service files
export const serviceFileMocks = {
    windows: {
        existsSync: jest.fn((filePath) => filePath.includes('air-test-peer.bat')),
        unlinkSync: jest.fn(),
        copyFileSync: jest.fn(),
        rmSync: jest.fn(),
        writeFileSync: jest.fn(),
        readdirSync: jest.fn(() => ['air-test-peer.bat', 'other.txt'])
    },
    mac: {
        existsSync: jest.fn((filePath) => filePath.includes('com.air.test-peer.plist')),
        unlinkSync: jest.fn(),
        copyFileSync: jest.fn(),
        rmSync: jest.fn(),
        writeFileSync: jest.fn(),
        readdirSync: jest.fn(() => ['com.air.test-peer.plist'])
    },
    linux: {
        existsSync: jest.fn((filePath) => filePath.includes('air-test-peer.service')),
        unlinkSync: jest.fn(),
        copyFileSync: jest.fn(),
        rmSync: jest.fn(),
        writeFileSync: jest.fn(),
        readdirSync: jest.fn(() => ['air-test-peer.service'])
    },
    termux: {
        existsSync: jest.fn((filePath) => filePath.includes('/var/service/test-peer')),
        unlinkSync: jest.fn(),
        copyFileSync: jest.fn(),
        rmSync: jest.fn(),
        writeFileSync: jest.fn(),
        readdirSync: jest.fn(() => ['test-peer', 'other-service'])
    },
    noService: {
        existsSync: jest.fn(() => false),
        unlinkSync: jest.fn(),
        copyFileSync: jest.fn(),
        rmSync: jest.fn(),
        writeFileSync: jest.fn(),
        readdirSync: jest.fn(() => [])
    }
};
// File cleaning scenarios
export const cleaningMocks = {
    fullClean: {
        existsSync: jest.fn((filePath) => {
            return filePath.includes('.pid') ||
                filePath.includes('air.json') ||
                filePath.includes('ddns.json') ||
                filePath.includes('ssl');
        }),
        unlinkSync: jest.fn(),
        copyFileSync: jest.fn(),
        rmSync: jest.fn(),
        readdirSync: jest.fn((dirPath) => {
            if (dirPath.includes('root')) {
                return [
                    'air.json',
                    '.test-peer.pid',
                    '.air-backup.pid',
                    'ddns.json',
                    'access.log',
                    'error.log',
                    'ssl',
                    'other.txt'
                ];
            }
            return [];
        })
    },
    selectiveClean: {
        existsSync: jest.fn((filePath) => {
            // Only PID files exist
            return filePath.includes('.pid');
        }),
        unlinkSync: jest.fn(),
        copyFileSync: jest.fn(),
        rmSync: jest.fn(),
        readdirSync: jest.fn(() => [
            '.test-peer.pid',
            'other.txt'
        ])
    },
    noFiles: {
        existsSync: jest.fn(() => false),
        unlinkSync: jest.fn(),
        copyFileSync: jest.fn(),
        rmSync: jest.fn(),
        readdirSync: jest.fn(() => ['other.txt'])
    },
    errorClean: {
        existsSync: jest.fn(() => true),
        unlinkSync: jest.fn(() => {
            throw new Error('EACCES: permission denied');
        }),
        copyFileSync: jest.fn(),
        rmSync: jest.fn(),
        readdirSync: jest.fn(() => ['.test-peer.pid'])
    }
};
// OS environment mocks
export const osEnvironmentMocks = {
    linux: {
        homedir: () => '/home/user',
        tmpdir: () => '/tmp'
    },
    linuxTermux: {
        homedir: () => '/data/data/com.termux/files/home',
        tmpdir: () => '/data/data/com.termux/files/usr/tmp'
    },
    windows: {
        homedir: () => 'C:\\Users\\user',
        tmpdir: () => 'C:\\Windows\\Temp'
    },
    mac: {
        homedir: () => '/Users/user',
        tmpdir: () => '/tmp'
    }
};
// Process environment mocks
export const processEnvironmentMocks = {
    linux: {
        platform: 'linux',
        env: {
            HOME: '/home/user'
        }
    },
    linuxTermux: {
        platform: 'linux',
        env: {
            PREFIX: '/data/data/com.termux/files/usr',
            HOME: '/data/data/com.termux/files/home'
        }
    },
    windows: {
        platform: 'win32',
        env: {
            USERPROFILE: 'C:\\Users\\user'
        }
    },
    mac: {
        platform: 'darwin',
        env: {
            HOME: '/Users/user'
        }
    }
};
// Expected results mocks
export const resultMocks = {
    stop: {
        success: { success: true, message: 'Processes stopped', stopped: true },
        nothingRunning: { success: true, message: 'No running processes found', stopped: false },
        error: { success: false, message: 'Process kill failed', stopped: false }
    },
    remove: {
        windows: { success: true, message: 'Windows startup removed', type: 'windows' },
        mac: { success: true, message: 'launchd service removed', type: 'launchd' },
        systemd: { success: true, message: 'Systemd service removed', type: 'systemd' },
        termux: { success: true, message: 'Termux service removed', type: 'termux' },
        cron: { success: true, message: 'Cron jobs removed', type: 'cron' },
        notFound: { success: true, message: 'No Windows service found', type: 'windows' },
        error: { success: false, message: 'Service removal failed' }
    },
    clean: {
        success: { success: true, message: '5 items cleaned', cleaned: 5 },
        partial: { success: true, message: '2 items cleaned', cleaned: 2 },
        nothing: { success: true, message: '0 items cleaned', cleaned: 0 },
        error: { success: false, message: 'Cleaning failed', cleaned: 2 }
    }
};
// Path mocks for different platforms
export const pathMocks = {
    join: jest.fn((...paths) => {
        const separator = paths[0]?.includes('C:') ? '\\' : '/';
        return paths.join(separator);
    }),
    resolve: jest.fn((pathStr) => pathStr),
    dirname: jest.fn((pathStr) => pathStr.replace(/[/\\][^/\\]+$/, '')),
    basename: jest.fn((pathStr) => pathStr.split(/[/\\]/).pop() || '')
};
// Create mock context for Uninstaller testing
export function createUninstallerMockContext(overrides = {}) {
    return {
        options: { ...uninstallerOptionMocks, ...overrides.options },
        pidFiles: { ...pidFileMocks, ...overrides.pidFiles },
        processKill: { ...processKillMocks, ...overrides.processKill },
        systemCommands: { ...systemCommandMocks, ...overrides.systemCommands },
        serviceFiles: { ...serviceFileMocks, ...overrides.serviceFiles },
        cleaning: { ...cleaningMocks, ...overrides.cleaning },
        osEnv: { ...osEnvironmentMocks, ...overrides.osEnv },
        processEnv: { ...processEnvironmentMocks, ...overrides.processEnv },
        results: { ...resultMocks, ...overrides.results },
        path: { ...pathMocks, ...overrides.path }
    };
}
// Utility functions for testing
export const uninstallerTestUtils = {
    // Create mock system environment
    mockSystemEnvironment: (platform) => {
        let processEnv, osEnv, systemCommands, serviceFiles;
        switch (platform) {
            case 'linux':
                processEnv = processEnvironmentMocks.linux;
                osEnv = osEnvironmentMocks.linux;
                systemCommands = systemCommandMocks.linux;
                serviceFiles = serviceFileMocks.linux;
                break;
            case 'windows':
                processEnv = processEnvironmentMocks.windows;
                osEnv = osEnvironmentMocks.windows;
                systemCommands = systemCommandMocks.windows;
                serviceFiles = serviceFileMocks.windows;
                break;
            case 'mac':
                processEnv = processEnvironmentMocks.mac;
                osEnv = osEnvironmentMocks.mac;
                systemCommands = systemCommandMocks.mac;
                serviceFiles = serviceFileMocks.mac;
                break;
            case 'termux':
                processEnv = processEnvironmentMocks.linuxTermux;
                osEnv = osEnvironmentMocks.linuxTermux;
                systemCommands = systemCommandMocks.termux;
                serviceFiles = serviceFileMocks.termux;
                break;
        }
        return { processEnv, osEnv, systemCommands, serviceFiles };
    },
    // Validate result structures
    validateStopResult: (result) => {
        expect(result).toEqual(expect.objectContaining({
            success: expect.any(Boolean),
            message: expect.any(String),
            stopped: expect.any(Boolean)
        }));
    },
    validateRemoveResult: (result) => {
        expect(result).toEqual(expect.objectContaining({
            success: expect.any(Boolean),
            message: expect.any(String)
        }));
        if (result.success) {
            expect(result.type).toBeDefined();
        }
    },
    validateCleanResult: (result) => {
        expect(result).toEqual(expect.objectContaining({
            success: expect.any(Boolean),
            message: expect.any(String),
            cleaned: expect.any(Number)
        }));
    },
    // Create temporary config for testing
    createTempConfig: (overrides = {}) => ({
        name: 'test-peer',
        root: '/test/root',
        env: 'development',
        bash: '/bin/bash',
        ...airConfigMocks.development,
        ...overrides
    }),
    // Simulate timeout scenarios
    simulateTimeout: (callback, delay = 2100) => {
        return new Promise(resolve => {
            setTimeout(() => {
                callback();
                resolve(true);
            }, delay);
        });
    },
    // Count expected file operations
    countFileOperations: (mockFs) => ({
        unlinks: mockFs.unlinkSync.mock.calls.length,
        removes: mockFs.rmSync.mock.calls.length,
        copies: mockFs.copyFileSync.mock.calls.length,
        writes: mockFs.writeFileSync.mock.calls.length
    })
};
export default {
    options: uninstallerOptionMocks,
    pidFiles: pidFileMocks,
    processKill: processKillMocks,
    systemCommands: systemCommandMocks,
    serviceFiles: serviceFileMocks,
    cleaning: cleaningMocks,
    osEnv: osEnvironmentMocks,
    processEnv: processEnvironmentMocks,
    results: resultMocks,
    path: pathMocks,
    createContext: createUninstallerMockContext,
    utils: uninstallerTestUtils
};
//# sourceMappingURL=uninstallerMocks.js.map