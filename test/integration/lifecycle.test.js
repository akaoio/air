import { Peer } from '../../Peer.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testDir = path.join(__dirname, '../fixtures')
const testConfigPath = path.join(testDir, 'lifecycle-test.json')

suite('Lifecycle Integration Tests', () => {
    
    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true })
    }

    const cleanup = () => {
        if (fs.existsSync(testConfigPath)) {
            fs.unlinkSync(testConfigPath)
        }
    }

    test('should complete full initialization cycle', async () => {
        const peer = new Peer({
            path: testConfigPath,
            development: {
                port: 18765 // Use different port to avoid conflicts
            }
        })
        
        // Override methods that would actually start servers
        peer.init = () => {
            peer.server = { 
                listen: () => {},
                on: () => {},
                close: () => {}
            }
        }
        
        // Mock GUN
        peer.run = async (callback) => {
            peer.gun = {}
            peer.user = { 
                is: null,
                auth: (pair, cb) => cb({ err: 'Mock auth' })
            }
            if (callback) callback()
            return peer
        }
        
        // Mock online
        peer.online = async (callback) => {
            if (callback) callback()
            return peer
        }
        
        // Test sync
        peer.sync = async (callback) => {
            if (callback) callback()
            return peer
        }
        
        // Run start sequence
        await peer.start()
        
        assert.ok(peer.gun)
        assert.ok(peer.user)
        
        cleanup()
    })

    test('should handle restart sequence', () => {
        const peer = new Peer()
        
        // Track restart attempts
        let initCalls = 0
        peer.init = () => {
            initCalls++
            peer.server = {
                listen: () => {},
                on: () => {},
                close: () => {}
            }
        }
        
        // Mock setTimeout to run immediately
        const originalSetTimeout = global.setTimeout
        global.setTimeout = (fn, delay) => fn()
        
        // First restart
        peer.restart()
        assert.equal(peer.restarts.count, 1)
        assert.equal(initCalls, 1)
        
        // Second restart
        peer.restart()
        assert.equal(peer.restarts.count, 2)
        assert.equal(initCalls, 2)
        
        // Restore
        global.setTimeout = originalSetTimeout
    })

    test('should handle config read/write cycle', () => {
        const testConfig = {
            root: '/test/root',
            env: 'test',
            name: 'testpeer',
            test: {
                port: 9999,
                domain: 'test.local'
            }
        }
        
        const peer = new Peer()
        peer.config = { ...testConfig, path: testConfigPath }
        
        // Write config
        peer.write()
        assert.ok(fs.existsSync(testConfigPath))
        
        // Read it back
        const peer2 = new Peer({ path: testConfigPath })
        peer2.config.path = testConfigPath
        const readConfig = peer2.read()
        
        assert.equal(readConfig.name, 'testpeer')
        assert.equal(readConfig.test.port, 9999)
        
        cleanup()
    })

    test('should handle ddns update cycle', async () => {
        const peer = new Peer()
        
        // Mock user authentication
        peer.user = { is: true }
        
        // Create mock ddns.json
        const ddnsPath = path.join(peer.config.root, 'ddns.json')
        const ddnsData = {
            lastIP: '1.2.3.4',
            currentIP: '5.6.7.8',
            newIP: '9.10.11.12'
        }
        fs.writeFileSync(ddnsPath, JSON.stringify(ddnsData))
        
        // Mock user.put
        let putData = null
        peer.user.put = (data, callback) => {
            putData = data
            callback({ ok: true })
        }
        
        // Run ddns update
        await new Promise(resolve => {
            peer.ddnsupdate(resolve)
        })
        
        assert.deepEqual(putData, ddnsData)
        
        // Cleanup
        if (fs.existsSync(ddnsPath)) {
            fs.unlinkSync(ddnsPath)
        }
    })

    test('should handle IP update cycle', async () => {
        const peer = new Peer()
        
        // Mock user authentication
        peer.user = { is: true }
        
        // Mock IP detection
        peer.get = async () => '1.2.3.4'
        
        // Mock user.put
        let putData = null
        peer.user.put = (data, callback) => {
            putData = data
            callback({ ok: true })
        }
        
        // Run IP update
        await new Promise(resolve => {
            peer.update(resolve)
        })
        
        assert.equal(putData.newIP, '1.2.3.4')
        assert.ok(putData.timestamp)
    })

    test('should handle alive heartbeat cycle', async () => {
        const peer = new Peer()
        
        // Mock user authentication
        peer.user = { is: true }
        
        // Mock user.put
        let putData = null
        peer.user.put = (data, callback) => {
            putData = data
            callback({ ok: true })
        }
        
        // Run alive
        await new Promise(resolve => {
            peer.alive(resolve)
        })
        
        assert.ok(putData.alive)
    })

    test('should handle sync config from remote URL', async () => {
        const peer = new Peer({
            sync: 'https://config.example.com/network.json'
        })
        
        // Mock fetch
        const originalFetch = global.fetch
        global.fetch = async (url) => {
            assert.equal(url, 'https://config.example.com/network.json')
            return {
                json: async () => ({
                    system: {
                        pub: 'system_pub',
                        epub: 'system_epub',
                        cert: 'system_cert'
                    }
                })
            }
        }
        
        // Mock read/write
        peer.read = () => peer.config
        peer.write = () => peer.config
        
        await new Promise(resolve => {
            peer.sync(resolve)
        })
        
        assert.equal(peer.config[peer.env].system.pub, 'system_pub')
        
        // Restore
        global.fetch = originalFetch
    })

    test('should handle sync config with invalid response', async () => {
        const peer = new Peer({
            sync: 'https://config.example.com/network.json'
        })
        
        // Mock fetch to fail
        const originalFetch = global.fetch
        global.fetch = async (url) => {
            throw new Error('Network error')
        }
        
        // Mock console.error
        const errors = []
        const originalError = console.error
        console.error = (msg) => errors.push(msg)
        
        await new Promise(resolve => {
            peer.sync(() => {
                // Should still resolve even with error
                resolve()
            })
        })
        
        assert.ok(errors.some(e => e.includes('Network error')))
        
        // Restore
        global.fetch = originalFetch
        console.error = originalError
    })

    test('should handle missing ddns.json file', async () => {
        const peer = new Peer()
        
        // Mock user authentication
        peer.user = { is: true }
        
        // Ensure ddns.json doesn't exist
        const ddnsPath = path.join(peer.config.root, 'ddns.json')
        if (fs.existsSync(ddnsPath)) {
            fs.unlinkSync(ddnsPath)
        }
        
        // Should resolve without error
        await new Promise(resolve => {
            peer.ddnsupdate(resolve)
        })
        
        assert.ok(true) // If we get here, it didn't crash
    })

    test('should handle IP detection failure', async () => {
        const peer = new Peer()
        
        // Mock user authentication
        peer.user = { is: true }
        
        // Mock IP detection to fail
        peer.get = async () => null
        
        // Mock console.error
        const errors = []
        const originalError = console.error
        console.error = (msg) => errors.push(msg)
        
        // Run IP update
        await new Promise(resolve => {
            peer.update(() => {
                // Should call callback even on error
                resolve()
            })
        })
        
        assert.ok(errors.some(e => e.includes('Unable to detect public IP')))
        
        // Restore
        console.error = originalError
    })

    test('should handle user not authenticated', async () => {
        const peer = new Peer()
        
        // User not authenticated
        peer.user = { is: null }
        
        // These should all reject/return early
        await new Promise(resolve => {
            peer.ddnsupdate(() => {
                // Should not be called
                assert.ok(false)
            })
            // Give it time to potentially fail
            setTimeout(resolve, 100)
        })
        
        await new Promise(resolve => {
            peer.update(() => {
                // Should not be called
                assert.ok(false)
            })
            setTimeout(resolve, 100)
        })
        
        await new Promise(resolve => {
            peer.alive(() => {
                // Should not be called
                assert.ok(false)
            })
            setTimeout(resolve, 100)
        })
        
        assert.ok(true) // If we get here, methods returned early as expected
    })

    test('should handle server error and trigger restart', () => {
        const peer = new Peer()
        
        let restartCalled = false
        peer.restart = () => {
            restartCalled = true
        }
        
        // Create mock server
        const errorHandlers = {}
        peer.server = {
            on: (event, handler) => {
                errorHandlers[event] = handler
            },
            listen: () => {},
            close: () => {}
        }
        
        // Re-init to attach handlers
        peer.init()
        
        // Trigger error
        if (errorHandlers.error) {
            errorHandlers.error(new Error('Test error'))
        }
        
        assert.ok(restartCalled)
    })

    test('should handle server close and trigger restart', () => {
        const peer = new Peer()
        
        let restartCalled = false
        peer.restart = () => {
            restartCalled = true
        }
        
        // Create mock server
        const closeHandlers = {}
        peer.server = {
            on: (event, handler) => {
                closeHandlers[event] = handler
            },
            listen: () => {},
            close: () => {}
        }
        
        // Re-init to attach handlers
        peer.init()
        
        // Trigger close
        if (closeHandlers.close) {
            closeHandlers.close()
        }
        
        assert.ok(restartCalled)
    })

    // Cleanup after all tests
    cleanup()
})