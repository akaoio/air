/**
 * Platform Strategies Focused Coverage Tests
 * Targets LinuxSystemd (5% coverage - lines 23-306) and Windows strategies
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { configMocks } from './mocks/configMocks.js'

// Mock child_process before any imports
const mockExecSync = jest.fn()
const mockSpawn = jest.fn()
jest.mock('child_process', () => ({
  execSync: mockExecSync,
  spawn: mockSpawn
}))

// Mock fs operations
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  chmodSync: jest.fn()
}
jest.mock('fs', () => mockFs)

describe('Platform Strategies Focused Coverage', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'platform-test-'))
    jest.clearAllMocks()
    
    // Reset all mocks to default behaviors
    mockExecSync.mockImplementation(() => '')
    mockSpawn.mockReturnValue({
      pid: 12345,
      unref: jest.fn(),
      on: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    })
    mockFs.existsSync.mockReturnValue(false)
    mockFs.readFileSync.mockReturnValue('{"root":"/tmp/test","name":"test"}')
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('LinuxSystemdStrategy Coverage', () => {
    test('should create LinuxSystemdStrategy instance and detect capabilities', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      // Mock systemctl check
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('which systemctl')) return '/usr/bin/systemctl'
        if (cmd.includes('which pm2')) throw new Error('not found')
        if (cmd.includes('which docker')) return '/usr/bin/docker'
        if (cmd.includes('which node')) return '/usr/bin/node'
        return ''
      })

      // Mock process.getuid to simulate non-root user
      const originalGetuid = process.getuid
      if (process.getuid) {
        process.getuid = jest.fn().mockReturnValue(1000) as () => number
      }

      const strategy = new LinuxSystemdStrategy()
      expect(strategy).toBeDefined()
      expect(strategy.getName()).toBe('Linux with Systemd')
      
      const capabilities = strategy.getCapabilities()
      expect(capabilities.platform).toBe('linux')
      expect(capabilities.hasSystemd).toBe(true)
      expect(capabilities.hasDocker).toBe(true)
      expect(capabilities.isRoot).toBe(false)
      expect(capabilities.canSudo).toBe(true) // which sudo succeeds by default

      // Restore original function
      if (originalGetuid) {
        process.getuid = originalGetuid
      }
    })

    test('should handle createService with systemd available', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      // Mock root user
      const originalGetuid = process.getuid
      if (process.getuid) {
        process.getuid = jest.fn().mockReturnValue(0) as () => number
      }
      
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('which systemctl')) return '/usr/bin/systemctl'
        return ''
      })
      mockFs.existsSync.mockReturnValue(false) // Service doesn't exist
      
      const strategy = new LinuxSystemdStrategy()
      const config = {
        ...configMocks.valid.basic,
        root: tempDir,
        name: 'test-service'
      }
      
      const result = await strategy.createService(config)
      expect(result.success).toBe(true)
      expect(result.type).toBe('systemd')
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('systemctl daemon-reload')
      )
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('systemctl enable')
      )

      process.getuid = originalGetuid
    })

    test('should handle createService when service already exists', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockFs.existsSync.mockReturnValue(true) // Service exists
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('which systemctl')) return '/usr/bin/systemctl'
        return ''
      })
      
      const strategy = new LinuxSystemdStrategy()
      const config = configMocks.valid.basic
      
      const result = await strategy.createService(config)
      expect(result.success).toBe(true)
      expect(result.message).toContain('already exists')
    })

    test('should handle createService without root privileges', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      // Mock non-root user without sudo
      const originalGetuid = process.getuid
      process.getuid = jest.fn().mockReturnValue(1000)
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('which systemctl')) return '/usr/bin/systemctl'
        if (cmd.includes('which sudo')) throw new Error('not found')
        return ''
      })
      
      const strategy = new LinuxSystemdStrategy()
      const config = configMocks.valid.basic
      
      const result = await strategy.createService(config)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Root privileges required')

      process.getuid = originalGetuid
    })

    test('should handle createService with sudo privileges', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      // Mock non-root user with sudo
      const originalGetuid = process.getuid
      process.getuid = jest.fn().mockReturnValue(1000)
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('which systemctl')) return '/usr/bin/systemctl'
        if (cmd.includes('which sudo')) return '/usr/bin/sudo'
        return ''
      })
      mockFs.existsSync.mockReturnValue(false)
      
      const strategy = new LinuxSystemdStrategy()
      const config = {
        ...configMocks.valid.basic,
        name: 'test-sudo-service'
      }
      
      const result = await strategy.createService(config)
      expect(result.success).toBe(true)
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('sudo systemctl daemon-reload')
      )

      process.getuid = originalGetuid
    })

    test('should handle startService with systemd', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockExecSync.mockImplementation((cmd) => {
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

    test('should fallback to direct start when systemd fails', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('which systemctl')) return '/usr/bin/systemctl'
        if (cmd.includes('systemctl start')) throw new Error('Service failed')
        return ''
      })
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        root: '/tmp/test',
        name: 'test-service'
      }))
      
      const strategy = new LinuxSystemdStrategy()
      const result = await strategy.startService('test-service')
      
      expect(result.started).toBe(true)
      expect(result.method).toBe('spawn')
      expect(mockSpawn).toHaveBeenCalled()
    })

    test('should handle stopService', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('systemctl stop')) return ''
        return ''
      })
      
      const strategy = new LinuxSystemdStrategy()
      const result = await strategy.stopService('test-service')
      
      expect(result).toBe(true)
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('systemctl stop air-test-service.service'),
        expect.any(Object)
      )
    })

    test('should handle removeService', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      // Mock root user
      const originalGetuid = process.getuid
      process.getuid = jest.fn().mockReturnValue(0)
      
      mockExecSync.mockImplementation(() => '')
      
      const strategy = new LinuxSystemdStrategy()
      const result = await strategy.removeService('test-service')
      
      expect(result).toBe(true)
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('systemctl stop'),
        expect.any(Object)
      )
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('systemctl disable'),
        expect.any(Object)
      )
      expect(mockFs.unlinkSync).toHaveBeenCalled()

      process.getuid = originalGetuid
    })

    test('should handle getServiceStatus', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('systemctl is-active')) return 'active\n'
        return ''
      })
      
      const strategy = new LinuxSystemdStrategy()
      const status = await strategy.getServiceStatus('test-service')
      
      expect(status).toBe('running')
    })

    test('should handle setupSSL with existing certificates', async () => {
      const { LinuxSystemdStrategy } = await import('../src/Platform/LinuxSystemd/index.js')
      
      mockFs.existsSync.mockImplementation((filePath) => {
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
      
      mockFs.existsSync.mockReturnValue(false) // No existing certs
      mockExecSync.mockImplementation((cmd) => {
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
      expect(mockFs.mkdirSync).toHaveBeenCalled()
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('openssl'),
        expect.any(Object)
      )
      expect(mockFs.chmodSync).toHaveBeenCalledTimes(2) // key and cert permissions
    })

    test('should handle getPaths for Linux', async () => {
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

  describe('WindowsStrategy Coverage', () => {
    test('should create WindowsStrategy instance and detect capabilities', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('sc query')) return 'SERVICE_NAME: test'
        if (cmd.includes('where pm2')) throw new Error('not found')
        if (cmd.includes('where docker')) return 'C:\\Program Files\\Docker\\docker.exe'
        if (cmd.includes('where node')) return 'C:\\Program Files\\nodejs\\node.exe'
        if (cmd.includes('net session')) throw new Error('Access denied')
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
      
      mockExecSync.mockImplementation((cmd) => {
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
      
      mockExecSync.mockImplementation((cmd) => {
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
      expect(mockFs.writeFileSync).toHaveBeenCalled() // XML file
      expect(mockFs.unlinkSync).toHaveBeenCalled() // Clean up temp file
    })

    test('should handle startService with NSSM', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) return 'C:\\nssm\\nssm.exe'
        if (cmd.includes('nssm start')) return ''
        return ''
      })
      
      const strategy = new WindowsStrategy()
      const result = await strategy.startService('test-service')
      
      expect(result.started).toBe(true)
      expect(result.method).toBe('windows-service')
    })

    test('should handle startService with Task Scheduler', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) throw new Error('not found')
        if (cmd.includes('schtasks /run')) return ''
        return ''
      })
      
      const strategy = new WindowsStrategy()
      const result = await strategy.startService('test-service')
      
      expect(result.started).toBe(true)
      expect(result.method).toBe('windows-service')
    })

    test('should fallback to direct start when service methods fail', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) throw new Error('not found')
        if (cmd.includes('schtasks /run')) throw new Error('Task not found')
        if (cmd.includes('start /B')) return ''
        return ''
      })
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        root: 'C:\\Air',
        name: 'test-service'
      }))
      
      const strategy = new WindowsStrategy()
      const result = await strategy.startService('test-service')
      
      expect(result.started).toBe(true)
      expect(result.method).toBe('spawn')
    })

    test('should handle setupSSL with OpenSSL', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockFs.existsSync.mockReturnValue(false)
      mockExecSync.mockImplementation((cmd) => {
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

    test('should handle setupSSL with PowerShell fallback', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockFs.existsSync.mockReturnValue(false)
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where openssl')) throw new Error('not found')
        if (cmd.includes('powershell')) return ''
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
      expect(result.certPath).toContain('cert.pfx') // PFX format
    })

    test('should handle getPaths for Windows', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      // Mock Windows environment variables
      const originalProgramData = process.env.PROGRAMDATA
      const originalAppData = process.env.APPDATA
      
      process.env.PROGRAMDATA = 'C:\\ProgramData'
      process.env.APPDATA = 'C:\\Users\\Test\\AppData\\Roaming'
      
      const strategy = new WindowsStrategy()
      const paths = strategy.getPaths()
      
      expect(paths.serviceDir).toContain('Air\\Services')
      expect(paths.configDir).toContain('Air\\Config')
      expect(paths.logDir).toContain('Air\\Logs')
      expect(paths.dataDir).toContain('Air\\Data')
      
      // Restore environment variables
      process.env.PROGRAMDATA = originalProgramData
      process.env.APPDATA = originalAppData
    })

    test('should handle getServiceStatus with NSSM', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) return 'C:\\nssm\\nssm.exe'
        if (cmd.includes('nssm status')) return 'SERVICE_RUNNING'
        return ''
      })
      
      const strategy = new WindowsStrategy()
      const status = await strategy.getServiceStatus('test-service')
      
      expect(status).toBe('running')
    })

    test('should handle getServiceStatus with Task Scheduler', async () => {
      const { WindowsStrategy } = await import('../src/Platform/Windows/index.js')
      
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) throw new Error('not found')
        if (cmd.includes('schtasks /query')) return 'TaskName    Next Run Time    Status\nAir-test    N/A              Running'
        return ''
      })
      
      const strategy = new WindowsStrategy()
      const status = await strategy.getServiceStatus('test-service')
      
      expect(status).toBe('running')
    })
  })

  describe('Platform Main Index Coverage', () => {
    test('should create Platform instance and detect strategy', async () => {
      const { Platform } = await import('../src/Platform/index.js')
      
      const platform = new Platform()
      expect(platform).toBeDefined()
      expect(typeof platform.createService).toBe('function')
      expect(typeof platform.startService).toBe('function')
      expect(typeof platform.stopService).toBe('function')
    })

    test('should handle different platform detection', async () => {
      const { Platform } = await import('../src/Platform/index.js')
      
      // Mock different platform
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      
      const platform = new Platform()
      expect(platform).toBeDefined()
      
      // Restore platform
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })
  })
})