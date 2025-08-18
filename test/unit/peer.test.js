import { Peer } from '../../src/Peer.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

suite('peer tests', () => {
    
    const create = (config = {}) => {
        const root = path.join(__dirname, '../fixtures/test-' + Date.now())
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true })
        }
        
        const peer = new Peer({ ...config, root, skipPidCheck: true })
        
        // Cleanup peer instance to prevent restart loops
        peer.cleanup()
        
        setTimeout(() => {
            if (fs.existsSync(root)) {
                fs.rmSync(root, { recursive: true, force: true })
            }
        }, 100)
        
        return peer
    }

    test('should create peer instance', () => {
        const peer = create()
        assert.ok(peer instanceof Peer)
        assert.ok(peer.config)
        assert.equal(peer.env, 'development')
        assert.equal(peer.restarts.max, 5)
        assert.equal(peer.delay.base, 5000)
    })

    test('should validate port numbers', () => {
        const peer = create({ development: { port: -1 } })
        assert.equal(peer.config.development.port, 8765)
    })

    test('should handle restart logic', () => {
        const peer = create()
        assert.equal(peer.restarts.count, 0)
        assert.equal(peer.restarts.max, 5)
    })

    // brutal port validation tests
    test('should handle port 0', () => {
        const peer = create({ development: { port: 0 } })
        assert.equal(peer.config.development.port, 8765)
    })

    test('should handle port 65536', () => {
        const peer = create({ development: { port: 65536 } })
        assert.equal(peer.config.development.port, 8765)
    })

    test('should handle string port', () => {
        const peer = create({ development: { port: "invalid" } })
        assert.equal(peer.config.development.port, 8765)
    })

    test('should handle null port', () => {
        const peer = create({ development: { port: null } })
        assert.equal(peer.config.development.port, 8765)
    })

    test('should handle undefined port', () => {
        const peer = create({ development: { port: undefined } })
        assert.equal(peer.config.development.port, 8765)
    })

    test('should handle object port', () => {
        const peer = create({ development: { port: { bad: "data" } } })
        assert.equal(peer.config.development.port, 8765)
    })

    test('should handle array port', () => {
        const peer = create({ development: { port: [8080, 9090] } })
        assert.equal(peer.config.development.port, 8765)
    })

    test('should handle float port', () => {
        const peer = create({ development: { port: 8080.5 } })
        assert.equal(peer.config.development.port, 8765)
    })

    test('should handle nan port', () => {
        const peer = create({ development: { port: NaN } })
        assert.equal(peer.config.development.port, 8765)
    })

    test('should handle infinity port', () => {
        const peer = create({ development: { port: Infinity } })
        assert.equal(peer.config.development.port, 8765)
    })

    // brutal config tests
    test('should handle null config', () => {
        const peer = create(null)
        assert.ok(peer instanceof Peer)
        assert.ok(peer.config)
    })

    test('should handle undefined config', () => {
        const peer = create(undefined)
        assert.ok(peer instanceof Peer)
        assert.ok(peer.config)
    })

    test('should handle empty config', () => {
        const peer = create({})
        assert.ok(peer instanceof Peer)
        assert.ok(peer.config)
    })

    // brutal path tests
    test('should reject path traversal in root', () => {
        assert.throws(() => {
            new Peer({ root: '../../../etc/passwd', skipPidCheck: true })
        }, /Invalid root path/)
    })

    test('should reject tilde in root', () => {
        assert.throws(() => {
            new Peer({ root: '~/badpath', skipPidCheck: true })
        }, /Invalid root path/)
    })

    test('should reject encoded dots in root', () => {
        assert.throws(() => {
            new Peer({ root: '/path%2e%2e/bad', skipPidCheck: true })
        }, /Invalid root path/)
    })

    test('should reject backslashes in root', () => {
        assert.throws(() => {
            new Peer({ root: 'C:\\Windows\\System32', skipPidCheck: true })
        }, /Invalid root path/)
    })

    // brutal restart scenarios
    test('should handle max restart attempts', () => {
        const peer = create()
        peer.restarts.count = 5
        peer.restarts.max = 5
        
        // simulate reaching max restarts
        let exitCalled = false
        const originalExit = process.exit
        process.exit = (code) => { 
            exitCalled = true
            // don't actually exit in tests
        }
        
        peer.restart()
        
        process.exit = originalExit
        assert.ok(exitCalled)
    })

    // brutal ip validation tests
    test('should reject invalid ip formats', () => {
        const peer = create()
        assert.equal(peer.ip.validate('not.an.ip'), false)
        assert.equal(peer.ip.validate('256.1.1.1'), false)
        assert.equal(peer.ip.validate('1.1.1'), false)
        assert.equal(peer.ip.validate('1.1.1.1.1'), false)
        assert.equal(peer.ip.validate(''), false)
        assert.equal(peer.ip.validate(null), false)
        assert.equal(peer.ip.validate(undefined), false)
    })

    test('should reject private ip ranges', () => {
        const peer = create()
        assert.equal(peer.ip.validate('10.0.0.1'), false)
        assert.equal(peer.ip.validate('172.16.0.1'), false)
        assert.equal(peer.ip.validate('192.168.1.1'), false)
        assert.equal(peer.ip.validate('127.0.0.1'), false)
        assert.equal(peer.ip.validate('0.0.0.0'), false)
        assert.equal(peer.ip.validate('224.0.0.1'), false)
    })

    // brutal config generation
    test('should handle corrupted config path', () => {
        const root = path.join(__dirname, '../fixtures/test-corrupt-' + Date.now())
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true })
        }
        
        const configPath = path.join(root, 'air.json')
        fs.writeFileSync(configPath, 'invalid json{')
        
        assert.throws(() => {
            new Peer({ root, skipPidCheck: true })
        })
        
        if (fs.existsSync(root)) {
            fs.rmSync(root, { recursive: true, force: true })
        }
    })
})