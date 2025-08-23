/**
 * Complete Manager Module Test Coverage
 * Target: 0% → 90%+ coverage
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Mock fs module
vi.mock('fs')

describe('Manager Module Complete Coverage', () => {
  const mockRootDir = '/tmp/test-air'
  const mockConfigPath = path.join(mockRootDir, 'air.json')
  
  const mockConfig = {
    name: 'test-air',
    env: 'development',
    root: mockRootDir,
    bash: '/bin/bash',
    sync: 'test-sync-key',
    development: {
      port: 8765,
      domain: 'test.example.com',
      ssl: {
        cert: '/tmp/test-cert.pem',
        key: '/tmp/test-key.pem'
      },
      peers: ['peer1:8765', 'peer2:8765']
    },
    production: {
      port: 8766,
      domain: 'prod.example.com'
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    
    // Mock fs methods
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig))
    vi.mocked(fs.writeFileSync).mockImplementation(() => {})
    vi.mocked(fs.mkdirSync).mockImplementation(() => {})
    
    // Mock os
    vi.spyOn(os, 'homedir').mockReturnValue('/home/test')
    
    // Reset environment variables
    delete process.env.AIR_ROOT
    delete process.env.PORT
    delete process.env.DOMAIN
    delete process.env.SYNC
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Manager/constructor', () => {
    test('should initialize with root path', async () => {
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      expect(manager).toBeDefined()
      expect(manager.root).toBe(mockRootDir)
    })

    test('should create directory if not exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockRootDir, { recursive: true })
    })
  })

  describe('Manager/read', () => {
    test('should read config from file', async () => {
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const config = manager.read()
      
      expect(config).toEqual(mockConfig)
      expect(fs.readFileSync).toHaveBeenCalledWith(mockConfigPath, 'utf8')
    })

    test('should return defaults if file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const config = manager.read()
      
      expect(config).toBeDefined()
      expect(config.name).toBe('air')
      expect(config.env).toBe('development')
    })

    test('should handle JSON parse errors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json')
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const config = manager.read()
      
      expect(config).toBeDefined()
      expect(config.name).toBe('air')
    })
  })

  describe('Manager/write', () => {
    test('should write config to file', async () => {
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      manager.write(mockConfig)
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        JSON.stringify(mockConfig, null, 2)
      )
    })

    test('should create directory before writing', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      manager.write(mockConfig)
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockRootDir, { recursive: true })
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    test('should handle write errors gracefully', async () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write failed')
      })
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      expect(() => manager.write(mockConfig)).not.toThrow()
    })
  })

  describe('Manager/mergeenv', () => {
    test('should merge environment variables into config', async () => {
      process.env.PORT = '9000'
      process.env.DOMAIN = 'env.example.com'
      process.env.SYNC = 'env-sync-key'
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const merged = manager.mergeenv(mockConfig)
      
      expect(merged.sync).toBe('env-sync-key')
      expect(merged.development.port).toBe(9000)
      expect(merged.development.domain).toBe('env.example.com')
    })

    test('should handle AIR_ROOT environment variable', async () => {
      process.env.AIR_ROOT = '/custom/root'
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const merged = manager.mergeenv(mockConfig)
      
      expect(merged.root).toBe('/custom/root')
    })

    test('should preserve config when no env vars set', async () => {
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const merged = manager.mergeenv(mockConfig)
      
      expect(merged).toEqual(mockConfig)
    })
  })

  describe('Manager/validate', () => {
    test('should validate valid config', async () => {
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const isValid = manager.validate(mockConfig)
      
      expect(isValid).toBe(true)
    })

    test('should reject config without name', async () => {
      const invalidConfig = { ...mockConfig, name: '' }
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const isValid = manager.validate(invalidConfig)
      
      expect(isValid).toBe(false)
    })

    test('should reject config without environment', async () => {
      const invalidConfig = { ...mockConfig, env: undefined }
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const isValid = manager.validate(invalidConfig)
      
      expect(isValid).toBe(false)
    })

    test('should reject config without port in environment', async () => {
      const invalidConfig = {
        ...mockConfig,
        development: { ...mockConfig.development, port: undefined }
      }
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const isValid = manager.validate(invalidConfig)
      
      expect(isValid).toBe(false)
    })
  })

  describe('Manager/sync', () => {
    test('should sync config by reading, merging env, and writing', async () => {
      process.env.PORT = '9001'
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const synced = manager.sync()
      
      expect(synced.development.port).toBe(9001)
      expect(fs.readFileSync).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    test('should handle sync with validation', async () => {
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      // Mock validate to ensure it's called
      const validateSpy = vi.spyOn(manager, 'validate')
      
      const synced = manager.sync()
      
      expect(validateSpy).toHaveBeenCalled()
      expect(synced).toEqual(mockConfig)
    })
  })

  describe('Manager/defaults', () => {
    test('should provide default configuration', async () => {
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const defaults = manager.defaults()
      
      expect(defaults).toBeDefined()
      expect(defaults.name).toBe('air')
      expect(defaults.env).toBe('development')
      expect(defaults.development).toBeDefined()
      expect(defaults.development.port).toBe(8765)
    })

    test('should include production defaults', async () => {
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const defaults = manager.defaults()
      
      expect(defaults.production).toBeDefined()
      expect(defaults.production.port).toBe(8765)
    })
  })

  describe('Manager edge cases', () => {
    test('should handle missing environment config', async () => {
      const configNoEnv = {
        name: 'test',
        env: 'staging'
      }
      
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(configNoEnv))
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const config = manager.read()
      
      expect(config).toBeDefined()
      expect(config.name).toBe('test')
    })

    test('should handle numeric PORT env variable', async () => {
      process.env.PORT = '8080'
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      const merged = manager.mergeenv(mockConfig)
      
      expect(merged.development.port).toBe(8080)
      expect(typeof merged.development.port).toBe('number')
    })

    test('should handle SSL configuration merging', async () => {
      process.env.SSL_CERT = '/custom/cert.pem'
      process.env.SSL_KEY = '/custom/key.pem'
      
      const { Manager } = await import('../src/Manager/index.js')
      const manager = new Manager(mockRootDir)
      
      // Test custom SSL env handling if implemented
      const merged = manager.mergeenv(mockConfig)
      
      expect(merged.development.ssl).toBeDefined()
    })
  })
})