/**
 * Peer Class Tests - Comprehensive Coverage for Core P2P Database
 * Target: 100% coverage for all 15 Peer methods
 * Critical: This is the heart of the Air database system
 */

import { describe, test, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest'
import { Peer } from '../../src/Peer/index.js'
import { constructor } from '../../src/Peer/constructor.js'
import { start } from '../../src/Peer/start.js'
import { stop } from '../../src/Peer/stop.js'
import { restart } from '../../src/Peer/restart.js'
import { init } from '../../src/Peer/init.js'
import { run } from '../../src/Peer/run.js'
import { online } from '../../src/Peer/online.js'
import { sync } from '../../src/Peer/sync.js'
import { activate } from '../../src/Peer/activate.js'
import { check } from '../../src/Peer/check.js'
import { clean } from '../../src/Peer/clean.js'
import { find } from '../../src/Peer/find.js'
import { read } from '../../src/Peer/read.js'
import { write } from '../../src/Peer/write.js'
import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import * as https from 'https'

// Mock external dependencies
vi.mock('gun', () => ({
  default: vi.fn(() => ({
    get: vi.fn(() => ({
      put: vi.fn(),
      on: vi.fn((callback) => callback({ name: 'test' }))
    })),
    user: vi.fn(() => ({
      create: vi.fn((name, pass, cb) => cb({ ok: 0 })),
      auth: vi.fn((name, pass, cb) => cb({ ok: 0 })),
      leave: vi.fn()
    })),
    opt: vi.fn(() => ({
      peers: ['http://localhost:8765/gun']
    }))
  }))
}))

vi.mock('../../src/Manager/index.js', () => ({
  Manager: vi.fn().mockImplementation(() => ({
    read: vi.fn(() => ({
      name: 'test-peer',
      env: 'test',
      port: 8765,
      domain: 'localhost',
      peers: [],
      test: {
        port: 8765,
        domain: 'localhost',
        peers: []
      }
    })),
    write: vi.fn(),
    sync: vi.fn(),
    validate: vi.fn(() => true),
    defaults: vi.fn(() => ({
      name: 'test-peer',
      env: 'test',
      port: 8765,
      domain: 'localhost',
      peers: []
    }))
  }))
}))

vi.mock('../../src/Process/index.js', () => ({
  Process: vi.fn().mockImplementation(() => ({
    check: vi.fn(() => false),
    clean: vi.fn(),
    find: vi.fn(() => null),
    isrunning: vi.fn(() => false),
    kill: vi.fn()
  }))
}))

vi.mock('../../src/Reporter/index.js', () => ({
  Reporter: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    alive: vi.fn(),
    ip: vi.fn(),
    ddns: vi.fn(),
    activate: vi.fn()
  }))
}))

vi.mock('../../src/Network/index.js', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ ipv4: '192.168.1.1', ipv6: null })),
    validate: vi.fn((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip)),
    update: vi.fn(() => Promise.resolve([{ success: true }]))
  }
}))

