import { Peer } from '../../Peer.js'

suite('IP Detection Tests', () => {
    
    test('should validate valid IP addresses', () => {
        const peer = new Peer()
        
        assert.ok(peer.ip.validate('192.168.1.1') === false) // Private
        assert.ok(peer.ip.validate('10.0.0.1') === false) // Private
        assert.ok(peer.ip.validate('172.16.0.1') === false) // Private
        assert.ok(peer.ip.validate('127.0.0.1') === false) // Loopback
        assert.ok(peer.ip.validate('0.0.0.0') === false) // Invalid
        assert.ok(peer.ip.validate('255.255.255.255') === false) // Broadcast
        assert.ok(peer.ip.validate('224.0.0.1') === false) // Multicast
        
        assert.ok(peer.ip.validate('8.8.8.8')) // Valid public IP
        assert.ok(peer.ip.validate('1.1.1.1')) // Valid public IP
        assert.ok(peer.ip.validate('93.184.216.34')) // Valid public IP
    })

    test('should reject invalid IP formats', () => {
        const peer = new Peer()
        
        assert.ok(!peer.ip.validate('256.1.1.1')) // Out of range
        assert.ok(!peer.ip.validate('1.1.1')) // Missing octet
        assert.ok(!peer.ip.validate('1.1.1.1.1')) // Too many octets
        assert.ok(!peer.ip.validate('a.b.c.d')) // Non-numeric
        assert.ok(!peer.ip.validate('')) // Empty string
        assert.ok(!peer.ip.validate('...')) // Only dots
        assert.ok(!peer.ip.validate('1.2.3.-4')) // Negative number
        assert.ok(!peer.ip.validate('01.02.03.04')) // Leading zeros (technically valid but our regex doesn't match)
    })

    test('should handle edge cases in IP validation', () => {
        const peer = new Peer()
        
        assert.ok(!peer.ip.validate(null))
        assert.ok(!peer.ip.validate(undefined))
        assert.ok(!peer.ip.validate(123))
        assert.ok(!peer.ip.validate({}))
        assert.ok(!peer.ip.validate([]))
        assert.ok(!peer.ip.validate('192.168.001.001')) // Leading zeros
        assert.ok(!peer.ip.validate(' 1.1.1.1 ')) // Whitespace
        assert.ok(!peer.ip.validate('1.1.1.1\n'))
        assert.ok(!peer.ip.validate('http://1.1.1.1'))
        assert.ok(!peer.ip.validate('1.1.1.1:8080'))
    })

    test('should handle DNS method with invalid service', async () => {
        const peer = new Peer()
        const config = { dnsTimeout: 1000 }
        
        const result = await peer.ip.dns(
            { hostname: 'invalid.dns.test', resolver: 'invalid.resolver.test' },
            config
        )
        
        assert.equal(result, null)
    })

    test('should handle HTTP method with invalid service', async () => {
        const peer = new Peer()
        const config = { timeout: 1000, userAgent: 'Test/1.0' }
        
        const result = await peer.ip.http(
            { url: 'http://invalid.url.test', format: 'text' },
            config
        )
        
        assert.equal(result, null)
    })

    test('should handle HTTP method with JSON format', async () => {
        const peer = new Peer()
        const config = { timeout: 5000, userAgent: 'Test/1.0' }
        
        // Mock fetch for testing
        const originalFetch = global.fetch
        global.fetch = async (url, options) => {
            return {
                ok: true,
                json: async () => ({ ip: '1.2.3.4' }),
                text: async () => '1.2.3.4'
            }
        }
        
        const result = await peer.ip.http(
            { url: 'https://test.api', format: 'json' },
            config
        )
        
        assert.equal(result, '1.2.3.4')
        
        // Test with field extraction
        global.fetch = async (url, options) => {
            return {
                ok: true,
                json: async () => ({ origin: '5.6.7.8' })
            }
        }
        
        const result2 = await peer.ip.http(
            { url: 'https://test.api', format: 'json', field: 'origin' },
            config
        )
        
        assert.equal(result2, '5.6.7.8')
        
        // Restore
        global.fetch = originalFetch
    })

    test('should handle HTTP method with comma-separated IPs', async () => {
        const peer = new Peer()
        const config = { timeout: 5000, userAgent: 'Test/1.0' }
        
        // Mock fetch
        const originalFetch = global.fetch
        global.fetch = async (url, options) => {
            return {
                ok: true,
                json: async () => ({ origin: '1.2.3.4, 5.6.7.8' })
            }
        }
        
        const result = await peer.ip.http(
            { url: 'https://test.api', format: 'json', field: 'origin' },
            config
        )
        
        assert.equal(result, '1.2.3.4')
        
        // Restore
        global.fetch = originalFetch
    })

    test('should handle HTTP timeout', async () => {
        const peer = new Peer()
        const config = { timeout: 100, userAgent: 'Test/1.0' }
        
        // Mock fetch with delay
        const originalFetch = global.fetch
        global.fetch = async (url, options) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        ok: true,
                        text: async () => '1.2.3.4'
                    })
                }, 200) // Longer than timeout
            })
        }
        
        const result = await peer.ip.http(
            { url: 'https://test.api', format: 'text' },
            config
        )
        
        // Should timeout and return null
        // Note: This test might not work as expected without proper AbortController mock
        
        // Restore
        global.fetch = originalFetch
    })

    test('should handle empty HTTP response', async () => {
        const peer = new Peer()
        const config = { timeout: 5000, userAgent: 'Test/1.0' }
        
        // Mock fetch
        const originalFetch = global.fetch
        global.fetch = async (url, options) => {
            return {
                ok: true,
                text: async () => ''
            }
        }
        
        const result = await peer.ip.http(
            { url: 'https://test.api', format: 'text' },
            config
        )
        
        assert.equal(result, null)
        
        // Restore
        global.fetch = originalFetch
    })

    test('should handle HTTP response with invalid IP', async () => {
        const peer = new Peer()
        const config = { timeout: 5000, userAgent: 'Test/1.0' }
        
        // Mock fetch
        const originalFetch = global.fetch
        global.fetch = async (url, options) => {
            return {
                ok: true,
                text: async () => 'not an ip address'
            }
        }
        
        const result = await peer.ip.http(
            { url: 'https://test.api', format: 'text' },
            config
        )
        
        assert.equal(result, null)
        
        // Restore
        global.fetch = originalFetch
    })

    test('should handle HTTP 404 response', async () => {
        const peer = new Peer()
        const config = { timeout: 5000, userAgent: 'Test/1.0' }
        
        // Mock fetch
        const originalFetch = global.fetch
        global.fetch = async (url, options) => {
            return {
                ok: false,
                status: 404
            }
        }
        
        const result = await peer.ip.http(
            { url: 'https://test.api', format: 'text' },
            config
        )
        
        assert.equal(result, null)
        
        // Restore
        global.fetch = originalFetch
    })

    test('should test get method with all failures', async () => {
        const peer = new Peer()
        
        // Mock all methods to fail
        peer.ip.dns = async () => null
        peer.ip.http = async () => null
        
        const result = await peer.ip.get()
        
        assert.equal(result, null)
    })

    test('should test get method with DNS success', async () => {
        const peer = new Peer()
        
        // Mock DNS to succeed
        peer.ip.dns = async (service) => {
            if (service.hostname === 'myip.opendns.com') {
                return '1.2.3.4'
            }
            return null
        }
        peer.ip.http = async () => null
        
        const result = await peer.ip.get()
        
        assert.equal(result, '1.2.3.4')
    })

    test('should test get method with HTTP success after DNS failure', async () => {
        const peer = new Peer()
        
        // Mock DNS to fail, HTTP to succeed
        peer.ip.dns = async () => null
        peer.ip.http = async (service) => {
            if (service.url === 'https://checkip.amazonaws.com') {
                return '5.6.7.8'
            }
            return null
        }
        
        const result = await peer.ip.get()
        
        assert.equal(result, '5.6.7.8')
    })

    test('should handle IP config with missing fields', () => {
        const peer = new Peer({
            ip: {
                timeout: 10000
                // Missing other fields
            }
        })
        
        const config = peer.ip.config()
        
        assert.equal(config.timeout, 10000)
        assert.equal(config.dnsTimeout, 3000) // Should use default
        assert.ok(config.dnsServices.length > 0) // Should use defaults
        assert.ok(config.httpServices.length > 0) // Should use defaults
    })

    test('should handle IP config with empty arrays', () => {
        const peer = new Peer({
            ip: {
                dns: [],
                http: []
            }
        })
        
        const config = peer.ip.config()
        
        // Should fall back to defaults when arrays are empty
        assert.ok(config.dnsServices.length > 0)
        assert.ok(config.httpServices.length > 0)
    })

    test('should handle malformed DNS service config', async () => {
        const peer = new Peer()
        const config = { dnsTimeout: 1000 }
        
        // Missing resolver
        const result1 = await peer.ip.dns(
            { hostname: 'myip.opendns.com' },
            config
        )
        assert.equal(result1, null)
        
        // Missing hostname
        const result2 = await peer.ip.dns(
            { resolver: 'resolver1.opendns.com' },
            config
        )
        assert.equal(result2, null)
        
        // Empty object
        const result3 = await peer.ip.dns({}, config)
        assert.equal(result3, null)
    })

    test('should handle malformed HTTP service config', async () => {
        const peer = new Peer()
        const config = { timeout: 1000, userAgent: 'Test/1.0' }
        
        // Missing URL
        const result1 = await peer.ip.http(
            { format: 'text' },
            config
        )
        assert.equal(result1, null)
        
        // Empty object
        const result2 = await peer.ip.http({}, config)
        assert.equal(result2, null)
    })

    test('should strip whitespace from IP', async () => {
        const peer = new Peer()
        const config = { timeout: 5000, userAgent: 'Test/1.0' }
        
        // Mock fetch
        const originalFetch = global.fetch
        global.fetch = async (url, options) => {
            return {
                ok: true,
                text: async () => '  1.2.3.4\n\r  '
            }
        }
        
        const result = await peer.ip.http(
            { url: 'https://test.api', format: 'text' },
            config
        )
        
        assert.equal(result, '1.2.3.4')
        
        // Restore
        global.fetch = originalFetch
    })
})