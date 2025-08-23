import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { Network } from '../../src/Network/index.js'
import { get } from '../../src/Network/get.js'
import { has } from '../../src/Network/has.js'
import { dns } from '../../src/Network/dns.js'
import { validate } from '../../src/Network/validate.js'
import { monitor } from '../../src/Network/monitor.js'
import { update } from '../../src/Network/update.js'
import { interfaces } from '../../src/Network/interfaces.js'
import { constants } from '../../src/Network/constants.js'
import * as ipv4 from '../../src/Network/ipv4/index.js'
import * as ipv6 from '../../src/Network/ipv6/index.js'
import { TestSetup } from '../shared/testSetup.js'
import * as os from 'os'
import * as dns2 from 'dns'
import * as https from 'https'

// Mock modules
vi.mock('os')
vi.mock('dns')
vi.mock('https')

describe('Network Class - Complete Coverage', () => {
  let testSetup: TestSetup
  let testDir: string
  let network: Network

  beforeEach(() => {
    testSetup = new TestSetup('network-test')
    testDir = testSetup.createTestDir('network')
    network = new Network()
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    testSetup.cleanup()
    vi.restoreAllMocks()
  })

  describe('get method', () => {
    test('should detect IPv4 and IPv6 addresses', async () => {
      const mockContext = {
        ipv4: { dns: vi.fn().mockResolvedValue('1.2.3.4') },
        ipv6: { dns: vi.fn().mockResolvedValue('2001:db8::1') }
      }
      
      const result = await get.call(mockContext)
      
      expect(result).toEqual({
        ipv4: '1.2.3.4',
        ipv6: '2001:db8::1'
      })
      expect(mockContext.ipv4.dns).toHaveBeenCalled()
      expect(mockContext.ipv6.dns).toHaveBeenCalled()
    })

    test('should handle IPv4 only scenarios', async () => {
      const mockContext = {
        ipv4: { dns: vi.fn().mockResolvedValue('192.168.1.1') },
        ipv6: { dns: vi.fn().mockResolvedValue(null) }
      }
      
      const result = await get.call(mockContext)
      
      expect(result).toEqual({
        ipv4: '192.168.1.1',
        ipv6: null
      })
    })

    test('should handle IPv6 only scenarios', async () => {
      const mockContext = {
        ipv4: { dns: vi.fn().mockResolvedValue(null) },
        ipv6: { dns: vi.fn().mockResolvedValue('fe80::1') }
      }
      
      const result = await get.call(mockContext)
      
      expect(result).toEqual({
        ipv4: null,
        ipv6: 'fe80::1'
      })
    })

    test('should handle no IP detected', async () => {
      const mockContext = {
        ipv4: { dns: vi.fn().mockResolvedValue(null) },
        ipv6: { dns: vi.fn().mockResolvedValue(null) }
      }
      
      const result = await get.call(mockContext)
      
      expect(result).toEqual({
        ipv4: null,
        ipv6: null
      })
    })

    test('should handle DNS errors gracefully', async () => {
      const mockContext = {
        ipv4: { dns: vi.fn().mockRejectedValue(new Error('DNS failed')) },
        ipv6: { dns: vi.fn().mockResolvedValue('::1') }
      }
      
      const result = await get.call(mockContext)
      
      expect(result).toEqual({
        ipv4: null,
        ipv6: '::1'
      })
    })
  })

  describe('has method', () => {
    test('should return true when IPv4 is available', async () => {
      const mockContext = {
        get: vi.fn().mockResolvedValue({ ipv4: '1.2.3.4', ipv6: null })
      }
      
      const result = await has.call(mockContext, 'ipv4')
      
      expect(result).toBe(true)
      expect(mockContext.get).toHaveBeenCalled()
    })

    test('should return false when IPv4 is not available', async () => {
      const mockContext = {
        get: vi.fn().mockResolvedValue({ ipv4: null, ipv6: '::1' })
      }
      
      const result = await has.call(mockContext, 'ipv4')
      
      expect(result).toBe(false)
    })

    test('should return true when IPv6 is available', async () => {
      const mockContext = {
        get: vi.fn().mockResolvedValue({ ipv4: null, ipv6: '2001:db8::1' })
      }
      
      const result = await has.call(mockContext, 'ipv6')
      
      expect(result).toBe(true)
    })

    test('should return false when IPv6 is not available', async () => {
      const mockContext = {
        get: vi.fn().mockResolvedValue({ ipv4: '1.2.3.4', ipv6: null })
      }
      
      const result = await has.call(mockContext, 'ipv6')
      
      expect(result).toBe(false)
    })

    test('should handle invalid IP version', async () => {
      const mockContext = {
        get: vi.fn().mockResolvedValue({ ipv4: '1.2.3.4', ipv6: null })
      }
      
      const result = await has.call(mockContext, 'ipv5' as any)
      
      expect(result).toBe(false)
    })
  })

  describe('dns method', () => {
    test('should perform DNS lookup for IPv4', async () => {
      const mockContext = {
        ipv4: { dns: vi.fn().mockResolvedValue('8.8.8.8') }
      }
      
      const result = await dns.call(mockContext, 4)
      
      expect(result).toBe('8.8.8.8')
      expect(mockContext.ipv4.dns).toHaveBeenCalled()
    })

    test('should perform DNS lookup for IPv6', async () => {
      const mockContext = {
        ipv6: { dns: vi.fn().mockResolvedValue('2001:4860:4860::8888') }
      }
      
      const result = await dns.call(mockContext, 6)
      
      expect(result).toBe('2001:4860:4860::8888')
      expect(mockContext.ipv6.dns).toHaveBeenCalled()
    })

    test('should default to IPv4 when version not specified', async () => {
      const mockContext = {
        ipv4: { dns: vi.fn().mockResolvedValue('1.1.1.1') },
        ipv6: { dns: vi.fn() }
      }
      
      const result = await dns.call(mockContext)
      
      expect(result).toBe('1.1.1.1')
      expect(mockContext.ipv4.dns).toHaveBeenCalled()
      expect(mockContext.ipv6.dns).not.toHaveBeenCalled()
    })

    test('should handle DNS failures', async () => {
      const mockContext = {
        ipv4: { dns: vi.fn().mockResolvedValue(null) }
      }
      
      const result = await dns.call(mockContext, 4)
      
      expect(result).toBeNull()
    })

    test('should handle invalid version numbers', async () => {
      const mockContext = {
        ipv4: { dns: vi.fn().mockResolvedValue('1.2.3.4') }
      }
      
      const result = await dns.call(mockContext, 5 as any)
      
      expect(result).toBeNull()
    })
  })

  describe('validate method', () => {
    test('should validate correct IPv4 addresses', () => {
      const mockContext = {}
      
      expect(validate.call(mockContext, '192.168.1.1')).toBe(true)
      expect(validate.call(mockContext, '8.8.8.8')).toBe(true)
      expect(validate.call(mockContext, '255.255.255.255')).toBe(true)
      expect(validate.call(mockContext, '0.0.0.0')).toBe(true)
    })

    test('should reject invalid IPv4 addresses', () => {
      const mockContext = {}
      
      expect(validate.call(mockContext, '256.1.1.1')).toBe(false)
      expect(validate.call(mockContext, '1.1.1')).toBe(false)
      expect(validate.call(mockContext, '1.1.1.1.1')).toBe(false)
      expect(validate.call(mockContext, 'not.an.ip.address')).toBe(false)
    })

    test('should validate correct IPv6 addresses', () => {
      const mockContext = {}
      
      expect(validate.call(mockContext, '2001:db8::1')).toBe(true)
      expect(validate.call(mockContext, 'fe80::1')).toBe(true)
      expect(validate.call(mockContext, '::')).toBe(true)
      expect(validate.call(mockContext, '::1')).toBe(true)
    })

    test('should reject invalid IPv6 addresses', () => {
      const mockContext = {}
      
      expect(validate.call(mockContext, 'gggg::1')).toBe(false)
      expect(validate.call(mockContext, '2001:db8:::1')).toBe(false)
      expect(validate.call(mockContext, '2001:db8:1:2:3:4:5:6:7')).toBe(false)
    })

    test('should reject private/local addresses when specified', () => {
      const mockContext = {}
      
      expect(validate.call(mockContext, '10.0.0.1', false)).toBe(false)
      expect(validate.call(mockContext, '172.16.0.1', false)).toBe(false)
      expect(validate.call(mockContext, '192.168.1.1', false)).toBe(false)
      expect(validate.call(mockContext, '127.0.0.1', false)).toBe(false)
      expect(validate.call(mockContext, 'fe80::1', false)).toBe(false)
      expect(validate.call(mockContext, 'fc00::1', false)).toBe(false)
    })

    test('should accept private addresses by default', () => {
      const mockContext = {}
      
      expect(validate.call(mockContext, '10.0.0.1')).toBe(true)
      expect(validate.call(mockContext, '192.168.1.1')).toBe(true)
      expect(validate.call(mockContext, 'fe80::1')).toBe(true)
    })
  })

  describe('monitor method', () => {
    test('should monitor IP changes', async () => {
      const mockContext = {
        get: vi.fn()
          .mockResolvedValueOnce({ ipv4: '1.2.3.4', ipv6: null })
          .mockResolvedValueOnce({ ipv4: '5.6.7.8', ipv6: null })
      }
      
      const callback = vi.fn()
      const stopMonitor = await monitor.call(mockContext, callback, 100)
      
      // Wait for monitor to detect change
      await new Promise(resolve => setTimeout(resolve, 250))
      
      expect(callback).toHaveBeenCalledWith({
        previous: { ipv4: '1.2.3.4', ipv6: null },
        current: { ipv4: '5.6.7.8', ipv6: null }
      })
      
      stopMonitor()
    })

    test('should not call callback when IP unchanged', async () => {
      const mockContext = {
        get: vi.fn().mockResolvedValue({ ipv4: '1.2.3.4', ipv6: null })
      }
      
      const callback = vi.fn()
      const stopMonitor = await monitor.call(mockContext, callback, 100)
      
      await new Promise(resolve => setTimeout(resolve, 250))
      
      expect(callback).not.toHaveBeenCalled()
      
      stopMonitor()
    })

    test('should handle monitor errors gracefully', async () => {
      const mockContext = {
        get: vi.fn()
          .mockResolvedValueOnce({ ipv4: '1.2.3.4', ipv6: null })
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ ipv4: '1.2.3.4', ipv6: null })
      }
      
      const callback = vi.fn()
      const stopMonitor = await monitor.call(mockContext, callback, 100)
      
      await new Promise(resolve => setTimeout(resolve, 350))
      
      // Should continue monitoring despite error
      expect(mockContext.get).toHaveBeenCalledTimes(3)
      expect(callback).not.toHaveBeenCalled()
      
      stopMonitor()
    })

    test('should use default interval', async () => {
      const mockContext = {
        get: vi.fn().mockResolvedValue({ ipv4: '1.2.3.4', ipv6: null })
      }
      
      const callback = vi.fn()
      const stopMonitor = await monitor.call(mockContext, callback)
      
      expect(stopMonitor).toBeInstanceOf(Function)
      
      stopMonitor()
    })
  })

  describe('update method', () => {
    test('should update DDNS with GoDaddy API', async () => {
      const mockHttpsRequest = vi.fn((options, callback) => {
        const res = {
          statusCode: 200,
          on: vi.fn((event, handler) => {
            if (event === 'data') handler('{"message":"Success"}')
            if (event === 'end') handler()
          })
        }
        callback(res)
        return {
          on: vi.fn(),
          write: vi.fn(),
          end: vi.fn()
        }
      })
      
      ;(https as any).request = mockHttpsRequest
      
      const config = {
        development: {
          godaddy: {
            domain: 'example.com',
            subdomain: 'test',
            key: 'test-key',
            secret: 'test-secret'
          }
        }
      }
      
      const ips = { ipv4: '1.2.3.4', ipv6: '2001:db8::1' }
      
      const result = await update.call({}, config, ips)
      
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        type: 'A',
        name: 'test',
        data: '1.2.3.4',
        success: true
      })
      expect(result[1]).toEqual({
        type: 'AAAA',
        name: 'test',
        data: '2001:db8::1',
        success: true
      })
    })

    test('should handle DDNS update failures', async () => {
      const mockHttpsRequest = vi.fn((options, callback) => {
        const res = {
          statusCode: 401,
          on: vi.fn((event, handler) => {
            if (event === 'data') handler('{"message":"Unauthorized"}')
            if (event === 'end') handler()
          })
        }
        callback(res)
        return {
          on: vi.fn(),
          write: vi.fn(),
          end: vi.fn()
        }
      })
      
      ;(https as any).request = mockHttpsRequest
      
      const config = {
        development: {
          godaddy: {
            domain: 'example.com',
            subdomain: 'test',
            key: 'invalid-key',
            secret: 'invalid-secret'
          }
        }
      }
      
      const ips = { ipv4: '1.2.3.4', ipv6: null }
      
      const result = await update.call({}, config, ips)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        type: 'A',
        name: 'test',
        data: '1.2.3.4',
        success: false,
        error: expect.stringContaining('401')
      })
    })

    test('should skip update when no GoDaddy config', async () => {
      const config = {
        development: {}
      }
      
      const ips = { ipv4: '1.2.3.4', ipv6: null }
      
      const result = await update.call({}, config, ips)
      
      expect(result).toEqual([])
    })

    test('should handle network errors during update', async () => {
      const mockHttpsRequest = vi.fn((options, callback) => {
        const req = {
          on: vi.fn((event, handler) => {
            if (event === 'error') handler(new Error('Network error'))
          }),
          write: vi.fn(),
          end: vi.fn()
        }
        return req
      })
      
      ;(https as any).request = mockHttpsRequest
      
      const config = {
        development: {
          godaddy: {
            domain: 'example.com',
            subdomain: 'test',
            key: 'test-key',
            secret: 'test-secret'
          }
        }
      }
      
      const ips = { ipv4: '1.2.3.4', ipv6: null }
      
      const result = await update.call({}, config, ips)
      
      expect(result).toHaveLength(1)
      expect(result[0].success).toBe(false)
      expect(result[0].error).toContain('Network error')
    })
  })

  describe('interfaces method', () => {
    test('should get all network interfaces', () => {
      const mockInterfaces = {
        eth0: [
          { family: 'IPv4', address: '192.168.1.100', internal: false },
          { family: 'IPv6', address: 'fe80::1', internal: false }
        ],
        lo: [
          { family: 'IPv4', address: '127.0.0.1', internal: true },
          { family: 'IPv6', address: '::1', internal: true }
        ]
      }
      
      ;(os.networkInterfaces as any).mockReturnValue(mockInterfaces)
      
      const result = interfaces.call({})
      
      expect(result).toEqual(mockInterfaces)
    })

    test('should filter interfaces by family', () => {
      const mockInterfaces = {
        eth0: [
          { family: 'IPv4', address: '192.168.1.100', internal: false },
          { family: 'IPv6', address: 'fe80::1', internal: false }
        ]
      }
      
      ;(os.networkInterfaces as any).mockReturnValue(mockInterfaces)
      
      const result = interfaces.call({}, 'IPv4')
      
      expect(result).toEqual({
        eth0: [
          { family: 'IPv4', address: '192.168.1.100', internal: false }
        ]
      })
    })

    test('should filter out internal interfaces', () => {
      const mockInterfaces = {
        eth0: [
          { family: 'IPv4', address: '192.168.1.100', internal: false }
        ],
        lo: [
          { family: 'IPv4', address: '127.0.0.1', internal: true }
        ]
      }
      
      ;(os.networkInterfaces as any).mockReturnValue(mockInterfaces)
      
      const result = interfaces.call({}, null, false)
      
      expect(result).toEqual({
        eth0: [
          { family: 'IPv4', address: '192.168.1.100', internal: false }
        ]
      })
    })

    test('should handle empty interfaces', () => {
      ;(os.networkInterfaces as any).mockReturnValue({})
      
      const result = interfaces.call({})
      
      expect(result).toEqual({})
    })
  })

  describe('constants', () => {
    test('should export network constants', () => {
      expect(constants).toBeDefined()
      expect(constants.DNS_SERVERS).toBeDefined()
      expect(constants.HTTP_SERVICES).toBeDefined()
      expect(constants.PRIVATE_RANGES).toBeDefined()
    })

    test('should have valid DNS servers', () => {
      expect(constants.DNS_SERVERS).toContain('8.8.8.8')
      expect(constants.DNS_SERVERS).toContain('1.1.1.1')
    })

    test('should have valid HTTP services', () => {
      expect(constants.HTTP_SERVICES).toContainEqual(
        expect.objectContaining({ hostname: expect.any(String) })
      )
    })

    test('should have valid private ranges', () => {
      expect(constants.PRIVATE_RANGES.ipv4).toContain('10.0.0.0/8')
      expect(constants.PRIVATE_RANGES.ipv4).toContain('192.168.0.0/16')
      expect(constants.PRIVATE_RANGES.ipv6).toContain('fe80::/10')
    })
  })

  describe('IPv4 module', () => {
    test('should perform IPv4 DNS lookup', async () => {
      const mockResolve4 = vi.fn((hostname, callback) => {
        callback(null, ['8.8.8.8'])
      })
      
      ;(dns2 as any).resolve4 = mockResolve4
      
      const result = await ipv4.dns()
      
      expect(result).toBe('8.8.8.8')
    })

    test('should perform IPv4 HTTP lookup', async () => {
      const mockHttpsGet = vi.fn((url, callback) => {
        const res = {
          on: vi.fn((event, handler) => {
            if (event === 'data') handler('8.8.8.8')
            if (event === 'end') handler()
          })
        }
        callback(res)
        return { on: vi.fn() }
      })
      
      ;(https as any).get = mockHttpsGet
      
      const result = await ipv4.http()
      
      expect(result).toBe('8.8.8.8')
    })

    test('should handle IPv4 DNS failures', async () => {
      const mockResolve4 = vi.fn((hostname, callback) => {
        callback(new Error('DNS failed'))
      })
      
      ;(dns2 as any).resolve4 = mockResolve4
      
      const result = await ipv4.dns()
      
      expect(result).toBeNull()
    })

    test('should handle IPv4 HTTP failures', async () => {
      const mockHttpsGet = vi.fn((url, callback) => {
        return {
          on: vi.fn((event, handler) => {
            if (event === 'error') handler(new Error('HTTP failed'))
          })
        }
      })
      
      ;(https as any).get = mockHttpsGet
      
      const result = await ipv4.http()
      
      expect(result).toBeNull()
    })
  })

  describe('IPv6 module', () => {
    test('should perform IPv6 DNS lookup', async () => {
      const mockResolve6 = vi.fn((hostname, callback) => {
        callback(null, ['2001:4860:4860::8888'])
      })
      
      ;(dns2 as any).resolve6 = mockResolve6
      
      const result = await ipv6.dns()
      
      expect(result).toBe('2001:4860:4860::8888')
    })

    test('should perform IPv6 HTTP lookup', async () => {
      const mockHttpsGet = vi.fn((url, callback) => {
        const res = {
          on: vi.fn((event, handler) => {
            if (event === 'data') handler('2001:db8::1')
            if (event === 'end') handler()
          })
        }
        callback(res)
        return { on: vi.fn() }
      })
      
      ;(https as any).get = mockHttpsGet
      
      const result = await ipv6.http()
      
      expect(result).toBe('2001:db8::1')
    })

    test('should handle IPv6 DNS failures', async () => {
      const mockResolve6 = vi.fn((hostname, callback) => {
        callback(new Error('DNS failed'))
      })
      
      ;(dns2 as any).resolve6 = mockResolve6
      
      const result = await ipv6.dns()
      
      expect(result).toBeNull()
    })

    test('should handle IPv6 HTTP failures', async () => {
      const mockHttpsGet = vi.fn((url, callback) => {
        return {
          on: vi.fn((event, handler) => {
            if (event === 'error') handler(new Error('HTTP failed'))
          })
        }
      })
      
      ;(https as any).get = mockHttpsGet
      
      const result = await ipv6.http()
      
      expect(result).toBeNull()
    })
  })

  describe('Network Class Integration', () => {
    test('should delegate methods correctly', async () => {
      const network = new Network()
      
      // Mock os.networkInterfaces
      ;(os.networkInterfaces as any).mockReturnValue({
        eth0: [{ family: 'IPv4', address: '192.168.1.1', internal: false }]
      })
      
      const ifaces = network.interfaces()
      expect(ifaces).toBeDefined()
      expect(ifaces.eth0).toBeDefined()
    })

    test('should validate IPs through class', () => {
      const network = new Network()
      
      expect(network.validate('8.8.8.8')).toBe(true)
      expect(network.validate('invalid')).toBe(false)
    })

    test('should handle concurrent operations', async () => {
      const network = new Network()
      
      // Mock DNS responses
      const mockResolve4 = vi.fn((hostname, callback) => {
        setTimeout(() => callback(null, ['1.2.3.4']), 10)
      })
      const mockResolve6 = vi.fn((hostname, callback) => {
        setTimeout(() => callback(null, ['::1']), 10)
      })
      
      ;(dns2 as any).resolve4 = mockResolve4
      ;(dns2 as any).resolve6 = mockResolve6
      
      const promises = [
        network.dns(4),
        network.dns(6),
        network.get()
      ]
      
      const results = await Promise.all(promises)
      
      expect(results[0]).toBe('1.2.3.4')
      expect(results[1]).toBe('::1')
      expect(results[2]).toEqual({ ipv4: '1.2.3.4', ipv6: '::1' })
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    test('should handle malformed IP addresses', () => {
      const network = new Network()
      
      expect(network.validate('')).toBe(false)
      expect(network.validate('...')).toBe(false)
      expect(network.validate('999.999.999.999')).toBe(false)
      expect(network.validate(':::::::::')).toBe(false)
    })

    test('should handle null/undefined inputs', () => {
      const network = new Network()
      
      expect(network.validate(null as any)).toBe(false)
      expect(network.validate(undefined as any)).toBe(false)
    })

    test('should handle timeout scenarios', async () => {
      const mockResolve4 = vi.fn((hostname, callback) => {
        // Never call callback to simulate timeout
      })
      
      ;(dns2 as any).resolve4 = mockResolve4
      
      const timeoutPromise = Promise.race([
        ipv4.dns(),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 100))
      ])
      
      const result = await timeoutPromise
      
      expect(result).toBe('timeout')
    })

    test('should handle very long domain names', async () => {
      const longDomain = 'a'.repeat(255) + '.com'
      const config = {
        development: {
          godaddy: {
            domain: longDomain,
            subdomain: 'test',
            key: 'key',
            secret: 'secret'
          }
        }
      }
      
      const result = await update.call({}, config, { ipv4: '1.2.3.4', ipv6: null })
      
      // Should handle gracefully
      expect(result).toBeDefined()
    })
  })
})