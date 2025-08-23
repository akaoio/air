/**
 * Installer/Uninstaller Service Operations Fixed Coverage Tests  
 * Targets SSL setup, service operations, and complete uninstall workflow
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { configMocks } from './mocks/configMocks.js'

// Mock fs operations
const mockFsSync = {
  existsSync: jest.fn<boolean, [string]>(),
  readFileSync: jest.fn<string | Buffer, [string, any?]>(),
  writeFileSync: jest.fn<void, [string, string]>(),
  mkdirSync: jest.fn<void, [string, any?]>(),
  unlinkSync: jest.fn<void, [string]>(),
  copyFileSync: jest.fn<void, [string, string]>(),
  chmodSync: jest.fn<void, [string, number]>(),
  rmSync: jest.fn<void, [string, any?]>(),
  readdirSync: jest.fn<string[], [string]>()
}
jest.mock('fs', () => mockFsSync)

// Mock Platform with proper types
const mockPlatformInstance = {
  setupSSL: jest.fn<Promise<{ success: boolean; keyPath?: string; certPath?: string; error?: string }>, [any]>(),
  createService: jest.fn<Promise<{ success: boolean; type?: string; message?: string; error?: string }>, [any]>(),
  removeService: jest.fn<Promise<boolean>, [string]>(),
  stopService: jest.fn<Promise<boolean>, [string]>()
}

jest.mock('../src/Platform/index.js', () => ({
  Platform: {
    getInstance: () => mockPlatformInstance
  }
}))

describe('Installer/Uninstaller Service Operations Fixed Coverage', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'installer-test-'))
    jest.clearAllMocks()
    
    // Reset mock implementations
    mockFsSync.existsSync.mockReturnValue(false)
    mockFsSync.readFileSync.mockReturnValue('{}')
    mockFsSync.readdirSync.mockReturnValue([])
    mockPlatformInstance.setupSSL.mockResolvedValue({ success: true })
    mockPlatformInstance.createService.mockResolvedValue({ success: true })
    mockPlatformInstance.stopService.mockResolvedValue(true)
    mockPlatformInstance.removeService.mockResolvedValue(true)
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
  })

  describe('Uninstaller Clean Coverage', () => {
    test('should clean all files by default', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      // Mock files exist
      mockFsSync.existsSync.mockReturnValue(true)
      mockFsSync.readdirSync.mockImplementation((dirPath: string) => {
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
      expect(mockFsSync.unlinkSync).toHaveBeenCalled()
      expect(mockFsSync.rmSync).toHaveBeenCalled() // SSL directory
    })

    test('should respect keepConfig option', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      mockFsSync.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('air.json') || filePath.includes('.pid')
      })
      mockFsSync.readdirSync.mockReturnValue(['.test-peer.pid'])

      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const result = clean(config, { keepConfig: true })
      
      expect(result.success).toBe(true)
      // Config should not be deleted
      const unlinkCalls = (mockFsSync.unlinkSync as jest.Mock).mock.calls.map(call => call[0])
      const configDeletes = unlinkCalls.filter((path: string) => path.includes('air.json'))
      expect(configDeletes).toHaveLength(0)
    })

    test('should backup config file before deletion', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      mockFsSync.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('air.json')
      })
      mockFsSync.readdirSync.mockReturnValue([])

      const config = {
        ...configMocks.valid.basic,
        root: tempDir
      }
      
      const result = clean(config, { keepConfig: false })
      
      expect(result.success).toBe(true)
      expect(mockFsSync.copyFileSync).toHaveBeenCalledWith(
        expect.stringContaining('air.json'),
        expect.stringContaining('air.json.backup')
      )
    })

    test('should handle cleaning errors gracefully', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      mockFsSync.existsSync.mockReturnValue(true)
      mockFsSync.readdirSync.mockImplementation(() => {
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
      expect(result).toBe(true)
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
      mockFsSync.existsSync.mockReturnValue(true)
      mockFsSync.readdirSync.mockReturnValue(['.test.pid'])

      const uninstaller = new Uninstaller()
      expect(uninstaller).toBeDefined()
      expect(typeof uninstaller.stop).toBe('function')
      expect(typeof uninstaller.remove).toBe('function')
      expect(typeof uninstaller.clean).toBe('function')
    })
  })
})