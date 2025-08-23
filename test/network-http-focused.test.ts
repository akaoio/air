/**
 * Network HTTP Methods Focused Coverage Tests
 * Targets ipv4/http.ts and ipv6/http.ts (lines 10-31 uncovered)
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock node-fetch before any imports
const mockFetch = jest.fn()
jest.mock('node-fetch', () => mockFetch)

describe('Network HTTP Methods Focused Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('IPv4 HTTP Method Coverage', () => {
    test('should get IPv4 address from first service (success path)', async () => {
      const { http } = await import('../src/Network/ipv4/http.js')
      
      // Mock successful response from first service
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve('192.168.1.100')
      })

      const result = await http()
      expect(result).toBe('192.168.1.100')
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ipify.org'),
        expect.objectContaining({
          headers: { 'User-Agent': 'Air-GUN-Peer/1.0' }
        })
      )
    })

    test('should handle JSON response format', async () => {
      const { http } = await import('../src/Network/ipv4/http.js')
      
      // Mock JSON response
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve('{"ip":"203.0.113.1","status":"success"}')
      })

      const result = await http()
      expect(result).toBe('203.0.113.1')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should handle JSON response with address field', async () => {
      const { http } = await import('../src/Network/ipv4/http.js')
      
      // Mock JSON response with address field
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve('{"address":"10.0.0.1","provider":"test"}')
      })

      const result = await http()
      expect(result).toBe('10.0.0.1')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should handle malformed JSON gracefully', async () => {
      const { http } = await import('../src/Network/ipv4/http.js')
      
      // Mock malformed JSON that falls back to text
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve('192.0.2.1 {invalid json')
      })

      const result = await http()
      expect(result).toBe('192.0.2.1')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should try multiple services when first fails', async () => {
      const { http } = await import('../src/Network/ipv4/http.js')
      
      // Mock first service fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          text: () => Promise.resolve('198.51.100.1')
        })

      const result = await http()
      expect(result).toBe('198.51.100.1')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('should continue through all services on invalid responses', async () => {
      const { http } = await import('../src/Network/ipv4/http.js')
      
      // Mock multiple invalid responses, then valid one
      mockFetch
        .mockResolvedValueOnce({ text: () => Promise.resolve('invalid-ip') })
        .mockResolvedValueOnce({ text: () => Promise.resolve('not-an-ip') })
        .mockResolvedValueOnce({ text: () => Promise.resolve('203.0.113.42') })

      const result = await http()
      expect(result).toBe('203.0.113.42')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    test('should return null when all services fail', async () => {
      const { http } = await import('../src/Network/ipv4/http.js')
      
      // Mock all services failing
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await http()
      expect(result).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(5) // Should try all 5 services
    })

    test('should return null when all services return invalid IPs', async () => {
      const { http } = await import('../src/Network/ipv4/http.js')
      
      // Mock all services returning invalid data
      mockFetch.mockResolvedValue({
        text: () => Promise.resolve('invalid-ip-address')
      })

      const result = await http()
      expect(result).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(5)
    })
  })

  describe('IPv6 HTTP Method Coverage', () => {
    test('should get IPv6 address from first service (success path)', async () => {
      const { http } = await import('../src/Network/ipv6/http.js')
      
      // Mock successful IPv6 response
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve('2001:db8::1')
      })

      const result = await http()
      expect(result).toBe('2001:db8::1')
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api6.ipify.org'),
        expect.objectContaining({
          headers: { 'User-Agent': 'Air-GUN-Peer/1.0' }
        })
      )
    })

    test('should handle IPv6 JSON response format', async () => {
      const { http } = await import('../src/Network/ipv6/http.js')
      
      // Mock IPv6 JSON response
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve('{"ip":"2001:db8:85a3::8a2e:370:7334","version":"6"}')
      })

      const result = await http()
      expect(result).toBe('2001:db8:85a3::8a2e:370:7334')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should handle IPv6 JSON with address field', async () => {
      const { http } = await import('../src/Network/ipv6/http.js')
      
      // Mock IPv6 JSON response with address field
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve('{"address":"fe80::1%lo0","type":"local"}')
      })

      const result = await http()
      expect(result).toBe('fe80::1%lo0')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should handle IPv6 malformed JSON gracefully', async () => {
      const { http } = await import('../src/Network/ipv6/http.js')
      
      // Mock malformed JSON that falls back to text
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve('2001:db8::dead:beef {invalid json')
      })

      const result = await http()
      expect(result).toBe('2001:db8::dead:beef')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should try multiple IPv6 services when first fails', async () => {
      const { http } = await import('../src/Network/ipv6/http.js')
      
      // Mock first service fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          text: () => Promise.resolve('2001:4860:4860::8888')
        })

      const result = await http()
      expect(result).toBe('2001:4860:4860::8888')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('should continue through all IPv6 services on invalid responses', async () => {
      const { http } = await import('../src/Network/ipv6/http.js')
      
      // Mock multiple invalid responses, then valid IPv6
      mockFetch
        .mockResolvedValueOnce({ text: () => Promise.resolve('invalid-ipv6') })
        .mockResolvedValueOnce({ text: () => Promise.resolve('not-an-ipv6') })
        .mockResolvedValueOnce({ text: () => Promise.resolve('2001:db8:cafe::42') })

      const result = await http()
      expect(result).toBe('2001:db8:cafe::42')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    test('should return null when all IPv6 services fail', async () => {
      const { http } = await import('../src/Network/ipv6/http.js')
      
      // Mock all services failing
      mockFetch.mockRejectedValue(new Error('IPv6 network error'))

      const result = await http()
      expect(result).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(4) // Should try all 4 IPv6 services
    })

    test('should return null when all IPv6 services return invalid addresses', async () => {
      const { http } = await import('../src/Network/ipv6/http.js')
      
      // Mock all services returning invalid IPv6 data
      mockFetch.mockResolvedValue({
        text: () => Promise.resolve('invalid-ipv6-address')
      })

      const result = await http()
      expect(result).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(4)
    })
  })

  describe('Network Constants Coverage', () => {
    test('should verify IPv4 services are accessible', async () => {
      const { ipv4Services } = await import('../src/Network/constants.js')
      
      expect(ipv4Services).toBeDefined()
      expect(Array.isArray(ipv4Services)).toBe(true)
      expect(ipv4Services.length).toBeGreaterThan(0)
      
      // Test each service URL format
      for (const service of ipv4Services) {
        expect(service).toMatch(/^https?:\/\//)
        expect(typeof service).toBe('string')
      }
    })

    test('should verify IPv6 services are accessible', async () => {
      const { ipv6Services } = await import('../src/Network/constants.js')
      
      expect(ipv6Services).toBeDefined()
      expect(Array.isArray(ipv6Services)).toBe(true)
      expect(ipv6Services.length).toBeGreaterThan(0)
      
      // Test each service URL format
      for (const service of ipv6Services) {
        expect(service).toMatch(/^https?:\/\//)
        expect(typeof service).toBe('string')
      }
    })
  })

  describe('Error Path Coverage', () => {
    test('should handle fetch timeout scenarios', async () => {
      const { http: ipv4Http } = await import('../src/Network/ipv4/http.js')
      
      // Mock timeout error
      mockFetch.mockImplementation(() => 
        Promise.reject(new Error('Request timeout'))
      )

      const result = await ipv4Http()
      expect(result).toBeNull()
    })

    test('should handle malformed responses', async () => {
      const { http: ipv6Http } = await import('../src/Network/ipv6/http.js')
      
      // Mock response that throws during text() call
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.reject(new Error('Response read error'))
      })

      const result = await ipv6Http()
      expect(result).toBeNull()
    })

    test('should handle empty responses', async () => {
      const { http: ipv4Http } = await import('../src/Network/ipv4/http.js')
      
      // Mock empty response
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve('')
      })

      const result = await ipv4Http()
      expect(result).toBeNull()
    })

    test('should handle whitespace-only responses', async () => {
      const { http: ipv6Http } = await import('../src/Network/ipv6/http.js')
      
      // Mock whitespace response
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve('   \n\t  ')
      })

      const result = await ipv6Http()
      expect(result).toBeNull()
    })
  })
})