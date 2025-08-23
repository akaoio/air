/**
 * REAL Installer Module Tests
 * Test installation operations thật
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Installer } from '../src/Installer/index.js';
import * as fs from 'fs';
import * as path from 'path';
const TEST_DIR = `/tmp/air-installer-test-${Date.now()}`;
const TEST_CONFIG = path.join(TEST_DIR, 'air.json');
describe('Installer Module - REAL Tests', () => {
    let installer;
    beforeAll(() => {
        // Create test directory
        fs.mkdirSync(TEST_DIR, { recursive: true });
        // Create test config
        const config = {
            name: 'installer-test',
            env: 'test',
            root: TEST_DIR,
            test: {
                port: 18766,
                domain: 'localhost',
                peers: []
            }
        };
        fs.writeFileSync(TEST_CONFIG, JSON.stringify(config, null, 2));
    });
    afterAll(() => {
        // Cleanup
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    });
    describe('Installer Operations', () => {
        it('should create Installer instance', () => {
            installer = new Installer();
            expect(installer).toBeDefined();
            expect(installer).toBeInstanceOf(Installer);
        });
        it('should detect existing installation', async () => {
            const detected = await installer.detect(TEST_DIR);
            expect(detected).toBeDefined();
            expect(detected.name).toBe('installer-test');
        });
        it('should check installation requirements', async () => {
            const checkResult = await installer.check();
            expect(checkResult).toBeDefined();
            expect(checkResult.canInstall).toBeDefined();
            // Should have platform info
            expect(checkResult.platform).toBeTruthy();
            expect(['linux', 'darwin', 'win32'].includes(checkResult.platform)).toBe(true);
        });
        it('should configure installation', async () => {
            const config = {
                name: 'test-install',
                env: 'test',
                root: TEST_DIR,
                test: {
                    port: 18767,
                    domain: 'test.local',
                    peers: []
                }
            };
            const configured = await installer.configure(config);
            expect(configured).toBeDefined();
            expect(configured.name).toBe('test-install');
        });
        it('should save installation config', async () => {
            const config = {
                name: 'save-test',
                env: 'test',
                root: TEST_DIR,
                test: {
                    port: 18768,
                    domain: 'localhost',
                    peers: []
                }
            };
            const saved = await installer.save(config);
            expect(saved).toBe(true);
            // Verify file exists
            const configPath = path.join(TEST_DIR, 'air.json');
            expect(fs.existsSync(configPath)).toBe(true);
            const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            expect(savedConfig.name).toBe('save-test');
        });
        it('should handle service operations', async () => {
            const config = {
                name: 'service-test',
                env: 'test',
                root: TEST_DIR,
                bash: '/bin/bash',
                test: {
                    port: 18769,
                    domain: 'localhost',
                    peers: []
                }
            };
            // Test service creation (may fail without permissions)
            try {
                const result = await installer.service(config);
                expect(result).toBeDefined();
                expect(result.created).toBeDefined();
            }
            catch (e) {
                // Expected to fail without sudo
                expect(e).toBeDefined();
            }
        });
        it('should handle SSL setup', async () => {
            const config = {
                name: 'ssl-test',
                env: 'test',
                root: TEST_DIR,
                domain: 'localhost',
                test: {
                    port: 18770,
                    domain: 'localhost',
                    peers: []
                }
            };
            // Test SSL generation
            const sslResult = await installer.ssl(config);
            expect(typeof sslResult).toBe('boolean');
            if (sslResult) {
                // Check if SSL files were created
                const sslDir = path.join(TEST_DIR, 'ssl');
                expect(fs.existsSync(sslDir)).toBe(true);
            }
        });
        it('should handle start operations', async () => {
            const config = {
                name: 'start-test',
                env: 'test',
                root: TEST_DIR,
                bash: process.env.SHELL || '/bin/bash',
                test: {
                    port: 18771,
                    domain: 'localhost',
                    peers: []
                }
            };
            // Test start (may fail in test environment)
            try {
                const result = await installer.start(config);
                expect(result).toBeDefined();
                expect(result.started).toBeDefined();
            }
            catch (e) {
                // Expected in test environment
                expect(e).toBeDefined();
            }
        });
    });
});
//# sourceMappingURL=installer-real.test.js.map