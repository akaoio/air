/**
 * Process Mocks - For Process class and Peer lifecycle testing
 * Shared across all agents testing process-related functionality
 */
export const processMocks = {
    // Valid process info
    valid: {
        running: {
            pid: 12345,
            ppid: 1234,
            name: 'air-peer',
            cmd: 'node dist/main.js',
            cpu: 5.2,
            memory: 128 * 1024 * 1024 // 128MB
        },
        stopped: {
            pid: 0,
            ppid: 0,
            name: '',
            cmd: '',
            cpu: 0,
            memory: 0
        }
    },
    // PID file scenarios
    pidFile: {
        valid: '12345',
        invalid: 'not-a-number',
        empty: '',
        stale: '99999' // Non-existent PID
    },
    // Port scenarios
    ports: {
        available: 8765,
        occupied: 80,
        invalid: 99999,
        privileged: 443
    },
    // System command responses
    commands: {
        lsof: {
            empty: '',
            occupied: 'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nnode    12345 user   10u  IPv4  0x123      0t0  TCP *:8765 (LISTEN)',
            error: 'lsof: command not found'
        },
        ps: {
            running: '  PID  PPID COMMAND\n12345  1234 node dist/main.js',
            notFound: '  PID  PPID COMMAND',
            error: 'ps: invalid option'
        },
        kill: {
            success: '',
            notFound: 'kill: (99999): No such process',
            permission: 'kill: (1): Operation not permitted'
        }
    }
};
/**
 * Create mock context for process method testing
 */
export function createProcessMockContext(overrides = {}) {
    return {
        name: 'test-peer',
        root: '/tmp/test',
        pidFile: '/tmp/test/.test-peer.pid',
        port: 8765,
        process: null,
        ...overrides
    };
}
/**
 * Mock child process operations
 */
export const childProcessMocks = {
    spawn: {
        success: () => ({
            pid: 12345,
            stdout: { on: jest.fn(), pipe: jest.fn() },
            stderr: { on: jest.fn(), pipe: jest.fn() },
            on: jest.fn((event, callback) => {
                if (event === 'close')
                    setTimeout(() => callback(0), 10);
            }),
            kill: jest.fn()
        }),
        error: () => ({
            pid: null,
            stdout: { on: jest.fn(), pipe: jest.fn() },
            stderr: { on: jest.fn(), pipe: jest.fn() },
            on: jest.fn((event, callback) => {
                if (event === 'error')
                    setTimeout(() => callback(new Error('spawn failed')), 10);
            }),
            kill: jest.fn()
        })
    },
    exec: {
        lsofEmpty: () => jest.fn((cmd, callback) => callback(null, '', '')),
        lsofOccupied: () => jest.fn((cmd, callback) => callback(null, processMocks.commands.lsof.occupied, '')),
        error: () => jest.fn((cmd, callback) => callback(new Error('Command failed'), '', 'Error'))
    }
};
/**
 * Mock file system operations for PID files
 */
export const pidFileMocks = {
    read: {
        valid: () => jest.fn().mockReturnValue(processMocks.pidFile.valid),
        invalid: () => jest.fn().mockReturnValue(processMocks.pidFile.invalid),
        empty: () => jest.fn().mockReturnValue(processMocks.pidFile.empty),
        error: () => jest.fn().mockImplementation(() => {
            throw new Error('ENOENT: no such file or directory');
        })
    },
    write: {
        success: () => jest.fn(),
        error: () => jest.fn().mockImplementation(() => {
            throw new Error('EACCES: permission denied');
        })
    },
    exists: {
        true: () => jest.fn().mockReturnValue(true),
        false: () => jest.fn().mockReturnValue(false)
    },
    unlink: {
        success: () => jest.fn(),
        error: () => jest.fn().mockImplementation(() => {
            throw new Error('ENOENT: no such file or directory');
        })
    }
};
/**
 * Mock system information
 */
export const systemMocks = {
    platform: {
        linux: 'linux',
        windows: 'win32',
        mac: 'darwin'
    },
    user: {
        root: { uid: 0, gid: 0, username: 'root' },
        normal: { uid: 1000, gid: 1000, username: 'user' },
        nobody: { uid: 65534, gid: 65534, username: 'nobody' }
    },
    memory: {
        low: 512 * 1024 * 1024, // 512MB
        normal: 2 * 1024 * 1024 * 1024, // 2GB
        high: 16 * 1024 * 1024 * 1024 // 16GB
    }
};
//# sourceMappingURL=processMocks.js.map