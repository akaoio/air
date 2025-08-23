/**
 * Installer/Uninstaller Service Operations Focused Coverage Tests  
 * Targets SSL setup, service operations, and complete uninstall workflow
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { configMocks } from './mocks/configMocks.js'

// Mock fs operations
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  copyFileSync: jest.fn(),
  chmodSync: jest.fn(),
  rmSync: jest.fn(),
  readdirSync: jest.fn()
}
jest.mock('fs', () => mockFs)

// Mock Platform
const mockPlatformInstance = {
  setupSSL: jest.fn(),
  createService: jest.fn(),
  removeService: jest.fn(),
  stopService: jest.fn(),
  getCapabilities: jest.fn(),
  getName: jest.fn()
}

jest.mock('../src/Platform/index.js', () => ({
  Platform: {
    getInstance: () => mockPlatformInstance
  }
}))

describe('Installer/Uninstaller Service Operations Focused Coverage', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'installer-test-'))
    jest.clearAllMocks()
    
    // Reset mock implementations
    mockFs.existsSync.mockReturnValue(false)
    mockFs.readFileSync.mockReturnValue('{}')
    mockFs.readdirSync.mockReturnValue([])
    mockPlatformInstance.setupSSL.mockResolvedValue({ success: true })
    mockPlatformInstance.createService.mockResolvedValue({ success: true })
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Installer SSL Setup Coverage', () => {
    test('should execute ssl setup successfully', async () => {
      const { ssl } = await import('../src/Installer/ssl.js')
      
      mockPlatformInstance.setupSSL.mockResolvedValue({
        success: true,
        keyPath: '/path/to/key.pem',
        certPath: '/path/to/cert.pem'
      })

      const config = { ...configMocks.valid.basic }
      const result = await ssl.call({}, config)
      
      expect(result).toBe(true)
      expect(config.ssl).toBeDefined()
      expect(config.ssl?.key).toBe('/path/to/key.pem')
      expect(config.ssl?.cert).toBe('/path/to/cert.pem')
      expect(mockPlatformInstance.setupSSL).toHaveBeenCalledWith(config)
    })

    test('should handle ssl setup failure', async () => {
      const { ssl } = await import('../src/Installer/ssl.js')
      
      mockPlatformInstance.setupSSL.mockResolvedValue({
        success: false,
        error: 'OpenSSL not found'
      })

      const config = { ...configMocks.valid.basic }
      const result = await ssl.call({}, config)
      
      expect(result).toBe(false)
      expect(config.ssl).toBeUndefined()
      expect(mockPlatformInstance.setupSSL).toHaveBeenCalledWith(config)
    })

    test('should handle ssl setup without paths', async () => {
      const { ssl } = await import('../src/Installer/ssl.js')
      
      mockPlatformInstance.setupSSL.mockResolvedValue({
        success: true
        // No keyPath/certPath returned
      })

      const config = { ...configMocks.valid.basic }
      const result = await ssl.call({}, config)
      
      expect(result).toBe(true)
      expect(config.ssl).toBeUndefined() // Should not be set without paths
    })

    test('should handle ssl setup with partial paths', async () => {
      const { ssl } = await import('../src/Installer/ssl.js')
      
      mockPlatformInstance.setupSSL.mockResolvedValue({
        success: true,
        keyPath: '/path/to/key.pem'
        // Missing certPath
      })

      const config = { ...configMocks.valid.basic }
      const result = await ssl.call({}, config)
      
      expect(result).toBe(true)
      expect(config.ssl).toBeUndefined() // Should not be set with incomplete paths
    })
  })

  describe('Installer Service Setup Coverage', () => {
    test('should execute service creation successfully', async () => {
      const { service } = await import('../src/Installer/service.js')
      
      mockPlatformInstance.createService.mockResolvedValue({
        success: true,
        type: 'systemd',
        message: 'Service created successfully'
      })

      const config = configMocks.valid.basic
      const result = await service.call({}, config)
      
      expect(result.created).toBe(true)
      expect(result.enabled).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockPlatformInstance.createService).toHaveBeenCalledWith(config)
    })

    test('should handle service creation failure', async () => {
      const { service } = await import('../src/Installer/service.js')
      
      mockPlatformInstance.createService.mockResolvedValue({
        success: false,
        error: 'Insufficient privileges'
      })

      const config = configMocks.valid.basic
      const result = await service.call({}, config)
      
      expect(result.created).toBe(false)
      expect(result.enabled).toBe(false)
      expect(result.error).toBe('Insufficient privileges')
    })

    test('should handle service creation with partial success', async () => {
      const { service } = await import('../src/Installer/service.js')
      
      mockPlatformInstance.createService.mockResolvedValue({
        success: true,
        type: 'windows-service',
        message: 'Service created but not enabled'
      })

      const config = configMocks.valid.basic
      const result = await service.call({}, config)
      
      expect(result.created).toBe(true)
      expect(result.enabled).toBe(true) // Both map to success
    })
  })

  describe('Uninstaller Clean Coverage', () => {
    test('should clean all files by default', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      // Mock files exist
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath.includes('root')) {
          return ['.test-peer.pid', '.air-backup.pid', 'error.log', 'access.log']
        }
        return []
      })

      const config = {
        ...configMocks.valid.basic,
        root: tempDir,
        name: 'test-peer'
      }
      
      const result = clean(config)
      
      expect(result.success).toBe(true)
      expect(result.cleaned).toBeGreaterThan(0)
      expect(mockFs.unlinkSync).toHaveBeenCalled()
      expect(mockFs.rmSync).toHaveBeenCalled() // SSL directory
    })

    test('should respect keepConfig option', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('air.json') || filePath.includes('.pid')
      })
      mockFs.readdirSync.mockReturnValue(['.test-peer.pid'])

      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const result = clean(config, { keepConfig: true })
      
      expect(result.success).toBe(true)
      expect(mockFs.unlinkSync).not.toHaveBeenCalledWith(
        expect.stringContaining('air.json')
      )
    })

    test('should respect keepSSL option', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('ssl') || filePath.includes('.pid')
      })
      mockFs.readdirSync.mockReturnValue(['.test-peer.pid'])

      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const result = clean(config, { keepSSL: true })
      
      expect(result.success).toBe(true)
      expect(mockFs.rmSync).not.toHaveBeenCalledWith(
        expect.stringContaining('ssl'),
        expect.any(Object)
      )
    })

    test('should respect keepLogs option', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readdirSync.mockReturnValue(['error.log', 'access.log', '.test-peer.pid'])

      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const result = clean(config, { keepLogs: true })
      
      expect(result.success).toBe(true)
      // Should not delete .log files
      const unlinkCalls = mockFs.unlinkSync.mock.calls.map(call => call[0])
      const logDeletes = unlinkCalls.filter(path => path.includes('.log'))
      expect(logDeletes).toHaveLength(0)
    })

    test('should backup config file before deletion', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('air.json')
      })
      mockFs.readdirSync.mockReturnValue([])

      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const result = clean(config, { keepConfig: false })
      
      expect(result.success).toBe(true)
      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        expect.stringContaining('air.json'),
        expect.stringContaining('air.json.backup')
      )
    })

    test('should handle cleaning errors gracefully', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const result = clean(config)
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Permission denied')
      expect(result.cleaned).toBe(0)
    })

    test('should clean DDNS state file', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('ddns.json')
      })
      mockFs.readdirSync.mockReturnValue([])

      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const result = clean(config)
      
      expect(result.success).toBe(true)
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('ddns.json')
      )
    })

    test('should clean multiple PID files', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readdirSync.mockReturnValue([
        '.air-main.pid',
        '.air-backup.pid', 
        '.test-peer.pid',
        'other-file.txt'
      ])

      const config = {
        ...configMocks.valid.basic,
        root: tempDir,
        name: 'test-peer'
      }
      
      const result = clean(config)
      
      expect(result.success).toBe(true)
      expect(result.cleaned).toBeGreaterThan(2) // At least the PID files
      
      // Verify PID files were deleted
      const unlinkCalls = mockFs.unlinkSync.mock.calls.map(call => call[0])
      const pidDeletes = unlinkCalls.filter(path => path.includes('.pid'))
      expect(pidDeletes.length).toBeGreaterThan(0)
    })
  })

  describe('Uninstaller Remove Coverage', () => {
    test('should handle remove operation', async () => {
      const { remove } = await import('../src/Uninstaller/remove.js')
      
      mockPlatformInstance.removeService.mockResolvedValue(true)

      const mockContext = {
        config: configMocks.valid.basic,
        logger: {
          info: jest.fn(),
          error: jest.fn(),
          debug: jest.fn()
        }
      }
      
      const result = await remove.call(mockContext)
      
      expect(mockPlatformInstance.removeService).toHaveBeenCalledWith(
        configMocks.valid.basic.name
      )
      expect(typeof result).toBe('boolean')
    })

    test('should handle remove operation failure', async () => {
      const { remove } = await import('../src/Uninstaller/remove.js')
      
      mockPlatformInstance.removeService.mockResolvedValue(false)

      const mockContext = {
        config: configMocks.valid.basic,
        logger: {
          info: jest.fn(),
          error: jest.fn(),
          debug: jest.fn()
        }
      }
      
      const result = await remove.call(mockContext)
      
      expect(result).toBe(false)
    })
  })

  describe('Uninstaller Stop Coverage', () => {
    test('should handle stop operation', async () => {
      const { stop } = await import('../src/Uninstaller/stop.js')
      
      mockPlatformInstance.stopService.mockResolvedValue(true)

      const mockContext = {
        config: configMocks.valid.basic,
        logger: {
          info: jest.fn(),
          error: jest.fn(),
          debug: jest.fn()
        }
      }
      
      const result = await stop.call(mockContext)
      
      expect(mockPlatformInstance.stopService).toHaveBeenCalledWith(
        configMocks.valid.basic.name
      )
      expect(typeof result).toBe('boolean')
    })

    test('should handle stop operation failure', async () => {
      const { stop } = await import('../src/Uninstaller/stop.js')
      
      mockPlatformInstance.stopService.mockResolvedValue(false)

      const mockContext = {
        config: configMocks.valid.basic,
        logger: {
          info: jest.fn(),
          error: jest.fn(),
          debug: jest.fn()
        }
      }
      
      const result = await stop.call(mockContext)
      
      expect(result).toBe(false)
    })
  })

  describe('Complete Installation/Uninstallation Workflow', () => {
    test('should handle complete installer workflow', async () => {
      const { Installer } = await import('../src/Installer/index.js')
      
      // Mock successful operations
      mockPlatformInstance.setupSSL.mockResolvedValue({
        success: true,
        keyPath: '/ssl/key.pem',
        certPath: '/ssl/cert.pem'
      })
      mockPlatformInstance.createService.mockResolvedValue({
        success: true,
        type: 'systemd'
      })

      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const installer = new Installer(config)
      expect(installer).toBeDefined()
      expect(typeof installer.ssl).toBe('function')
      expect(typeof installer.service).toBe('function')
    })

    test('should handle complete uninstaller workflow', async () => {
      const { Uninstaller } = await import('../src/Uninstaller/index.js')
      
      // Mock successful operations
      mockPlatformInstance.stopService.mockResolvedValue(true)
      mockPlatformInstance.removeService.mockResolvedValue(true)
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readdirSync.mockReturnValue(['.test.pid'])

      const uninstaller = new Uninstaller()
      expect(uninstaller).toBeDefined()
      expect(typeof uninstaller.stop).toBe('function')
      expect(typeof uninstaller.remove).toBe('function')
      expect(typeof uninstaller.clean).toBe('function')
    })

    test('should handle installer error scenarios', async () => {
      const { ssl } = await import('../src/Installer/ssl.js')
      const { service } = await import('../src/Installer/service.js')
      
      // Mock error scenarios
      mockPlatformInstance.setupSSL.mockResolvedValue({
        success: false,
        error: 'SSL setup failed'
      })
      mockPlatformInstance.createService.mockResolvedValue({
        success: false,
        error: 'Service creation failed'
      })

      const config = configMocks.valid.basic
      
      const sslResult = await ssl.call({}, config)
      const serviceResult = await service.call({}, config)
      
      expect(sslResult).toBe(false)
      expect(serviceResult.created).toBe(false)
      expect(serviceResult.error).toBe('Service creation failed')
    })

    test('should handle uninstaller error scenarios', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      // Mock filesystem errors
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Directory access failed')
      })

      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const result = clean(config)
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Directory access failed')
    })
  })
})