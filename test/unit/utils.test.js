import { merge } from '../../src/libs/utils.js'

suite('utils tests', () => {
    
    test('should merge objects', () => {
        const a = { x: 1, y: 2 }
        const b = { y: 3, z: 4 }
        const result = merge(a, b)
        assert.equal(result.x, 1)
        assert.equal(result.y, 3)
        assert.equal(result.z, 4)
    })

    test('should merge nested objects', () => {
        const a = { config: { port: 8080 } }
        const b = { config: { host: 'localhost' } }
        const result = merge(a, b)
        assert.equal(result.config.port, 8080)
        assert.equal(result.config.host, 'localhost')
    })

    test('should merge arrays', () => {
        const a = { peers: ['a', 'b'] }
        const b = { peers: ['c'] }
        const result = merge(a, b)
        assert.equal(result.peers.length, 3)
        assert.ok(result.peers.includes('a'))
        assert.ok(result.peers.includes('c'))
    })

    // brutal edge case tests
    test('should handle null inputs', () => {
        assert.throws(() => merge(null, {}))
        assert.throws(() => merge({}, null))
        assert.throws(() => merge(null, null))
    })

    test('should handle undefined inputs', () => {
        assert.throws(() => merge(undefined, {}))
        assert.throws(() => merge({}, undefined))
        assert.throws(() => merge(undefined, undefined))
    })

    test('should handle empty inputs', () => {
        const result1 = merge({}, {})
        assert.equal(Object.keys(result1).length, 0)
        
        const result2 = merge({ a: 1 }, {})
        assert.equal(result2.a, 1)
        
        const result3 = merge({}, { b: 2 })
        assert.equal(result3.b, 2)
    })

    test('should handle type conflicts', () => {
        const a = { config: "string" }
        const b = { config: { port: 8080 } }
        const result = merge(a, b)
        assert.equal(typeof result.config, 'object')
        assert.equal(result.config.port, 8080)
    })

    test('should handle number conflicts', () => {
        const a = { port: 8080 }
        const b = { port: "9090" }
        const result = merge(a, b)
        assert.equal(result.port, "9090")
    })

    test('should handle array overwrites', () => {
        const a = { list: [1, 2, 3] }
        const b = { list: ['x', 'y'] }
        const result = merge(a, b)
        assert.equal(result.list.length, 5)
        assert.ok(result.list.includes(1))
        assert.ok(result.list.includes('x'))
    })

    test('should handle deep nested conflicts', () => {
        const a = { 
            config: { 
                server: { port: 8080 },
                debug: true 
            } 
        }
        const b = { 
            config: { 
                server: "disabled",
                timeout: 5000 
            } 
        }
        const result = merge(a, b)
        assert.equal(result.config.server, "disabled")
        assert.equal(result.config.debug, true)
        assert.equal(result.config.timeout, 5000)
    })

    test('should handle circular references', () => {
        const a = { x: 1 }
        const b = { y: 2 }
        a.self = a
        b.self = b
        
        // should not crash or infinite loop
        const result = merge(a, b)
        assert.equal(result.x, 1)
        assert.equal(result.y, 2)
    })

    test('should handle very large objects', () => {
        const a = {}
        const b = {}
        
        // create large objects
        for (let i = 0; i < 1000; i++) {
            a[`key${i}`] = `value${i}`
            b[`key${i + 500}`] = `newvalue${i}`
        }
        
        const result = merge(a, b)
        assert.equal(Object.keys(result).length, 1500)
        assert.equal(result.key0, 'value0')
        assert.equal(result.key500, 'newvalue0')
        assert.equal(result.key999, 'newvalue499')
    })

    test('should handle special javascript values', () => {
        const a = { 
            nan: NaN,
            infinity: Infinity,
            date: new Date(),
            regex: /test/g
        }
        const b = { 
            nan: "not a number",
            infinity: -Infinity,
            date: "2023-01-01",
            regex: "string"
        }
        const result = merge(a, b)
        assert.equal(result.nan, "not a number")
        assert.equal(result.infinity, -Infinity)
        assert.equal(result.date, "2023-01-01")
        assert.equal(result.regex, "string")
    })

    test('should handle functions', () => {
        const a = { 
            func: () => "original",
            value: 1
        }
        const b = { 
            func: () => "new",
            value: 2
        }
        const result = merge(a, b)
        assert.equal(result.func(), "new")
        assert.equal(result.value, 2)
    })

    test('should handle symbols', () => {
        const sym1 = Symbol('test1')
        const sym2 = Symbol('test2')
        const a = { [sym1]: 'value1' }
        const b = { [sym2]: 'value2' }
        const result = merge(a, b)
        assert.equal(result[sym1], 'value1')
        assert.equal(result[sym2], 'value2')
    })
})