import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
describe('DDNS Functionality Tests', () => {
    let tempDir;
    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'air-ddns-test-'));
    });
    afterEach(async () => {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
    });
    describe('DDNS Constructor', () => {
        test('should create DDNS instance with config', async () => {
            const { DDNS } = await import('../src/DDNS/index.js');
            const config = {
                name: 'test-ddns',
                env: 'development',
                development: {
                    port: 8765,
                    domain: 'test.local',
                    godaddy: {
                        key: 'test-key',
                        secret: 'test-secret'
                    }
                }
            };
            const ddns = new DDNS(config);
            expect(ddns).toBeDefined();
            expect(ddns.config).toEqual(config);
        });
        test('should handle constructor with minimal config', async () => {
            const { constructor: DDNSConstructor } = await import('../src/DDNS/constructor.js');
            const mockThis = {
                config: undefined,
                logger: { info: vi.fn(), error: vi.fn() }
            };
            const config = {
                name: 'minimal-test',
                env: 'development',
                development: { port: 8765 }
            };
            DDNSConstructor.call(mockThis, config);
            expect(mockThis.config).toEqual(config);
        });
    });
    describe('DDNS Detection', () => {
        test('should detect IP addresses (not DDNS providers)', async () => {
            const { detect } = await import('../src/DDNS/detect.js');
            // DDNS detect is for IP detection, not provider detection
            const result = await detect();
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect('ipv4' in result).toBe(true);
            expect('ipv6' in result).toBe(true);
        });
        test('should handle IP detection gracefully', async () => {
            const { detect } = await import('../src/DDNS/detect.js');
            // Should return IPResult structure regardless
            const result = await detect();
            expect(result).toBeDefined();
            expect(result.ipv4 === null || typeof result.ipv4 === 'string').toBe(true);
            expect(result.ipv6 === null || typeof result.ipv6 === 'string').toBe(true);
        });
    });
    describe('DDNS State Management', () => {
        test('should save DDNS state to file', async () => {
            const { save } = await import('../src/DDNS/state.js');
            const state = {
                lastUpdate: Date.now(),
                lastIP: '1.2.3.4',
                providers: ['godaddy']
            };
            // Mock process.cwd to return our temp directory
            const originalCwd = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
            try {
                save.call({}, state);
                const savedState = JSON.parse(await fs.readFile(path.join(tempDir, 'ddns.json'), 'utf8'));
                expect(savedState).toEqual(state);
            }
            finally {
                originalCwd.mockRestore();
            }
        });
        test('should load DDNS state from file', async () => {
            const { load } = await import('../src/DDNS/state.js');
            const state = {
                lastUpdate: 1234567890,
                lastIP: '5.6.7.8',
                providers: ['godaddy', 'cloudflare']
            };
            // Mock process.cwd to return our temp directory
            const originalCwd = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
            try {
                await fs.writeFile(path.join(tempDir, 'ddns.json'), JSON.stringify(state));
                const result = load.call({});
                expect(result).toEqual(state);
            }
            finally {
                originalCwd.mockRestore();
            }
        });
        test('should handle missing state file gracefully', async () => {
            const { load } = await import('../src/DDNS/state.js');
            // Mock process.cwd to return our temp directory (no ddns.json file exists)
            const originalCwd = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
            try {
                const result = load.call({});
                expect(result).toBeNull();
            }
            finally {
                originalCwd.mockRestore();
            }
        });
    });
    describe('DDNS Update Operations', () => {
        test('should perform DDNS update', async () => {
            const { update } = await import('../src/DDNS/update.js');
            const mockThis = {
                config: {
                    name: 'update-test',
                    env: 'development',
                    development: {
                        port: 8765,
                        domain: 'test.example.com',
                        godaddy: {
                            key: 'mock-key',
                            secret: 'mock-secret'
                        }
                    }
                },
                logger: {
                    info: vi.fn(),
                    error: vi.fn(),
                    debug: vi.fn()
                },
                detect: vi.fn().mockReturnValue(['godaddy']),
                save: vi.fn().mockResolvedValue(true)
            };
            const ip = '9.10.11.12';
            // Mock fetch to avoid real API calls
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
            const result = await update.call(mockThis, ip);
            expect(Array.isArray(result)).toBe(true);
        });
        test('should handle update without providers', async () => {
            const { update } = await import('../src/DDNS/update.js');
            const mockThis = {
                config: {
                    name: 'no-provider-test',
                    env: 'development',
                    development: { port: 8765 }
                },
                logger: { info: vi.fn(), error: vi.fn() },
                detect: vi.fn().mockReturnValue([]),
                save: vi.fn().mockResolvedValue(true)
            };
            const result = await update.call(mockThis, '1.1.1.1');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });
    });
    describe('DDNS Types', () => {
        test('should export DDNS types', async () => {
            const typesModule = await import('../src/DDNS/types.js');
            expect(typesModule).toBeDefined();
        });
    });
});
//# sourceMappingURL=ddns-functionality.test.js.map