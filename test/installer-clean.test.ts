import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Installer Clean Tests', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'air-installer-clean-'))
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Installer Constructor', () => {
    test('should create Installer instance', async () => {
      const { Installer } = await import('../src/Installer/index.js')
      
      const options = {
        root: tempDir,
        env: 'development' as const,
        name: 'test-installer'
      }
      
      const installer = new Installer(options)
      expect(installer).toBeDefined()
      expect(installer.options).toEqual(options)
      expect(installer.context).toBeDefined()
    })

    test('should call constructor method', async () => {
      const { constructor: InstallerConstructor } = await import('../src/Installer/constructor.js')
      
      const mockThis = { options: undefined, context: undefined }
      const options = { root: tempDir, name: 'test' }
      
      InstallerConstructor.call(mockThis, options)
      expect(mockThis.options).toEqual(options)
      expect(mockThis.context).toBeDefined()
    })
  })

  describe('Installer Check', () => {
    test('should check system info', async () => {
      const { check } = await import('../src/Installer/check.js')
      
      const result = check()
      expect(result).toBeDefined()
      expect(result.nodeVersion).toBe(process.version)
      expect(typeof result.platform).toBe('string')
      expect(typeof result.hasSudo).toBe('boolean')
    })
  })

  describe('Installer Detect', () => {
    test('should detect existing config', async () => {
      const { detect } = await import('../src/Installer/detect.js')
      
      const config = { name: 'test', env: 'development' as const }
      await fs.writeFile(path.join(tempDir, 'air.json'), JSON.stringify(config))
      
      const result = detect(tempDir)
      expect(result).toEqual(config)
    })

    test('should return null when no config exists', async () => {
      const { detect } = await import('../src/Installer/detect.js')
      
      const result = detect(tempDir)
      expect(result).toBeNull()
    })
  })

  describe('Installer Configure', () => {
    test('should configure with options', async () => {
      const { configure } = await import('../src/Installer/configure.js')
      
      const options = {
        root: tempDir,
        env: 'development' as const,
        name: 'configure-test'
      }
      
      const result = configure(options)
      expect(result).toBeDefined()
      expect(result.name).toBe('configure-test')
      expect(result.root).toBe(tempDir)
      expect(result.env).toBe('development')
    })
  })

  describe('Installer Save', () => {
    test('should save config to file', async () => {
      const { save } = await import('../src/Installer/save.js')
      
      const config = {
        name: 'save-test',
        env: 'development' as const,
        root: tempDir,
        development: { port: 8765 }
      }
      
      const mockThis = {
        logger: { info: vi.fn(), debug: vi.fn() }
      }
      
      save.call(mockThis, config)
      
      const savedConfig = JSON.parse(
        await fs.readFile(path.join(tempDir, 'air.json'), 'utf8')
      )
      expect(savedConfig).toEqual(config)
    })
  })

  describe('Installer Service Operations', () => {
    test('should import service function', async () => {
      const { service } = await import('../src/Installer/service.js')
      expect(typeof service).toBe('function')
    })
  })

  describe('Installer SSL Operations', () => {
    test('should import ssl function', async () => {
      const { ssl } = await import('../src/Installer/ssl.js')
      expect(typeof ssl).toBe('function')
    })
  })

  describe('Installer Start Operations', () => {
    test('should import start function', async () => {
      const { start } = await import('../src/Installer/start.js')
      expect(typeof start).toBe('function')
    })
  })

  describe('Installer Types', () => {
    test('should import types module', async () => {
      const typesModule = await import('../src/Installer/types.js')
      expect(typesModule).toBeDefined()
    })
  })
})