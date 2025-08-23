/**
 * Comprehensive Platform Module Coverage Test
 * Target: Push Platform module from current 91.11% to 95%+
 * Focus: LinuxSystemd (67.41% → 85%+), Windows (37.75% → 75%+)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync, spawn } from 'child_process'

// Platform module imports - following Class = Directory + Method-per-file pattern
import { Platform } from '../src/Platform/index.js'
import { LinuxSystemdStrategy } from '../src/Platform/LinuxSystemd/index.js'
import { WindowsStrategy } from '../src/Platform/Windows/index.js'
import type { AirConfig } from '../src/types/index.js'

// Mock external dependencies for controlled testing
vi.mock('fs')
vi.mock('child_process')
vi.mock('os')

const mockedFs = vi.mocked(fs)
const mockedExecSync = vi.mocked(execSync)
const mockedSpawn = vi.mocked(spawn)
const mockedOs = vi.mocked(os)

describe('Platform Module - Comprehensive Coverage', () => {
  let mockConfig: AirConfig
  let originalPlatform: NodeJS.Platform
  let originalUID: (() => number) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Store original values
    originalPlatform = process.platform
    originalUID = process.getuid
    
    // Setup mock config
    mockConfig = {
      name: 'test-air-service',
      env: 'test',
      root: '/test/air/root',
      domain: 'test.example.com',
      bash: '/bin/bash',
      test: {
        port: 18080,
        domain: 'test.example.com',
        peers: []
      }
    }

    // Setup common fs mocks
    mockedFs.existsSync.mockReturnValue(false)
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))
    mockedFs.writeFileSync.mockImplementation(() => {})
    mockedFs.mkdirSync.mockImplementation(() => '')
    mockedFs.unlinkSync.mockImplementation(() => {})
    mockedFs.chmodSync.mockImplementation(() => {})
    
    // Setup execSync to succeed by default
    mockedExecSync.mockReturnValue('command output')
  })

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true
    })
    
    if (originalUID) {
      process.getuid = originalUID
    } else {
      delete (process as any).getuid
    }
  })

  describe('Platform Detection and Strategy Creation', () => {
    it('should detect Linux platform and create systemd strategy', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true
      })
      
      // Mock systemd available
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('which systemctl') || cmd.includes('systemctl --version')) {
          return 'systemctl output'
        }
        throw new Error('Command not found')
      })

      const platform = new Platform()
      expect(platform.getName()).toContain('Linux')
    })

    it('should detect Windows platform and create Windows strategy', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      })

      const platform = new Platform()
      expect(platform.getName()).toBe('Windows')
    })

    it('should detect macOS and fallback to generic Unix strategy', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true
      })

      const platform = new Platform()
      expect(platform.getName()).toBeTruthy()
    })

    it('should handle unknown platform gracefully', () => {
      Object.defineProperty(process, 'platform', {
        value: 'unknown' as NodeJS.Platform,
        configurable: true
      })

      const platform = new Platform()
      expect(platform.getName()).toBeTruthy()
    })

    it('should handle FreeBSD platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'freebsd',
        configurable: true
      })

      const platform = new Platform()
      expect(platform.getName()).toBeTruthy()
    })

    it('should handle OpenBSD platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'openbsd',
        configurable: true
      })

      const platform = new Platform()
      expect(platform.getName()).toBeTruthy()
    })

    it('should handle SunOS platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'sunos',
        configurable: true
      })

      const platform = new Platform()
      expect(platform.getName()).toBeTruthy()
    })

    it('should handle AIX platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'aix',
        configurable: true
      })

      const platform = new Platform()
      expect(platform.getName()).toBeTruthy()
    })
  })

  describe('LinuxSystemd Strategy - Edge Cases and Error Paths', () => {
    let strategy: LinuxSystemdStrategy

    beforeEach(() => {
      strategy = new LinuxSystemdStrategy()
    })

    it('should handle systemd not available during service creation', async () => {
      // Mock systemd as not available
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('which systemctl')) {
          throw new Error('systemctl not found')
        }
        return 'output'
      })

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Systemd is not available')
    })

    it('should handle insufficient permissions for service creation', async () => {
      // Mock as non-root without sudo
      process.getuid = vi.fn().mockReturnValue(1000)
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('which sudo')) {
          throw new Error('sudo not found')
        }
        return 'output'
      })

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Root privileges required')
    })

    it('should handle existing service during creation', async () => {
      mockedFs.existsSync.mockReturnValue(true)

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(true)
      expect(result.message).toContain('already exists')
    })

    it('should handle service creation with root privileges', async () => {
      process.getuid = vi.fn().mockReturnValue(0) // Root user
      mockedFs.existsSync.mockReturnValue(false)

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(true)
      expect(result.type).toBe('systemd')
    })

    it('should handle service creation with sudo privileges', async () => {
      process.getuid = vi.fn().mockReturnValue(1000) // Non-root
      mockedFs.existsSync.mockReturnValue(false)
      
      // Mock sudo available
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('which sudo')) {
          return '/usr/bin/sudo'
        }
        return 'output'
      })

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(true)
    })

    it('should handle systemd unit file generation with Bun runtime', async () => {
      // Mock Bun available
      global.Bun = {} as any
      mockedFs.existsSync.mockReturnValue(false)
      process.getuid = vi.fn().mockReturnValue(0)

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(true)
      
      // Cleanup
      delete (global as any).Bun
    })

    it('should handle errors during service creation', async () => {
      mockedFs.existsSync.mockReturnValue(false)
      process.getuid = vi.fn().mockReturnValue(0)
      
      // Mock execSync to throw error
      mockedExecSync.mockImplementation(() => {
        throw new Error('systemctl command failed')
      })

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(false)
      expect(result.error).toContain('systemctl command failed')
    })

    it('should fallback to direct start when systemd unavailable', async () => {
      // Mock systemd unavailable
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('systemctl')) {
          throw new Error('systemctl not available')
        }
        return 'output'
      })

      // Mock spawn for direct start
      const mockChild = {
        pid: 12345,
        unref: vi.fn()
      }
      mockedSpawn.mockReturnValue(mockChild as any)

      const result = await strategy.startService('test-service')
      expect(result.started).toBe(true)
      expect(result.method).toBe('spawn')
      expect(result.pid).toBe(12345)
    })

    it('should handle direct start failure', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('systemctl failed')
      })
      
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Config file not found')
      })

      const result = await strategy.startService('test-service')
      expect(result.started).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle systemd service start with PID extraction', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('systemctl show')) {
          return 'MainPID=12345'
        }
        return 'output'
      })

      const result = await strategy.startService('test-service')
      expect(result.started).toBe(true)
      expect(result.pid).toBe(12345)
      expect(result.method).toBe('systemd')
    })

    it('should handle systemd service start without PID', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('systemctl show')) {
          return 'MainPID=0'
        }
        return 'output'
      })

      const result = await strategy.startService('test-service')
      expect(result.started).toBe(true)
      expect(result.pid).toBeUndefined()
    })

    it('should handle service removal with root privileges', async () => {
      process.getuid = vi.fn().mockReturnValue(0)

      const result = await strategy.removeService('test-service')
      expect(result).toBe(true)
    })

    it('should handle service removal with sudo privileges', async () => {
      process.getuid = vi.fn().mockReturnValue(1000)

      const result = await strategy.removeService('test-service')
      expect(result).toBe(true)
    })

    it('should handle service removal failure', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Service removal failed')
      })

      const result = await strategy.removeService('test-service')
      expect(result).toBe(false)
    })

    it('should check service status accurately', async () => {
      mockedExecSync.mockReturnValue('active')

      const status = await strategy.getServiceStatus('test-service')
      expect(status).toBe('running')
    })

    it('should handle inactive service status', async () => {
      mockedExecSync.mockReturnValue('inactive')

      const status = await strategy.getServiceStatus('test-service')
      expect(status).toBe('stopped')
    })

    it('should handle unknown service status', async () => {
      mockedExecSync.mockReturnValue('failed')

      const status = await strategy.getServiceStatus('test-service')
      expect(status).toBe('unknown')
    })

    it('should handle SSL setup when certificates exist', async () => {
      mockedFs.existsSync.mockReturnValue(true)

      const result = await strategy.setupSSL(mockConfig)
      expect(result.success).toBe(true)
      expect(result.keyPath).toBeTruthy()
      expect(result.certPath).toBeTruthy()
    })

    it('should handle SSL certificate generation', async () => {
      mockedFs.existsSync.mockReturnValue(false)

      const result = await strategy.setupSSL(mockConfig)
      expect(result.success).toBe(true)
    })

    it('should handle SSL generation failure', async () => {
      mockedFs.existsSync.mockReturnValue(false)
      mockedExecSync.mockImplementation(() => {
        throw new Error('OpenSSL failed')
      })

      const result = await strategy.setupSSL(mockConfig)
      expect(result.success).toBe(false)
      expect(result.error).toContain('OpenSSL failed')
    })
  })

  describe('Windows Strategy - Comprehensive Coverage', () => {
    let strategy: WindowsStrategy

    beforeEach(() => {
      strategy = new WindowsStrategy()
      
      // Mock Windows environment
      mockedOs.tmpdir.mockReturnValue('C:\\Temp')
      mockedOs.homedir.mockReturnValue('C:\\Users\\TestUser')
      process.env.PROGRAMDATA = 'C:\\ProgramData'
      process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming'
    })

    it('should handle service creation without administrator privileges', async () => {
      // Mock net session to fail (not admin)
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('net session')) {
          throw new Error('Access denied')
        }
        return 'output'
      })

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Administrator privileges required')
    })

    it('should create service with NSSM when available', async () => {
      // Mock admin privileges
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('net session')) {
          return 'success'
        }
        if (cmd.includes('where nssm')) {
          return 'C:\\nssm\\nssm.exe'
        }
        return 'output'
      })
      
      // Mock Bun available
      global.Bun = {} as any

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(true)
      expect(result.type).toBe('windows-service')
      expect(result.message).toContain('NSSM')
      
      // Cleanup
      delete (global as any).Bun
    })

    it('should fallback to Task Scheduler when NSSM unavailable', async () => {
      // Mock admin privileges
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('net session')) {
          return 'success'
        }
        if (cmd.includes('where nssm')) {
          throw new Error('nssm not found')
        }
        return 'output'
      })

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(true)
      expect(result.message).toContain('Task Scheduler')
    })

    it('should handle service creation errors', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('net session')) {
          return 'success'
        }
        if (cmd.includes('schtasks')) {
          throw new Error('Task creation failed')
        }
        return 'output'
      })

      const result = await strategy.createService(mockConfig)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Task creation failed')
    })

    it('should start service with NSSM', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) {
          return 'C:\\nssm\\nssm.exe'
        }
        return 'output'
      })

      const result = await strategy.startService('test-service')
      expect(result.started).toBe(true)
      expect(result.method).toBe('windows-service')
    })

    it('should fallback to Task Scheduler for start', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) {
          throw new Error('nssm not found')
        }
        return 'output'
      })

      const result = await strategy.startService('test-service')
      expect(result.started).toBe(true)
      expect(result.method).toBe('windows-service')
    })

    it('should fallback to direct spawn when service start fails', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Service start failed')
      })

      const result = await strategy.startService('test-service')
      expect(result.started).toBe(true)
      expect(result.method).toBe('spawn')
    })

    it('should handle direct spawn failure', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('All methods failed')
      })
      
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Config not found')
      })

      const result = await strategy.startService('test-service')
      expect(result.started).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should stop service with NSSM', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) {
          return 'C:\\nssm\\nssm.exe'
        }
        return 'output'
      })

      const result = await strategy.stopService('test-service')
      expect(result).toBe(true)
    })

    it('should stop service with Task Scheduler', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) {
          throw new Error('nssm not found')
        }
        return 'output'
      })

      const result = await strategy.stopService('test-service')
      expect(result).toBe(true)
    })

    it('should handle stop service failure', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Stop failed')
      })

      const result = await strategy.stopService('test-service')
      expect(result).toBe(false)
    })

    it('should remove service with NSSM', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) {
          return 'C:\\nssm\\nssm.exe'
        }
        return 'output'
      })

      const result = await strategy.removeService('test-service')
      expect(result).toBe(true)
    })

    it('should remove service with Task Scheduler', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) {
          throw new Error('nssm not found')
        }
        return 'output'
      })

      const result = await strategy.removeService('test-service')
      expect(result).toBe(true)
    })

    it('should get service status with NSSM', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) {
          return 'C:\\nssm\\nssm.exe'
        }
        if (cmd.includes('nssm status')) {
          return 'SERVICE_RUNNING'
        }
        return 'output'
      })

      const status = await strategy.getServiceStatus('test-service')
      expect(status).toBe('running')
    })

    it('should get stopped status with NSSM', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) {
          return 'C:\\nssm\\nssm.exe'
        }
        if (cmd.includes('nssm status')) {
          return 'SERVICE_STOPPED'
        }
        return 'output'
      })

      const status = await strategy.getServiceStatus('test-service')
      expect(status).toBe('stopped')
    })

    it('should get status with Task Scheduler', async () => {
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where nssm')) {
          throw new Error('nssm not found')
        }
        if (cmd.includes('schtasks /query')) {
          return 'Running'
        }
        return 'output'
      })

      const status = await strategy.getServiceStatus('test-service')
      expect(status).toBe('running')
    })

    it('should handle SSL setup with existing certificates', async () => {
      mockedFs.existsSync.mockReturnValue(true)

      const result = await strategy.setupSSL(mockConfig)
      expect(result.success).toBe(true)
    })

    it('should setup SSL with OpenSSL on Windows', async () => {
      mockedFs.existsSync.mockReturnValue(false)
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where openssl')) {
          return 'C:\\openssl\\openssl.exe'
        }
        return 'output'
      })

      const result = await strategy.setupSSL(mockConfig)
      expect(result.success).toBe(true)
    })

    it('should fallback to PowerShell for SSL when OpenSSL unavailable', async () => {
      mockedFs.existsSync.mockReturnValue(false)
      mockedExecSync.mockImplementation((cmd) => {
        if (cmd.includes('where openssl')) {
          throw new Error('openssl not found')
        }
        return 'output'
      })

      const result = await strategy.setupSSL(mockConfig)
      expect(result.success).toBe(true)
      expect(result.certPath).toContain('.pfx')
    })

    it('should handle SSL setup failure', async () => {
      mockedFs.existsSync.mockReturnValue(false)
      mockedExecSync.mockImplementation(() => {
        throw new Error('SSL generation failed')
      })

      const result = await strategy.setupSSL(mockConfig)
      expect(result.success).toBe(false)
    })

    it('should provide correct Windows paths', () => {
      const paths = strategy.getPaths()
      expect(paths.serviceDir).toContain('ProgramData')
      expect(paths.configDir).toContain('ProgramData')
      expect(paths.logDir).toContain('ProgramData')
      expect(paths.dataDir).toContain('AppData')
      expect(paths.tempDir).toContain('Temp')
    })

    it('should detect Windows capabilities correctly', () => {
      const capabilities = strategy.getCapabilities()
      expect(capabilities.platform).toBe('win32')
      expect(capabilities.hasSystemd).toBe(false)
      expect(capabilities.hasLaunchd).toBe(false)
      expect(capabilities.canSudo).toBe(false)
    })
  })

  describe('Platform Singleton and Strategy Management', () => {
    it('should maintain singleton instance', () => {
      // Reset singleton
      (Platform as any).instance = null
      
      const platform1 = Platform.getInstance()
      const platform2 = Platform.getInstance()
      
      expect(platform1).toBe(platform2)
    })

    it('should allow strategy override', () => {
      const platform = new Platform()
      const customStrategy = new LinuxSystemdStrategy()
      
      platform.setStrategy(customStrategy)
      expect(platform.getStrategy()).toBe(customStrategy)
    })

    it('should delegate all methods to strategy', async () => {
      const platform = new Platform()
      const mockStrategy = {
        getName: vi.fn().mockReturnValue('Mock Strategy'),
        getCapabilities: vi.fn().mockReturnValue({}),
        getPaths: vi.fn().mockReturnValue({}),
        createService: vi.fn().mockResolvedValue({ success: true }),
        startService: vi.fn().mockResolvedValue({ started: true }),
        stopService: vi.fn().mockResolvedValue(true),
        removeService: vi.fn().mockResolvedValue(true),
        getServiceStatus: vi.fn().mockResolvedValue('running'),
        setupSSL: vi.fn().mockResolvedValue({ success: true })
      }

      platform.setStrategy(mockStrategy as any)

      // Test all delegated methods
      expect(platform.getName()).toBe('Mock Strategy')
      expect(platform.getCapabilities()).toEqual({})
      expect(platform.getPaths()).toEqual({})
      
      await platform.createService(mockConfig)
      await platform.startService('test')
      await platform.stopService('test')
      await platform.removeService('test')
      await platform.getServiceStatus('test')
      await platform.setupSSL(mockConfig)

      // Verify all methods were called
      expect(mockStrategy.getName).toHaveBeenCalled()
      expect(mockStrategy.getCapabilities).toHaveBeenCalled()
      expect(mockStrategy.getPaths).toHaveBeenCalled()
      expect(mockStrategy.createService).toHaveBeenCalledWith(mockConfig)
      expect(mockStrategy.startService).toHaveBeenCalledWith('test')
      expect(mockStrategy.stopService).toHaveBeenCalledWith('test')
      expect(mockStrategy.removeService).toHaveBeenCalledWith('test')
      expect(mockStrategy.getServiceStatus).toHaveBeenCalledWith('test')
      expect(mockStrategy.setupSSL).toHaveBeenCalledWith(mockConfig)
    })
  })

  describe('Platform Detection Edge Cases', () => {
    it('should handle systemd detection failure in Linux', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true
      })
      
      // Mock systemd unavailable
      mockedExecSync.mockImplementation(() => {
        throw new Error('systemctl not found')
      })

      const platform = new Platform()
      // Should fallback to generic strategy
      expect(platform.getName()).toBeTruthy()
    })

    it('should warn about using fallback strategy', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true
      })
      
      mockedExecSync.mockImplementation(() => {
        throw new Error('systemctl not found')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      new Platform()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using LinuxSystemdStrategy as fallback')
      )
      
      consoleSpy.mockRestore()
    })

    it('should warn about unknown platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'unknown-os' as NodeJS.Platform,
        configurable: true
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      new Platform()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown platform: unknown-os')
      )
      
      consoleSpy.mockRestore()
    })
  })
})