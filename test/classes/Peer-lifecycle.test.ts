/**
 * Peer Lifecycle Tests - Services Phase
 * Tests all 8 Peer lifecycle methods (start, stop, restart, init, run, online, sync, activate)
 */

import { Peer } from '../../src/Peer/index.js'
import { TestSetup } from '../shared/testSetup.js'
import { configMocks, createMockContext } from '../mocks/configMocks.js'
import { processMocks, createProcessMockContext } from '../mocks/processMocks.js'
import fs from 'fs'
import { spawn } from 'child_process'
import { createServer } from 'http'

// Mock modules
jest.mock('fs')
jest.mock('child_process')  
jest.mock('http')
jest.mock('../src/Network/index.js')

const mockedFs = fs as jest.Mocked<typeof fs>
const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>
const mockedCreateServer = createServer as jest.MockedFunction<typeof createServer>

describe('Peer Lifecycle', () => {
    let testSetup: TestSetup
    let testDir: string
    let peer: Peer
    
    beforeEach(() => {
        testSetup = new TestSetup('peer-lifecycle-test')
        testDir = testSetup.createTestDir('peer')
        
        // Setup basic mocks
        mockedFs.existsSync.mockReturnValue(true)
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(configMocks.valid.basic))
        mockedFs.writeFileSync.mockImplementation(() => {})
        mockedFs.mkdirSync.mockImplementation(() => {})
        
        peer = new Peer({
            root: testDir,
            skipPidCheck: true,
            name: 'test-peer',
            env: 'test'
        })
        
        jest.clearAllMocks()
    })
    
    afterEach(() => {
        testSetup.cleanup()
    })
    
    describe('start() method', () => {
        test('should start peer successfully', async () => {
            // Mock successful initialization
            const mockServer = {
                listen: jest.fn((port, callback) => callback()),
                on: jest.fn(),
                close: jest.fn()
            }
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            const result = await peer.start()
            
            expect(result).toBe(true)
            expect(peer.server).toBeDefined()
            expect(mockServer.listen).toHaveBeenCalledWith(8765, expect.any(Function))
        })
        
        test('should handle port already in use', async () => {
            const mockServer = {
                listen: jest.fn((port, callback) => {
                    const error: any = new Error('EADDRINUSE')
                    error.code = 'EADDRINUSE'
                    callback(error)
                }),
                on: jest.fn(),
                close: jest.fn()
            }
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            const result = await peer.start()
            
            expect(result).toBe(false)
        })
        
        test('should handle start timeout', async () => {
            const mockServer = {
                listen: jest.fn(), // Never calls callback
                on: jest.fn(),
                close: jest.fn()
            }
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            // Mock timeout after 1ms for test speed
            const result = await peer.start({ timeout: 1 })
            
            expect(result).toBe(false)
        })
        
        test('should create PID file on successful start', async () => {
            const mockServer = {
                listen: jest.fn((port, callback) => callback()),
                on: jest.fn(),
                close: jest.fn()
            }
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            await peer.start()
            
            const expectedPidFile = `${testDir}/.test-peer.pid`
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expectedPidFile,
                process.pid.toString()
            )
        })
        
        test('should not start if already running', async () => {
            // Mock process check returns true
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.readFileSync.mockReturnValue(process.pid.toString())
            
            const peer = new Peer({
                root: testDir,
                name: 'test-peer',
                env: 'test'
            })
            
            const result = await peer.start()
            
            expect(result).toBe(false)
        })
    })
    
    describe('stop() method', () => {
        test('should stop running peer gracefully', async () => {
            // Setup running peer
            const mockServer = {
                listen: jest.fn((port, callback) => callback()),
                on: jest.fn(),
                close: jest.fn((callback) => callback()),
                listening: true
            }
            peer.server = mockServer as any
            
            const result = await peer.stop()
            
            expect(result).toBe(true)
            expect(mockServer.close).toHaveBeenCalled()
            expect(peer.server).toBeNull()
        })
        
        test('should handle stop when peer not running', async () => {
            peer.server = null
            
            const result = await peer.stop()
            
            expect(result).toBe(true) // Should succeed even if not running
        })
        
        test('should clean up PID file on stop', async () => {
            const mockServer = {
                close: jest.fn((callback) => callback())
            }
            peer.server = mockServer as any
            
            mockedFs.existsSync.mockReturnValue(true)
            mockedFs.unlinkSync.mockImplementation(() => {})
            
            await peer.stop()
            
            const expectedPidFile = `${testDir}/.test-peer.pid`
            expect(mockedFs.unlinkSync).toHaveBeenCalledWith(expectedPidFile)
        })
        
        test('should handle server close error', async () => {
            const mockServer = {
                close: jest.fn((callback) => callback(new Error('Server close failed')))
            }
            peer.server = mockServer as any
            
            const result = await peer.stop()
            
            expect(result).toBe(false)
        })
        
        test('should handle stop timeout', async () => {
            const mockServer = {
                close: jest.fn() // Never calls callback
            }
            peer.server = mockServer as any
            
            const result = await peer.stop({ timeout: 1 })
            
            expect(result).toBe(false)
        })
    })
    
    describe('restart() method', () => {
        test('should restart peer successfully', async () => {
            // Setup running peer
            const mockServer = {
                listen: jest.fn((port, callback) => callback()),
                on: jest.fn(),
                close: jest.fn((callback) => callback()),
                listening: true
            }
            
            peer.server = mockServer as any
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            const result = await peer.restart()
            
            expect(result).toBe(true)
            expect(mockServer.close).toHaveBeenCalled()
            expect(mockServer.listen).toHaveBeenCalledTimes(2) // Once for initial setup, once for restart
        })
        
        test('should restart with exponential backoff on failure', async () => {
            let attemptCount = 0
            const mockServer = {
                listen: jest.fn((port, callback) => {
                    attemptCount++
                    if (attemptCount < 3) {
                        callback(new Error('Start failed'))
                    } else {
                        callback() // Success on 3rd attempt
                    }
                }),
                on: jest.fn(),
                close: jest.fn((callback) => callback())
            }
            
            peer.server = mockServer as any
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            const result = await peer.restart({ maxRetries: 3, baseDelay: 10 })
            
            expect(result).toBe(true)
            expect(attemptCount).toBe(3)
        })
        
        test('should fail after max retries', async () => {
            const mockServer = {
                listen: jest.fn((port, callback) => callback(new Error('Always fails'))),
                on: jest.fn(),
                close: jest.fn((callback) => callback())
            }
            
            peer.server = mockServer as any
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            const result = await peer.restart({ maxRetries: 2, baseDelay: 1 })
            
            expect(result).toBe(false)
        })
        
        test('should apply jitter to backoff delays', async () => {
            const delays: number[] = []
            const originalSetTimeout = global.setTimeout
            
            global.setTimeout = jest.fn((callback, delay) => {
                delays.push(delay)
                return originalSetTimeout(callback, 0) // Execute immediately for test
            }) as any
            
            const mockServer = {
                listen: jest.fn((port, callback) => callback(new Error('Always fails'))),
                on: jest.fn(),
                close: jest.fn((callback) => callback())
            }
            
            peer.server = mockServer as any
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            await peer.restart({ maxRetries: 3, baseDelay: 100 })
            
            // Should have some variation due to jitter
            expect(delays.length).toBe(2) // 2 retries = 2 delays
            expect(delays[0]).toBeGreaterThan(80) // 100ms ± 20%
            expect(delays[0]).toBeLessThan(120)
            
            global.setTimeout = originalSetTimeout
        })
    })
    
    describe('init() method', () => {
        test('should initialize peer configuration and dependencies', () => {
            const result = peer.init()
            
            expect(result).toBe(true)
            expect(peer.config).toBeDefined()
            expect(peer.GUN).toBeDefined()
            expect(peer.sea).toBeDefined()
        })
        
        test('should handle init with custom configuration', () => {
            const customConfig = {
                ...configMocks.valid.basic,
                test: { ...configMocks.valid.basic.test, port: 9000 }
            }
            
            const result = peer.init(customConfig)
            
            expect(result).toBe(true)
            expect(peer.config.test.port).toBe(9000)
        })
        
        test('should handle init failure gracefully', () => {
            // Mock configuration read error
            mockedFs.readFileSync.mockImplementation(() => {
                throw new Error('Config read failed')
            })
            
            const result = peer.init()
            
            expect(result).toBe(false)
        })
        
        test('should validate configuration during init', () => {
            const invalidConfig = configMocks.invalid.emptyName
            
            const result = peer.init(invalidConfig)
            
            expect(result).toBe(false)
        })
    })
    
    describe('run() method', () => {
        test('should run main peer loop', async () => {
            // Mock successful init and start
            jest.spyOn(peer, 'init').mockReturnValue(true)
            jest.spyOn(peer, 'start').mockResolvedValue(true)
            jest.spyOn(peer, 'online').mockResolvedValue(true)
            
            const result = await peer.run()
            
            expect(result).toBe(true)
            expect(peer.init).toHaveBeenCalled()
            expect(peer.start).toHaveBeenCalled()
            expect(peer.online).toHaveBeenCalled()
        })
        
        test('should handle run failure in init phase', async () => {
            jest.spyOn(peer, 'init').mockReturnValue(false)
            
            const result = await peer.run()
            
            expect(result).toBe(false)
        })
        
        test('should handle run failure in start phase', async () => {
            jest.spyOn(peer, 'init').mockReturnValue(true)
            jest.spyOn(peer, 'start').mockResolvedValue(false)
            
            const result = await peer.run()
            
            expect(result).toBe(false)
        })
        
        test('should handle run with custom options', async () => {
            jest.spyOn(peer, 'init').mockReturnValue(true)
            jest.spyOn(peer, 'start').mockResolvedValue(true)
            jest.spyOn(peer, 'online').mockResolvedValue(true)
            
            const result = await peer.run({
                skipOnline: true,
                timeout: 5000
            })
            
            expect(result).toBe(true)
            expect(peer.online).not.toHaveBeenCalled()
        })
    })
    
    describe('online() method', () => {
        test('should bring peer online successfully', async () => {
            // Mock network connectivity
            jest.doMock('../src/Network/index.js', () => ({
                get: jest.fn().mockResolvedValue({
                    primary: '1.2.3.4',
                    hasIPv6: true
                })
            }))
            
            const result = await peer.online()
            
            expect(result).toBe(true)
        })
        
        test('should handle network detection failure', async () => {
            jest.doMock('../src/Network/index.js', () => ({
                get: jest.fn().mockRejectedValue(new Error('Network unavailable'))
            }))
            
            const result = await peer.online()
            
            expect(result).toBe(false)
        })
        
        test('should connect to peer network', async () => {
            const mockGun = {
                get: jest.fn().mockReturnThis(),
                put: jest.fn().mockReturnThis(),
                on: jest.fn().mockReturnThis()
            }
            
            peer.gun = mockGun as any
            
            const result = await peer.online()
            
            expect(result).toBe(true)
            expect(mockGun.get).toHaveBeenCalled()
        })
        
        test('should handle peer authentication', async () => {
            const mockUser = {
                create: jest.fn((alias, pass, cb) => cb({ ok: 0 })),
                auth: jest.fn((alias, pass, cb) => cb({ put: { alias } }))
            }
            
            peer.user = mockUser as any
            
            const result = await peer.online({
                auth: { alias: 'test-peer', pass: 'test-pass' }
            })
            
            expect(result).toBe(true)
            expect(mockUser.auth).toHaveBeenCalled()
        })
    })
    
    describe('sync() method', () => {
        test('should sync with remote peers successfully', async () => {
            const mockGun = {
                get: jest.fn().mockReturnThis(),
                put: jest.fn().mockReturnThis(),
                on: jest.fn((cb) => cb({ test: 'data' }, 'test-key'))
            }
            
            peer.gun = mockGun as any
            
            const result = await peer.sync()
            
            expect(result).toBe(true)
            expect(mockGun.get).toHaveBeenCalled()
        })
        
        test('should handle sync timeout', async () => {
            const mockGun = {
                get: jest.fn().mockReturnThis(),
                put: jest.fn().mockReturnThis(),
                on: jest.fn() // Never calls callback
            }
            
            peer.gun = mockGun as any
            
            const result = await peer.sync({ timeout: 10 })
            
            expect(result).toBe(false)
        })
        
        test('should sync configuration from remote', async () => {
            const remoteConfig = { ...configMocks.valid.basic, version: 2 }
            
            const mockGun = {
                get: jest.fn().mockReturnThis(),
                put: jest.fn().mockReturnThis(),
                on: jest.fn((cb) => cb(remoteConfig, 'config'))
            }
            
            peer.gun = mockGun as any
            
            await peer.sync({ syncConfig: true })
            
            expect(peer.config.version).toBe(2)
        })
        
        test('should handle sync with specific peers', async () => {
            const specificPeers = ['wss://peer1.com/gun', 'wss://peer2.com/gun']
            
            const result = await peer.sync({ peers: specificPeers })
            
            expect(result).toBe(true)
        })
    })
    
    describe('activate() method', () => {
        test('should activate peer for production use', () => {
            const result = peer.activate()
            
            expect(result).toBe(true)
            expect(peer.active).toBe(true)
        })
        
        test('should handle activation with SSL setup', () => {
            const sslOptions = {
                key: '/path/to/key.pem',
                cert: '/path/to/cert.pem'
            }
            
            const result = peer.activate({ ssl: sslOptions })
            
            expect(result).toBe(true)
        })
        
        test('should validate production requirements before activation', () => {
            peer.config = configMocks.invalid.emptyName
            
            const result = peer.activate()
            
            expect(result).toBe(false)
        })
        
        test('should setup monitoring on activation', () => {
            const mockReporter = {
                start: jest.fn(),
                alive: jest.fn()
            }
            
            peer.reporter = mockReporter as any
            
            const result = peer.activate({ monitoring: true })
            
            expect(result).toBe(true)
            expect(mockReporter.start).toHaveBeenCalled()
        })
    })
    
    describe('Integration Tests', () => {
        test('should handle complete peer lifecycle', async () => {
            const mockServer = {
                listen: jest.fn((port, callback) => callback()),
                on: jest.fn(),
                close: jest.fn((callback) => callback())
            }
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            // Full lifecycle: init → start → online → activate → stop
            expect(peer.init()).toBe(true)
            expect(await peer.start()).toBe(true)
            expect(await peer.online()).toBe(true)
            expect(peer.activate()).toBe(true)
            expect(await peer.stop()).toBe(true)
        })
        
        test('should handle peer crash recovery', async () => {
            // Simulate crash during start
            let startAttempts = 0
            const mockServer = {
                listen: jest.fn((port, callback) => {
                    startAttempts++
                    if (startAttempts === 1) {
                        callback(new Error('Crash during start'))
                    } else {
                        callback() // Success on retry
                    }
                }),
                on: jest.fn(),
                close: jest.fn((callback) => callback())
            }
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            // Should recover with restart
            expect(await peer.restart()).toBe(true)
        })
        
        test('should maintain state consistency across operations', async () => {
            const mockServer = {
                listen: jest.fn((port, callback) => callback()),
                on: jest.fn(),
                close: jest.fn((callback) => callback())
            }
            mockedCreateServer.mockReturnValue(mockServer as any)
            
            // State should be consistent
            expect(peer.active).toBe(false)
            
            await peer.start()
            expect(peer.server).not.toBeNull()
            
            peer.activate()
            expect(peer.active).toBe(true)
            
            await peer.stop()
            expect(peer.server).toBeNull()
            expect(peer.active).toBe(false)
        })
    })
})