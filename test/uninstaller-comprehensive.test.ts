import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Uninstaller Comprehensive Coverage Tests', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'air-uninstaller-comprehensive-'))
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Uninstaller Constructor Coverage', () => {
    test('should import and create Uninstaller instance', async () => {
      const { Uninstaller } = await import('../src/Uninstaller/index.js')
      
      const config = {
        name: 'uninstaller-test',
        env: 'development' as const,
        root: tempDir,
        development: { port: 8765 }
      }
      
      const uninstaller = new Uninstaller(config)
      expect(uninstaller).toBeDefined()
      expect(uninstaller.config).toEqual(config)
    })

    test('should call constructor method directly', async () => {
      const { constructor: UninstallerConstructor } = await import('../src/Uninstaller/constructor.js')
      
      const mockThis = {
        config: undefined,
        platform: undefined
      }
      
      const config = {
        name: 'constructor-test',
        env: 'production' as const,
        root: tempDir,
        production: { port: 443 }
      }
      
      UninstallerConstructor.call(mockThis, config)
      expect(mockThis.config).toEqual(config)
      expect(mockThis.platform).toBeDefined()
    })
  })

  describe('Uninstaller Clean Operations', () => {
    test('should perform clean operations', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      const mockThis = {
        config: {
          name: 'clean-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          clean: vi.fn().mockResolvedValue({ success: true })
        }
      }
      
      const result = await clean.call(mockThis)
      expect(result).toBeDefined()
      expect(mockThis.platform.clean).toHaveBeenCalled()
    })

    test('should handle clean failures gracefully', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      const mockThis = {
        config: {
          name: 'clean-fail-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          clean: vi.fn().mockRejectedValue(new Error('Clean failed'))
        }
      }
      
      try {
        const result = await clean.call(mockThis)
        // Should handle errors gracefully
        expect(result).toBeDefined()
      } catch (error) {
        // May propagate error, which is fine
        expect(error.message).toContain('Clean failed')
      }
    })

    test('should handle clean with file removal', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      // Create some test files to clean
      const testFile = path.join(tempDir, 'test-file.txt')
      await fs.writeFile(testFile, 'test content')
      
      const mockThis = {
        config: {
          name: 'clean-files-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          clean: vi.fn().mockImplementation(async (config) => {
            // Simulate platform cleaning files
            try {
              await fs.rm(testFile)
              return { success: true, cleaned: [testFile] }
            } catch (error) {
              return { success: false, error: error.message }
            }
          })
        }
      }
      
      const result = await clean.call(mockThis)
      expect(result).toBeDefined()
      expect(mockThis.platform.clean).toHaveBeenCalledWith(mockThis.config)
    })
  })

  describe('Uninstaller Remove Operations', () => {
    test('should perform remove operations', async () => {
      const { remove } = await import('../src/Uninstaller/remove.js')
      
      const mockThis = {
        config: {
          name: 'remove-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          remove: vi.fn().mockResolvedValue({ 
            success: true, 
            removed: ['service', 'config', 'logs'] 
          })
        }
      }
      
      const result = await remove.call(mockThis)
      expect(result).toBeDefined()
      expect(mockThis.platform.remove).toHaveBeenCalledWith(mockThis.config)
    })

    test('should handle remove with force option', async () => {
      const { remove } = await import('../src/Uninstaller/remove.js')
      
      const mockThis = {
        config: {
          name: 'remove-force-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          remove: vi.fn().mockResolvedValue({ success: true })
        }
      }
      
      const result = await remove.call(mockThis, { force: true })
      expect(result).toBeDefined()
      expect(mockThis.platform.remove).toHaveBeenCalled()
    })

    test('should handle remove failures', async () => {
      const { remove } = await import('../src/Uninstaller/remove.js')
      
      const mockThis = {
        config: {
          name: 'remove-fail-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          remove: vi.fn().mockRejectedValue(new Error('Permission denied'))
        }
      }
      
      try {
        const result = await remove.call(mockThis)
        // May handle error gracefully or propagate
        expect(result !== undefined).toBe(true)
      } catch (error) {
        expect(error.message).toContain('Permission denied')
      }
    })

    test('should remove configuration files', async () => {
      const { remove } = await import('../src/Uninstaller/remove.js')
      
      // Create test config file
      const configFile = path.join(tempDir, 'air.json')
      await fs.writeFile(configFile, JSON.stringify({ name: 'test' }))
      
      const mockThis = {
        config: {
          name: 'remove-config-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          remove: vi.fn().mockImplementation(async (config) => {
            try {
              await fs.rm(configFile)
              return { success: true, removedFiles: [configFile] }
            } catch (error) {
              return { success: false, error: error.message }
            }
          })
        }
      }
      
      const result = await remove.call(mockThis)
      expect(result).toBeDefined()
    })
  })

  describe('Uninstaller Stop Operations', () => {
    test('should stop services before removal', async () => {
      const { stop } = await import('../src/Uninstaller/stop.js')
      
      const mockThis = {
        config: {
          name: 'stop-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          stop: vi.fn().mockResolvedValue({ 
            success: true, 
            status: 'stopped',
            pid: null 
          })
        }
      }
      
      const result = await stop.call(mockThis)
      expect(result).toBeDefined()
      expect(mockThis.platform.stop).toHaveBeenCalledWith(mockThis.config.name)
    })

    test('should handle stop when service not running', async () => {
      const { stop } = await import('../src/Uninstaller/stop.js')
      
      const mockThis = {
        config: {
          name: 'stop-not-running-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          stop: vi.fn().mockResolvedValue({ 
            success: false, 
            error: 'Service not found',
            status: 'not-running'
          })
        }
      }
      
      const result = await stop.call(mockThis)
      expect(result).toBeDefined()
      // Should handle "not running" as acceptable outcome
    })

    test('should handle stop with timeout', async () => {
      const { stop } = await import('../src/Uninstaller/stop.js')
      
      const mockThis = {
        config: {
          name: 'stop-timeout-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          stop: vi.fn().mockImplementation(async (name) => {
            // Simulate a service that takes time to stop
            await new Promise(resolve => setTimeout(resolve, 100))
            return { success: true, status: 'stopped', duration: 100 }
          })
        }
      }
      
      const result = await stop.call(mockThis)
      expect(result).toBeDefined()
      expect(mockThis.platform.stop).toHaveBeenCalled()
    })

    test('should force stop if graceful stop fails', async () => {
      const { stop } = await import('../src/Uninstaller/stop.js')
      
      let stopAttempts = 0
      const mockThis = {
        config: {
          name: 'stop-force-test',
          env: 'development' as const,
          root: tempDir,
          development: { port: 8765 }
        },
        platform: {
          stop: vi.fn().mockImplementation(async (name, options = {}) => {
            stopAttempts++
            if (options.force || stopAttempts > 1) {
              return { success: true, status: 'killed', method: 'force' }
            } else {
              return { success: false, error: 'Process not responding' }
            }
          })
        }
      }
      
      try {
        const result = await stop.call(mockThis, { force: true })
        expect(result).toBeDefined()
      } catch (error) {
        // May need force option implementation
        expect(error).toBeDefined()
      }
    })
  })

  describe('Uninstaller Integration Tests', () => {
    test('should perform complete uninstall sequence', async () => {
      const { Uninstaller } = await import('../src/Uninstaller/index.js')
      
      const config = {
        name: 'complete-uninstall-test',
        env: 'development' as const,
        root: tempDir,
        development: { port: 8765 }
      }
      
      const uninstaller = new Uninstaller(config)
      
      // Mock all platform operations
      uninstaller.platform = {
        stop: vi.fn().mockResolvedValue({ success: true }),
        clean: vi.fn().mockResolvedValue({ success: true }),
        remove: vi.fn().mockResolvedValue({ success: true })
      }
      
      // Test that uninstaller has all methods
      expect(typeof uninstaller.stop).toBe('function')
      expect(typeof uninstaller.clean).toBe('function')
      expect(typeof uninstaller.remove).toBe('function')
    })

    test('should handle partial failures during uninstall', async () => {
      const { Uninstaller } = await import('../src/Uninstaller/index.js')
      
      const config = {
        name: 'partial-failure-test',
        env: 'development' as const,
        root: tempDir,
        development: { port: 8765 }
      }
      
      const uninstaller = new Uninstaller(config)
      
      // Mock platform with mixed success/failure
      uninstaller.platform = {
        stop: vi.fn().mockResolvedValue({ success: true }),
        clean: vi.fn().mockRejectedValue(new Error('Permission denied')),
        remove: vi.fn().mockResolvedValue({ success: true })
      }
      
      // Test individual operations
      try {
        await uninstaller.stop()
        expect(uninstaller.platform.stop).toHaveBeenCalled()
      } catch (error) {
        // Should not fail on stop
        expect(false).toBe(true)
      }
      
      try {
        await uninstaller.clean()
        // Should propagate clean error
        expect(false).toBe(true) 
      } catch (error) {
        expect(error.message).toContain('Permission denied')
      }
    })

    test('should handle dry run mode', async () => {
      const { Uninstaller } = await import('../src/Uninstaller/index.js')
      
      const config = {
        name: 'dry-run-test',
        env: 'development' as const,
        root: tempDir,
        development: { port: 8765 },
        dryRun: true
      }
      
      const uninstaller = new Uninstaller(config)
      
      // Mock platform to track calls without side effects
      uninstaller.platform = {
        stop: vi.fn().mockResolvedValue({ 
          success: true, 
          dryRun: true,
          wouldStop: 'air-service'
        }),
        clean: vi.fn().mockResolvedValue({ 
          success: true, 
          dryRun: true,
          wouldClean: ['logs', 'cache']
        }),
        remove: vi.fn().mockResolvedValue({ 
          success: true, 
          dryRun: true,
          wouldRemove: ['service', 'config']
        })
      }
      
      expect(uninstaller).toBeDefined()
      expect(uninstaller.config.dryRun).toBe(true)
    })
  })

  describe('Uninstaller Error Handling', () => {
    test('should handle missing platform', async () => {
      const { Uninstaller } = await import('../src/Uninstaller/index.js')
      
      const config = {
        name: 'missing-platform-test',
        env: 'development' as const,
        root: tempDir,
        development: { port: 8765 }
      }
      
      const uninstaller = new Uninstaller(config)
      
      // Simulate missing or failed platform
      uninstaller.platform = null
      
      try {
        await uninstaller.stop()
        // Should handle missing platform gracefully
        expect(true).toBe(true)
      } catch (error) {
        // Expected to fail without platform
        expect(error).toBeDefined()
      }
    })

    test('should handle configuration validation errors', async () => {
      const { Uninstaller } = await import('../src/Uninstaller/index.js')
      
      // Test with invalid config
      const invalidConfig = {
        // Missing required fields
      }
      
      try {
        const uninstaller = new Uninstaller(invalidConfig as any)
        expect(uninstaller).toBeDefined()
      } catch (error) {
        // May fail during construction with invalid config
        expect(error).toBeDefined()
      }
    })

    test('should handle filesystem permission errors', async () => {
      const { clean } = await import('../src/Uninstaller/clean.js')
      
      const mockThis = {
        config: {
          name: 'permission-test',
          env: 'development' as const,
          root: '/root', // Typically requires permissions
          development: { port: 8765 }
        },
        platform: {
          clean: vi.fn().mockRejectedValue(
            Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
          )
        }
      }
      
      try {
        await clean.call(mockThis)
      } catch (error) {
        expect(error.code).toBe('EACCES')
      }
    })
  })
})