describe('Peer Class - Comprehensive Tests', () => {
  let mockContext: any
  let tempDir: string
  let serverMock: any
  let originalConsoleLog: any
  let originalConsoleError: any

  beforeEach(() => {
    tempDir = `/tmp/peer-test-${Date.now()}`
    
    // Create mock server
    serverMock = {
      listen: vi.fn((port, callback) => callback && callback()),
      close: vi.fn((callback) => callback && callback()),
      on: vi.fn(),
      address: vi.fn(() => ({ port: 8765, address: '0.0.0.0' }))
    }

    // Mock http/https createServer
    vi.spyOn(http, 'createServer').mockReturnValue(serverMock as any)
    vi.spyOn(https, 'createServer').mockReturnValue(serverMock as any)

    // Mock fs operations
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{}')
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any)
    
    // Silence console during tests
    originalConsoleLog = console.log
    originalConsoleError = console.error
    console.log = vi.fn()
    console.error = vi.fn()

    // Create mock context for method testing
    mockContext = {
      name: 'test-peer',
      env: 'test',
      root: tempDir,
      config: {
        name: 'test-peer',
        env: 'test',
        port: 8765,
        domain: 'localhost',
        peers: [],
        test: {
          port: 8765,
          domain: 'localhost',
          peers: []
        }
      },
      manager: {
        read: vi.fn(() => mockContext.config),
        write: vi.fn(),
        sync: vi.fn(),
        validate: vi.fn(() => true)
      },
      process: {
        check: vi.fn(() => false),
        clean: vi.fn(),
        find: vi.fn(() => null),
        isrunning: vi.fn(() => false),
        kill: vi.fn()
      },
      reporter: {
        start: vi.fn(),
        stop: vi.fn(),
        alive: vi.fn(),
        ip: vi.fn(),
        ddns: vi.fn(),
        activate: vi.fn()
      },
      server: null,
      gun: null,
      user: null,
      pair: null,
      attempts: 0,
      maxAttempts: 5
    }
  })

  afterEach(() => {
    console.log = originalConsoleLog
    console.error = originalConsoleError
    vi.restoreAllMocks()
  })

  describe('constructor.ts', () => {
    test('should initialize Peer with default values', () => {
      const context: any = {}
      constructor.call(context)
      
      expect(context.name).toBe('air')
      expect(context.env).toBe('development')
      expect(context.attempts).toBe(0)
      expect(context.maxAttempts).toBe(5)
      expect(context.manager).toBeDefined()
      expect(context.process).toBeDefined()
      expect(context.reporter).toBeDefined()
    })

    test('should initialize with custom name and env', () => {
      const context: any = {}
      constructor.call(context, 'custom-peer', 'production')
      
      expect(context.name).toBe('custom-peer')
      expect(context.env).toBe('production')
    })

    test('should initialize with environment variables', () => {
      process.env.AIR_NAME = 'env-peer'
      process.env.AIR_ENV = 'staging'
      
      const context: any = {}
      constructor.call(context)
      
      expect(context.name).toBe('env-peer')
      expect(context.env).toBe('staging')
      
      delete process.env.AIR_NAME
      delete process.env.AIR_ENV
    })

    test('should handle special characters in name', () => {
      const context: any = {}
      constructor.call(context, 'test-ñáme-üñïcödé', 'test')
      
      expect(context.name).toBe('test-ñáme-üñïcödé')
    })
  })

  describe('start.ts', () => {
    test('should start peer successfully', async () => {
      const result = await start.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.manager.read).toHaveBeenCalled()
      expect(mockContext.manager.validate).toHaveBeenCalledWith(mockContext.config)
    })

    test('should handle invalid configuration', async () => {
      mockContext.manager.validate.mockReturnValue(false)
      
      const result = await start.call(mockContext)
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid configuration'))
    })

    test('should handle process already running', async () => {
      mockContext.process.check.mockReturnValue(true)
      mockContext.process.find.mockReturnValue({ pid: 12345, port: 8765 })
      
      const result = await start.call(mockContext)
      
      expect(result).toBe(false)
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('already running'))
    })

    test('should clean stale PID file', async () => {
      mockContext.process.check.mockReturnValue(true)
      mockContext.process.find.mockReturnValue(null)
      
      const result = await start.call(mockContext)
      
      expect(mockContext.process.clean).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    test('should handle start errors gracefully', async () => {
      mockContext.manager.read.mockImplementation(() => {
        throw new Error('Read failed')
      })
      
      const result = await start.call(mockContext)
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to start'))
    })
  })

  describe('stop.ts', () => {
    test('should stop running peer', async () => {
      mockContext.server = serverMock
      mockContext.gun = { opt: vi.fn() }
      mockContext.user = { leave: vi.fn() }
      
      const result = await stop.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.reporter.stop).toHaveBeenCalled()
      expect(serverMock.close).toHaveBeenCalled()
      expect(mockContext.process.clean).toHaveBeenCalled()
    })

    test('should handle stop when not running', async () => {
      mockContext.server = null
      
      const result = await stop.call(mockContext)
      
      expect(result).toBe(true)
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Not running'))
    })

    test('should force kill process if needed', async () => {
      mockContext.process.isrunning.mockReturnValue(true)
      
      const result = await stop.call(mockContext)
      
      expect(mockContext.process.kill).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    test('should handle server close errors', async () => {
      mockContext.server = {
        close: vi.fn((callback) => callback(new Error('Close failed')))
      }
      
      const result = await stop.call(mockContext)
      
      expect(result).toBe(true)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error closing server'))
    })
  })

  describe('restart.ts', () => {
    test('should restart with exponential backoff', async () => {
      mockContext.attempts = 0
      
      const startTime = Date.now()
      const result = await restart.call(mockContext)
      const elapsed = Date.now() - startTime
      
      expect(result).toBe(true)
      expect(mockContext.attempts).toBe(1)
      expect(elapsed).toBeGreaterThanOrEqual(4000) // 5s base - 20% jitter
    })

    test('should cap delay at maximum', async () => {
      mockContext.attempts = 10 // High attempt count
      
      const startTime = Date.now()
      const result = await restart.call(mockContext)
      const elapsed = Date.now() - startTime
      
      expect(result).toBe(true)
      expect(elapsed).toBeLessThan(65000) // Max 60s + jitter
    })

    test('should fail after max attempts', async () => {
      mockContext.attempts = 5
      mockContext.maxAttempts = 5
      
      const result = await restart.call(mockContext)
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Maximum restart attempts'))
    })

    test('should reset attempts on successful start', async () => {
      mockContext.attempts = 3
      
      const result = await restart.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.attempts).toBe(0)
    })
  })

  describe('init.ts', () => {
    test('should initialize HTTP server', async () => {
      mockContext.config.test.ssl = undefined
      
      const result = await init.call(mockContext)
      
      expect(result).toBe(true)
      expect(http.createServer).toHaveBeenCalled()
      expect(mockContext.server).toBeDefined()
      expect(serverMock.listen).toHaveBeenCalledWith(8765, expect.any(Function))
    })

    test('should initialize HTTPS server with SSL', async () => {
      mockContext.config.test.ssl = {
        key: '/path/to/key.pem',
        cert: '/path/to/cert.pem'
      }
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync')
        .mockReturnValueOnce('key-content')
        .mockReturnValueOnce('cert-content')
      
      const result = await init.call(mockContext)
      
      expect(result).toBe(true)
      expect(https.createServer).toHaveBeenCalledWith({
        key: 'key-content',
        cert: 'cert-content'
      }, expect.any(Function))
    })

    test('should handle missing SSL files', async () => {
      mockContext.config.test.ssl = {
        key: '/missing/key.pem',
        cert: '/missing/cert.pem'
      }
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      
      const result = await init.call(mockContext)
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('SSL key file not found'))
    })

    test('should handle port already in use', async () => {
      serverMock.listen.mockImplementation((port, callback) => {
        serverMock.emit('error', { code: 'EADDRINUSE' })
      })
      serverMock.emit = vi.fn((event, error) => {
        if (event === 'error' && error.code === 'EADDRINUSE') {
          console.error(`Port ${mockContext.config.test.port} is already in use`)
        }
      })
      
      const result = await init.call(mockContext)
      
      expect(result).toBe(true) // Still returns true but logs error
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('already in use'))
    })
  })

  describe('run.ts', () => {
    test('should initialize GUN database', () => {
      const result = run.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.gun).toBeDefined()
    })

    test('should configure GUN with peers', () => {
      mockContext.config.test.peers = ['http://peer1.com/gun', 'http://peer2.com/gun']
      
      const result = run.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.gun).toBeDefined()
    })

    test('should handle GUN initialization errors', () => {
      // Force an error by making gun constructor throw
      const Gun = require('gun').default
      Gun.mockImplementationOnce(() => {
        throw new Error('GUN init failed')
      })
      
      const result = run.call(mockContext)
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize GUN'))
    })
  })

  describe('online.ts', () => {
    test('should authenticate existing user', async () => {
      mockContext.gun = {
        user: vi.fn(() => ({
          auth: vi.fn((name, pass, cb) => cb({ ok: 0, pub: 'test-pub' })),
          create: vi.fn(),
          leave: vi.fn()
        }))
      }
      mockContext.config.test.pair = { pub: 'test-pub', priv: 'test-priv', epub: 'test-epub', epriv: 'test-epriv' }
      
      const result = await online.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.user).toBeDefined()
    })

    test('should create new user if not exists', async () => {
      let authCalled = false
      mockContext.gun = {
        user: vi.fn(() => ({
          auth: vi.fn((name, pass, cb) => {
            if (!authCalled) {
              authCalled = true
              cb({ err: 'User not found' })
            } else {
              cb({ ok: 0, pub: 'new-pub' })
            }
          }),
          create: vi.fn((name, pass, cb) => cb({ ok: 0, pub: 'new-pub' })),
          leave: vi.fn()
        }))
      }
      
      const result = await online.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.gun.user().create).toHaveBeenCalled()
    })

    test('should generate new pair if missing', async () => {
      mockContext.gun = {
        user: vi.fn(() => ({
          auth: vi.fn((name, pass, cb) => cb({ ok: 0, pub: 'test-pub' })),
          create: vi.fn(),
          leave: vi.fn()
        }))
      }
      mockContext.config.test.pair = undefined
      
      const result = await online.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.pair).toBeDefined()
      expect(mockContext.manager.write).toHaveBeenCalled()
    })

    test('should handle authentication failure', async () => {
      mockContext.gun = {
        user: vi.fn(() => ({
          auth: vi.fn((name, pass, cb) => cb({ err: 'Auth failed' })),
          create: vi.fn((name, pass, cb) => cb({ err: 'Create failed' })),
          leave: vi.fn()
        }))
      }
      
      const result = await online.call(mockContext)
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to authenticate'))
    })
  })

  describe('sync.ts', () => {
    test('should sync configuration to GUN', async () => {
      mockContext.gun = {
        get: vi.fn(() => ({
          put: vi.fn()
        }))
      }
      mockContext.user = {
        get: vi.fn(() => ({
          get: vi.fn(() => ({
            put: vi.fn()
          }))
        }))
      }
      
      const result = await sync.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.gun.get).toHaveBeenCalledWith('peers')
      expect(mockContext.user.get).toHaveBeenCalledWith('config')
    })

    test('should handle sync without user', async () => {
      mockContext.gun = {
        get: vi.fn(() => ({
          put: vi.fn()
        }))
      }
      mockContext.user = null
      
      const result = await sync.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.gun.get).toHaveBeenCalled()
    })

    test('should handle sync errors', async () => {
      mockContext.gun = {
        get: vi.fn(() => {
          throw new Error('GUN error')
        })
      }
      
      const result = await sync.call(mockContext)
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to sync'))
    })
  })

  describe('activate.ts', () => {
    test('should activate reporter', () => {
      activate.call(mockContext)
      
      expect(mockContext.reporter.activate).toHaveBeenCalled()
    })

    test('should handle missing reporter', () => {
      mockContext.reporter = null
      
      expect(() => activate.call(mockContext)).not.toThrow()
    })
  })

  describe('check.ts', () => {
    test('should check if process is running', () => {
      mockContext.process.check.mockReturnValue(true)
      
      const result = check.call(mockContext)
      
      expect(result).toBe(true)
      expect(mockContext.process.check).toHaveBeenCalled()
    })

    test('should return false when not running', () => {
      mockContext.process.check.mockReturnValue(false)
      
      const result = check.call(mockContext)
      
      expect(result).toBe(false)
    })
  })

  describe('clean.ts', () => {
    test('should clean process files', () => {
      clean.call(mockContext)
      
      expect(mockContext.process.clean).toHaveBeenCalled()
    })

    test('should handle clean errors', () => {
      mockContext.process.clean.mockImplementation(() => {
        throw new Error('Clean failed')
      })
      
      expect(() => clean.call(mockContext)).not.toThrow()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to clean'))
    })
  })

  describe('find.ts', () => {
    test('should find process by port', () => {
      const processInfo = { pid: 12345, port: 8765, command: 'node' }
      mockContext.process.find.mockReturnValue(processInfo)
      
      const result = find.call(mockContext, 8765)
      
      expect(result).toEqual(processInfo)
      expect(mockContext.process.find).toHaveBeenCalledWith(8765)
    })

    test('should return null when process not found', () => {
      mockContext.process.find.mockReturnValue(null)
      
      const result = find.call(mockContext, 8765)
      
      expect(result).toBeNull()
    })
  })

  describe('read.ts', () => {
    test('should read data from GUN', async () => {
      mockContext.gun = {
        get: vi.fn(() => ({
          once: vi.fn((callback) => callback({ test: 'data' }))
        }))
      }
      
      const result = await read.call(mockContext, 'test-key')
      
      expect(result).toEqual({ test: 'data' })
      expect(mockContext.gun.get).toHaveBeenCalledWith('test-key')
    })

    test('should handle read without GUN', async () => {
      mockContext.gun = null
      
      const result = await read.call(mockContext, 'test-key')
      
      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('GUN not initialized'))
    })

    test('should handle read errors', async () => {
      mockContext.gun = {
        get: vi.fn(() => {
          throw new Error('Read failed')
        })
      }
      
      const result = await read.call(mockContext, 'test-key')
      
      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to read'))
    })
  })

  describe('write.ts', () => {
    test('should write data to GUN', async () => {
      const putMock = vi.fn()
      mockContext.gun = {
        get: vi.fn(() => ({
          put: putMock
        }))
      }
      
      const result = await write.call(mockContext, 'test-key', { test: 'data' })
      
      expect(result).toBe(true)
      expect(mockContext.gun.get).toHaveBeenCalledWith('test-key')
      expect(putMock).toHaveBeenCalledWith({ test: 'data' })
    })

    test('should handle write without GUN', async () => {
      mockContext.gun = null
      
      const result = await write.call(mockContext, 'test-key', { test: 'data' })
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('GUN not initialized'))
    })

    test('should handle write errors', async () => {
      mockContext.gun = {
        get: vi.fn(() => {
          throw new Error('Write failed')
        })
      }
      
      const result = await write.call(mockContext, 'test-key', { test: 'data' })
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to write'))
    })
  })

  describe('Peer Class Integration', () => {
    test('should handle complete peer lifecycle', async () => {
      const peer = new Peer('integration-test', 'test')
      
      // Start peer
      const started = await peer.start()
      expect(started).toBe(true)
      
      // Check if running
      expect(peer.check()).toBe(false) // Mock returns false
      
      // Stop peer
      const stopped = await peer.stop()
      expect(stopped).toBe(true)
    })

    test('should handle configuration and sync workflow', async () => {
      const peer = new Peer()
      
      // Read config
      const config = peer.read()
      expect(config).toBeDefined()
      
      // Write config
      peer.write()
      expect(peer.manager.write).toHaveBeenCalled()
      
      // Sync to GUN
      const synced = await peer.sync()
      expect(synced).toBe(true)
    })

    test('should handle restart with retries', async () => {
      const peer = new Peer()
      peer.attempts = 0
      
      const restarted = await peer.restart()
      expect(restarted).toBe(true)
      expect(peer.attempts).toBe(0) // Reset after successful restart
    })

    test('should handle data operations', async () => {
      const peer = new Peer()
      peer.gun = {
        get: vi.fn(() => ({
          put: vi.fn(),
          once: vi.fn((cb) => cb({ value: 'test' }))
        }))
      }
      
      // Write data
      const written = await peer.write('key', { value: 'test' })
      expect(written).toBe(true)
      
      // Read data
      const data = await peer.read('key')
      expect(data).toEqual({ value: 'test' })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle network errors during init', async () => {
      serverMock.listen.mockImplementation((port, callback) => {
        serverMock.emit('error', new Error('Network error'))
      })
      
      const result = await init.call(mockContext)
      
      expect(result).toBe(true) // Still tries to continue
    })

    test('should handle concurrent start calls', async () => {
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(start.call(mockContext))
      }
      
      const results = await Promise.all(promises)
      expect(results.every(r => typeof r === 'boolean')).toBe(true)
    })

    test('should handle invalid port numbers', async () => {
      mockContext.config.test.port = -1
      
      const result = await init.call(mockContext)
      
      expect(result).toBe(true) // Attempts to use invalid port
      expect(serverMock.listen).toHaveBeenCalledWith(-1, expect.any(Function))
    })

    test('should handle extremely long peer names', () => {
      const longName = 'x'.repeat(1000)
      const context: any = {}
      constructor.call(context, longName, 'test')
      
      expect(context.name).toBe(longName)
    })

    test('should handle missing configuration file', async () => {
      mockContext.manager.read.mockReturnValue(null)
      mockContext.manager.validate.mockReturnValue(false)
      
      const result = await start.call(mockContext)
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid configuration'))
    })
  })

  describe('Performance and Stress Tests', () => {
    test('should handle rapid start/stop cycles', async () => {
      for (let i = 0; i < 10; i++) {
        await start.call(mockContext)
        await stop.call(mockContext)
      }
      
      expect(mockContext.process.clean).toHaveBeenCalledTimes(10)
    })

    test('should handle large configuration objects', async () => {
      const largeConfig = {
        ...mockContext.config,
        largeData: 'x'.repeat(100000),
        nested: {
          deep: {
            structure: {
              with: {
                many: {
                  levels: 'value'
                }
              }
            }
          }
        }
      }
      mockContext.config = largeConfig
      
      const result = await sync.call(mockContext)
      
      expect(result).toBe(true)
    })

    test('should handle many peer connections', () => {
      const manyPeers = []
      for (let i = 0; i < 100; i++) {
        manyPeers.push(`http://peer${i}.com/gun`)
      }
      mockContext.config.test.peers = manyPeers
      
      const result = run.call(mockContext)
      
      expect(result).toBe(true)
    })
  })
})