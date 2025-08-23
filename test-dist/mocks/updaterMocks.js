/**
 * Updater Class Test Mocks - System Phase
 * Comprehensive update process test data and utilities
 */
import { airConfigMocks } from './installerMocks.js';
// Updater options mocks
export const updaterOptionMocks = {
    default: {},
    basic: {
        autoRestart: false,
        backupBeforeUpdate: false,
        timeout: 30000
    },
    safe: {
        autoRestart: false,
        backupBeforeUpdate: true,
        timeout: 60000
    },
    aggressive: {
        autoRestart: true,
        backupBeforeUpdate: false,
        timeout: 15000
    },
    production: {
        autoRestart: true,
        backupBeforeUpdate: true,
        timeout: 120000
    }
};
// Git operation mocks
export const gitMocks = {
    validRepo: {
        execSync: jest.fn((command, options) => {
            const cwd = options?.cwd || '/test/root';
            switch (true) {
                case command.includes('git status') && !command.includes('--porcelain'):
                    return '';
                case command.includes('git status --porcelain'):
                    return '';
                case command.includes('git pull'):
                    return 'Updating abc123..def456\nFast-forward\n 3 files changed, 15 insertions(+), 8 deletions(-)';
                case command.includes('git stash'):
                    return 'Saved working directory';
                default:
                    return '';
            }
        })
    },
    upToDate: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('git status') && !command.includes('--porcelain'):
                    return '';
                case command.includes('git status --porcelain'):
                    return '';
                case command.includes('git pull'):
                    return 'Already up to date.';
                default:
                    return '';
            }
        })
    },
    withLocalChanges: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('git status') && !command.includes('--porcelain'):
                    return '';
                case command.includes('git status --porcelain'):
                    return ' M src/main.ts\n?? temp.txt';
                case command.includes('git stash'):
                    return 'Saved working directory and index state WIP on main';
                case command.includes('git pull'):
                    return 'Updating abc123..def456\n 2 files changed, 10 insertions(+), 3 deletions(-)';
                default:
                    return '';
            }
        })
    },
    notARepo: {
        execSync: jest.fn((command) => {
            if (command.includes('git status') && !command.includes('--porcelain')) {
                throw new Error('fatal: not a git repository');
            }
            return '';
        })
    },
    pullFails: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('git status') && !command.includes('--porcelain'):
                    return '';
                case command.includes('git status --porcelain'):
                    return '';
                case command.includes('git pull'):
                    throw new Error('error: Your local changes would be overwritten by merge');
                default:
                    return '';
            }
        })
    },
    networkError: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('git status') && !command.includes('--porcelain'):
                    return '';
                case command.includes('git status --porcelain'):
                    return '';
                case command.includes('git pull'):
                    throw new Error('fatal: unable to access repository: Connection refused');
                default:
                    return '';
            }
        })
    }
};
// Package manager operation mocks
export const packageMocks = {
    npm: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('npm update'):
                    return 'updated 3 packages in 2.5s\n';
                case command.includes('npm audit fix'):
                    return 'fixed 2 vulnerabilities (1 low, 1 moderate)\n';
                default:
                    return '';
            }
        }),
        isBun: false
    },
    npmNoUpdates: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('npm update'):
                    return 'up to date in 1.2s\n';
                case command.includes('npm audit fix'):
                    return 'found 0 vulnerabilities\n';
                default:
                    return '';
            }
        }),
        isBun: false
    },
    npmWithVulnerabilities: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('npm update'):
                    return 'updated 1 package in 1.8s\n';
                case command.includes('npm audit fix'):
                    return 'fixed 5 vulnerabilities (2 low, 2 moderate, 1 high)\n';
                default:
                    return '';
            }
        }),
        isBun: false
    },
    npmAuditFails: {
        execSync: jest.fn((command) => {
            switch (true) {
                case command.includes('npm update'):
                    return 'updated 2 packages in 3.1s\n';
                case command.includes('npm audit fix'):
                    throw new Error('npm audit fix failed');
                default:
                    return '';
            }
        }),
        isBun: false
    },
    bun: {
        execSync: jest.fn((command) => {
            if (command.includes('bun update')) {
                return 'bun updated packages\n';
            }
            return '';
        }),
        isBun: true,
        lockfileModified: true
    },
    bunNoUpdates: {
        execSync: jest.fn((command) => {
            if (command.includes('bun update')) {
                return 'All packages up to date\n';
            }
            return '';
        }),
        isBun: true,
        lockfileModified: false
    },
    bunFails: {
        execSync: jest.fn((command) => {
            if (command.includes('bun update')) {
                throw new Error('bun update failed');
            }
            return '';
        }),
        isBun: true
    }
};
// File system mocks for lockfile detection
export const lockfileMocks = {
    bunRecentlyModified: {
        existsSync: jest.fn((filePath) => filePath.includes('bun.lockb')),
        statSync: jest.fn(() => ({
            mtime: new Date(Date.now() - 5000) // Modified 5 seconds ago
        }))
    },
    bunNotModified: {
        existsSync: jest.fn((filePath) => filePath.includes('bun.lockb')),
        statSync: jest.fn(() => ({
            mtime: new Date(Date.now() - 60000) // Modified 1 minute ago
        }))
    },
    noLockfile: {
        existsSync: jest.fn(() => false),
        statSync: jest.fn()
    }
};
// Service restart mocks
export const restartMocks = {
    linux: {
        pidFileExists: {
            existsSync: jest.fn((filePath) => filePath.includes('.pid')),
            readFileSync: jest.fn(() => '12345'),
            unlinkSync: jest.fn()
        },
        processRunning: {
            kill: jest.fn((pid, signal) => {
                if (signal === 0)
                    return; // Test signal succeeds
                if (signal === 'SIGTERM')
                    return; // Terminate succeeds
            })
        },
        systemdUser: {
            execSync: jest.fn((command) => {
                if (command.includes('systemctl --user restart'))
                    return '';
                if (command.includes('systemctl --user is-active'))
                    return 'active';
                if (command.includes('sudo -n true'))
                    throw new Error('sudo password required');
                return '';
            })
        },
        systemdSystem: {
            execSync: jest.fn((command) => {
                if (command.includes('systemctl --user restart'))
                    throw new Error('user service not found');
                if (command.includes('sudo systemctl restart'))
                    return '';
                if (command.includes('sudo -n true'))
                    return '';
                return '';
            })
        },
        noSystemd: {
            execSync: jest.fn((command) => {
                if (command.includes('systemctl'))
                    throw new Error('systemctl not found');
                if (command.includes('sudo -n true'))
                    throw new Error('sudo not available');
                return '';
            })
        }
    },
    mac: {
        launchctl: {
            execSync: jest.fn((command) => {
                if (command.includes('launchctl stop'))
                    return '';
                if (command.includes('launchctl start'))
                    return '';
                return '';
            })
        },
        launchctlFails: {
            execSync: jest.fn((command) => {
                if (command.includes('launchctl'))
                    throw new Error('service not found');
                return '';
            })
        }
    },
    windows: {
        execSync: jest.fn(() => '') // Windows doesn't restart, just returns success
    }
};
// Process startup mocks
export const startupMocks = {
    successful: {
        existsSync: jest.fn((filePath) => {
            // PID file should exist after startup
            return filePath.includes('.pid');
        }),
        readFileSync: jest.fn(() => '54321'), // New PID
        execSync: jest.fn(),
        kill: jest.fn() // Process check succeeds
    },
    failed: {
        existsSync: jest.fn(() => false), // No PID file created
        readFileSync: jest.fn(),
        execSync: jest.fn(),
        kill: jest.fn(() => {
            throw new Error('Process not found');
        })
    },
    commandFails: {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        execSync: jest.fn(() => {
            throw new Error('Command execution failed');
        }),
        kill: jest.fn()
    }
};
// Expected results mocks
export const resultMocks = {
    git: {
        success: { success: true, message: 'Updated from repository', details: '3 files changed' },
        upToDate: { success: true, message: 'Already up to date' },
        notRepo: { success: false, message: 'Not a git repository' },
        failed: { success: false, message: 'Git update failed', details: 'Connection refused' }
    },
    packages: {
        npmSuccess: { success: true, message: '3 packages updated' },
        npmUpToDate: { success: true, message: 'All packages up to date' },
        npmWithFix: { success: true, message: 'Packages updated & vulnerabilities fixed' },
        bunSuccess: { success: true, message: 'Packages updated (Bun)' },
        bunUpToDate: { success: true, message: 'All packages up to date (Bun)' },
        failed: { success: false, message: 'Package update failed', details: 'npm update failed' }
    },
    restart: {
        success: { success: true, message: 'Process restarted' },
        systemdUser: { success: true, message: 'User service restarted' },
        systemdSystem: { success: true, message: 'System service restarted' },
        launchd: { success: true, message: 'launchd service restarted' },
        windows: { success: true, message: 'Will restart on next login' },
        notRunning: { success: false, message: 'Process not running' },
        failed: { success: false, message: 'Service restart failed' }
    }
};
// Create mock context for Updater testing
export function createUpdaterMockContext(overrides = {}) {
    return {
        options: { ...updaterOptionMocks, ...overrides.options },
        git: { ...gitMocks, ...overrides.git },
        packages: { ...packageMocks, ...overrides.packages },
        lockfiles: { ...lockfileMocks, ...overrides.lockfiles },
        restart: { ...restartMocks, ...overrides.restart },
        startup: { ...startupMocks, ...overrides.startup },
        results: { ...resultMocks, ...overrides.results }
    };
}
// Utility functions for testing
export const updaterTestUtils = {
    // Create mock system environment
    mockSystemEnvironment: (runtime, platform) => {
        return {
            isBun: runtime === 'bun',
            platform: platform === 'windows' ? 'win32' : platform === 'mac' ? 'darwin' : 'linux',
            expectedFile: runtime === 'bun' ? 'src/main.ts' : 'dist/main.js'
        };
    },
    // Validate result structures
    validateGitResult: (result) => {
        expect(result).toEqual(expect.objectContaining({
            success: expect.any(Boolean),
            message: expect.any(String)
        }));
    },
    validatePackagesResult: (result) => {
        expect(result).toEqual(expect.objectContaining({
            success: expect.any(Boolean),
            message: expect.any(String)
        }));
    },
    validateRestartResult: (result) => {
        expect(result).toEqual(expect.objectContaining({
            success: expect.any(Boolean),
            message: expect.any(String)
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
    simulateDelay: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    // Mock global Bun object
    mockBunGlobal: (exists) => {
        if (exists) {
            global.Bun = { version: '1.0.0' };
        }
        else {
            delete global.Bun;
        }
    },
    // Count different types of commands executed
    countCommands: (mockExecSync) => {
        const calls = mockExecSync.mock.calls;
        return {
            git: calls.filter(call => call[0].includes('git')).length,
            npm: calls.filter(call => call[0].includes('npm')).length,
            bun: calls.filter(call => call[0].includes('bun')).length,
            systemctl: calls.filter(call => call[0].includes('systemctl')).length,
            launchctl: calls.filter(call => call[0].includes('launchctl')).length
        };
    },
    // Check if update status is properly tracked
    validateUpdateStatus: (updater) => {
        expect(updater['updateStatus']).toEqual(expect.objectContaining({
            git: expect.any(Boolean),
            packages: expect.any(Boolean),
            restarted: expect.any(Boolean)
        }));
    }
};
export default {
    options: updaterOptionMocks,
    git: gitMocks,
    packages: packageMocks,
    lockfiles: lockfileMocks,
    restart: restartMocks,
    startup: startupMocks,
    results: resultMocks,
    createContext: createUpdaterMockContext,
    utils: updaterTestUtils
};
//# sourceMappingURL=updaterMocks.js.map