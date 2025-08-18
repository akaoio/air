import { Peer } from '../../Peer.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testDir = path.join(__dirname, '../fixtures')

suite('Challenging Edge Case Tests', () => {

    // Test 1: Race condition - Multiple Peers trying to use same port simultaneously
    test('should handle race condition with concurrent Peer creation', async () => {
        const promises = []
        const port = 19999
        
        // Try to create 10 Peers simultaneously on same port
        for (let i = 0; i < 10; i++) {
            promises.push(new Promise((resolve) => {
                try {
                    const peer = new Peer({
                        name: `racer-${i}`,
                        development: { port }
                    })
                    setTimeout(() => {
                        if (peer.server) peer.server.close()
                        resolve({ success: true, index: i })
                    }, 100)
                } catch (error) {
                    resolve({ success: false, index: i, error: error.message })
                }
            }))
        }
        
        const results = await Promise.all(promises)
        const successful = results.filter(r => r.success).length
        
        // At least one should succeed, others should handle port conflict gracefully
        assert.ok(successful >= 1, `Expected at least 1 successful peer, got ${successful}`)
    })

    // Test 2: Memory leak detection - Rapid server restart cycles
    test('should not leak memory during rapid restart cycles', async () => {
        const peer = new Peer({ name: 'memory-test' })
        const initialMemory = process.memoryUsage().heapUsed
        
        // Perform 50 rapid restart cycles
        for (let i = 0; i < 50; i++) {
            peer.restart()
            await new Promise(resolve => setTimeout(resolve, 10))
        }
        
        if (peer.server) peer.server.close()
        
        // Force garbage collection if available
        if (global.gc) global.gc()
        
        const finalMemory = process.memoryUsage().heapUsed
        const memoryGrowth = finalMemory - initialMemory
        
        // Memory should not grow more than 10MB
        assert.ok(memoryGrowth < 10 * 1024 * 1024, `Memory grew by ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`)
    })

    // Test 3: Path traversal security vulnerability
    test('should prevent path traversal attacks in config path', () => {
        const maliciousInputs = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam',
            'air.json/../../sensitive.txt',
            'air%2ejson/%2e%2e/%2e%2e/etc/passwd'
        ]
        
        maliciousInputs.forEach(input => {
            assert.throws(() => {
                const peer = new Peer({
                    root: input
                })
                // Should not reach here
                if (peer.server) peer.server.close()
            }, null, `Should reject malicious path: ${input}`)
        })
    })

    // Test 4: Configuration file corruption recovery
    test('should recover from corrupted config file', () => {
        const testConfigPath = path.join(testDir, 'corrupt-test.json')
        
        // Write corrupted JSON (truncated)
        fs.writeFileSync(testConfigPath, '{"name": "test", "port": 8765, "peers": ["ws://exam')
        
        const testRoot = path.dirname(testConfigPath)
        
        // Should handle corrupted config gracefully
        const peer = new Peer({ root: testRoot })
        assert.ok(peer, 'Should create peer despite corrupted config')
        
        if (peer.server) peer.server.close()
        if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath)
    })

    // Test 5: Extreme config size handling
    test('should handle extremely large config files efficiently', () => {
        const testRoot = path.join(testDir, 'large-config-test')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const testConfigPath = path.join(testRoot, 'air.json')
        
        // Create a 5MB config with many peers
        const largePeers = []
        for (let i = 0; i < 10000; i++) {
            largePeers.push(`wss://peer${i}.example.com:${8000 + i}/gun`)
        }
        
        const largeConfig = {
            name: 'large-test',
            development: {
                port: 8765,
                peers: largePeers,
                // Add deeply nested structure
                metadata: {}
            }
        }
        
        // Add deep nesting
        let current = largeConfig.development.metadata
        for (let i = 0; i < 100; i++) {
            current.nested = { level: i, data: 'x'.repeat(1000) }
            current = current.nested
        }
        
        fs.writeFileSync(testConfigPath, JSON.stringify(largeConfig))
        
        const startTime = Date.now()
        const peer = new Peer({ root: testRoot })
        const loadTime = Date.now() - startTime
        
        assert.ok(loadTime < 1000, `Config load took ${loadTime}ms, should be under 1000ms`)
        assert.equal(peer.config.development.peers.length, 10000)
        
        if (peer.server) peer.server.close()
        if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath)
        if (fs.existsSync(testRoot)) fs.rmdirSync(testRoot, { recursive: true })
    })

    // Test 6: Network partition simulation
    test('should handle network failures gracefully', async () => {
        const peer = new Peer({
            name: 'network-test',
            development: {
                peers: ['wss://unreachable.example.com/gun']
            }
        })
        
        // Mock fetch to simulate network failure
        const originalFetch = global.fetch
        let fetchCalls = 0
        global.fetch = async () => {
            fetchCalls++
            throw new Error('Network unreachable')
        }
        
        // Try IP detection with network failure
        const ip = await peer.get()
        assert.equal(ip, null, 'Should return null when network fails')
        assert.ok(fetchCalls > 0, 'Should have attempted network calls')
        
        // Restore
        global.fetch = originalFetch
        if (peer.server) peer.server.close()
    })

    // Test 7: Concurrent config file access
    test('should handle concurrent config read/write operations', async () => {
        const testRoot = path.join(testDir, 'concurrent-config')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const peer = new Peer({ root: testRoot })
        
        // Perform 100 concurrent read/write operations
        const operations = []
        for (let i = 0; i < 100; i++) {
            if (i % 2 === 0) {
                operations.push(new Promise(resolve => {
                    peer.config.testValue = i
                    peer.write()
                    resolve('write')
                }))
            } else {
                operations.push(new Promise(resolve => {
                    peer.read()
                    resolve('read')
                }))
            }
        }
        
        const results = await Promise.all(operations)
        assert.equal(results.length, 100, 'All operations should complete')
        
        if (peer.server) peer.server.close()
        const configPath = path.join(testRoot, 'air.json')
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath)
        if (fs.existsSync(testRoot)) fs.rmdirSync(testRoot, { recursive: true })
    })

    // Test 8: Signal handling and graceful shutdown
    test('should handle SIGTERM gracefully', (done) => {
        // Spawn a child process with a Peer
        const child = spawn('node', ['-e', `
            import { Peer } from '${path.join(__dirname, '../../Peer.js')}'
            const peer = new Peer({ name: 'signal-test' })
            process.on('SIGTERM', () => {
                if (peer.server) peer.server.close()
                process.exit(0)
            })
            setTimeout(() => {}, 10000) // Keep alive
        `], { stdio: 'pipe' })
        
        setTimeout(() => {
            // Send SIGTERM
            child.kill('SIGTERM')
            
            let exited = false
            child.on('exit', (code) => {
                exited = true
                assert.equal(code, 0, 'Should exit cleanly')
                done()
            })
            
            // Fail if doesn't exit in 2 seconds
            setTimeout(() => {
                if (!exited) {
                    child.kill('SIGKILL')
                    assert.fail('Process did not exit gracefully')
                }
            }, 2000)
        }, 100)
    })

    // Test 9: Extreme port number edge cases
    test('should handle port number edge cases', () => {
        const invalidPorts = [
            -1,      // Negative
            0,       // Zero  
            65536,   // Above max
            99999,   // Way above max
            'abc',   // String
            null,    // Null
            undefined, // Undefined
            {},      // Object
            [],      // Array
            NaN      // NaN
        ]
        
        invalidPorts.forEach(port => {
            const peer = new Peer({
                name: 'port-test',
                development: { port }
            })
            
            // Should either use default port or handle gracefully
            assert.ok(peer.config.development.port, `Should have a valid port for input: ${port}`)
            
            if (peer.server) peer.server.close()
        })
    })

    // Test 10: Unicode and special characters in configuration
    test('should handle Unicode and special characters everywhere', () => {
        const testRoot = path.join(testDir, 'unicode-test-🎉')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const peer = new Peer({
            root: testRoot,
            name: '测试-тест-🚀-\u0000-\uFFFF',
            development: {
                domain: '例え.jp',
                peers: ['wss://服务器.中国/枪', 'wss://сервер.рф/пистолет'],
                godaddy: {
                    key: '🔑-key-\n\r\t',
                    secret: 'secret-\\x00-\\xFF'
                }
            }
        })
        
        peer.write()
        const readBack = peer.read()
        
        assert.equal(readBack.name, '测试-тест-🚀-\u0000-\uFFFF')
        assert.equal(readBack.development.domain, '例え.jp')
        assert.equal(readBack.development.peers.length, 2)
        
        if (peer.server) peer.server.close()
        const configPath = path.join(testRoot, 'air.json')
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath)
        if (fs.existsSync(testRoot)) fs.rmSync(testRoot, { recursive: true, force: true })
    })

    // Test 11: Stress test with rapid configuration changes
    test('should handle 1000 rapid config changes without corruption', async () => {
        const testRoot = path.join(testDir, 'stress-test')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const peer = new Peer({ root: testRoot })
        
        // Perform 1000 rapid config changes
        for (let i = 0; i < 1000; i++) {
            peer.config.counter = i
            peer.config.timestamp = Date.now()
            peer.config.random = Math.random()
            peer.write()
            
            // Occasionally read to verify
            if (i % 100 === 0) {
                const verified = peer.read()
                assert.ok(verified.counter >= i - 1, `Counter should be at least ${i - 1}`)
            }
        }
        
        // Final verification
        const final = peer.read()
        assert.equal(final.counter, 999, 'Final counter should be 999')
        
        if (peer.server) peer.server.close()
        const configPath = path.join(testRoot, 'air.json')
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath)
        if (fs.existsSync(testRoot)) fs.rmSync(testRoot, { recursive: true, force: true })
    })

    // Test 12: Zero-byte and malformed certificate files
    test('should handle malformed SSL certificate files', () => {
        const testRoot = path.join(testDir, 'ssl-test')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const keyPath = path.join(testRoot, 'key.pem')
        const certPath = path.join(testRoot, 'cert.pem')
        
        // Create zero-byte files
        fs.writeFileSync(keyPath, '')
        fs.writeFileSync(certPath, '')
        
        const peer = new Peer({
            root: testRoot,
            env: 'production',
            production: {
                ssl: {
                    key: keyPath,
                    cert: certPath
                }
            }
        })
        
        // Should fall back to HTTP when SSL files are invalid
        assert.ok(peer.http, 'Should create HTTP server when SSL fails')
        assert.ok(!peer.https, 'Should not create HTTPS server with invalid certs')
        
        if (peer.server) peer.server.close()
        if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath)
        if (fs.existsSync(certPath)) fs.unlinkSync(certPath)
        if (fs.existsSync(testRoot)) fs.rmdirSync(testRoot, { recursive: true })
    })
})