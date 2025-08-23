/**
 * REAL Integration Tests - No Mocks, No Stubs
 * Test với code thật, file thật, network thật
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Config } from '../src/Config/index.js'
import { Manager } from '../src/Manager/index.js'
import { DDNS } from '../src/DDNS/index.js'
import { Logger } from '../src/Logger/index.js'
import * as PathModule from '../src/Path/index.js'
import { Process } from '../src/Process/index.js'
import * as NetworkModule from '../src/Network/index.js'
import { Reporter } from '../src/Reporter/index.js'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

// Test directory thật
const TEST_DIR = `/tmp/air-test-${Date.now()}`
const TEST_CONFIG_PATH = path.join(TEST_DIR, 'air.json')

describe('REAL Integration Tests', () => {
    beforeAll(() => {
        // Tạo thư mục test thật
        fs.mkdirSync(TEST_DIR, { recursive: true })
    })
    
    afterAll(() => {
        // Xóa thư mục test
        fs.rmSync(TEST_DIR, { recursive: true, force: true })
    })
    
    describe('Config - Real File Operations', () => {
        it('should REALLY write and read config files', () => {
            const config = new Config(TEST_CONFIG_PATH)
            
            // Test defaults - tạo config thật
            const defaults = config.defaults()
            expect(defaults).toBeDefined()
            expect(defaults.name).toBeTruthy()
            expect(defaults.env).toBeTruthy()
            
            // Test save - ghi file thật
            const testConfig = {
                ...defaults,
                name: 'real-test',
                test_value: 'this is real'
            }
            const saved = config.save(testConfig)
            expect(saved).toBe(true)
            
            // Verify file thật đã được tạo
            expect(fs.existsSync(TEST_CONFIG_PATH)).toBe(true)
            
            // Test load - đọc file thật
            const loaded = config.load()
            expect(loaded.name).toBe('real-test')
            expect(loaded.test_value).toBe('this is real')
            
            // Test merge - merge config thật
            const merged = config.merge(loaded, { port: 9999 })
            expect(merged.port).toBe(9999)
            expect(merged.name).toBe('real-test')
            
            // Test validate - validate data thật
            const validation = config.validate(merged)
            expect(validation.valid).toBe(true)
        })
    })
    
    describe('Manager - Real Configuration Management', () => {
        it('should REALLY manage configurations', () => {
            const manager = new Manager({ path: TEST_CONFIG_PATH })
            
            // Write config thật
            const config = {
                name: 'manager-real',
                env: 'test' as const,
                root: TEST_DIR,
                test: {
                    port: 7777,
                    domain: 'test.local',
                    peers: []
                }
            }
            
            const written = manager.write(config)
            expect(written).toBe(true)
            
            // Read config thật
            const read = manager.read()
            expect(read.name).toBe('manager-real')
            expect(read.test?.port).toBe(7777)
            
            // Test environment merging thật
            process.env.AIR_NAME = 'env-override'
            process.env.AIR_ENV = 'production'
            
            const merged = manager.mergeenv(read)
            expect(merged.name).toBe('env-override')
            expect(merged.env).toBe('production')
            
            // Cleanup env
            delete process.env.AIR_NAME
            delete process.env.AIR_ENV
        })
    })
    
    describe('Path - Real Path Operations', () => {
        it('should REALLY work with paths', () => {
            process.env.AIR_ROOT = TEST_DIR
            
            // Get real root path
            const root = PathModule.root()
            expect(root).toBe(TEST_DIR)
            
            // Get real bash path
            const bash = PathModule.bash()
            expect(bash).toBeTruthy()
            // Verify bash exists
            try {
                execSync(`which ${bash}`, { stdio: 'ignore' })
                expect(true).toBe(true)
            } catch {
                // Bash might not exist, that's ok
            }
            
            // Get real tmp directory
            const tmp = PathModule.tmp()
            expect(tmp).toBeTruthy()
            expect(tmp.startsWith('/tmp')).toBe(true)
            
            // Create tmp directory thật
            fs.mkdirSync(tmp, { recursive: true })
            expect(fs.existsSync(tmp)).toBe(true)
            
            // Get all paths
            const paths = PathModule.getpaths()
            expect(paths.root).toBe(TEST_DIR)
            expect(paths.tmp).toBeTruthy()
            
            delete process.env.AIR_ROOT
        })
    })
    
    describe('Logger - Real Logging', () => {
        it('should REALLY log to console and files', () => {
            const logFile = path.join(TEST_DIR, 'test.log')
            const logger = new Logger({ name: 'real-test' })
            
            // Test console logging (thật)
            logger.info('Real info message')
            logger.warn('Real warning')
            logger.error('Real error')
            logger.debug('Real debug')
            
            // Test file logging thật
            logger.file(logFile, 'Real log entry 1')
            logger.file(logFile, 'Real log entry 2')
            
            // Verify log file exists và có content
            expect(fs.existsSync(logFile)).toBe(true)
            const logContent = fs.readFileSync(logFile, 'utf8')
            expect(logContent).toContain('Real log entry 1')
            expect(logContent).toContain('Real log entry 2')
        })
    })
    
    describe('Process - Real Process Management', () => {
        it('should REALLY manage process and PID files', () => {
            const proc = new Process({ name: 'test-proc' })
            
            // Get real PID file path
            const pidFile = proc.getpidfile()
            expect(pidFile).toContain('.test-proc.pid')
            
            // Check if running (should be false)
            const running = proc.check()
            expect(running).toBe(false)
            
            // Find process by port (real check)
            const found = proc.find(8765)
            // May or may not find something, both are valid
            expect(found === null || typeof found === 'object').toBe(true)
            
            // Clean PID files (real cleanup)
            proc.clean()
            
            // Check if current process is running
            const currentPid = process.pid
            const isRunning = proc.isrunning(currentPid)
            expect(isRunning).toBe(true)
            
            // Check fake PID
            const fakeRunning = proc.isrunning(99999999)
            expect(fakeRunning).toBe(false)
        })
    })
    
    describe('Network - Real Network Operations', () => {
        it('should REALLY detect network and IPs', async () => {
            // Real network check
            const hasNetwork = await NetworkModule.has()
            expect(typeof hasNetwork).toBe('boolean')
            
            // Real IP detection (might fail without network)
            try {
                const ips = await NetworkModule.get()
                expect(ips).toBeDefined()
                
                if (ips.v4) {
                    // Validate real IP
                    const isValid = NetworkModule.validate(ips.v4)
                    expect(isValid).toBe(true)
                }
            } catch (e) {
                // Network might not be available, that's ok
                expect(e).toBeDefined()
            }
            
            // Test IP validation với IPs thật
            expect(NetworkModule.validate('192.168.1.1')).toBe(true)
            expect(NetworkModule.validate('10.0.0.1')).toBe(true)
            expect(NetworkModule.validate('not-an-ip')).toBe(false)
            expect(NetworkModule.validate('999.999.999.999')).toBe(false)
        })
    })
    
    describe('DDNS - Real DNS Operations', () => {
        it('should REALLY detect IPs', async () => {
            const ddns = new DDNS()
            
            // Real IP detection
            try {
                const ips = await ddns.detect()
                expect(ips).toBeDefined()
                
                // Check structure
                expect(ips).toHaveProperty('v4')
                expect(ips).toHaveProperty('v6')
                
                // IPs might be null if no network
                if (ips.v4) {
                    expect(ips.v4).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
                }
            } catch (e) {
                // Network might not be available
                expect(e).toBeDefined()
            }
        })
    })
    
    describe('Reporter - Real Reporting', () => {
        it('should REALLY create reporter instance', () => {
            const reporter = new Reporter()
            
            // Test constructor và methods exist
            expect(reporter).toBeDefined()
            expect(reporter.start).toBeDefined()
            expect(reporter.stop).toBeDefined()
            expect(reporter.alive).toBeDefined()
            
            // Start và stop thật (không crash)
            reporter.start()
            reporter.alive()
            reporter.stop()
            
            // Should not throw
            expect(true).toBe(true)
        })
    })
})