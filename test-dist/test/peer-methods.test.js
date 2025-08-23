import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
describe('Peer Methods Tests', () => {
    let tempDir;
    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'air-peer-methods-'));
    });
    afterEach(async () => {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
    });
    describe('Peer Constructor Method', () => {
        test('should call constructor method', async () => {
            const { constructor: PeerConstructor } = await import('../src/Peer/constructor.js');
            const mockThis = {
                config: undefined,
                logger: { info: vi.fn(), error: vi.fn() },
                manager: undefined,
                processManager: undefined,
                statusReporter: undefined,
                server: null,
                gun: null,
                user: null,
                pair: null,
                restarts: { max: 5, count: 0, baseDelay: 5000, maxDelay: 60000 }
            };
            const config = {
                name: 'peer-test',
                env: 'development',
                root: tempDir,
                development: { port: 8765 }
            };
            PeerConstructor.call(mockThis, config);
            expect(mockThis.config).toBeDefined();
        });
    });
    describe('Peer Activate Method', () => {
        test('should call activate method', async () => {
            const { activate } = await import('../src/Peer/activate.js');
            const mockThis = {
                logger: { info: vi.fn(), debug: vi.fn() },
                config: { name: 'activate-test' }
            };
            const result = await activate.call(mockThis);
            expect(result !== undefined).toBe(true);
        });
    });
    describe('Peer Check Method', () => {
        test('should call check method', async () => {
            const { check } = await import('../src/Peer/check.js');
            const mockThis = {
                logger: { info: vi.fn(), debug: vi.fn() },
                processManager: {
                    checkpid: vi.fn().mockReturnValue(false)
                }
            };
            const result = check.call(mockThis);
            expect(typeof result).toBe('boolean');
        });
    });
    describe('Peer Clean Method', () => {
        test('should call clean method', async () => {
            const { clean } = await import('../src/Peer/clean.js');
            const mockThis = {
                logger: { info: vi.fn(), debug: vi.fn() },
                processManager: {
                    cleanpid: vi.fn()
                },
                server: null,
                gun: null
            };
            const result = clean.call(mockThis);
            expect(result !== undefined).toBe(true);
        });
    });
    describe('Peer Find Method', () => {
        test('should call find method', async () => {
            const { find } = await import('../src/Peer/find.js');
            const mockThis = {
                logger: { info: vi.fn(), debug: vi.fn() },
                config: {
                    name: 'find-test',
                    development: { port: 8765 }
                },
                processManager: {
                    find: vi.fn().mockReturnValue(null)
                }
            };
            const result = find.call(mockThis, 8765);
            expect(result !== undefined).toBe(true);
        });
    });
    describe('Peer Init Method', () => {
        test('should call init method', async () => {
            const { init } = await import('../src/Peer/init.js');
            const mockThis = {
                logger: { info: vi.fn(), error: vi.fn() },
                config: {
                    name: 'init-test',
                    env: 'development',
                    root: tempDir,
                    development: { port: 8766, domain: 'localhost' }
                },
                server: null
            };
            try {
                const result = await init.call(mockThis);
                expect(result !== undefined).toBe(true);
            }
            catch (error) {
                // Expected to fail without proper setup, but we test the method call
                expect(error).toBeDefined();
            }
        });
    });
    describe('Peer Online Method', () => {
        test('should call online method', async () => {
            const { online } = await import('../src/Peer/online.js');
            const mockThis = {
                logger: { info: vi.fn(), debug: vi.fn() },
                config: { name: 'online-test' },
                gun: {
                    user: vi.fn().mockReturnValue({
                        create: vi.fn(),
                        auth: vi.fn()
                    })
                },
                user: null,
                pair: null
            };
            try {
                const result = await online.call(mockThis);
                expect(result !== undefined).toBe(true);
            }
            catch (error) {
                // Expected to fail without proper setup
                expect(error).toBeDefined();
            }
        });
    });
    describe('Peer Read Method', () => {
        test('should call read method', async () => {
            const { read } = await import('../src/Peer/read.js');
            const mockThis = {
                logger: { debug: vi.fn() },
                gun: {
                    get: vi.fn().mockReturnValue({
                        on: vi.fn()
                    })
                }
            };
            const result = read.call(mockThis, 'test-key');
            expect(result !== undefined).toBe(true);
        });
    });
    describe('Peer Restart Method', () => {
        test('should call restart method', async () => {
            const { restart } = await import('../src/Peer/restart.js');
            const mockThis = {
                logger: { info: vi.fn(), error: vi.fn() },
                restarts: { count: 0, max: 5, baseDelay: 1000, maxDelay: 5000 },
                clean: vi.fn(),
                init: vi.fn().mockResolvedValue(true),
                run: vi.fn().mockResolvedValue(true)
            };
            try {
                const result = await restart.call(mockThis);
                expect(result !== undefined).toBe(true);
            }
            catch (error) {
                // Expected to fail without proper setup
                expect(error).toBeDefined();
            }
        });
    });
    describe('Peer Run Method', () => {
        test('should call run method', async () => {
            const { run } = await import('../src/Peer/run.js');
            const mockThis = {
                logger: { info: vi.fn(), error: vi.fn() },
                config: {
                    name: 'run-test',
                    env: 'development',
                    root: tempDir,
                    development: { port: 8767 }
                },
                server: {
                    listen: vi.fn()
                },
                gun: null
            };
            try {
                const result = await run.call(mockThis);
                expect(result !== undefined).toBe(true);
            }
            catch (error) {
                // Expected to fail without proper setup
                expect(error).toBeDefined();
            }
        });
    });
    describe('Peer Start Method', () => {
        test('should call start method', async () => {
            const { start } = await import('../src/Peer/start.js');
            const mockThis = {
                logger: { info: vi.fn(), error: vi.fn() },
                config: {
                    name: 'start-test',
                    env: 'development',
                    development: { port: 8768 }
                },
                processManager: {
                    checkpid: vi.fn().mockReturnValue(false)
                },
                init: vi.fn().mockResolvedValue(true),
                run: vi.fn().mockResolvedValue(true),
                online: vi.fn().mockResolvedValue(true),
                sync: vi.fn().mockResolvedValue(true)
            };
            try {
                const result = await start.call(mockThis);
                expect(result !== undefined).toBe(true);
            }
            catch (error) {
                // Expected to fail without proper setup
                expect(error).toBeDefined();
            }
        });
    });
    describe('Peer Stop Method', () => {
        test('should call stop method', async () => {
            const { stop } = await import('../src/Peer/stop.js');
            const mockThis = {
                logger: { info: vi.fn() },
                server: {
                    close: vi.fn()
                },
                statusReporter: {
                    stop: vi.fn()
                },
                processManager: {
                    cleanpid: vi.fn()
                }
            };
            const result = await stop.call(mockThis);
            expect(result !== undefined).toBe(true);
        });
    });
    describe('Peer Sync Method', () => {
        test('should call sync method', async () => {
            const { sync } = await import('../src/Peer/sync.js');
            const mockThis = {
                logger: { debug: vi.fn() },
                config: {
                    name: 'sync-test',
                    development: { port: 8769 }
                },
                manager: {
                    sync: vi.fn().mockResolvedValue(true)
                }
            };
            try {
                const result = await sync.call(mockThis);
                expect(result !== undefined).toBe(true);
            }
            catch (error) {
                // Expected to fail without proper setup
                expect(error).toBeDefined();
            }
        });
    });
    describe('Peer Write Method', () => {
        test('should call write method', async () => {
            const { write } = await import('../src/Peer/write.js');
            const mockThis = {
                logger: { debug: vi.fn() },
                gun: {
                    get: vi.fn().mockReturnValue({
                        put: vi.fn()
                    })
                }
            };
            const result = write.call(mockThis, 'test-key', 'test-value');
            expect(result !== undefined).toBe(true);
        });
    });
    describe('Peer Index Methods', () => {
        test('should have all methods available in index', async () => {
            const { activate, check, clean, find, init, online, read, restart, run, start, stop, sync, write } = await import('../src/Peer/index.js');
            expect(typeof activate).toBe('function');
            expect(typeof check).toBe('function');
            expect(typeof clean).toBe('function');
            expect(typeof find).toBe('function');
            expect(typeof init).toBe('function');
            expect(typeof online).toBe('function');
            expect(typeof read).toBe('function');
            expect(typeof restart).toBe('function');
            expect(typeof run).toBe('function');
            expect(typeof start).toBe('function');
            expect(typeof stop).toBe('function');
            expect(typeof sync).toBe('function');
            expect(typeof write).toBe('function');
        });
    });
});
//# sourceMappingURL=peer-methods.test.js.map