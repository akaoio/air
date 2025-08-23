/**
 * Platform Strategies Fixed Coverage Tests
 * Targets LinuxSystemd (5% coverage - lines 23-306) and Windows strategies
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { configMocks } from './mocks/configMocks.js'

// Mock child_process
const mockExecSync = jest.fn<string, [string, any?]>()
const mockSpawn = jest.fn()
jest.mock('child_process', () => ({
  execSync: mockExecSync,
  spawn: mockSpawn
}))

// Mock fs operations  
const mockFsSync = {
  existsSync: jest.fn<boolean, [string]>(),
  readFileSync: jest.fn<string | Buffer, [string, any?]>(),
  writeFileSync: jest.fn<void, [string, string]>(),
  mkdirSync: jest.fn<void, [string, any?]>(),
  unlinkSync: jest.fn<void, [string]>(),
  chmodSync: jest.fn<void, [string, number]>()
}
jest.mock('fs', () => mockFsSync)

describe('Platform Strategies Fixed Coverage', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'platform-test-'))
    jest.clearAllMocks()
    
    // Default mock behaviors
    mockExecSync.mockReturnValue('')
    mockSpawn.mockReturnValue({
      pid: 12345,
      unref: jest.fn(),
      on: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    })
    mockFsSync.existsSync.mockReturnValue(false)
    mockFsSync.readFileSync.mockReturnValue('{"root":"/tmp/test","name":"test"}')
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('LinuxSystemdStrategy Basic Coverage', () => {
    test('should create LinuxSystemdStrategy and detect capabilities', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('which systemctl')) return '/usr/bin/systemctl'
        if (cmd.includes('which docker')) return '/usr/bin/docker'
        if (cmd.includes('which node')) return '/usr/bin/node'
        if (cmd.includes('which pm2')) throw new Error('not found')
        return ''
      })

      const strategy = new LinuxSystemdStrategy()
      expect(strategy).toBeDefined()
      expect(strategy.getName()).toBe('Linux with Systemd')
      
      const capabilities = strategy.getCapabilities()
      expect(capabilities.platform).toBe('linux')
      expect(capabilities.hasSystemd).toBe(true)
      expect(capabilities.hasDocker).toBe(true)
    })

    test('should handle createService successfully', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('which systemctl')) return '/usr/bin/systemctl'
        if (cmd.includes('systemctl daemon-reload')) return ''
        if (cmd.includes('systemctl enable')) return ''
        return ''
      })
      
      mockFsSync.existsSync.mockReturnValue(false) // Service doesn't exist
      
      const strategy = new LinuxSystemdStrategy()
      const config = {
        ...configMocks.valid.basic,
        root: tempDir,
        name: 'test-service'
      }
      
      const result = await strategy.createService(config)
      expect(result.success).toBe(true)
      expect(result.type).toBe('systemd')
    })

    test('should handle service already exists', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockFsSync.existsSync.mockReturnValue(true) // Service exists
      
      const strategy = new LinuxSystemdStrategy()
      const config = configMocks.valid.basic
      
      const result = await strategy.createService(config)
      expect(result.success).toBe(true)
      expect(result.message).toContain('already exists')
    })

    test('should handle startService with systemd', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('which systemctl')) return '/usr/bin/systemctl'
        if (cmd.includes('systemctl start')) return ''
        if (cmd.includes('systemctl show')) return 'MainPID=12345'
        return ''
      })
      
      const strategy = new LinuxSystemdStrategy()
      const result = await strategy.startService('test-service')
      
      expect(result.started).toBe(true)
      expect(result.pid).toBe(12345)
      expect(result.method).toBe('systemd')
    })

    test('should handle stopService', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('systemctl stop')) return ''
        return ''
      })
      
      const strategy = new LinuxSystemdStrategy()
      const result = await strategy.stopService('test-service')
      
      expect(result).toBe(true)
    })

    test('should handle setupSSL with existing certificates', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockFsSync.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('key.pem') || filePath.includes('cert.pem')
      })
      
      const strategy = new LinuxSystemdStrategy()
      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const result = await strategy.setupSSL(config)
      expect(result.success).toBe(true)
      expect(result.keyPath).toContain('key.pem')
      expect(result.certPath).toContain('cert.pem')
    })

    test('should handle setupSSL certificate generation', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockFsSync.existsSync.mockReturnValue(false) // No existing certs
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('openssl')) return ''
        return ''
      })
      
      const strategy = new LinuxSystemdStrategy()
      const config = {
        ...configMocks.valid.basic,
        root: tempDir,
        domain: 'test.example.com'
      }
      
      const result = await strategy.setupSSL(config)
      expect(result.success).toBe(true)
      expect(mockFsSync.mkdirSync).toHaveBeenCalled()
      expect(mockFsSync.chmodSync).toHaveBeenCalledTimes(2)
    })

    test('should get platform paths', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      const strategy = new LinuxSystemdStrategy()
      const paths = strategy.getPaths()
      
      expect(paths.serviceDir).toBe('/etc/systemd/system')
      expect(paths.configDir).toBe('/etc/air')
      expect(paths.logDir).toBe('/var/log/air')
      expect(paths.dataDir).toBe('/var/lib/air')
      expect(paths.tempDir).toBe('/tmp/air')
    })
  })

  describe('WindowsStrategy Basic Coverage', () => {
    test('should create WindowsStrategy and detect capabilities', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('sc query')) return 'SERVICE_NAME: test'
        if (cmd.includes('where docker')) return 'C:\\Program Files\\Docker\\docker.exe'
        if (cmd.includes('where node')) return 'C:\\Program Files\\nodejs\\node.exe'
        if (cmd.includes('net session')) throw new Error('Access denied') // Not admin
        return ''
      })
      
      const strategy = new WindowsStrategy()
      expect(strategy).toBeDefined()
      expect(strategy.getName()).toBe('Windows')
      
      const capabilities = strategy.getCapabilities()
      expect(capabilities.platform).toBe('win32')
      expect(capabilities.hasWindowsService).toBe(true)
      expect(capabilities.hasDocker).toBe(true)
      expect(capabilities.isRoot).toBe(false)
      expect(capabilities.canSudo).toBe(false) // Windows doesn't use sudo
    })

    test('should handle createService with NSSM', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('net session')) return 'Success' // Administrator
        if (cmd.includes('where nssm')) return 'C:\\nssm\\nssm.exe'
        if (cmd.includes('nssm install')) return ''
        return ''
      })
      
      const strategy = new WindowsStrategy()
      const config = {
        ...configMocks.valid.basic,
        name: 'test-windows-service'
      }
      
      const result = await strategy.createService(config)
      expect(result.success).toBe(true)
      expect(result.type).toBe('windows-service')
      expect(result.message).toContain('NSSM')
    })

    test('should handle createService with Task Scheduler fallback', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('net session')) return 'Success' // Administrator
        if (cmd.includes('where nssm')) throw new Error('not found')
        if (cmd.includes('schtasks /create')) return ''
        return ''
      })
      
      const strategy = new WindowsStrategy()
      const config = {
        ...configMocks.valid.basic,
        name: 'test-task'
      }
      
      const result = await strategy.createService(config)
      expect(result.success).toBe(true)
      expect(result.message).toContain('Task Scheduler')
      expect(mockFsSync.writeFileSync).toHaveBeenCalled() // XML file
      expect(mockFsSync.unlinkSync).toHaveBeenCalled() // Clean up temp file
    })

    test('should handle startService with NSSM', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('where nssm')) return 'C:\\nssm\\nssm.exe'
        if (cmd.includes('nssm start')) return ''
        return ''
      })
      
      const strategy = new WindowsStrategy()
      const result = await strategy.startService('test-service')
      
      expect(result.started).toBe(true)
      expect(result.method).toBe('windows-service')
    })

    test('should handle setupSSL with OpenSSL', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockFsSync.existsSync.mockReturnValue(false)
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('where openssl')) return 'C:\\OpenSSL\\bin\\openssl.exe'
        if (cmd.includes('openssl req')) return ''
        return ''
      })
      
      const strategy = new WindowsStrategy()
      const config = {
        ...configMocks.valid.basic,
        root: 'C:\\Air',
        domain: 'test.example.com'
      }
      
      const result = await strategy.setupSSL(config)
      expect(result.success).toBe(true)
      expect(result.keyPath).toContain('key.pem')
    })
  })

  describe('Platform Main Coverage', () => {
    test('should create Platform instance', async () => {
      const { Platform } = await import('../src/Platform/index.js')
      
      const platform = new Platform()
      expect(platform).toBeDefined()
      expect(typeof platform.createService).toBe('function')
      expect(typeof platform.startService).toBe('function')
      expect(typeof platform.stopService).toBe('function')
    })
  })
})