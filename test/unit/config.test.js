import { Peer } from '../../Peer.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testDir = path.join(__dirname, '../fixtures')
const testConfigPath = path.join(testDir, 'test-config.json')

suite('Configuration Tests', () => {
    
    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true })
    }

    const cleanup = () => {
        if (fs.existsSync(testConfigPath)) {
            fs.unlinkSync(testConfigPath)
        }
    }
    
    // Helper to create Peer with automatic cleanup
    const createPeer = (config = {}) => {
        const peer = new Peer(config)
        // Schedule server cleanup
        setTimeout(() => {
            if (peer.server) {
                try {
                    peer.server.close()
                } catch (e) {
                    // Ignore if already closed
                }
            }
        }, 10)
        return peer
    }

    test('should read valid config file', () => {
        // Create a test directory with its own air.json
        const testRoot = path.join(testDir, 'test-root')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const testAirPath = path.join(testRoot, 'air.json')
        
        const config = {
            root: testRoot,
            bash: '/test/bash',
            env: 'production',
            name: 'testpeer',
            sync: 'https://example.com/config.json',
            production: {
                domain: 'test.example.com',
                port: 443,
                peers: ['wss://peer1.com/gun']
            }
        }
        
        fs.writeFileSync(testAirPath, JSON.stringify(config, null, 2))
        
        // Pass root directory so Peer looks for air.json there
        const peer = new Peer({ root: testRoot })
        
        assert.ok(peer.config)
        // Config should be merged with defaults
        assert.equal(peer.config.env, 'production')
        assert.equal(peer.config.name, 'testpeer')
        
        // Close server to free port
        if (peer.server) peer.server.close()
        
        // Cleanup
        if (fs.existsSync(testAirPath)) {
            fs.unlinkSync(testAirPath)
        }
        if (fs.existsSync(testRoot)) {
            fs.rmdirSync(testRoot, { recursive: true })
        }
    })

    test('should write config file', () => {
        // Create a test directory with its own air.json
        const testRoot = path.join(testDir, 'test-write')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const testAirPath = path.join(testRoot, 'air.json')
        
        const peer = new Peer({ root: testRoot })
        peer.config.env = 'development'
        peer.config.name = 'writepeer'
        
        peer.write()
        
        assert.ok(fs.existsSync(testAirPath))
        const written = JSON.parse(fs.readFileSync(testAirPath, 'utf8'))
        assert.equal(written.root, testRoot)
        assert.equal(written.name, 'writepeer')
        
        // Close server to free port
        if (peer.server) peer.server.close()
        
        // Cleanup
        if (fs.existsSync(testAirPath)) {
            fs.unlinkSync(testAirPath)
        }
        if (fs.existsSync(testRoot)) {
            fs.rmdirSync(testRoot, { recursive: true })
        }
    })

    test('should handle missing config file', () => {
        const testRoot = path.join(testDir, 'test-missing')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        // Create peer with a root that has no air.json
        const peer = new Peer({ root: testRoot })
        
        assert.ok(peer.config)
        // Should return existing config without errors
        
        // Close server to free port
        if (peer.server) peer.server.close()
        
        // Cleanup
        if (fs.existsSync(testRoot)) {
            fs.rmdirSync(testRoot, { recursive: true })
        }
    })

    test('should handle invalid JSON in config file', () => {
        const testRoot = path.join(testDir, 'test-invalid')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const testAirPath = path.join(testRoot, 'air.json')
        fs.writeFileSync(testAirPath, '{ invalid json }')
        
        assert.throws(() => {
            const peer = new Peer({ root: testRoot })
        })
        
        // Cleanup
        if (fs.existsSync(testAirPath)) {
            fs.unlinkSync(testAirPath)
        }
        if (fs.existsSync(testRoot)) {
            fs.rmdirSync(testRoot, { recursive: true })
        }
    })

    test('should handle empty config file', () => {
        const testRoot = path.join(testDir, 'test-empty')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const testAirPath = path.join(testRoot, 'air.json')
        fs.writeFileSync(testAirPath, '')
        
        assert.throws(() => {
            const peer = new Peer({ root: testRoot })
        })
        
        // Cleanup
        if (fs.existsSync(testAirPath)) {
            fs.unlinkSync(testAirPath)
        }
        if (fs.existsSync(testRoot)) {
            fs.rmdirSync(testRoot, { recursive: true })
        }
    })

    test('should handle config with only whitespace', () => {
        const testRoot = path.join(testDir, 'test-whitespace')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const testAirPath = path.join(testRoot, 'air.json')
        fs.writeFileSync(testAirPath, '   \n\t  ')
        
        assert.throws(() => {
            const peer = new Peer({ root: testRoot })
        })
        
        // Cleanup
        if (fs.existsSync(testAirPath)) {
            fs.unlinkSync(testAirPath)
        }
        if (fs.existsSync(testRoot)) {
            fs.rmdirSync(testRoot, { recursive: true })
        }
    })

    test('should merge config correctly', () => {
        const testRoot = path.join(testDir, 'test-merge')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const testAirPath = path.join(testRoot, 'air.json')
        
        // First config to be saved
        const initialConfig = {
            root: testRoot,
            env: 'development',
            name: 'initialpeer',
            development: {
                port: 8765,
                domain: 'initial.example.com'
            }
        }
        
        fs.writeFileSync(testAirPath, JSON.stringify(initialConfig, null, 2))
        
        // Create peer which will read the initial config
        const peer = new Peer({ root: testRoot })
        
        // Modify and write back
        peer.config.name = 'newpeer'
        peer.config.development.domain = 'new.example.com'
        peer.config.development.peers = ['wss://new.peer.com/gun']
        
        peer.write()
        
        // Read again to verify merge
        const merged = peer.read()
        
        assert.equal(merged.root, testRoot)
        assert.equal(merged.name, 'newpeer')
        assert.equal(merged.development.port, 8765)
        assert.equal(merged.development.domain, 'new.example.com')
        assert.ok(Array.isArray(merged.development.peers))
        assert.equal(merged.development.peers[0], 'wss://new.peer.com/gun')
        
        // Close server to free port
        if (peer.server) peer.server.close()
        
        // Cleanup
        if (fs.existsSync(testAirPath)) {
            fs.unlinkSync(testAirPath)
        }
        if (fs.existsSync(testRoot)) {
            fs.rmdirSync(testRoot, { recursive: true })
        }
    })

    test('should handle IP config structure', () => {
        const testRoot = path.join(testDir, 'test-ip-config')
        if (!fs.existsSync(testRoot)) {
            fs.mkdirSync(testRoot, { recursive: true })
        }
        
        const testAirPath = path.join(testRoot, 'air.json')
        
        const config = {
            root: testRoot,
            env: 'development',
            name: 'test-ip-peer',
            ip: {
                timeout: 10000,
                dnstimeout: 5000,
                agent: 'TestAgent/1.0',
                dns: [
                    { hostname: 'test.dns.com', resolver: 'resolver.test.com' }
                ],
                http: [
                    { url: 'https://test.ip.com', format: 'text' }
                ]
            }
        }
        
        fs.writeFileSync(testAirPath, JSON.stringify(config, null, 2))
        
        const peer = new Peer({ root: testRoot })
        
        assert.ok(peer.config.ip)
        assert.equal(peer.config.ip.timeout, 10000)
        assert.equal(peer.config.ip.dnstimeout, 5000)
        assert.equal(peer.config.ip.agent, 'TestAgent/1.0')
        assert.ok(Array.isArray(peer.config.ip.dns))
        assert.ok(Array.isArray(peer.config.ip.http))
        
        // Close server to free port
        if (peer.server) peer.server.close()
        
        // Cleanup
        if (fs.existsSync(testAirPath)) {
            fs.unlinkSync(testAirPath)
        }
        if (fs.existsSync(testRoot)) {
            fs.rmdirSync(testRoot, { recursive: true })
        }
    })

    test('should create default IP config if missing', () => {
        const peer = new Peer()
        const ipConfig = peer.ipconfig()
        
        assert.ok(ipConfig)
        assert.equal(ipConfig.timeout, 5000)
        assert.equal(ipConfig.dnsTimeout, 3000)
        assert.equal(ipConfig.userAgent, 'Air-GUN-Peer/1.0')
        assert.ok(Array.isArray(ipConfig.dnsServices))
        assert.ok(Array.isArray(ipConfig.httpServices))
        
        // Should save to config
        assert.ok(peer.config.ip)
        assert.equal(peer.config.ip.timeout, 5000)
        
        // Close server to free port
        if (peer.server) peer.server.close()
    })

    test('should use existing IP config', () => {
        const peer = new Peer({
            ip: {
                timeout: 15000,
                dnstimeout: 7000,
                agent: 'CustomAgent/2.0',
                dns: [
                    { hostname: 'custom.dns', resolver: 'custom.resolver' }
                ],
                http: [
                    { url: 'https://custom.ip', format: 'json' }
                ]
            }
        })
        
        const ipConfig = peer.ipconfig()
        
        assert.equal(ipConfig.timeout, 15000)
        assert.equal(ipConfig.dnsTimeout, 7000)
        assert.equal(ipConfig.userAgent, 'CustomAgent/2.0')
        assert.equal(ipConfig.dnsServices.length, 1)
        assert.equal(ipConfig.httpServices.length, 1)
        
        // Close server to free port
        if (peer.server) peer.server.close()
    })

    test('should handle environment overrides for IP config', () => {
        process.env.IP_TIMEOUT = '20000'
        process.env.IP_DNS_TIMEOUT = '8000'
        process.env.IP_AGENT = 'EnvAgent/3.0'
        
        const peer = new Peer()
        const ipConfig = peer.ipconfig()
        
        assert.equal(ipConfig.timeout, 20000)
        assert.equal(ipConfig.dnsTimeout, 8000)
        assert.equal(ipConfig.userAgent, 'EnvAgent/3.0')
        
        // Close server to free port
        if (peer.server) peer.server.close()
        
        // Cleanup
        delete process.env.IP_TIMEOUT
        delete process.env.IP_DNS_TIMEOUT
        delete process.env.IP_AGENT
    })

    test('should handle godaddy config', () => {
        const config = {
            production: {
                godaddy: {
                    domain: 'example.com',
                    host: 'api',
                    key: 'test_key',
                    secret: 'test_secret'
                }
            }
        }
        
        fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2))
        
        const peer = new Peer({ path: testConfigPath, env: 'production' })
        peer.config.path = testConfigPath
        const readConfig = peer.read()
        
        assert.deepEqual(readConfig.production.godaddy, config.production.godaddy)
        
        cleanup()
    })

    test('should handle SSL config', () => {
        const config = {
            production: {
                ssl: {
                    key: '/path/to/key.pem',
                    cert: '/path/to/cert.pem'
                }
            }
        }
        
        fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2))
        
        const peer = new Peer({ path: testConfigPath, env: 'production' })
        peer.config.path = testConfigPath
        const readConfig = peer.read()
        
        assert.deepEqual(readConfig.production.ssl, config.production.ssl)
        
        cleanup()
    })

    test('should handle pair (SEA keys) config', () => {
        const config = {
            development: {
                pair: {
                    pub: 'public_key_string',
                    priv: 'private_key_string',
                    epub: 'epub_key_string',
                    epriv: 'epriv_key_string'
                }
            }
        }
        
        fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2))
        
        const peer = new Peer({ path: testConfigPath })
        peer.config.path = testConfigPath
        const readConfig = peer.read()
        
        assert.deepEqual(readConfig.development.pair, config.development.pair)
        
        cleanup()
    })

    test('should handle system config', () => {
        const config = {
            production: {
                system: {
                    pub: 'system_pub',
                    epub: 'system_epub',
                    cert: {
                        peer: 'peer_cert',
                        message: 'cert_message'
                    }
                }
            }
        }
        
        fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2))
        
        const peer = new Peer({ path: testConfigPath, env: 'production' })
        peer.config.path = testConfigPath
        const readConfig = peer.read()
        
        assert.deepEqual(readConfig.production.system, config.production.system)
        
        cleanup()
    })

    test('should not write invalid JSON', () => {
        const peer = new Peer({ path: testConfigPath })
        
        // Create circular reference
        peer.config.circular = peer.config
        peer.config.path = testConfigPath
        
        assert.throws(() => {
            peer.write()
        })
        
        // File should not be created
        assert.ok(!fs.existsSync(testConfigPath))
    })

    test('should handle config with special characters', () => {
        const config = {
            name: 'peer-with-special-chars!@#$%',
            development: {
                domain: 'test.example.com/path?query=1&other=2'
            }
        }
        
        fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2))
        
        const peer = new Peer({ path: testConfigPath })
        peer.config.path = testConfigPath
        const readConfig = peer.read()
        
        assert.equal(readConfig.name, config.name)
        assert.equal(readConfig.development.domain, config.development.domain)
        
        cleanup()
    })

    test('should handle very large config files', () => {
        const largeConfig = {
            peers: []
        }
        
        // Create array with 1000 peers
        for (let i = 0; i < 1000; i++) {
            largeConfig.peers.push(`wss://peer${i}.example.com/gun`)
        }
        
        fs.writeFileSync(testConfigPath, JSON.stringify(largeConfig, null, 2))
        
        const peer = new Peer({ path: testConfigPath })
        peer.config.path = testConfigPath
        const readConfig = peer.read()
        
        assert.equal(readConfig.peers.length, 1000)
        assert.equal(readConfig.peers[0], 'wss://peer0.example.com/gun')
        assert.equal(readConfig.peers[999], 'wss://peer999.example.com/gun')
        
        cleanup()
    })

    test('should preserve config formatting when writing', () => {
        const peer = new Peer({ path: testConfigPath })
        peer.config = {
            path: testConfigPath,
            root: '/test',
            nested: {
                deep: {
                    value: 'test'
                }
            }
        }
        
        peer.write()
        
        const content = fs.readFileSync(testConfigPath, 'utf8')
        // Should be pretty printed with 4 spaces
        assert.ok(content.includes('    '))
        assert.ok(content.includes('"nested": {'))
        
        cleanup()
    })

    // Clean up after all tests
    cleanup()
})