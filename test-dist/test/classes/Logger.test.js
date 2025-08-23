import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../../src/Logger/index.js';
import { constructor } from '../../src/Logger/constructor.js';
import { debug } from '../../src/Logger/debug.js';
import { info } from '../../src/Logger/info.js';
import { warn } from '../../src/Logger/warn.js';
import { error } from '../../src/Logger/error.js';
import { log } from '../../src/Logger/log.js';
import { file } from '../../src/Logger/file.js';
import { TestSetup } from '../shared/testSetup.js';
import * as fs from 'fs';
import * as path from 'path';
describe('Logger Class - Complete Coverage', () => {
    let testSetup;
    let testDir;
    let logger;
    let consoleLogSpy;
    let consoleErrorSpy;
    let consoleWarnSpy;
    let fsAppendSpy;
    let fsMkdirSpy;
    beforeEach(() => {
        testSetup = new TestSetup('logger-test');
        testDir = testSetup.createTestDir('logger');
        // Spy on console methods
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        // Spy on file system methods
        fsAppendSpy = vi.spyOn(fs.promises, 'appendFile').mockResolvedValue(undefined);
        fsMkdirSpy = vi.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
        logger = new Logger();
    });
    afterEach(() => {
        testSetup.cleanup();
        vi.restoreAllMocks();
    });
    describe('constructor method', () => {
        test('should initialize Logger with default state', () => {
            const mockContext = {};
            constructor.call(mockContext);
            expect(mockContext.enabled).toBe(true);
            expect(mockContext.fileEnabled).toBe(false);
            expect(mockContext.logFile).toBeUndefined();
            expect(mockContext.logDir).toBeUndefined();
        });
        test('should initialize Logger with custom options', () => {
            const mockContext = {};
            const options = {
                enabled: false,
                fileEnabled: true,
                logFile: 'custom.log',
                logDir: '/custom/logs'
            };
            constructor.call(mockContext, options);
            expect(mockContext.enabled).toBe(false);
            expect(mockContext.fileEnabled).toBe(true);
            expect(mockContext.logFile).toBe('custom.log');
            expect(mockContext.logDir).toBe('/custom/logs');
        });
    });
    describe('debug method', () => {
        test('should log debug messages when enabled', () => {
            const mockContext = { enabled: true };
            debug.call(mockContext, 'Debug message', { extra: 'data' });
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'), 'Debug message', { extra: 'data' });
        });
        test('should not log when disabled', () => {
            const mockContext = { enabled: false };
            debug.call(mockContext, 'Debug message');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
        test('should handle multiple arguments', () => {
            const mockContext = { enabled: true };
            debug.call(mockContext, 'Message', 'arg2', 'arg3', { obj: true });
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'), 'Message', 'arg2', 'arg3', { obj: true });
        });
    });
    describe('info method', () => {
        test('should log info messages when enabled', () => {
            const mockContext = { enabled: true };
            info.call(mockContext, 'Info message');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'), 'Info message');
        });
        test('should not log when disabled', () => {
            const mockContext = { enabled: false };
            info.call(mockContext, 'Info message');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });
    describe('warn method', () => {
        test('should log warning messages when enabled', () => {
            const mockContext = { enabled: true };
            warn.call(mockContext, 'Warning message');
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'), 'Warning message');
        });
        test('should not log when disabled', () => {
            const mockContext = { enabled: false };
            warn.call(mockContext, 'Warning message');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
    });
    describe('error method', () => {
        test('should log error messages when enabled', () => {
            const mockContext = { enabled: true };
            error.call(mockContext, 'Error message');
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'), 'Error message');
        });
        test('should log Error objects', () => {
            const mockContext = { enabled: true };
            const err = new Error('Test error');
            error.call(mockContext, err);
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'), err);
        });
        test('should not log when disabled', () => {
            const mockContext = { enabled: false };
            error.call(mockContext, 'Error message');
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });
    });
    describe('log method', () => {
        test('should handle different log levels', () => {
            const mockContext = {
                enabled: true,
                debug: debug,
                info: info,
                warn: warn,
                error: error
            };
            // Test debug level
            log.call(mockContext, 'debug', 'Debug via log');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'), 'Debug via log');
            // Test info level
            log.call(mockContext, 'info', 'Info via log');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'), 'Info via log');
            // Test warn level
            log.call(mockContext, 'warn', 'Warn via log');
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'), 'Warn via log');
            // Test error level
            log.call(mockContext, 'error', 'Error via log');
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'), 'Error via log');
        });
        test('should default to info level for unknown levels', () => {
            const mockContext = {
                enabled: true,
                info: info
            };
            log.call(mockContext, 'unknown', 'Unknown level');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'), 'Unknown level');
        });
        test('should handle custom log levels', () => {
            const customMethod = vi.fn();
            const mockContext = {
                enabled: true,
                custom: customMethod,
                info: info
            };
            log.call(mockContext, 'custom', 'Custom message');
            expect(customMethod).toHaveBeenCalledWith('Custom message');
        });
    });
    describe('file method', () => {
        test('should write to file when file logging is enabled', async () => {
            const mockContext = {
                fileEnabled: true,
                logDir: testDir,
                logFile: 'test.log'
            };
            await file.call(mockContext, 'info', 'File log message');
            expect(fsMkdirSpy).toHaveBeenCalledWith(testDir, { recursive: true });
            expect(fsAppendSpy).toHaveBeenCalledWith(path.join(testDir, 'test.log'), expect.stringContaining('[INFO] File log message'));
        });
        test('should use default log directory and file', async () => {
            const mockContext = {
                fileEnabled: true
            };
            await file.call(mockContext, 'error', 'Error to file');
            expect(fsMkdirSpy).toHaveBeenCalledWith('logs', { recursive: true });
            expect(fsAppendSpy).toHaveBeenCalledWith(path.join('logs', 'air.log'), expect.stringContaining('[ERROR] Error to file'));
        });
        test('should not write to file when disabled', async () => {
            const mockContext = {
                fileEnabled: false
            };
            await file.call(mockContext, 'info', 'Should not write');
            expect(fsAppendSpy).not.toHaveBeenCalled();
        });
        test('should handle file write errors gracefully', async () => {
            const mockContext = {
                fileEnabled: true,
                logDir: testDir,
                logFile: 'test.log'
            };
            const writeError = new Error('Write failed');
            fsAppendSpy.mockRejectedValueOnce(writeError);
            // Should not throw
            await expect(file.call(mockContext, 'info', 'Will fail')).resolves.toBeUndefined();
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to write to log file:', writeError);
        });
        test('should format log entries with timestamp', async () => {
            const mockContext = {
                fileEnabled: true,
                logDir: testDir,
                logFile: 'test.log'
            };
            await file.call(mockContext, 'debug', 'Timestamped message');
            expect(fsAppendSpy).toHaveBeenCalledWith(expect.any(String), expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*\] \[DEBUG\] Timestamped message/));
        });
        test('should handle multiple arguments in file logging', async () => {
            const mockContext = {
                fileEnabled: true,
                logDir: testDir,
                logFile: 'test.log'
            };
            await file.call(mockContext, 'info', 'Message', 'arg2', { data: true });
            expect(fsAppendSpy).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('[INFO] Message arg2 {"data":true}'));
        });
    });
    describe('Logger Class Integration', () => {
        test('should delegate methods correctly', () => {
            logger.debug('Debug test');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'), 'Debug test');
            logger.info('Info test');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'), 'Info test');
            logger.warn('Warn test');
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'), 'Warn test');
            logger.error('Error test');
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'), 'Error test');
        });
        test('should handle enabling/disabling logging', () => {
            const logger = new Logger({ enabled: false });
            logger.info('Should not log');
            expect(consoleLogSpy).not.toHaveBeenCalled();
            logger.enabled = true;
            logger.info('Should log');
            expect(consoleLogSpy).toHaveBeenCalled();
        });
        test('should handle file logging configuration', async () => {
            const logger = new Logger({
                fileEnabled: true,
                logDir: testDir,
                logFile: 'integration.log'
            });
            await logger.file('info', 'Integration test');
            expect(fsAppendSpy).toHaveBeenCalledWith(path.join(testDir, 'integration.log'), expect.stringContaining('[INFO] Integration test'));
        });
        test('should support logging with multiple data types', () => {
            logger.debug('String', 123, true, null, undefined, { obj: true }, ['array']);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'), 'String', 123, true, null, undefined, { obj: true }, ['array']);
        });
        test('should handle circular references in objects', () => {
            const circular = { name: 'test' };
            circular.self = circular;
            // Should not throw
            expect(() => logger.debug('Circular:', circular)).not.toThrow();
            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });
    describe('Edge Cases and Error Scenarios', () => {
        test('should handle very long messages', () => {
            const longMessage = 'x'.repeat(10000);
            logger.info(longMessage);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'), longMessage);
        });
        test('should handle special characters in messages', () => {
            const specialChars = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~\\n\\t';
            logger.debug(specialChars);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'), specialChars);
        });
        test('should handle undefined and null arguments', () => {
            logger.info(undefined, null);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'), undefined, null);
        });
        test('should handle no arguments', () => {
            logger.info();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
        });
        test('should handle file system permission errors', async () => {
            const mockContext = {
                fileEnabled: true,
                logDir: '/root/forbidden',
                logFile: 'test.log'
            };
            const permError = new Error('EACCES: permission denied');
            fsMkdirSpy.mockRejectedValueOnce(permError);
            await file.call(mockContext, 'info', 'Permission test');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to write to log file:', permError);
        });
        test('should handle invalid file paths', async () => {
            const mockContext = {
                fileEnabled: true,
                logDir: '\0invalid\0path',
                logFile: 'test.log'
            };
            await file.call(mockContext, 'info', 'Invalid path test');
            // Should attempt to write but handle any errors
            expect(fsMkdirSpy).toHaveBeenCalled();
        });
    });
    describe('Performance and Concurrency', () => {
        test('should handle rapid consecutive logs', () => {
            for (let i = 0; i < 1000; i++) {
                logger.debug(`Message ${i}`);
            }
            expect(consoleLogSpy).toHaveBeenCalledTimes(1000);
        });
        test('should handle concurrent file writes', async () => {
            const logger = new Logger({
                fileEnabled: true,
                logDir: testDir,
                logFile: 'concurrent.log'
            });
            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(logger.file('info', `Concurrent message ${i}`));
            }
            await Promise.all(promises);
            expect(fsAppendSpy).toHaveBeenCalledTimes(100);
        });
        test('should maintain message order in file writes', async () => {
            const messages = [];
            fsAppendSpy.mockImplementation(async (file, content) => {
                messages.push(content);
            });
            const logger = new Logger({
                fileEnabled: true,
                logDir: testDir,
                logFile: 'order.log'
            });
            for (let i = 0; i < 10; i++) {
                await logger.file('info', `Message ${i}`);
            }
            for (let i = 0; i < 10; i++) {
                expect(messages[i]).toContain(`Message ${i}`);
            }
        });
    });
});
//# sourceMappingURL=Logger.test.js.map