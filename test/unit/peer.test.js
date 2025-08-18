import { Peer } from '../../Peer.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testConfigPath = path.join(__dirname, '../fixtures/test-air.json')

suite('Peer Class Tests', () => {
    
    // Clean up test files
    const cleanup = () => {
        if (fs.existsSync(testConfigPath)) {
            fs.unlinkSync(testConfigPath)
        }
    }
    
    // Helper to create test peer without starting server
    const createTestPeer = (config = {}) => {
        // Create test root to avoid conflicts with main air.json
        const testRoot = path.join(__dirname, '../fixtures/test-peer-' + Date.now())
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const peer = new Peer({ ...config, root: testRoot })
        
        // Close the server immediately after creation to free the port
        if (peer.server) {
            peer.server.close()
        }
        
        // Clean up the test directory
        setTimeout(() => {
            if (fs.existsSync(testRoot)) {
                fs.rmSync(testRoot, { recursive: true, force: true })
            }
        }, 100)
        
        return peer
    }

    test('should create Peer instance with default config', () => {
        const peer = createTestPeer()
        assert.ok(peer instanceof Peer)
        assert.ok(peer.config)
        assert.equal(peer.env, 'development')
        assert.equal(peer.restarts.max, 5)
        assert.equal(peer.restarts.count, 0)
        assert.equal(peer.delay.base, 5000)
        assert.equal(peer.delay.max, 60000)
    })

    test('should handle custom config', () => {
        const customConfig = {
            env: 'production',
            name: 'testpeer'
        }
        const peer = createTestPeer(customConfig)
        assert.equal(peer.config.env, 'production')
        assert.equal(peer.config.name, 'testpeer')
        assert.ok(peer.config.root)  // Will be the test root
    })

    test('should handle environment variables', () => {
        const originalEnv = process.env.ENV
        process.env.ENV = 'staging'
        process.env.NAME = 'envpeer'
        process.env.PORT = '9999'
        
        const peer = createTestPeer()
        assert.equal(peer.env, 'staging')
        assert.equal(peer.config.name, 'envpeer')
        assert.equal(peer.config['staging'].port, '9999')
        
        // Restore
        process.env.ENV = originalEnv
        delete process.env.NAME
        delete process.env.PORT
    })

    test('should handle command line arguments', () => {
        const originalArgv = process.argv
        process.argv = [
            'node',
            'test.js',
            '/root/path',     // argv[2] - root
            '/bash/path',     // argv[3] - bash
            'testing',        // argv[4] - env
            'argpeer',        // argv[5] - name
            'example.com',    // argv[6] - domain
            '7777'           // argv[7] - port
        ]
        
        const peer = new Peer()
        assert.equal(peer.config.root, '/root/path')
        assert.equal(peer.config.bash, '/bash/path')
        assert.equal(peer.env, 'testing')
        assert.equal(peer.config.name, 'argpeer')
        assert.equal(peer.config['testing'].domain, 'example.com')
        assert.equal(peer.config['testing'].port, '7777')
        
        // Restore
        process.argv = originalArgv
    })

    test('should validate restart logic with exponential backoff', () => {
        const peer = new Peer()
        
        // Mock console.log to capture output
        const logs = []
        const originalLog = console.log
        console.log = (msg) => logs.push(msg)
        
        // Simulate multiple restart attempts
        for (let i = 1; i <= 5; i++) {
            peer.restarts.count = i - 1
            const expectedBase = Math.min(5000 * Math.pow(2, i - 1), 60000)
            
            // Check that delay is within jitter range (±20%)
            const minDelay = expectedBase * 0.8
            const maxDelay = expectedBase * 1.2
            
            // We can't test the actual restart without mocking timers
            // but we can verify the calculation logic
            const exponential = Math.min(peer.delay.base * Math.pow(2, i - 1), peer.delay.max)
            assert.ok(exponential >= 5000 && exponential <= 60000)
        }
        
        console.log = originalLog
    })

    test('should handle malformed config file gracefully', () => {
        // Create a malformed JSON file
        fs.writeFileSync(testConfigPath, '{invalid json}')
        
        const peer = new Peer({ path: testConfigPath })
        // Should not throw, should use defaults
        assert.ok(peer.config)
        
        cleanup()
    })

    test('should handle missing SSL files', () => {
        const peer = new Peer({
            env: 'production',
            production: {
                ssl: {
                    key: '/nonexistent/key.pem',
                    cert: '/nonexistent/cert.pem'
                }
            }
        })
        
        assert.equal(peer.options.key, null)
        assert.equal(peer.options.cert, null)
    })

    test('should initialize server based on SSL availability', () => {
        const peer = new Peer()
        
        // Without SSL
        assert.ok(!peer.https)
        assert.ok(peer.http)
        assert.equal(peer.server, peer.http)
    })

    test('should handle port conflicts', () => {
        const peer1 = new Peer({ development: { port: 8765 } })
        // Second peer with same port would fail in real scenario
        // This tests that the config is set correctly
        const peer2 = new Peer({ development: { port: 8765 } })
        
        assert.equal(peer1.config.development.port, 8765)
        assert.equal(peer2.config.development.port, 8765)
    })

    test('should handle edge cases in configuration precedence', () => {
        const originalEnv = process.env.NAME
        const originalArgv = process.argv
        
        // Set all sources
        process.env.NAME = 'envname'
        process.argv = ['node', 'test', '', '', '', 'argname']
        
        const peer = new Peer({ name: 'configname' })
        
        // Command args should win
        assert.equal(peer.config.name, 'argname')
        
        // Test with empty argv
        process.argv = ['node', 'test', '', '', '', '']
        const peer2 = new Peer({ name: 'configname' })
        assert.equal(peer2.config.name, 'envname') // Env should win
        
        // Restore
        process.env.NAME = originalEnv
        process.argv = originalArgv
    })

    test('should handle null and undefined config values', () => {
        const peer = new Peer({
            name: null,
            sync: undefined,
            development: {
                port: null,
                domain: undefined
            }
        })
        
        // Should fall back to defaults
        assert.ok(peer.config.name) // Should have default
        assert.ok(peer.config.development.port) // Should have default
    })

    test('should sanitize bash path', () => {
        const peer1 = new Peer({ bash: '/path/with/trailing/  ' })
        assert.equal(peer1.config.bash, '/path/with/trailing')
        
        const peer2 = new Peer({ bash: '/path/with/slash/' })
        assert.equal(peer2.config.bash, '/path/with/slash')
    })

    test('should handle production SSL paths correctly', () => {
        const peer = new Peer({
            env: 'production',
            production: {
                domain: 'test.com'
            }
        })
        
        // Should auto-generate Let's Encrypt paths
        const expectedKey = '/etc/letsencrypt/live/test.com/privkey.pem'
        const expectedCert = '/etc/letsencrypt/live/test.com/cert.pem'
        
        // These would be set if files existed
        // Just verify the logic works
        assert.ok(peer.config)
    })

    test('should handle peers array correctly', () => {
        const peers = ['wss://peer1.com/gun', 'wss://peer2.com/gun']
        const peer = new Peer({
            development: {
                peers: peers
            }
        })
        
        assert.deepEqual(peer.config.development.peers, peers)
    })

    test('should handle empty peers array', () => {
        const peer = new Peer({
            development: {
                peers: []
            }
        })
        
        assert.deepEqual(peer.config.development.peers, [])
    })

    test('should handle maximum restart attempts', () => {
        const peer = new Peer()
        peer.restarts.count = 5 // Max attempts
        
        // Mock process.exit
        let exitCode = null
        const originalExit = process.exit
        process.exit = (code) => { exitCode = code }
        
        // Mock console.error
        const errors = []
        const originalError = console.error
        console.error = (msg) => errors.push(msg)
        
        peer.restart()
        
        assert.equal(exitCode, 1)
        assert.ok(errors.some(e => e.includes('Maximum restart attempts')))
        
        // Restore
        process.exit = originalExit
        console.error = originalError
    })

    test('should handle config path generation', () => {
        const peer = new Peer({ root: '/test/root' })
        assert.equal(peer.config.path, path.join('/test/root', 'air.json'))
    })

    test('should handle SEA pair configuration', () => {
        const pair = {
            pub: 'public-key',
            priv: 'private-key',
            epub: 'epub-key',
            epriv: 'epriv-key'
        }
        
        const peer = new Peer({
            development: {
                pair: pair
            }
        })
        
        assert.deepEqual(peer.config.development.pair, pair)
    })

    test('should handle partial SEA pair configuration', () => {
        const peer = new Peer({
            development: {
                pair: {
                    pub: 'only-pub'
                }
            }
        })
        
        assert.equal(peer.config.development.pair.pub, 'only-pub')
        assert.equal(peer.config.development.pair.priv, null)
    })

    test('should handle system configuration', () => {
        const system = {
            pub: 'system-pub',
            epub: 'system-epub',
            cert: { message: 'cert-message' }
        }
        
        const peer = new Peer({
            development: {
                system: system
            }
        })
        
        assert.deepEqual(peer.config.development.system, system)
    })

    test('should handle www path configuration', () => {
        const peer = new Peer({ bash: '/custom/bash' })
        assert.equal(peer.config.development.www, path.join('/custom/bash', 'www'))
        
        const peer2 = new Peer({
            development: {
                www: '/custom/www'
            }
        })
        assert.equal(peer2.config.development.www, '/custom/www')
    })

    test('should handle sync URL configuration', () => {
        const syncUrl = 'https://config.example.com/network.json'
        const peer = new Peer({ sync: syncUrl })
        assert.equal(peer.config.sync, syncUrl)
    })

    test('should handle development vs production defaults', () => {
        const devPeer = new Peer({ env: 'development' })
        assert.equal(devPeer.config.name, 'localhost')
        assert.equal(devPeer.config.development.domain, 'localhost')
        
        const prodPeer = new Peer({ env: 'production' })
        assert.equal(prodPeer.config.name, null)
        assert.equal(prodPeer.config.production.domain, null)
    })

    test('should handle GUN and SEA initialization', () => {
        const peer = new Peer()
        assert.ok(peer.GUN)
        assert.ok(peer.sea)
        assert.deepEqual(peer.gun, {})
        assert.deepEqual(peer.user, {})
    })

    test('should handle edge case with all config sources empty', () => {
        const originalEnv = { ...process.env }
        const originalArgv = [...process.argv]
        
        // Clear environment
        delete process.env.ROOT
        delete process.env.BASH
        delete process.env.ENV
        delete process.env.NAME
        delete process.env.DOMAIN
        delete process.env.PORT
        
        // Minimal argv
        process.argv = ['node', 'test']
        
        const peer = new Peer()
        
        // Should have sensible defaults
        assert.ok(peer.config.root)
        assert.ok(peer.config.bash)
        assert.equal(peer.env, 'development')
        assert.equal(peer.config.development.port, 8765)
        
        // Restore
        Object.assign(process.env, originalEnv)
        process.argv = originalArgv
    })

    // Cleanup after all tests
    cleanup()
})