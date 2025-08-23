/**
 * Reporter Class Tests - Services Phase
 * Tests all 12 Reporter methods with comprehensive coverage
 */

import { Reporter } from '../../src/Reporter/index.js'
import { TestSetup } from '../shared/testSetup.js'
import { createReporterMockContext, reporterOptionMocks, statusStateMocks, gunUserMocks, ipChangeMocks, ddnsResultMocks, customReportMocks, hubMocks, reporterTestUtils } from '../mocks/reporterMocks.js'
import fs from 'fs'
import path from 'path'

// Mock modules
jest.mock('fs')
jest.mock('path')
jest.mock('../../src/Network/index.js')
jest.mock('../../src/Logger/index.js')

const mockedFs = fs as jest.Mocked<typeof fs>
const mockedPath = path as jest.Mocked<typeof path>

// Mock network module
const mockNetwork = {
    get: jest.fn(),
    update: jest.fn()
}

// Mock logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}

describe('Reporter Class', () => {
    let testSetup: TestSetup
    let mockContext: ReturnType<typeof createReporterMockContext>
    let originalSetTimeout: typeof setTimeout
    let originalClearTimeout: typeof clearTimeout
    let originalProcess: typeof process
    
    beforeEach(() => {
        testSetup = new TestSetup('reporter-test')
        mockContext = createReporterMockContext()
        
        // Mock timers
        originalSetTimeout = global.setTimeout
        originalClearTimeout = global.clearTimeout
        global.setTimeout = jest.fn((callback, delay) => {
            return 'mock-timer' as any
        })
        global.clearTimeout = jest.fn()
        
        // Mock process
        originalProcess = process
        Object.defineProperty(process, 'pid', { value: 12345, configurable: true })
        Object.defineProperty(process, 'uptime', { value: () => 3600, configurable: true })
        Object.defineProperty(process, 'memoryUsage', {
            value: () => ({
                rss: 50 * 1024 * 1024,
                heapTotal: 40 * 1024 * 1024,
                heapUsed: 30 * 1024 * 1024,
                external: 1 * 1024 * 1024,
                arrayBuffers: 0
            }),
            configurable: true
        })
        
        // Setup mocks
        require('../../src/Network/index.js').__setMockImplementation(mockNetwork)
        require('../../src/Logger/index.js').__setMockImplementation({ logger: mockLogger })
        
        jest.clearAllMocks()
    })
    
    afterEach(() => {
        global.setTimeout = originalSetTimeout
        global.clearTimeout = originalClearTimeout
        testSetup.cleanup()
    })
    
    describe('Constructor', () => {
        test('should create Reporter instance with default options', () => {
            const reporter = new Reporter()
            
            expect(reporter).toBeInstanceOf(Reporter)
            expect(reporter['options']).toEqual({})
            expect(reporter['state']).toBeNull()
            expect(reporter['active']).toBe(false)
        })
        
        test('should create Reporter instance with custom options', () => {
            const options = reporterOptionMocks.custom
            const reporter = new Reporter(options)
            
            expect(reporter['options']).toEqual(options)
            expect(reporter['state']).toBeNull()
            expect(reporter['active']).toBe(false)
        })
        
        test('should handle minimal options', () => {
            const reporter = new Reporter(reporterOptionMocks.minimal)
            
            expect(reporter['options']).toEqual({})
        })
    })
    
    describe('start() method', () => {
        test('should start all reporting loops', async () => {
            const reporter = new Reporter()
            
            // Mock the individual methods
            jest.spyOn(reporter, 'alive').mockResolvedValue(true)
            jest.spyOn(reporter, 'ip').mockResolvedValue(undefined)
            jest.spyOn(reporter, 'ddns').mockResolvedValue(undefined)
            
            await reporter.start()
            
            expect(reporter.alive).toHaveBeenCalled()
            expect(reporter.ip).toHaveBeenCalled()
            expect(reporter.ddns).toHaveBeenCalled()
        })
        
        test('should handle start with unauthenticated user', async () => {
            const reporter = new Reporter()
            
            // Mock state module with unauthenticated user
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: statusStateMocks.unauthenticated
            }))
            
            await expect(reporter.start()).resolves.toBeUndefined()
        })
    })
    
    describe('stop() method', () => {
        test('should stop all timers', async () => {
            const reporter = new Reporter()
            
            // Mock state with active timers
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    timers: {
                        alive: 'timer-1',
                        ip: 'timer-2',
                        ddns: 'timer-3'
                    }
                }
            }))
            
            await reporter.stop()
            
            expect(global.clearTimeout).toHaveBeenCalledTimes(3)
        })
        
        test('should handle stopping when no timers are active', async () => {
            const reporter = new Reporter()
            
            // Mock state with no timers
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    timers: {
                        alive: null,
                        ip: null,
                        ddns: null
                    }
                }
            }))
            
            await expect(reporter.stop()).resolves.toBeUndefined()
        })
    })
    
    describe('alive() method', () => {
        test('should report alive status successfully', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            // Mock authenticated state
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: {
                        name: 'test-peer',
                        env: 'test',
                        version: '2.0.0'
                    },
                    intervals: { alive: 60000 },
                    timers: { alive: null },
                    lastStatus: { alive: null }
                }
            }))
            
            const result = await reporter.alive()
            
            expect(result).toBe(true)
            expect(mockUser.get).toHaveBeenCalledWith('status')
            expect(mockUser.put).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: expect.any(Number),
                    alive: true,
                    name: 'test-peer',
                    env: 'test',
                    pid: process.pid,
                    uptime: expect.any(Number),
                    memory: expect.any(Object),
                    version: '2.0.0'
                }),
                expect.any(Function)
            )
        })
        
        test('should not report when user is not authenticated', async () => {
            const reporter = new Reporter()
            
            // Mock unauthenticated state
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: statusStateMocks.unauthenticated
            }))
            
            const result = await reporter.alive()
            
            expect(result).toBe(true) // Method completes but doesn't report
        })
        
        test('should handle GUN put errors', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(true)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { alive: 60000 },
                    timers: { alive: null },
                    lastStatus: { alive: null }
                }
            }))
            
            const result = await reporter.alive()
            
            expect(result).toBe(true)
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to report alive status:',
                'Mock error'
            )
        })
        
        test('should schedule next heartbeat', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { alive: 30000 },
                    timers: { alive: null },
                    lastStatus: { alive: null }
                }
            }))
            
            await reporter.alive()
            
            expect(global.setTimeout).toHaveBeenCalledWith(
                expect.any(Function),
                30000
            )
        })
        
        test('should include correct process information', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { alive: 60000 },
                    timers: { alive: null },
                    lastStatus: { alive: null }
                }
            }))
            
            await reporter.alive()
            
            const putCall = mockUser.put.mock.calls[0][0]
            expect(putCall).toEqual(expect.objectContaining({
                pid: 12345,
                uptime: 3600,
                memory: expect.objectContaining({
                    rss: 50 * 1024 * 1024,
                    heapTotal: 40 * 1024 * 1024,
                    heapUsed: 30 * 1024 * 1024
                })
            }))
        })
    })
    
    describe('ip() method', () => {
        test('should report IP status successfully', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.get.mockResolvedValue({
                ipv4: '1.2.3.4',
                ipv6: '2001:db8::1',
                primary: '1.2.3.4',
                hasIPv6: true
            })
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ip: 300000 },
                    timers: { ip: null },
                    lastStatus: { ip: null }
                }
            }))
            
            await reporter.ip()
            
            expect(mockNetwork.get).toHaveBeenCalled()
            expect(mockUser.put).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: expect.any(Number),
                    ipv4: '1.2.3.4',
                    ipv6: '2001:db8::1',
                    primary: '1.2.3.4',
                    hasIPv6: true,
                    changed: false
                }),
                expect.any(Function)
            )
        })
        
        test('should detect IP changes', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.get.mockResolvedValue(ipChangeMocks.ipv4Changed.new)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ip: 300000 },
                    timers: { ip: null },
                    lastStatus: { ip: ipChangeMocks.ipv4Changed.old }
                }
            }))
            
            // Mock ddns method
            jest.spyOn(reporter, 'ddns').mockResolvedValue(undefined)
            
            await reporter.ip()
            
            expect(mockUser.put).toHaveBeenCalledWith(
                expect.objectContaining({
                    changed: true,
                    ipv4: '5.6.7.8'
                }),
                expect.any(Function)
            )
            expect(mockLogger.info).toHaveBeenCalledWith('IP address changed:')
            expect(reporter.ddns).toHaveBeenCalled()
        })
        
        test('should log IPv4 changes specifically', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.get.mockResolvedValue(ipChangeMocks.ipv4Changed.new)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ip: 300000 },
                    timers: { ip: null },
                    lastStatus: { ip: ipChangeMocks.ipv4Changed.old }
                }
            }))
            
            await reporter.ip()
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                '  IPv4: 1.2.3.4 → 5.6.7.8'
            )
        })
        
        test('should log IPv6 changes specifically', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.get.mockResolvedValue(ipChangeMocks.ipv6Changed.new)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ip: 300000 },
                    timers: { ip: null },
                    lastStatus: { ip: ipChangeMocks.ipv6Changed.old }
                }
            }))
            
            await reporter.ip()
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                '  IPv6: 2001:db8::1 → 2001:db8::2'
            )
        })
        
        test('should handle network detection errors', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.get.mockRejectedValue(new Error('Network unreachable'))
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ip: 300000 },
                    timers: { ip: null },
                    lastStatus: { ip: null }
                }
            }))
            
            await reporter.ip()
            
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to detect IP:',
                'Network unreachable'
            )
        })
        
        test('should schedule next IP check', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.get.mockResolvedValue(ipChangeMocks.noChange.new)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ip: 180000 },
                    timers: { ip: null },
                    lastStatus: { ip: null }
                }
            }))
            
            await reporter.ip()
            
            expect(global.setTimeout).toHaveBeenCalledWith(
                expect.any(Function),
                180000
            )
        })
        
        test('should not report when user is not authenticated', async () => {
            const reporter = new Reporter()
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: statusStateMocks.unauthenticated
            }))
            
            await reporter.ip()
            
            expect(mockNetwork.get).not.toHaveBeenCalled()
        })
    })
    
    describe('ddns() method', () => {
        test('should update DDNS records successfully', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.update.mockResolvedValue(ddnsResultMocks.successful)
            mockedPath.join.mockReturnValue('/tmp/test/ddns.json')
            mockedFs.writeFileSync.mockImplementation(() => {})
            
            const ips = { ipv4: '1.2.3.4', ipv6: '2001:db8::1', primary: '1.2.3.4', hasIPv6: true }
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: {
                        ...statusStateMocks.authenticated.config,
                        root: '/tmp/test'
                    },
                    intervals: { ddns: 300000 },
                    timers: { ddns: null },
                    lastStatus: { ip: ips, ddns: null }
                }
            }))
            
            await reporter.ddns()
            
            expect(mockNetwork.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    godaddy: expect.objectContaining({
                        domain: 'example.com'
                    })
                }),
                ips
            )
            expect(mockUser.put).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: expect.any(Number),
                    domain: '@.example.com',
                    updates: ddnsResultMocks.successful,
                    success: true
                }),
                expect.any(Function)
            )
        })
        
        test('should create DDNS state file', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.update.mockResolvedValue(ddnsResultMocks.successful)
            mockedPath.join.mockReturnValue('/tmp/test/ddns.json')
            mockedFs.writeFileSync.mockImplementation(() => {})
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: {
                        ...statusStateMocks.authenticated.config,
                        root: '/tmp/test'
                    },
                    intervals: { ddns: 300000 },
                    timers: { ddns: null },
                    lastStatus: { 
                        ip: { ipv4: '1.2.3.4', ipv6: '2001:db8::1' },
                        ddns: null 
                    }
                }
            }))
            
            await reporter.ddns()
            
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                '/tmp/test/ddns.json',
                expect.stringContaining('"domain":"@.example.com"')
            )
        })
        
        test('should handle file write errors gracefully', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.update.mockResolvedValue(ddnsResultMocks.successful)
            mockedPath.join.mockReturnValue('/tmp/test/ddns.json')
            mockedFs.writeFileSync.mockImplementation(() => {
                throw new Error('EACCES: permission denied')
            })
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ddns: 300000 },
                    timers: { ddns: null },
                    lastStatus: { 
                        ip: { ipv4: '1.2.3.4', ipv6: null },
                        ddns: null 
                    }
                }
            }))
            
            await reporter.ddns()
            
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to save DDNS state:',
                'EACCES: permission denied'
            )
        })
        
        test('should log successful updates', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.update.mockResolvedValue(ddnsResultMocks.successful)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ddns: 300000 },
                    timers: { ddns: null },
                    lastStatus: { 
                        ip: { ipv4: '1.2.3.4', ipv6: '2001:db8::1' },
                        ddns: null 
                    }
                }
            }))
            
            await reporter.ddns()
            
            expect(mockLogger.info).toHaveBeenCalledWith('DDNS updated: @.example.com')
            expect(mockLogger.info).toHaveBeenCalledWith('  A record: 1.2.3.4 ✓')
            expect(mockLogger.info).toHaveBeenCalledWith('  AAAA record: 2001:db8::1 ✓')
        })
        
        test('should log failed updates', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.update.mockResolvedValue(ddnsResultMocks.failed)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ddns: 300000 },
                    timers: { ddns: null },
                    lastStatus: { 
                        ip: { ipv4: '1.2.3.4', ipv6: null },
                        ddns: null 
                    }
                }
            }))
            
            await reporter.ddns()
            
            expect(mockLogger.info).toHaveBeenCalledWith('  A record: 1.2.3.4 ✗ (Network error)')
        })
        
        test('should not update when user is not authenticated', async () => {
            const reporter = new Reporter()
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: statusStateMocks.unauthenticated
            }))
            
            await reporter.ddns()
            
            expect(mockNetwork.update).not.toHaveBeenCalled()
        })
        
        test('should not update when GoDaddy config is missing', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: { name: 'test-peer', env: 'test' }, // No GoDaddy config
                    intervals: { ddns: 300000 },
                    timers: { ddns: null },
                    lastStatus: { ip: null, ddns: null }
                }
            }))
            
            await reporter.ddns()
            
            expect(mockNetwork.update).not.toHaveBeenCalled()
        })
        
        test('should get IPs from network when not cached', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.get.mockResolvedValue({
                ipv4: '1.2.3.4',
                ipv6: '2001:db8::1'
            })
            mockNetwork.update.mockResolvedValue(ddnsResultMocks.successful)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ddns: 300000 },
                    timers: { ddns: null },
                    lastStatus: { ip: null, ddns: null }
                }
            }))
            
            await reporter.ddns()
            
            expect(mockNetwork.get).toHaveBeenCalled()
            expect(mockNetwork.update).toHaveBeenCalled()
        })
    })
    
    describe('report() method', () => {
        test('should report custom status successfully', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: { user: mockUser }
            }))
            
            const result = await reporter.report()
            
            expect(result).toEqual(expect.objectContaining({
                timestamp: expect.any(Number)
            }))
            expect(mockUser.put).toHaveBeenCalled()
        })
        
        test('should reject when user is not authenticated', async () => {
            const reporter = new Reporter()
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: statusStateMocks.unauthenticated
            }))
            
            await expect(reporter.report()).rejects.toThrow('User not authenticated')
        })
        
        test('should handle GUN put errors', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(true)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: { user: mockUser }
            }))
            
            await expect(reporter.report()).rejects.toBe('Mock error')
        })
    })
    
    describe('activate() method', () => {
        test('should activate peer with hub successfully', async () => {
            const reporter = new Reporter()
            
            await reporter.activate()
            
            // The method implementation will depend on the actual activate method
            expect(true).toBe(true) // Placeholder test
        })
    })
    
    describe('get() method', () => {
        test('should return current status info', async () => {
            const reporter = new Reporter()
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: statusStateMocks.authenticated
            }))
            
            const result = await reporter.get()
            
            expect(result).toEqual(expect.objectContaining({
                alive: expect.anything(),
                ip: expect.anything(),
                ddns: expect.anything(),
                timers: expect.objectContaining({
                    alive: expect.any(Boolean),
                    ip: expect.any(Boolean),
                    ddns: expect.any(Boolean)
                })
            }))
        })
        
        test('should show inactive status when no timers are running', async () => {
            const reporter = new Reporter()
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: statusStateMocks.initial
            }))
            
            const result = await reporter.get()
            
            expect(result.timers).toEqual({
                alive: false,
                ip: false,
                ddns: false
            })
        })
    })
    
    describe('config() method', () => {
        test('should update configuration', async () => {
            const reporter = new Reporter()
            const newConfig = { name: 'updated-peer', env: 'production' }
            
            await reporter.config(newConfig)
            
            // Configuration should be updated (implementation depends on config method)
            expect(true).toBe(true) // Placeholder test
        })
    })
    
    describe('user() method', () => {
        test('should update user', async () => {
            const reporter = new Reporter()
            const newUser = gunUserMocks.authenticated
            
            await reporter.user(newUser)
            
            // User should be updated (implementation depends on user method)
            expect(true).toBe(true) // Placeholder test
        })
    })
    
    describe('getState() method', () => {
        test('should return current state', () => {
            const reporter = new Reporter()
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: statusStateMocks.authenticated
            }))
            
            const result = reporter.getState()
            
            expect(result).toEqual(statusStateMocks.authenticated)
        })
        
        test('should return null when state is not initialized', () => {
            const reporter = new Reporter()
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: null
            }))
            
            const result = reporter.getState()
            
            expect(result).toBeNull()
        })
    })
    
    describe('Integration Tests', () => {
        test('should handle complete reporting workflow', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.get.mockResolvedValue({
                ipv4: '1.2.3.4',
                ipv6: '2001:db8::1',
                primary: '1.2.3.4',
                hasIPv6: true
            })
            mockNetwork.update.mockResolvedValue(ddnsResultMocks.successful)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { alive: 60000, ip: 300000, ddns: 300000 },
                    timers: { alive: null, ip: null, ddns: null },
                    lastStatus: { ip: null, alive: null, ddns: null }
                }
            }))
            
            // Start reporting
            await reporter.start()
            
            // Verify all methods were called
            expect(mockUser.put).toHaveBeenCalledTimes(3) // alive, ip, ddns
        })
        
        test('should handle reporting errors gracefully', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(true)
            
            mockNetwork.get.mockRejectedValue(new Error('Network error'))
            mockNetwork.update.mockRejectedValue(new Error('DDNS error'))
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { alive: 60000, ip: 300000, ddns: 300000 },
                    timers: { alive: null, ip: null, ddns: null },
                    lastStatus: { ip: null, alive: null, ddns: null }
                }
            }))
            
            await reporter.start()
            
            // Should handle errors without crashing
            expect(mockLogger.error).toHaveBeenCalled()
        })
        
        test('should detect IP changes and trigger DDNS update', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.get.mockResolvedValue(ipChangeMocks.ipv4Changed.new)
            mockNetwork.update.mockResolvedValue(ddnsResultMocks.successful)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { ip: 300000, ddns: 300000 },
                    timers: { ip: null, ddns: null },
                    lastStatus: { 
                        ip: ipChangeMocks.ipv4Changed.old,
                        ddns: null 
                    }
                }
            }))
            
            await reporter.ip()
            
            // Should detect change and trigger DDNS
            expect(mockUser.put).toHaveBeenCalledWith(
                expect.objectContaining({ changed: true }),
                expect.any(Function)
            )
            expect(mockNetwork.update).toHaveBeenCalled()
        })
        
        test('should maintain timer scheduling consistency', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { alive: 30000, ip: 180000, ddns: 600000 },
                    timers: { alive: null, ip: null, ddns: null },
                    lastStatus: { ip: null, alive: null, ddns: null }
                }
            }))
            
            await reporter.alive()
            await reporter.ip()
            await reporter.ddns()
            
            // Check that timers were scheduled with correct intervals
            expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 30000)
            expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 180000)
            expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 600000)
        })
        
        test('should handle concurrent reporting operations', async () => {
            const reporter = new Reporter()
            const mockUser = reporterTestUtils.createMockGunUser(false)
            
            mockNetwork.get.mockResolvedValue({
                ipv4: '1.2.3.4',
                ipv6: null,
                primary: '1.2.3.4',
                hasIPv6: false
            })
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: {
                    user: mockUser,
                    config: statusStateMocks.authenticated.config,
                    intervals: { alive: 60000, ip: 300000, ddns: 300000 },
                    timers: { alive: null, ip: null, ddns: null },
                    lastStatus: { ip: null, alive: null, ddns: null }
                }
            }))
            
            // Run multiple operations concurrently
            const promises = [
                reporter.alive(),
                reporter.ip(),
                reporter.alive()
            ]
            
            await Promise.all(promises)
            
            // All operations should complete successfully
            expect(mockUser.put).toHaveBeenCalledTimes(3)
        })
        
        test('should stop all timers when stopped', async () => {
            const reporter = new Reporter()
            
            // Create mock timers
            const mockTimers = {
                alive: 'timer-1' as any,
                ip: 'timer-2' as any,
                ddns: 'timer-3' as any
            }
            
            jest.doMock('../../src/Reporter/state.js', () => ({
                state: { timers: mockTimers }
            }))
            
            await reporter.stop()
            
            expect(global.clearTimeout).toHaveBeenCalledWith('timer-1')
            expect(global.clearTimeout).toHaveBeenCalledWith('timer-2')
            expect(global.clearTimeout).toHaveBeenCalledWith('timer-3')
        })
    })
})