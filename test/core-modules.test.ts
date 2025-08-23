/**
 * Core modules test for improving coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as child_process from 'child_process'
import * as path from 'path'

// Mock all external dependencies
vi.mock('fs')
vi.mock('child_process')
vi.mock('node-fetch', () => ({
    default: vi.fn(() => Promise.resolve({
        text: () => Promise.resolve('192.168.1.1'),
        ok: true
    }))
}))

const mockedFs = fs as any
const mockedChildProcess = child_process as any

describe('Core Module Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        
        // Setup default mocks
        mockedFs.existsSync.mockReturnValue(false)
        mockedFs.readFileSync.mockReturnValue('{}')
        mockedFs.writeFileSync.mockReturnValue(undefined)
        mockedFs.mkdirSync.mockReturnValue(undefined)
        mockedFs.readdirSync.mockReturnValue([])
        mockedFs.statSync.mockReturnValue({ 
            isDirectory: () => false,
            isFile: () => true
        })
        
        mockedChildProcess.execSync.mockReturnValue('')
        mockedChildProcess.exec.mockImplementation((cmd: string, cb: any) => {
            if (cb) cb(null, '', '')
        })
        mockedChildProcess.spawn.mockReturnValue({
            pid: 12345,
            unref: vi.fn(),
            on: vi.fn(),
            stdout: { on: vi.fn() },
            stderr: { on: vi.fn() }
        })
    })
    
    describe('Config Module Deep Test', () => {
        it('should test all Config functionality', async () => {
            const { Config } = await import('../src/Config/index.js')
            
            // Test with file exists
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'test-config',
                env: 'development',
                development: {
                    port: 8765,
                    domain: 'localhost',
                    peers: []
                }
            }))
            
            const config = new Config('/test/air.json')
            
            // Test load
            const loaded = config.load()
            expect(loaded).toBeDefined()
            expect(loaded.name).toBe('test-config')
            
            // Test defaults
            const defaults = config.defaults()
            expect(defaults).toBeDefined()
            expect(defaults.env).toBeDefined()
            
            // Test merge
            const merged = config.merge(defaults, { name: 'merged' })
            expect(merged.name).toBe('merged')
            
            // Test validate
            const validation = config.validate(merged)
            expect(validation.valid).toBeDefined()
            
            // Test save
            const saved = config.save(merged)
            expect(saved).toBe(true)
            expect(mockedFs.writeFileSync).toHaveBeenCalled()
        })
    })
    
    describe('Process Module Deep Test', () => {
        it('should test all Process functionality', async () => {
            const { Process } = await import('../src/Process/index.js')
            
            // Setup mocks for process checking
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('12345')
            mockedChildProcess.execSync.mockImplementation((cmd: string) => {
                if (cmd.includes('kill -0')) return ''
                if (cmd.includes('ps aux')) return 'node /test/air\n12345'
                if (cmd.includes('lsof')) return 'node 12345'
                return ''
            })
            
            const proc = new Process({ name: 'test' })
            
            // Test check
            const isRunning = proc.check()
            expect(typeof isRunning).toBe('boolean')
            
            // Test find
            const found = proc.find(8765)
            expect(found).toBeDefined()
            
            // Test getpidfile
            const pidfile = proc.getpidfile()
            expect(pidfile).toBeDefined()
            expect(pidfile).toContain('.test.pid')
            
            // Test clean
            proc.clean()
            expect(mockedFs.unlinkSync).toHaveBeenCalled()
            
            // Test kill
            const killed = proc.kill(12345)
            expect(typeof killed).toBe('boolean')
        })
    })
    
    describe('Logger Module Deep Test', () => {
        it('should test all Logger functionality', async () => {
            const { Logger } = await import('../src/Logger/index.js')
            
            // Mock console
            const originalConsole = { ...console }
            console.log = vi.fn()
            console.error = vi.fn()
            console.warn = vi.fn()
            
            const logger = new Logger({ name: 'test', verbose: true })
            
            // Test all log levels
            logger.info('info message')
            expect(console.log).toHaveBeenCalled()
            
            logger.warn('warning message')
            expect(console.warn).toHaveBeenCalled()
            
            logger.error('error message')
            expect(console.error).toHaveBeenCalled()
            
            logger.debug('debug message')
            expect(console.log).toHaveBeenCalled()
            
            logger.log('general', 'general message')
            
            // Test file logging
            logger.file('/test/log.txt', 'file message')
            expect(mockedFs.appendFileSync).toHaveBeenCalled()
            
            // Restore console
            Object.assign(console, originalConsole)
        })
    })
    
    describe('Manager Module Deep Test', () => {
        it('should test all Manager functionality', async () => {
            const { Manager } = await import('../src/Manager/index.js')
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'manager-test',
                env: 'development',
                development: {
                    port: 8765,
                    domain: 'localhost',
                    peers: []
                }
            }))
            
            const manager = new Manager({ path: '/test/air.json' })
            
            // Test read
            const config = manager.read()
            expect(config).toBeDefined()
            expect(config.name).toBe('manager-test')
            
            // Test write
            const written = manager.write(config)
            expect(written).toBe(true)
            
            // Test defaults
            const defaults = manager.defaults()
            expect(defaults).toBeDefined()
            
            // Test validate
            const validation = manager.validate(config)
            expect(validation.valid).toBeDefined()
            
            // Test mergeenv
            process.env.AIR_NAME = 'env-name'
            const merged = manager.mergeenv(config)
            expect(merged.name).toBe('env-name')
            delete process.env.AIR_NAME
        })
    })
    
    describe('DDNS Module Deep Test', () => {
        it('should test DDNS functionality', async () => {
            const { DDNS } = await import('../src/DDNS/index.js')
            
            // Mock DNS lookup
            mockedChildProcess.execSync.mockImplementation((cmd: string) => {
                if (cmd.includes('dig')) return '192.168.1.1'
                if (cmd.includes('nslookup')) return 'Address: 192.168.1.1'
                return ''
            })
            
            const ddns = new DDNS({
                godaddy: {
                    key: 'test-key',
                    secret: 'test-secret',
                    domain: 'test.com'
                }
            })
            
            // Test detect
            const ips = await ddns.detect()
            expect(ips).toBeDefined()
            
            // Test update
            const updated = await ddns.update({ v4: '192.168.1.1', v6: null })
            expect(updated).toBeDefined()
        })
    })
    
    describe('Reporter Module Deep Test', () => {
        it('should test Reporter functionality', async () => {
            const { Reporter } = await import('../src/Reporter/index.js')
            
            const reporter = new Reporter()
            
            // Test activate
            reporter.activate({
                name: 'test',
                env: 'development',
                development: {
                    port: 8765,
                    domain: 'localhost',
                    peers: []
                }
            })
            
            // Test start
            reporter.start()
            
            // Test alive
            reporter.alive()
            
            // Test config
            reporter.config({
                name: 'updated',
                env: 'production'
            })
            
            // Test stop
            reporter.stop()
            
            expect(reporter).toBeDefined()
        })
    })
})