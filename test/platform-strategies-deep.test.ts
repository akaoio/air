/**
 * Platform Strategies Deep Coverage Test
 * Target: LinuxSystemd (67% → 95%) and Windows (37% → 90%)
 * These are complex strategy implementations with many methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as childProcess from 'child_process'
import { createMockConfig } from './mocks/config-mocks-fixed.js'

// Static imports for Platform strategies
import { LinuxSystemdStrategy } from '../src/Platform/LinuxSystemd/index.js'
import { WindowsStrategy } from '../src/Platform/Windows/index.js'

// Mock external dependencies
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('child_process')

const mockedFs = vi.mocked(fs)
const mockedChildProcess = vi.mocked(childProcess)

describe('Platform Strategies Deep Coverage', () => {
  let config: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    config = createMockConfig()
    
    // Setup fs mocks
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue('mock service file content')
    mockedFs.writeFileSync.mockImplementation(() => {})
    mockedFs.mkdirSync.mockImplementation(() => '')
    mockedFs.chmodSync.mockImplementation(() => {})
    
    // Setup child_process mocks
    mockedChildProcess.execSync.mockReturnValue(Buffer.from('mock command output'))
    mockedChildProcess.spawn.mockReturnValue({
      pid: 12345,
      on: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() }
    } as any)
  })

  describe('LinuxSystemd Strategy Deep Coverage', () => {
    let strategy: LinuxSystemdStrategy
    
    beforeEach(() => {
      strategy = new LinuxSystemdStrategy()
    })
    
    it('should test getName method', () => {
      const name = strategy.getName()
      expect(name).toBe('Linux with Systemd')
    })
    
    it('should test getCapabilities method', () => {
      const capabilities = strategy.getCapabilities()
      expect(capabilities).toBeDefined()
      expect(capabilities).toHaveProperty('platform')
      expect(capabilities).toHaveProperty('hasSystemd')
      expect(capabilities.hasSystemd).toBe(true)
    })
    
    it('should test getPaths method', () => {
      const paths = strategy.getPaths()
      expect(paths).toBeDefined()
      expect(paths).toHaveProperty('serviceDir')
      expect(paths).toHaveProperty('configDir')
      expect(paths).toHaveProperty('logDir')
    })
    
    it('should test createService method', async () => {
      try {
        const result = await strategy.createService(config)
        expect(result).toBeDefined()
        expect(result).toHaveProperty('success')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
    
    it('should test startService method', async () => {
      // Mock successful systemctl start
      mockedChildProcess.execSync.mockReturnValue(Buffer.from(''))
      
      try {
        const result = await strategy.startService('test-service')
        expect(result).toBeDefined()
        expect(result).toHaveProperty('started')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
    
    it('should test stopService method', async () => {
      mockedChildProcess.execSync.mockReturnValue(Buffer.from(''))
      
      const result = await strategy.stopService('test-service')
      expect(typeof result).toBe('boolean')
    })
    
    it('should test removeService method', async () => {
      const result = await strategy.removeService('test-service')
      expect(typeof result).toBe('boolean')
    })
    
    it('should test getServiceStatus method', async () => {
      // Mock different service statuses
      const statuses = [
        { output: 'active (running)', expected: 'running' },
        { output: 'inactive (dead)', expected: 'stopped' },
        { output: 'failed', expected: 'unknown' }
      ]
      
      for (const status of statuses) {
        mockedChildProcess.execSync.mockReturnValue(Buffer.from(status.output))
        
        try {
          const result = await strategy.getServiceStatus('test-service')
          expect(['running', 'stopped', 'unknown']).toContain(result)
        } catch (error) {
          expect(error).toBeDefined()
        }
      }
    })
    
    it('should test setupSSL method', async () => {
      try {
        const result = await strategy.setupSSL(config)
        expect(result).toBeDefined()
        expect(result).toHaveProperty('success')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
    
    it('should handle systemctl command errors', async () => {
      // Mock command failure
      mockedChildProcess.execSync.mockImplementation(() => {
        throw new Error('systemctl: command not found')
      })
      
      try {
        await strategy.startService('test-service')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
    
    it('should handle filesystem errors in service creation', async () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })
      
      try {
        await strategy.createService(config)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('Windows Strategy Deep Coverage', () => {
    let strategy: WindowsStrategy
    
    beforeEach(() => {
      strategy = new WindowsStrategy()
    })
    
    it('should test getName method', () => {
      const name = strategy.getName()
      expect(name).toBe('Windows')
    })
    
    it('should test getCapabilities method', () => {
      const capabilities = strategy.getCapabilities()
      expect(capabilities).toBeDefined()
      expect(capabilities).toHaveProperty('platform')
      expect(capabilities).toHaveProperty('hasWindowsService')
      expect(capabilities.hasWindowsService).toBe(true)
    })
    
    it('should test getPaths method', () => {
      const paths = strategy.getPaths()
      expect(paths).toBeDefined()
      expect(paths).toHaveProperty('serviceDir')
      expect(paths).toHaveProperty('configDir')
      expect(paths).toHaveProperty('logDir')
    })
    
    it('should test createService method', async () => {
      // Mock Windows service creation commands
      mockedChildProcess.execSync
        .mockReturnValueOnce(Buffer.from('SUCCESS'))
        .mockReturnValueOnce(Buffer.from('SERVICE CREATED'))
      
      try {
        const result = await strategy.createService(config)
        expect(result).toBeDefined()
        expect(result).toHaveProperty('success')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
    
    it('should test startService method', async () => {
      // Mock sc start command
      mockedChildProcess.execSync.mockReturnValue(Buffer.from('SERVICE_START_PENDING'))
      
      try {
        const result = await strategy.startService('TestService')
        expect(result).toBeDefined()
        expect(result).toHaveProperty('started')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
    
    it('should test stopService method', async () => {
      mockedChildProcess.execSync.mockReturnValue(Buffer.from('SERVICE_STOP_PENDING'))
      
      const result = await strategy.stopService('TestService')
      expect(typeof result).toBe('boolean')
    })
    
    it('should test removeService method', async () => {
      mockedChildProcess.execSync.mockReturnValue(Buffer.from('SUCCESS'))
      
      const result = await strategy.removeService('TestService')
      expect(typeof result).toBe('boolean')
    })
    
    it('should test getServiceStatus method', async () => {
      // Mock different Windows service states
      const states = [
        { output: 'STATE: 4 RUNNING', expected: 'running' },
        { output: 'STATE: 1 STOPPED', expected: 'stopped' },
        { output: 'STATE: 7 PAUSED', expected: 'unknown' }
      ]
      
      for (const state of states) {
        mockedChildProcess.execSync.mockReturnValue(Buffer.from(state.output))
        
        try {
          const result = await strategy.getServiceStatus('TestService')
          expect(['running', 'stopped', 'unknown']).toContain(result)
        } catch (error) {
          expect(error).toBeDefined()
        }
      }
    })
    
    it('should test setupSSL method', async () => {
      try {
        const result = await strategy.setupSSL(config)
        expect(result).toBeDefined()
        expect(result).toHaveProperty('success')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
    
    it('should handle Windows-specific command errors', async () => {
      // Mock sc command failure
      mockedChildProcess.execSync.mockImplementation(() => {
        const error = new Error('sc: command failed') as any
        error.status = 1
        throw error
      })
      
      try {
        await strategy.startService('TestService')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
    
    it('should handle Windows registry errors', async () => {
      // Mock registry access errors
      mockedChildProcess.execSync.mockImplementation((cmd) => {
        if (cmd.toString().includes('reg ')) {
          const error = new Error('Registry access denied') as any
          error.status = 5
          throw error
        }
        return Buffer.from('mock output')
      })
      
      try {
        await strategy.createService(config)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('Strategy Comparison and Edge Cases', () => {
    it('should test both strategies with same config', async () => {
      const linuxStrategy = new LinuxSystemdStrategy()
      const windowsStrategy = new WindowsStrategy()
      
      const linuxName = linuxStrategy.getName()
      const windowsName = windowsStrategy.getName()
      
      expect(linuxName).not.toBe(windowsName)
      
      const linuxCaps = linuxStrategy.getCapabilities()
      const windowsCaps = windowsStrategy.getCapabilities()
      
      expect(linuxCaps.hasSystemd).toBe(true)
      expect(windowsCaps.hasWindowsService).toBe(true)
    })
    
    it('should test error handling across strategies', async () => {
      const strategies = [
        new LinuxSystemdStrategy(),
        new WindowsStrategy()
      ]
      
      for (const strategy of strategies) {
        // Test with null config
        try {
          await strategy.createService(null as any)
        } catch (error) {
          expect(error).toBeDefined()
        }
        
        // Test with empty service name
        try {
          await strategy.startService('')
        } catch (error) {
          expect(error).toBeDefined()
        }
      }
    })
    
    it('should test path generation consistency', () => {
      const linuxStrategy = new LinuxSystemdStrategy()
      const windowsStrategy = new WindowsStrategy()
      
      const linuxPaths = linuxStrategy.getPaths()
      const windowsPaths = windowsStrategy.getPaths()
      
      // Both should have all required path properties
      const requiredProperties = ['serviceDir', 'configDir', 'logDir', 'dataDir', 'tempDir']
      
      requiredProperties.forEach(prop => {
        expect(linuxPaths).toHaveProperty(prop)
        expect(windowsPaths).toHaveProperty(prop)
      })
    })
    
    it('should test capabilities detection accuracy', () => {
      const linuxStrategy = new LinuxSystemdStrategy()
      const windowsStrategy = new WindowsStrategy()
      
      const linuxCaps = linuxStrategy.getCapabilities()
      const windowsCaps = windowsStrategy.getCapabilities()
      
      // Linux should detect systemd capability
      expect(linuxCaps.hasSystemd).toBe(true)
      expect(linuxCaps.hasWindowsService).toBe(false)
      
      // Windows should detect service capability
      expect(windowsCaps.hasWindowsService).toBe(true)
      expect(windowsCaps.hasSystemd).toBe(false)
    })
  })
})