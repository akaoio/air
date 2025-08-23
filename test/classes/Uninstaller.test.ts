/**
 * Uninstaller Class Tests - System Phase  
 * Tests all 4 Uninstaller methods with comprehensive coverage
 */

import { Uninstaller } from '../../src/Uninstaller/index.js'
import { TestSetup } from '../shared/testSetup.js'
import { createUninstallerMockContext, uninstallerOptionMocks, pidFileMocks, processKillMocks, systemCommandMocks, serviceFileMocks, cleaningMocks, uninstallerTestUtils } from '../mocks/uninstallerMocks.js'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// Mock modules
jest.mock('os')
jest.mock('fs') 
jest.mock('path')
jest.mock('child_process')

const mockedOs = os as jest.Mocked<typeof os>
const mockedFs = fs as jest.Mocked<typeof fs>
const mockedPath = path as jest.Mocked<typeof path>
const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>

describe('Uninstaller Class', () => {
    let testSetup: TestSetup
    let mockContext: ReturnType<typeof createUninstallerMockContext>
    let originalProcess: typeof process
    let originalSetTimeout: typeof setTimeout
    
    beforeEach(() => {
        testSetup = new TestSetup('uninstaller-test')
        mockContext = createUninstallerMockContext()
        
        // Save originals
        originalProcess = process
        originalSetTimeout = global.setTimeout
        
        // Mock global setTimeout
        global.setTimeout = jest.fn((callback: Function, delay: number) => {
            // For testing, execute callback immediately instead of waiting
            if (delay === 2000) {
                setImmediate(callback)
            }
            return 'mock-timer' as any
        })
        
        // Setup default path mocks
        mockedPath.join.mockImplementation((...paths: string[]) => {
            const separator = paths[0]?.includes('C:') ? '\\' : '/'
            return paths.join(separator)
        })
        
        jest.clearAllMocks()
    })
    
    afterEach(() => {
        global.setTimeout = originalSetTimeout
        testSetup.cleanup()
    })
    
    describe('Constructor', () => {
        test('should create Uninstaller instance with default options', () => {
            const uninstaller = new Uninstaller()
            
            expect(uninstaller).toBeInstanceOf(Uninstaller)
            expect(uninstaller['options']).toEqual({})
            expect(uninstaller['completed']).toEqual([])
            expect(uninstaller['errors']).toEqual([])
        })
        
        test('should create Uninstaller instance with custom options', () => {
            const options = uninstallerOptionMocks.aggressive
            const uninstaller = new Uninstaller(options)
            
            expect(uninstaller['options']).toEqual(options)
            expect(uninstaller['completed']).toEqual([])
            expect(uninstaller['errors']).toEqual([])
        })
        
        test('should handle all option combinations', () => {
            Object.values(uninstallerOptionMocks).forEach(options => {
                const uninstaller = new Uninstaller(options)
                
                expect(uninstaller['options']).toEqual(options)
                expect(uninstaller['completed']).toHaveLength(0)
                expect(uninstaller['errors']).toHaveLength(0)
            })
        })
    })
    
    describe('stop() method', () => {
        test('should stop process using PID file successfully', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            // Mock PID file exists with valid PID
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('12345')
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            // Mock process exists and can be killed
            Object.defineProperty(process, 'kill', {
                value: jest.fn((pid: number, signal?: string | number) => {
                    if (signal === 0) return // Test signal succeeds
                    if (signal === 'SIGTERM') return // Terminate succeeds
                }),
                configurable: true
            })
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.stop(config)
            
            uninstallerTestUtils.validateStopResult(result)
            expect(result.success).toBe(true)
            expect(result.stopped).toBe(true)
            expect(result.message).toContain('Processes stopped')
            expect(mockedFs.unlinkSync).toHaveBeenCalled()
        })
        
        test('should handle invalid PID file gracefully', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('not-a-number')
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            
            mockedExecSync.mockImplementation(() => '')
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.stop(config)
            
            expect(result.success).toBe(true)
            expect(result.stopped).toBe(true)
        })
        
        test('should handle process not running', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('99999')
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            // Mock process doesn't exist
            Object.defineProperty(process, 'kill', {
                value: jest.fn(() => {
                    throw new Error('ESRCH: No such process')
                }),
                configurable: true
            })
            
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            
            mockedExecSync.mockImplementation(() => '')
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.stop(config)
            
            expect(result.success).toBe(true)
            expect(result.stopped).toBe(true)
        })
        
        test('should use system commands when PID file missing', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockReturnValue(false)
            
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            
            mockedExecSync.mockImplementation(() => '')
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.stop(config)
            
            expect(result.success).toBe(true)
            expect(result.stopped).toBe(true)
            expect(mockedExecSync).toHaveBeenCalledWith(
                expect.stringContaining('pkill -f'),
                expect.objectContaining({ stdio: 'ignore' })
            )
        })
        
        test('should use Windows-specific commands on Windows', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockReturnValue(false)
            
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                configurable: true
            })
            
            mockedExecSync.mockImplementation(() => 'SUCCESS: Sent termination signal')
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.stop(config)
            
            expect(result.success).toBe(true)
            expect(result.stopped).toBe(true)
            expect(mockedExecSync).toHaveBeenCalledWith(
                expect.stringContaining('taskkill'),
                expect.objectContaining({ stdio: 'ignore' })
            )
        })
        
        test('should handle no running processes', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockReturnValue(false)
            
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            
            mockedExecSync.mockImplementation(() => {
                throw new Error('No matching processes')
            })
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.stop(config)
            
            expect(result.success).toBe(true)
            expect(result.stopped).toBe(false)
            expect(result.message).toContain('No running processes found')
        })
        
        test('should handle SIGKILL timeout scenario', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue('12345')
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            // Mock process that survives SIGTERM but dies to SIGKILL
            let termCalled = false
            Object.defineProperty(process, 'kill', {
                value: jest.fn((pid: number, signal?: string | number) => {
                    if (signal === 0) {
                        // First check: process exists
                        // After timeout check: process still exists if SIGTERM not effective
                        return !termCalled
                    }
                    if (signal === 'SIGTERM') {
                        termCalled = true
                        return
                    }
                    if (signal === 'SIGKILL') return
                }),
                configurable: true
            })
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.stop(config)
            
            expect(result.success).toBe(true)
            expect(result.stopped).toBe(true)
        })
        
        test('should handle stop errors gracefully', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockImplementation(() => {
                throw new Error('File system error')
            })
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.stop(config)
            
            expect(result.success).toBe(false)
            expect(result.stopped).toBe(false)
            expect(result.message).toBe('File system error')
        })
    })
    
    describe('remove() method', () => {
        test('should remove Windows startup entry', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                configurable: true
            })
            
            mockedOs.homedir.mockReturnValue('C:\\Users\\user')
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.remove(config)
            
            uninstallerTestUtils.validateRemoveResult(result)
            expect(result.success).toBe(true)
            expect(result.type).toBe('windows')
            expect(result.message).toContain('Windows startup removed')
            expect(mockedPath.join).toHaveBeenCalledWith(
                'C:\\Users\\user',
                'AppData', 'Roaming', 'Microsoft', 'Windows',
                'Start Menu', 'Programs', 'Startup'
            )
        })
        
        test('should remove macOS LaunchAgent', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            Object.defineProperty(process, 'platform', {
                value: 'darwin',
                configurable: true
            })
            
            mockedOs.homedir.mockReturnValue('/Users/user')
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.unlinkSync.mockImplementation(() => {})
            mockedExecSync.mockImplementation(() => '')
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.remove(config)
            
            expect(result.success).toBe(true)
            expect(result.type).toBe('launchd')
            expect(result.message).toContain('launchd service removed')
            expect(mockedExecSync).toHaveBeenCalledWith(
                expect.stringContaining('launchctl unload'),
                expect.objectContaining({ stdio: 'ignore' })
            )
        })
        
        test('should remove Systemd service on Linux', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            Object.defineProperty(process, 'env', {
                value: {},
                configurable: true
            })
            
            mockedOs.homedir.mockReturnValue('/home/user')
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.unlinkSync.mockImplementation(() => {})
            mockedExecSync.mockImplementation((command: string) => {
                if (command.includes('systemctl --version')) return 'systemd 248'
                return ''
            })
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.remove(config)
            
            expect(result.success).toBe(true)
            expect(result.type).toBe('systemd')
            expect(result.message).toContain('Systemd service removed')
            expect(mockedExecSync).toHaveBeenCalledWith('systemctl --user daemon-reload', { stdio: 'ignore' })
        })
        
        test('should remove Termux service', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            Object.defineProperty(process, 'env', {
                value: { PREFIX: '/data/data/com.termux/files/usr' },
                configurable: true
            })
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.rmSync.mockImplementation(() => {})
            mockedExecSync.mockImplementation(() => '')
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.remove(config)
            
            expect(result.success).toBe(true)
            expect(result.type).toBe('termux')
            expect(result.message).toContain('Termux service removed')
            expect(mockedExecSync).toHaveBeenCalledWith('sv-disable test-peer', { stdio: 'ignore' })
        })
        
        test('should remove cron jobs on Linux without systemd', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            Object.defineProperty(process, 'env', {
                value: {},
                configurable: true
            })
            
            mockedOs.tmpdir.mockReturnValue('/tmp')
            mockedFs.writeFileSync.mockImplementation(() => {})
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            mockedExecSync.mockImplementation((command: string) => {
                if (command.includes('systemctl --version')) {
                    throw new Error('systemctl not found')
                }
                if (command.includes('crontab -l')) {
                    return `@reboot ${config.root}/start.sh\n# Other cron job\n*/5 * * * * /other/script`
                }
                return ''
            })
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.remove(config)
            
            expect(result.success).toBe(true)
            expect(result.type).toBe('cron')
            expect(result.message).toContain('Cron jobs removed')
            expect(mockedFs.writeFileSync).toHaveBeenCalled()
        })
        
        test('should handle no service files found', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                configurable: true
            })
            
            mockedOs.homedir.mockReturnValue('C:\\Users\\user')
            mockedFs.existsSync.mockReturnValue(false)
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.remove(config)
            
            expect(result.success).toBe(true)
            expect(result.type).toBe('windows')
            expect(result.message).toContain('No Windows service found')
        })
        
        test('should handle cron removal when no crontab exists', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            Object.defineProperty(process, 'env', {
                value: {},
                configurable: true
            })
            
            mockedExecSync.mockImplementation((command: string) => {
                if (command.includes('systemctl --version')) {
                    throw new Error('systemctl not found')
                }
                if (command.includes('crontab -l')) {
                    throw new Error('no crontab for user')
                }
                return ''
            })
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.remove(config)
            
            expect(result.success).toBe(true)
            expect(result.type).toBe('cron')
            expect(result.message).toContain('No crontab found')
        })
        
        test('should handle service removal errors', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            
            mockedExecSync.mockImplementation(() => {
                throw new Error('systemctl: command failed')
            })
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.remove(config)
            
            expect(result.success).toBe(false)
            expect(result.message).toBe('systemctl: command failed')
        })
    })
    
    describe('clean() method', () => {
        test('should clean all files with default options', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('.pid') ||
                       filePath.includes('air.json') ||
                       filePath.includes('ddns.json') ||
                       filePath.includes('ssl')
            })
            
            mockedFs.readdirSync.mockReturnValue([
                'air.json',
                '.test-peer.pid',
                '.air-backup.pid',
                'ddns.json',
                'access.log',
                'error.log',
                'ssl',
                'other.txt'
            ] as any)
            
            mockedFs.unlinkSync.mockImplementation(() => {})
            mockedFs.copyFileSync.mockImplementation(() => {})
            mockedFs.rmSync.mockImplementation(() => {})
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.clean(config)
            
            uninstallerTestUtils.validateCleanResult(result)
            expect(result.success).toBe(true)
            expect(result.cleaned).toBeGreaterThan(0)
            expect(result.message).toContain('items cleaned')
            
            const operations = uninstallerTestUtils.countFileOperations(mockedFs)
            expect(operations.unlinks).toBeGreaterThan(0)
            expect(operations.copies).toBeGreaterThan(0) // Config backup
        })
        
        test('should respect keepConfig option', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            const options = { keepConfig: true }
            
            mockedFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('.pid') || filePath.includes('air.json')
            })
            
            mockedFs.readdirSync.mockReturnValue([
                'air.json',
                '.test-peer.pid'
            ] as any)
            
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.clean(config, options)
            
            expect(result.success).toBe(true)
            expect(result.cleaned).toBe(1) // Only PID file removed
            
            // Config should not be removed
            expect(mockedFs.unlinkSync).not.toHaveBeenCalledWith(
                expect.stringContaining('air.json')
            )
        })
        
        test('should respect keepSSL option', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            const options = { keepSSL: true }
            
            mockedFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('ssl') || filePath.includes('.pid')
            })
            
            mockedFs.readdirSync.mockReturnValue([
                '.test-peer.pid',
                'ssl'
            ] as any)
            
            mockedFs.unlinkSync.mockImplementation(() => {})
            mockedFs.rmSync.mockImplementation(() => {})
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.clean(config, options)
            
            expect(result.success).toBe(true)
            
            // SSL directory should not be removed
            expect(mockedFs.rmSync).not.toHaveBeenCalledWith(
                expect.stringContaining('ssl'),
                expect.any(Object)
            )
        })
        
        test('should respect keepLogs option', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            const options = { keepLogs: true }
            
            mockedFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('.pid')
            })
            
            mockedFs.readdirSync.mockReturnValue([
                '.test-peer.pid',
                'access.log',
                'error.log',
                'debug.log'
            ] as any)
            
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.clean(config, options)
            
            expect(result.success).toBe(true)
            
            // Log files should not be removed
            const unlinkCalls = mockedFs.unlinkSync.mock.calls
            const logRemovals = unlinkCalls.filter(call => 
                call[0].toString().includes('.log')
            )
            expect(logRemovals).toHaveLength(0)
        })
        
        test('should clean multiple PID files', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('.test-peer.pid') ||
                       filePath.includes('.air-backup.pid') ||
                       filePath.includes('.air-dev.pid')
            })
            
            mockedFs.readdirSync.mockReturnValue([
                '.test-peer.pid',
                '.air-backup.pid',
                '.air-dev.pid',
                'other.txt'
            ] as any)
            
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.clean(config)
            
            expect(result.success).toBe(true)
            expect(result.cleaned).toBe(3)
        })
        
        test('should handle no files to clean', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockReturnValue(false)
            mockedFs.readdirSync.mockReturnValue(['other.txt'] as any)
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.clean(config)
            
            expect(result.success).toBe(true)
            expect(result.cleaned).toBe(0)
            expect(result.message).toBe('0 items cleaned')
        })
        
        test('should handle cleaning errors gracefully', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readdirSync.mockReturnValue(['.test-peer.pid'] as any)
            mockedFs.unlinkSync.mockImplementation(() => {
                throw new Error('EACCES: permission denied')
            })
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.clean(config)
            
            expect(result.success).toBe(false)
            expect(result.message).toBe('EACCES: permission denied')
            expect(result.cleaned).toBe(0)
        })
        
        test('should backup config file before removal', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('air.json')
            })
            
            mockedFs.readdirSync.mockReturnValue(['air.json'] as any)
            mockedFs.copyFileSync.mockImplementation(() => {})
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.clean(config)
            
            expect(result.success).toBe(true)
            expect(mockedFs.copyFileSync).toHaveBeenCalledWith(
                expect.stringContaining('air.json'),
                expect.stringContaining('air.json.backup')
            )
        })
        
        test('should clean DDNS state file', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            mockedFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('ddns.json')
            })
            
            mockedFs.readdirSync.mockReturnValue(['ddns.json'] as any)
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            const uninstaller = new Uninstaller()
            const result = await uninstaller.clean(config)
            
            expect(result.success).toBe(true)
            expect(result.cleaned).toBe(1)
            expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
                expect.stringContaining('ddns.json')
            )
        })
    })
    
    describe('Integration Tests', () => {
        test('should handle complete uninstallation workflow', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            // Setup Linux environment with systemd
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            Object.defineProperty(process, 'env', {
                value: {},
                configurable: true
            })
            Object.defineProperty(process, 'kill', {
                value: jest.fn(),
                configurable: true
            })
            
            mockedOs.homedir.mockReturnValue('/home/user')
            
            // Setup mocks for stop
            mockedFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('.pid') ||
                       filePath.includes('.service') ||
                       filePath.includes('air.json') ||
                       filePath.includes('ddns.json')
            })
            mockedFs.readFileSync.mockReturnValue('12345')
            mockedFs.unlinkSync.mockImplementation(() => {})
            mockedFs.copyFileSync.mockImplementation(() => {})
            mockedFs.readdirSync.mockReturnValue([
                'air.json',
                '.test-peer.pid',
                'ddns.json',
                'access.log'
            ] as any)
            
            // Setup mocks for remove
            mockedExecSync.mockImplementation((command: string) => {
                if (command.includes('systemctl --version')) return 'systemd 248'
                return ''
            })
            
            const uninstaller = new Uninstaller()
            
            // Execute full workflow
            const stopResult = await uninstaller.stop(config)
            const removeResult = await uninstaller.remove(config)
            const cleanResult = await uninstaller.clean(config)
            
            // Verify all operations succeeded
            expect(stopResult.success).toBe(true)
            expect(removeResult.success).toBe(true)
            expect(cleanResult.success).toBe(true)
            
            expect(stopResult.stopped).toBe(true)
            expect(removeResult.type).toBe('systemd')
            expect(cleanResult.cleaned).toBeGreaterThan(0)
        })
        
        test('should handle cross-platform variations', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            const platforms = [
                {
                    platform: 'win32',
                    expectedServiceType: 'windows',
                    homedir: 'C:\\Users\\user'
                },
                {
                    platform: 'darwin',
                    expectedServiceType: 'launchd',
                    homedir: '/Users/user'
                },
                {
                    platform: 'linux',
                    expectedServiceType: 'systemd',
                    homedir: '/home/user'
                }
            ]
            
            for (const { platform, expectedServiceType, homedir } of platforms) {
                Object.defineProperty(process, 'platform', {
                    value: platform,
                    configurable: true
                })
                
                mockedOs.homedir.mockReturnValue(homedir)
                mockedFs.existsSync.mockReturnValue(true)
                mockedFs.unlinkSync.mockImplementation(() => {})
                
                if (platform === 'linux') {
                    mockedExecSync.mockImplementation((command: string) => {
                        if (command.includes('systemctl --version')) return 'systemd 248'
                        return ''
                    })
                } else {
                    mockedExecSync.mockImplementation(() => '')
                }
                
                const uninstaller = new Uninstaller()
                const result = await uninstaller.remove(config)
                
                expect(result.success).toBe(true)
                expect(result.type).toBe(expectedServiceType)
            }
        })
        
        test('should handle partial failures gracefully', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true
            })
            
            // Stop fails but other operations succeed
            mockedFs.existsSync.mockImplementation((filePath: string) => {
                if (filePath.includes('.pid')) {
                    throw new Error('PID file access error')
                }
                return true
            })
            
            mockedFs.unlinkSync.mockImplementation(() => {})
            mockedFs.readdirSync.mockReturnValue(['air.json'] as any)
            mockedExecSync.mockImplementation(() => '')
            
            const uninstaller = new Uninstaller()
            
            const stopResult = await uninstaller.stop(config)
            const removeResult = await uninstaller.remove(config)
            const cleanResult = await uninstaller.clean(config)
            
            // Stop should fail, others should succeed
            expect(stopResult.success).toBe(false)
            expect(removeResult.success).toBe(true)
            expect(cleanResult.success).toBe(true)
        })
        
        test('should maintain state consistency', async () => {
            const config = uninstallerTestUtils.createTempConfig()
            
            const uninstaller = new Uninstaller({ dryRun: true })
            
            expect(uninstaller['options'].dryRun).toBe(true)
            expect(uninstaller['completed']).toHaveLength(0)
            expect(uninstaller['errors']).toHaveLength(0)
            
            // State should remain consistent throughout operations
            mockedFs.existsSync.mockReturnValue(false)
            
            await uninstaller.stop(config)
            await uninstaller.remove(config)
            await uninstaller.clean(config)
            
            // Instance state should remain accessible
            expect(uninstaller['options'].dryRun).toBe(true)
        })
    })
})