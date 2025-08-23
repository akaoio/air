/**
 * Complete Network Module Test Coverage
 * Target: 0% → 90%+ coverage
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import * as dns from 'dns/promises'
import * as https from 'https'
import { EventEmitter } from 'events'

// Mock modules
vi.mock('dns/promises')
vi.mock('https')
vi.mock('node-fetch')

describe('Network Module Complete Coverage', () => {
  const mockIPs = {
    ipv4: '203.0.113.1',
    ipv6: '2001:db8::1'
  }

  const mockConfig = {
    name: 'test-air',
    env: 'development',
    development: {
      port: 8765,
      domain: 'test.example.com',
      godaddy: {
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        domains: ['test.example.com']
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Network/get', () => {
    test('should get both IPv4 and IPv6 addresses', async () => {
      // Mock DNS lookups
      vi.mocked(dns.resolve4).mockResolvedValue([mockIPs.ipv4])
      vi.mocked(dns.resolve6).mockResolvedValue([mockIPs.ipv6])
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const result = await network.get()
      
      expect(result).toEqual(mockIPs)
      expect(dns.resolve4).toHaveBeenCalled()
      expect(dns.resolve6).toHaveBeenCalled()
    })

    test('should handle IPv4-only scenario', async () => {
      vi.mocked(dns.resolve4).mockResolvedValue([mockIPs.ipv4])
      vi.mocked(dns.resolve6).mockRejectedValue(new Error('No IPv6'))
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const result = await network.get()
      
      expect(result.ipv4).toBe(mockIPs.ipv4)
      expect(result.ipv6).toBeNull()
    })

    test('should handle IPv6-only scenario', async () => {
      vi.mocked(dns.resolve4).mockRejectedValue(new Error('No IPv4'))
      vi.mocked(dns.resolve6).mockResolvedValue([mockIPs.ipv6])
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const result = await network.get()
      
      expect(result.ipv4).toBeNull()
      expect(result.ipv6).toBe(mockIPs.ipv6)
    })

    test('should handle no IP addresses available', async () => {
      vi.mocked(dns.resolve4).mockRejectedValue(new Error('No IPv4'))
      vi.mocked(dns.resolve6).mockRejectedValue(new Error('No IPv6'))
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const result = await network.get()
      
      expect(result.ipv4).toBeNull()
      expect(result.ipv6).toBeNull()
    })
  })

  describe('Network/validate', () => {
    test('should validate correct IPv4 address', async () => {
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      expect(network.validate('192.168.1.1')).toBe(true)
      expect(network.validate('8.8.8.8')).toBe(true)
      expect(network.validate('203.0.113.1')).toBe(true)
    })

    test('should validate correct IPv6 address', async () => {
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      expect(network.validate('2001:db8::1')).toBe(true)
      expect(network.validate('::1')).toBe(true)
      expect(network.validate('fe80::1')).toBe(true)
    })

    test('should reject invalid IP addresses', async () => {
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      expect(network.validate('not.an.ip')).toBe(false)
      expect(network.validate('256.256.256.256')).toBe(false)
      expect(network.validate('192.168.1')).toBe(false)
      expect(network.validate('')).toBe(false)
      expect(network.validate(null)).toBe(false)
      expect(network.validate(undefined)).toBe(false)
    })

    test('should reject private IP addresses', async () => {
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      expect(network.validate('10.0.0.1')).toBe(false)
      expect(network.validate('172.16.0.1')).toBe(false)
      expect(network.validate('192.168.0.1')).toBe(false)
      expect(network.validate('127.0.0.1')).toBe(false)
    })
  })

  describe('Network/update', () => {
    test('should update DNS records via GoDaddy API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })
      
      global.fetch = mockFetch
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const results = await network.update(mockConfig, mockIPs)
      
      expect(results).toHaveLength(1)
      expect(results[0].domain).toBe('test.example.com')
      expect(results[0].success).toBe(true)
      expect(mockFetch).toHaveBeenCalled()
    })

    test('should handle update failures gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('API error'))
      global.fetch = mockFetch
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const results = await network.update(mockConfig, mockIPs)
      
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].error).toBeDefined()
    })

    test('should skip update if no GoDaddy config', async () => {
      const configNoGoDaddy = {
        ...mockConfig,
        development: {
          ...mockConfig.development,
          godaddy: undefined
        }
      }
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const results = await network.update(configNoGoDaddy, mockIPs)
      
      expect(results).toEqual([])
    })
  })

  describe('Network/dns', () => {
    test('should perform DNS lookup for IPv4', async () => {
      vi.mocked(dns.resolve4).mockResolvedValue([mockIPs.ipv4])
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const ip = await network.dns('test.example.com', 'A')
      
      expect(ip).toBe(mockIPs.ipv4)
      expect(dns.resolve4).toHaveBeenCalledWith('test.example.com')
    })

    test('should perform DNS lookup for IPv6', async () => {
      vi.mocked(dns.resolve6).mockResolvedValue([mockIPs.ipv6])
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const ip = await network.dns('test.example.com', 'AAAA')
      
      expect(ip).toBe(mockIPs.ipv6)
      expect(dns.resolve6).toHaveBeenCalledWith('test.example.com')
    })

    test('should handle DNS lookup failures', async () => {
      vi.mocked(dns.resolve4).mockRejectedValue(new Error('NXDOMAIN'))
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const ip = await network.dns('nonexistent.example.com', 'A')
      
      expect(ip).toBeNull()
    })
  })

  describe('Network/interfaces', () => {
    test('should get network interfaces', async () => {
      const mockInterfaces = {
        eth0: [
          { family: 'IPv4', address: '192.168.1.100', internal: false },
          { family: 'IPv6', address: 'fe80::1', internal: false }
        ],
        lo: [
          { family: 'IPv4', address: '127.0.0.1', internal: true }
        ]
      }
      
      const os = await import('os')
      vi.spyOn(os, 'networkInterfaces').mockReturnValue(mockInterfaces)
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const interfaces = network.interfaces()
      
      expect(interfaces).toBeDefined()
      expect(interfaces.eth0).toBeDefined()
      expect(interfaces.lo).toBeDefined()
    })

    test('should filter internal interfaces if needed', async () => {
      const mockInterfaces = {
        eth0: [
          { family: 'IPv4', address: '192.168.1.100', internal: false }
        ],
        lo: [
          { family: 'IPv4', address: '127.0.0.1', internal: true }
        ]
      }
      
      const os = await import('os')
      vi.spyOn(os, 'networkInterfaces').mockReturnValue(mockInterfaces)
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const external = network.interfaces(false) // Filter internal
      
      expect(external.eth0).toBeDefined()
      expect(external.lo).toBeUndefined()
    })
  })

  describe('Network/monitor', () => {
    test('should monitor network changes', async () => {
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const callback = vi.fn()
      const monitor = network.monitor(callback)
      
      expect(monitor).toBeDefined()
      
      // Simulate network change
      setTimeout(() => {
        monitor.emit('change', mockIPs)
      }, 10)
      
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(callback).toHaveBeenCalledWith(mockIPs)
      
      monitor.stop()
    })

    test('should stop monitoring', async () => {
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const callback = vi.fn()
      const monitor = network.monitor(callback)
      
      monitor.stop()
      
      // Should not receive events after stopping
      monitor.emit('change', mockIPs)
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Network/has', () => {
    test('should check if has IPv4', async () => {
      vi.mocked(dns.resolve4).mockResolvedValue([mockIPs.ipv4])
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const hasIPv4 = await network.has('ipv4')
      
      expect(hasIPv4).toBe(true)
    })

    test('should check if has IPv6', async () => {
      vi.mocked(dns.resolve6).mockResolvedValue([mockIPs.ipv6])
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const hasIPv6 = await network.has('ipv6')
      
      expect(hasIPv6).toBe(true)
    })

    test('should return false if no IP', async () => {
      vi.mocked(dns.resolve4).mockRejectedValue(new Error('No IP'))
      
      const { Network } = await import('../src/Network/index.js')
      const network = new Network()
      
      const hasIPv4 = await network.has('ipv4')
      
      expect(hasIPv4).toBe(false)
    })
  })

  describe('Network/ipv4 methods', () => {
    test('should get IPv4 via DNS', async () => {
      vi.mocked(dns.resolve4).mockResolvedValue([mockIPs.ipv4])
      
      const { ipv4 } = await import('../src/Network/ipv4/index.js')
      
      const ip = await ipv4.dns()
      
      expect(ip).toBe(mockIPs.ipv4)
    })

    test('should get IPv4 via HTTP', async () => {
      const mockResponse = new EventEmitter()
      mockResponse.statusCode = 200
      
      vi.mocked(https.get).mockImplementation((url, callback) => {
        callback(mockResponse)
        setTimeout(() => {
          mockResponse.emit('data', mockIPs.ipv4)
          mockResponse.emit('end')
        }, 10)
        return new EventEmitter()
      })
      
      const { ipv4 } = await import('../src/Network/ipv4/index.js')
      
      const ip = await ipv4.http()
      
      expect(ip).toBe(mockIPs.ipv4)
    })
  })

  describe('Network/ipv6 methods', () => {
    test('should get IPv6 via DNS', async () => {
      vi.mocked(dns.resolve6).mockResolvedValue([mockIPs.ipv6])
      
      const { ipv6 } = await import('../src/Network/ipv6/index.js')
      
      const ip = await ipv6.dns()
      
      expect(ip).toBe(mockIPs.ipv6)
    })

    test('should get IPv6 via HTTP', async () => {
      const mockResponse = new EventEmitter()
      mockResponse.statusCode = 200
      
      vi.mocked(https.get).mockImplementation((url, callback) => {
        callback(mockResponse)
        setTimeout(() => {
          mockResponse.emit('data', mockIPs.ipv6)
          mockResponse.emit('end')
        }, 10)
        return new EventEmitter()
      })
      
      const { ipv6 } = await import('../src/Network/ipv6/index.js')
      
      const ip = await ipv6.http()
      
      expect(ip).toBe(mockIPs.ipv6)
    })
  })

  describe('Network/constants', () => {
    test('should export network constants', async () => {
      const { constants } = await import('../src/Network/constants.js')
      
      expect(constants).toBeDefined()
      expect(constants.DNS_SERVERS).toBeDefined()
      expect(constants.HTTP_SERVICES).toBeDefined()
      expect(constants.TIMEOUT).toBeDefined()
    })
  })
})