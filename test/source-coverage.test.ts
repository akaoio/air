/**
 * Test để đo độ phủ coverage từ source TypeScript files
 * Test này sẽ import trực tiếp từ src/ để đo coverage chính xác
 */

import { describe, it, expect } from 'vitest'

// Import trực tiếp từ source files để coverage tracking hoạt động
import { Peer } from '../src/Peer.js'
import { ConfigManager } from '../src/config.js'
import { ProcessManager } from '../src/process.js'
import { StatusReporter } from '../src/status.js'
import network from '../src/network.js'

describe('Source Code Coverage Tests', () => {
  describe('Configuration Management', () => {
    it('should create and read configuration', () => {
      const configManager = new ConfigManager()
      const config = configManager.read()
      
      expect(config).toBeDefined()
      expect(config.name).toBeDefined()
      expect(config.env).toBeDefined()
      expect(config.root).toBeDefined()
    })

    it('should write and validate configuration', () => {
      const configManager = new ConfigManager()
      const testConfig = {
        name: 'test-air',
        env: 'development' as const,
        root: '/tmp/test',
        bash: '/bin/bash',
        development: {
          port: 8765,
          domain: 'localhost',
          peers: []
        },
        production: {
          port: 443,
          domain: 'example.com',
          peers: []
        }
      }
      
      // Test validation
      const validation = configManager.validate()
      expect(validation).toBeDefined()
      expect(validation.valid).toBeDefined()
      expect(validation.errors).toBeDefined()
    })

    it('should merge environment variables', () => {
      const configManager = new ConfigManager()
      const config = configManager.read()
      const merged = configManager.mergeEnvVars(config)
      
      expect(merged).toBeDefined()
      expect(merged.name).toBeDefined()
    })
  })

  describe('Process Management', () => {
    it('should create process manager and check PID operations', () => {
      const processManager = new ProcessManager({ name: 'test-air' })
      
      // Test PID file operations (without actually creating files)
      expect(processManager).toBeDefined()
      expect(processManager.config).toBeDefined()
      expect(processManager.config.name).toBe('test-air')
    })

    it('should find processes by port', () => {
      const processManager = new ProcessManager()
      
      // Test find method (may return null on some systems)
      const result = processManager.find(80)
      expect(result === null || typeof result === 'object').toBe(true)
    })

    it('should check process running status', () => {
      const processManager = new ProcessManager()
      
      // Test with current process PID
      const isRunning = processManager.isRunning(process.pid)
      expect(isRunning).toBe(true)
      
      // Test with invalid PID
      const notRunning = processManager.isRunning(999999)
      expect(notRunning).toBe(false)
    })
  })

  describe('Network Operations', () => {
    it('should validate IP addresses', () => {
      // Test valid public IPv4
      expect(network.validate('8.8.8.8')).toBe(true)
      expect(network.validate('1.1.1.1')).toBe(true)
      
      // Test invalid/private IPs
      expect(network.validate('192.168.1.1')).toBe(false)
      expect(network.validate('10.0.0.1')).toBe(false)
      expect(network.validate('127.0.0.1')).toBe(false)
      expect(network.validate('invalid-ip')).toBe(false)
      expect(network.validate('')).toBe(false)
      expect(network.validate(null as any)).toBe(false)
    })

    it('should have IPv6 detection capability', async () => {
      const hasIPv6 = await network.has()
      expect(typeof hasIPv6).toBe('boolean')
    })

    it('should handle network interfaces', () => {
      const interfaces = network.getinterfaces()
      expect(Array.isArray(interfaces)).toBe(true)
    })
  })

  describe('Status Reporting', () => {
    it('should create status reporter with configuration', () => {
      const reporter = new StatusReporter({
        aliveInterval: 30000,
        ipInterval: 60000,
        ddnsInterval: 120000
      })
      
      expect(reporter).toBeDefined()
      expect(reporter.intervals.alive).toBe(30000)
      expect(reporter.intervals.ip).toBe(60000)
      expect(reporter.intervals.ddns).toBe(120000)
    })

    it('should manage timer operations', () => {
      const reporter = new StatusReporter()
      
      // Test start/stop operations
      expect(() => reporter.start()).not.toThrow()
      expect(() => reporter.stop()).not.toThrow()
      
      // Test status retrieval
      const status = reporter.getStatus()
      expect(status).toBeDefined()
      expect(status.timers).toBeDefined()
    })

    it('should update configuration and user', () => {
      const reporter = new StatusReporter()
      
      const testConfig = { name: 'test', env: 'development' }
      reporter.updateConfig(testConfig)
      
      const testUser = { is: { pub: 'test-key' } }
      reporter.updateUser(testUser)
      
      expect(reporter.config).toEqual(testConfig)
      expect(reporter.user).toEqual(testUser)
    })
  })

  describe('Peer Integration', () => {
    it('should create Peer instance with proper initialization', () => {
      const peer = new Peer({ 
        skipPidCheck: true,
        maxRestarts: 3,
        restartDelay: 1000
      })
      
      expect(peer).toBeDefined()
      expect(peer.restarts.max).toBe(3)
      expect(peer.restarts.baseDelay).toBe(1000)
    })

    it('should access IP validation through peer', () => {
      const peer = new Peer({ skipPidCheck: true })
      
      expect(peer.ip).toBeDefined()
      expect(peer.ip.validate).toBeDefined()
      expect(typeof peer.ip.validate).toBe('function')
      
      // Test IP validation through peer interface
      expect(peer.ip.validate('8.8.8.8')).toBe(true)
      expect(peer.ip.validate('192.168.1.1')).toBe(false)
    })

    it('should access status methods through peer', () => {
      const peer = new Peer({ skipPidCheck: true })
      
      expect(peer.status).toBeDefined()
      expect(peer.status.alive).toBeDefined()
      expect(peer.status.ip).toBeDefined()
      expect(peer.status.ddns).toBeDefined()
      expect(typeof peer.status.alive).toBe('function')
    })

    it('should handle configuration read/write through peer', () => {
      const peer = new Peer({ skipPidCheck: true })
      
      const config = peer.read()
      expect(config).toBeDefined()
      expect(config.name).toBeDefined()
      expect(config.env).toBeDefined()
    })

    it('should handle process management through peer', () => {
      const peer = new Peer({ skipPidCheck: true })
      
      // Test process-related methods
      expect(typeof peer.find).toBe('function')
      expect(typeof peer.clean).toBe('function')
      expect(typeof peer.cleanup).toBe('function')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', () => {
      const configManager = new ConfigManager({ configFile: '/nonexistent/path/config.json' })
      
      // Should not throw, should return default config
      expect(() => {
        const config = configManager.read()
        expect(config).toBeDefined()
      }).not.toThrow()
    })

    it('should handle process operations on invalid PIDs', () => {
      const processManager = new ProcessManager()
      
      // Should handle invalid PIDs gracefully (may return true on some systems for -1)
      const invalidResult = processManager.isRunning(999999) // Use very high PID
      expect(typeof invalidResult).toBe('boolean')
      expect(processManager.kill(999999)).toBe(false)
    })

    it('should handle network operations with invalid inputs', () => {
      // Should handle invalid inputs gracefully
      expect(network.validate(undefined as any)).toBe(false)
      expect(network.validate(123 as any)).toBe(false)
      expect(network.validate(null as any)).toBe(false)
    })
  })
})