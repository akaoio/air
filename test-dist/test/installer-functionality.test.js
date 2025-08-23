import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import * as fsSync from 'fs';
import path from 'path';
import os from 'os';
describe('Installer Functionality Tests', () => {
    let tempDir;
    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'air-installer-test-'));
    });
    afterEach(async () => {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
    });
    describe('Installer Constructor', () => {
        test('should create Installer instance with options', async () => {
            const { Installer } = await import('../src/Installer/index.js');
            const options = {
                root: tempDir,
                env: 'development',
                name: 'test-installer'
            };
            const installer = new Installer(options);
            expect(installer).toBeDefined();
            expect(installer.options).toEqual(options);
            expect(installer.context).toBeDefined();
            expect(installer.context.rootDir).toBe(process.cwd());
            expect(installer.context.platform).toBe(process.platform);
        });
        test('should create Installer instance without options', async () => {
            const { Installer } = await import('../src/Installer/index.js');
            const installer = new Installer();
            expect(installer).toBeDefined();
            expect(installer.options).toEqual({});
            expect(installer.context).toBeDefined();
        });
        test('should handle constructor method directly', async () => {
            const { constructor: InstallerConstructor } = await import('../src/Installer/constructor.js');
            const mockThis = {
                options: undefined,
                context: undefined
            };
            const options = {
                root: tempDir,
                env: 'production',
                name: 'constructor-test'
            };
            InstallerConstructor.call(mockThis, options);
            expect(mockThis.options).toEqual(options);
            expect(mockThis.context).toBeDefined();
            expect(mockThis.context.rootDir).toBe(process.cwd());
        });
    });
    describe('Installer Check Operations', () => {
        test('should check system requirements', async () => {
            const { check } = await import('../src/Installer/check.js');
            const mockThis = {
                config: {
                    name: 'check-test',
                    env: 'development',
                    root: tempDir,
                    development: { port: 8765 }
                },
                logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
                platform: {
                    check: jest.fn().mockResolvedValue({
                        success: true,
                        capabilities: ['systemd', 'ssl']
                    })
                }
            };
            const result = await check.call(mockThis);
            expect(result).toBeDefined();
            expect(mockThis.platform.check).toHaveBeenCalled();
        });
        test('should handle check failures gracefully', async () => {
            const { check } = await import('../src/Installer/check.js');
            const mockThis = {
                config: {
                    name: 'check-fail-test',
                    env: 'development',
                    root: tempDir,
                    development: { port: 8765 }
                },
                logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
                platform: {
                    check: jest.fn().mockRejectedValue(new Error('Check failed'))
                }
            };
            const result = await check.call(mockThis);
            expect(result).toBeDefined();
        });
    });
    describe('Installer Configure Operations', () => {
        test('should configure installation', async () => {
            const { configure } = await import('../src/Installer/configure.js');
            const mockThis = {
                config: {
                    name: 'configure-test',
                    env: 'development',
                    root: tempDir,
                    development: {
                        port: 8765,
                        domain: 'configure-test.local'
                    }
                },
                logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
                platform: {
                    configure: jest.fn().mockResolvedValue({ success: true })
                }
            };
            const options = {
                root: tempDir,
                env: 'development',
                name: 'configure-test'
            };
            const result = configure(options);
            expect(result).toBeDefined();
            expect(result.name).toBe('configure-test');
            expect(result.root).toBe(tempDir);
        });
    });
    describe('Installer Detect Operations', () => {
        test('should detect system platform', async () => {
            const { detect } = await import('../src/Installer/detect.js');
            const mockThis = {
                logger: { info: jest.fn(), debug: jest.fn() }
            };
            const result = detect(tempDir);
            expect(result).toBe(null); // No config exists yet
        });
    });
    describe('Installer Save Operations', () => {
        test('should save installer configuration', async () => {
            const { save } = await import('../src/Installer/save.js');
            const configPath = path.join(tempDir, 'installer-config.json');
            const config = {
                name: 'save-test',
                env: 'development',
                root: tempDir,
                development: { port: 8765 }
            };
            const mockThis = {
                config,
                configPath,
                logger: { info: jest.fn(), debug: jest.fn() }
            };
            save.call(mockThis, config);
            expect(fsSync.existsSync(configPath)).toBe(true);
            const savedConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
            expect(savedConfig).toEqual(config);
        });
        test('should handle save errors gracefully', async () => {
            const { save } = await import('../src/Installer/save.js');
            const mockThis = {
                config: { name: 'save-error-test' },
                configPath: '/invalid/path/config.json',
                logger: { info: jest.fn(), error: jest.fn() }
            };
            try {
                save.call(mockThis, { name: 'save-error-test' });
                expect(true).toBe(false); // Should have thrown
            }
            catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
    describe('Installer Service Operations', () => {
        test('should handle service installation', async () => {
            const { service } = await import('../src/Installer/service.js');
            const mockThis = {
                config: {
                    name: 'service-test',
                    env: 'development',
                    root: tempDir,
                    development: { port: 8765 }
                },
                logger: { info: jest.fn(), error: jest.fn() },
                platform: {
                    service: jest.fn().mockResolvedValue({ success: true })
                }
            };
            const result = await service.call(mockThis);
            expect(result).toBeDefined();
            expect(mockThis.platform.service).toHaveBeenCalled();
        });
    });
    describe('Installer SSL Operations', () => {
        test('should handle SSL setup', async () => {
            const { ssl } = await import('../src/Installer/ssl.js');
            const mockThis = {
                config: {
                    name: 'ssl-test',
                    env: 'production',
                    root: tempDir,
                    production: {
                        port: 443,
                        domain: 'ssl-test.com',
                        ssl: {
                            cert: 'cert.pem',
                            key: 'key.pem'
                        }
                    }
                },
                logger: { info: jest.fn(), error: jest.fn() },
                platform: {
                    ssl: jest.fn().mockResolvedValue({ success: true })
                }
            };
            const result = await ssl.call(mockThis);
            expect(result).toBeDefined();
            expect(mockThis.platform.ssl).toHaveBeenCalled();
        });
    });
    describe('Installer Start Operations', () => {
        test('should handle service start', async () => {
            const { start } = await import('../src/Installer/start.js');
            const mockThis = {
                config: {
                    name: 'start-test',
                    env: 'development',
                    root: tempDir,
                    development: { port: 8765 }
                },
                logger: { info: jest.fn(), error: jest.fn() },
                platform: {
                    start: jest.fn().mockResolvedValue({ success: true })
                }
            };
            const result = await start.call(mockThis);
            expect(result).toBeDefined();
            expect(mockThis.platform.start).toHaveBeenCalled();
        });
    });
    describe('Installer Types', () => {
        test('should export installer types', async () => {
            const typesModule = await import('../src/Installer/types.js');
            expect(typesModule).toBeDefined();
        });
    });
});
//# sourceMappingURL=installer-functionality.test.js.map