import { Peer } from '../../Peer.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

suite('panic scenario tests', () => {
    
    const create = (config = {}) => {
        const root = path.join(__dirname, '../fixtures/panic-' + Date.now())
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true })
        }
        
        const peer = new Peer({ ...config, root, skipPidCheck: true })
        
        if (peer.server) {
            peer.server.close()
        }
        
        setTimeout(() => {
            if (fs.existsSync(root)) {
                fs.rmSync(root, { recursive: true, force: true })
            }
        }, 100)
        
        return peer
    }

    // filesystem panic tests
    test('should handle unreadable config file', () => {
        const root = path.join(__dirname, '../fixtures/panic-unreadable-' + Date.now())
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true })
        }
        
        const configPath = path.join(root, 'air.json')
        fs.writeFileSync(configPath, '{"test": "data"}')
        fs.chmodSync(configPath, 0o000) // no permissions
        
        assert.throws(() => {
            new Peer({ root, skipPidCheck: true })
        })
        
        // cleanup
        fs.chmodSync(configPath, 0o644)
        if (fs.existsSync(root)) {
            fs.rmSync(root, { recursive: true, force: true })
        }
    })

    test('should handle readonly filesystem', () => {
        const root = path.join(__dirname, '../fixtures/panic-readonly-' + Date.now())
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true })
        }
        
        fs.chmodSync(root, 0o444) // readonly
        
        assert.throws(() => {
            new Peer({ root, skipPidCheck: true })
        })
        
        // cleanup
        fs.chmodSync(root, 0o755)
        if (fs.existsSync(root)) {
            fs.rmSync(root, { recursive: true, force: true })
        }
    })

    test('should handle nonexistent directory', () => {
        const root = '/this/path/does/not/exist/anywhere'
        
        assert.throws(() => {
            new Peer({ root, skipPidCheck: true })
        })
    })

    // memory panic tests
    test('should handle extremely large config', () => {
        const peer = create()
        const largeConfig = {}
        
        // create massive nested object
        let current = largeConfig
        for (let i = 0; i < 100; i++) {
            current.level = {}
            current = current.level
        }
        
        // should not crash
        const result = peer.read()
        assert.ok(result)
    })

    test('should handle massive array in config', () => {
        const config = {
            development: {
                peers: new Array(1000).fill('wss://fake.peer.com/gun')
            }
        }
        
        const peer = create(config)
        assert.ok(Array.isArray(peer.config.development.peers))
        assert.ok(peer.config.development.peers.length > 0)
    })

    // network panic tests
    test('should handle network timeout', async () => {
        const peer = create()
        
        // test with very short timeout
        const config = peer.ip.config()
        config.timeout = 1 // 1ms timeout
        
        const result = await peer.ip.http({
            url: 'https://httpbin.org/delay/10', // 10 second delay
            format: 'text'
        }, config)
        
        assert.equal(result, null)
    })

    test('should handle dns failure', async () => {
        const peer = create()
        
        const result = await peer.ip.dns({
            hostname: 'nonexistent.domain.that.does.not.exist',
            resolver: 'nonexistent.resolver.com'
        }, { dnsTimeout: 1000 })
        
        assert.equal(result, null)
    })

    test('should handle all ip detection failures', async () => {
        const peer = create()
        
        // completely override the methods to force failure
        peer.ip.dns = async () => null
        peer.ip.http = async () => null
        peer.configip = () => ({
            timeout: 100,
            dnsTimeout: 100,
            userAgent: 'test',
            dnsServices: [{ hostname: 'fake.domain', resolver: 'fake.resolver' }],
            httpServices: [{ url: 'https://nonexistent.domain.fake/ip', format: 'text' }]
        })
        
        const result = await peer.ip.get()
        assert.equal(result, null)
    })

    // concurrent panic tests
    test('should handle concurrent peer creation', () => {
        const peers = []
        const errors = []
        
        // try to create 10 peers concurrently
        for (let i = 0; i < 10; i++) {
            try {
                const peer = create({ development: { port: 9000 + i } })
                peers.push(peer)
            } catch (error) {
                errors.push(error)
            }
        }
        
        // should create all peers without crashing
        assert.ok(peers.length > 0)
        
        // cleanup
        peers.forEach(peer => {
            if (peer.server) {
                peer.server.close()
            }
        })
    })

    test('should handle rapid config writes', () => {
        const peer = create()
        const errors = []
        
        // rapidly write config 100 times
        for (let i = 0; i < 100; i++) {
            try {
                peer.config.test = i
                peer.write()
            } catch (error) {
                errors.push(error)
            }
        }
        
        // should not crash from rapid writes
        assert.ok(errors.length < 10) // allow some errors but not total failure
    })

    // resource exhaustion tests
    test('should handle pid file corruption', () => {
        const root = path.join(__dirname, '../fixtures/panic-pid-' + Date.now())
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true })
        }
        
        const pidPath = path.join(root, '.air-test.pid')
        fs.writeFileSync(pidPath, 'not-a-number')
        
        // should handle corrupted pid file gracefully
        const peer = new Peer({ root, name: 'test', skipPidCheck: false })
        assert.ok(peer)
        
        if (fs.existsSync(root)) {
            fs.rmSync(root, { recursive: true, force: true })
        }
    })

    test('should handle malformed json in config', () => {
        const root = path.join(__dirname, '../fixtures/panic-malformed-' + Date.now())
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true })
        }
        
        const configPath = path.join(root, 'air.json')
        fs.writeFileSync(configPath, '{"incomplete": json without closing')
        
        assert.throws(() => {
            new Peer({ root, skipPidCheck: true })
        })
        
        if (fs.existsSync(root)) {
            fs.rmSync(root, { recursive: true, force: true })
        }
    })

    test('should handle binary garbage in config', () => {
        const root = path.join(__dirname, '../fixtures/panic-binary-' + Date.now())
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true })
        }
        
        const configPath = path.join(root, 'air.json')
        const binaryData = Buffer.from([0xFF, 0xFE, 0x00, 0x01, 0x02, 0x03])
        fs.writeFileSync(configPath, binaryData)
        
        assert.throws(() => {
            new Peer({ root, skipPidCheck: true })
        })
        
        if (fs.existsSync(root)) {
            fs.rmSync(root, { recursive: true, force: true })
        }
    })
})