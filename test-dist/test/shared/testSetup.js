/**
 * Shared Test Setup - Foundation for all test suites
 * Used by all agents for consistent testing infrastructure
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
export class TestSetup {
    baseDir;
    testDirs = new Map();
    constructor(testName = 'air-test') {
        this.baseDir = path.join(os.tmpdir(), `${testName}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        this.ensureBaseDir();
    }
    /**
     * Create a unique test directory for a specific test suite
     */
    createTestDir(suiteName) {
        const testDir = path.join(this.baseDir, suiteName);
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        this.testDirs.set(suiteName, testDir);
        return testDir;
    }
    /**
     * Get test directory for a suite
     */
    getTestDir(suiteName) {
        return this.testDirs.get(suiteName) || this.createTestDir(suiteName);
    }
    /**
     * Create a test config file
     */
    createTestConfig(dir, config) {
        const configPath = path.join(dir, 'air.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return configPath;
    }
    /**
     * Create test files for various scenarios
     */
    createTestFiles(dir) {
        return {
            validConfig: this.createTestConfig(dir, {
                name: 'test-peer',
                env: 'test',
                test: {
                    port: 8765,
                    peers: []
                }
            }),
            invalidConfig: this.createCorruptedFile(dir, 'invalid.json', '{ invalid json'),
            emptyConfig: this.createTestConfig(dir, {}),
            largeConfig: this.createTestConfig(dir, {
                name: 'large-test',
                data: 'x'.repeat(10000)
            })
        };
    }
    /**
     * Create a corrupted file for error testing
     */
    createCorruptedFile(dir, filename, content) {
        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, content);
        return filePath;
    }
    /**
     * Create PID file for process testing
     */
    createPidFile(dir, name, pid) {
        const pidPath = path.join(dir, `.${name}.pid`);
        fs.writeFileSync(pidPath, pid.toString());
        return pidPath;
    }
    /**
     * Cleanup all test directories
     */
    cleanup() {
        try {
            if (fs.existsSync(this.baseDir)) {
                fs.rmSync(this.baseDir, { recursive: true, force: true });
            }
        }
        catch (error) {
            console.warn('Cleanup failed:', error);
        }
    }
    /**
     * Get base test directory
     */
    getBaseDir() {
        return this.baseDir;
    }
    ensureBaseDir() {
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }
}
//# sourceMappingURL=testSetup.js.map