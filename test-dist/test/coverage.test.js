/**
 * Test để đo độ phủ coverage từ built files
 * Sử dụng vitest để generate coverage report
 */
import { describe, it, expect } from 'vitest';
import { Peer, Config, Manager, Logger, Reporter, Process } from '../dist/index.js';
describe('Air Package Coverage Tests', () => {
    describe('Core Classes', () => {
        it('should create Peer instance', () => {
            const peer = new Peer({ skipPidCheck: true });
            expect(peer).toBeDefined();
            expect(peer.constructor.name).toBe('Peer');
        });
        it('should create Config instance', () => {
            const config = new Config();
            expect(config).toBeDefined();
            expect(config.constructor.name).toBe('Config');
        });
        it('should create Manager instance', () => {
            const manager = new Manager();
            expect(manager).toBeDefined();
            expect(manager.constructor.name).toBe('Manager');
        });
        it('should create Logger instance', () => {
            const logger = new Logger('test');
            expect(logger).toBeDefined();
            expect(logger.constructor.name).toBe('Logger');
        });
        it('should create Reporter instance', () => {
            const reporter = new Reporter();
            expect(reporter).toBeDefined();
            expect(reporter.constructor.name).toBe('Reporter');
        });
        it('should create Process instance', () => {
            const process = new Process();
            expect(process).toBeDefined();
            expect(process.constructor.name).toBe('Process');
        });
    });
    describe('Configuration Management', () => {
        it('should read default configuration', () => {
            const manager = new Manager();
            const config = manager.read();
            expect(config).toBeDefined();
            expect(config.name).toBeDefined();
            expect(config.env).toBeDefined();
            expect(config.root).toBeDefined();
        });
        it('should validate configuration', () => {
            const manager = new Manager();
            const config = manager.read();
            const result = manager.validate(config);
            expect(result).toBeDefined();
            expect(result.valid).toBeDefined();
            expect(result.errors).toBeDefined();
        });
        it('should merge configurations', () => {
            const manager = new Manager();
            const defaults = manager.defaults();
            const custom = { name: 'custom-air' };
            const merged = manager.mergeenv({ ...defaults, ...custom });
            expect(merged.name).toBe('custom-air');
        });
    });
    describe('Process Management', () => {
        it('should manage PID file paths', () => {
            const process = new Process({ name: 'test-air' });
            const pidFile = process.getpidfile();
            expect(pidFile).toBeDefined();
            expect(typeof pidFile).toBe('string');
            expect(pidFile).toContain('.pid');
        });
        it('should check if process is running', () => {
            const process = new Process();
            const isRunning = process.isrunning(process.pid || 1);
            expect(typeof isRunning).toBe('boolean');
        });
    });
    describe('Logging System', () => {
        it('should create logger with name', () => {
            const logger = new Logger('coverage-test');
            expect(logger.name).toBe('coverage-test');
        });
        it('should log messages at different levels', () => {
            const logger = new Logger('test');
            // These should not throw
            expect(() => logger.info('Test info message')).not.toThrow();
            expect(() => logger.warn('Test warn message')).not.toThrow();
            expect(() => logger.error('Test error message')).not.toThrow();
            expect(() => logger.debug('Test debug message')).not.toThrow();
        });
    });
    describe('Network Operations', () => {
        it('should access IP validation through Peer', () => {
            const peer = new Peer({ skipPidCheck: true });
            expect(peer.ip).toBeDefined();
            expect(peer.ip.validate).toBeDefined();
            expect(typeof peer.ip.validate).toBe('function');
            // Test IP validation
            expect(peer.ip.validate('8.8.8.8')).toBe(true);
            expect(peer.ip.validate('192.168.1.1')).toBe(false); // Private IP
            expect(peer.ip.validate('invalid')).toBe(false);
        });
        it('should have IP get method', () => {
            const peer = new Peer({ skipPidCheck: true });
            expect(peer.ip.get).toBeDefined();
            expect(typeof peer.ip.get).toBe('function');
        });
    });
    describe('Configuration Loading', () => {
        it('should load default config values', () => {
            const config = new Config();
            const defaults = config.defaults();
            expect(defaults).toBeDefined();
            expect(defaults.name).toBeDefined();
            expect(defaults.env).toBeDefined();
            expect(defaults.development).toBeDefined();
            expect(defaults.production).toBeDefined();
            expect(defaults.ip).toBeDefined();
        });
        it('should validate config structure', () => {
            const config = new Config();
            const testConfig = {
                name: 'test',
                env: 'development',
                root: '/tmp',
                development: {
                    port: 8765,
                    domain: 'localhost',
                    peers: []
                }
            };
            const isValid = config.validate(testConfig);
            expect(typeof isValid).toBe('boolean');
        });
    });
    describe('Status Reporting', () => {
        it('should create reporter with options', () => {
            const reporter = new Reporter({ interval: 5000 });
            expect(reporter).toBeDefined();
        });
        it('should have all required methods', () => {
            const reporter = new Reporter();
            expect(reporter.start).toBeDefined();
            expect(reporter.stop).toBeDefined();
            expect(reporter.alive).toBeDefined();
            expect(reporter.ip).toBeDefined();
            expect(reporter.ddns).toBeDefined();
            expect(reporter.report).toBeDefined();
            expect(reporter.activate).toBeDefined();
            expect(reporter.get).toBeDefined();
            expect(reporter.config).toBeDefined();
            expect(reporter.user).toBeDefined();
        });
    });
    describe('Build Output Integration', () => {
        it('should export all main classes', () => {
            expect(Peer).toBeDefined();
            expect(Config).toBeDefined();
            expect(Manager).toBeDefined();
            expect(Logger).toBeDefined();
            expect(Reporter).toBeDefined();
            expect(Process).toBeDefined();
        });
        it('should instantiate classes from built output', () => {
            // Test that we can create instances from the built JS files
            const instances = [
                new Peer({ skipPidCheck: true }),
                new Config(),
                new Manager(),
                new Logger('build-test'),
                new Reporter(),
                new Process()
            ];
            instances.forEach(instance => {
                expect(instance).toBeDefined();
                expect(instance.constructor).toBeDefined();
            });
        });
    });
});
//# sourceMappingURL=coverage.test.js.map