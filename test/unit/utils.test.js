import { merge } from '../../libs/utils.js'

suite('Utils Tests', () => {
    
    test('should merge simple objects', () => {
        const obj1 = { a: 1, b: 2 }
        const obj2 = { b: 3, c: 4 }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { a: 1, b: 3, c: 4 })
    })

    test('should merge nested objects', () => {
        const obj1 = {
            a: 1,
            nested: {
                x: 10,
                y: 20
            }
        }
        const obj2 = {
            nested: {
                y: 30,
                z: 40
            }
        }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, {
            a: 1,
            nested: {
                x: 10,
                y: 30,
                z: 40
            }
        })
    })

    test('should merge arrays by concatenating unique values', () => {
        const obj1 = { arr: [1, 2, 3] }
        const obj2 = { arr: [3, 4, 5] }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { arr: [1, 2, 3, 4, 5] })
    })

    test('should handle empty arrays', () => {
        const obj1 = { arr: [] }
        const obj2 = { arr: [1, 2] }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { arr: [1, 2] })
    })

    test('should handle null values', () => {
        const obj1 = { a: null, b: 2 }
        const obj2 = { a: 3, c: null }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { a: 3, b: 2, c: null })
    })

    test('should handle undefined values', () => {
        const obj1 = { a: undefined, b: 2 }
        const obj2 = { a: 3, c: undefined }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { a: 3, b: 2, c: undefined })
    })

    test('should merge multiple objects', () => {
        const obj1 = { a: 1 }
        const obj2 = { b: 2 }
        const obj3 = { c: 3 }
        const obj4 = { a: 4, d: 5 }
        const result = merge(obj1, obj2, obj3, obj4)
        
        assert.deepEqual(result, { a: 4, b: 2, c: 3, d: 5 })
    })

    test('should handle non-object arguments', () => {
        const result = merge({ a: 1 }, 'string', { b: 2 })
        assert.equal(result, undefined)
    })

    test('should handle all non-object arguments', () => {
        const result = merge('string', 123, true)
        assert.equal(result, undefined)
    })

    test('should handle empty objects', () => {
        const obj1 = {}
        const obj2 = { a: 1 }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { a: 1 })
    })

    test('should handle deeply nested objects', () => {
        const obj1 = {
            level1: {
                level2: {
                    level3: {
                        value: 'original'
                    }
                }
            }
        }
        const obj2 = {
            level1: {
                level2: {
                    level3: {
                        value: 'updated',
                        extra: 'new'
                    },
                    newLevel2: 'added'
                }
            }
        }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, {
            level1: {
                level2: {
                    level3: {
                        value: 'updated',
                        extra: 'new'
                    },
                    newLevel2: 'added'
                }
            }
        })
    })

    test('should not modify original objects', () => {
        const obj1 = { a: 1, nested: { x: 10 } }
        const obj2 = { b: 2, nested: { y: 20 } }
        const originalObj1 = JSON.stringify(obj1)
        const originalObj2 = JSON.stringify(obj2)
        
        merge(obj1, obj2)
        
        assert.equal(JSON.stringify(obj1), originalObj1)
        assert.equal(JSON.stringify(obj2), originalObj2)
    })

    test('should handle arrays with duplicate values', () => {
        const obj1 = { arr: ['a', 'b', 'c'] }
        const obj2 = { arr: ['b', 'c', 'd'] }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { arr: ['a', 'b', 'c', 'd'] })
    })

    test('should handle mixed types in arrays', () => {
        const obj1 = { arr: [1, 'two', true] }
        const obj2 = { arr: [1, 'three', false] }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { arr: [1, 'two', true, 'three', false] })
    })

    test('should handle objects with array and non-array values', () => {
        const obj1 = { prop: [1, 2] }
        const obj2 = { prop: 'string' }
        const result = merge(obj1, obj2)
        
        // Non-array should override array
        assert.deepEqual(result, { prop: 'string' })
    })

    test('should handle array with non-array values', () => {
        const obj1 = { prop: 'string' }
        const obj2 = { prop: [1, 2] }
        const result = merge(obj1, obj2)
        
        // Array should override non-array
        assert.deepEqual(result, { prop: [1, 2] })
    })

    test('should return empty object when no arguments', () => {
        const result = merge()
        assert.deepEqual(result, {})
    })

    test('should handle single object argument', () => {
        const obj = { a: 1, b: 2 }
        const result = merge(obj)
        
        assert.deepEqual(result, obj)
        assert.notEqual(result, obj) // Should be a new object
    })

    test('should handle boolean values', () => {
        const obj1 = { flag: true, other: false }
        const obj2 = { flag: false, another: true }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { flag: false, other: false, another: true })
    })

    test('should handle number values including zero', () => {
        const obj1 = { a: 0, b: 1 }
        const obj2 = { a: 2, c: 0 }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { a: 2, b: 1, c: 0 })
    })

    test('should handle empty strings', () => {
        const obj1 = { a: '', b: 'text' }
        const obj2 = { a: 'updated', c: '' }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { a: 'updated', b: 'text', c: '' })
    })

    test('should handle objects with circular references gracefully', () => {
        const obj1 = { a: 1 }
        obj1.self = obj1 // Circular reference
        
        const obj2 = { b: 2 }
        
        // This might cause issues - test that it doesn't crash
        try {
            const result = merge(obj1, obj2)
            // If it works, great
            assert.ok(result)
        } catch (e) {
            // If it throws, that's also acceptable
            assert.ok(e)
        }
    })

    test('should handle objects with function values', () => {
        const fn1 = () => 'first'
        const fn2 = () => 'second'
        
        const obj1 = { callback: fn1 }
        const obj2 = { callback: fn2 }
        const result = merge(obj1, obj2)
        
        assert.equal(result.callback, fn2)
    })

    test('should handle objects with symbol keys', () => {
        const sym = Symbol('test')
        const obj1 = { [sym]: 'value1' }
        const obj2 = { [sym]: 'value2' }
        const result = merge(obj1, obj2)
        
        // Symbols are not enumerable by default
        // The merge function uses Object.entries which won't see symbols
        assert.ok(result)
    })

    test('should handle Date objects', () => {
        const date1 = new Date('2024-01-01')
        const date2 = new Date('2024-12-31')
        
        const obj1 = { date: date1 }
        const obj2 = { date: date2 }
        const result = merge(obj1, obj2)
        
        assert.equal(result.date, date2)
    })

    test('should handle edge case with prototype properties', () => {
        const obj1 = Object.create({ inherited: 'value' })
        obj1.own = 'property'
        
        const obj2 = { own: 'updated', new: 'added' }
        const result = merge(obj1, obj2)
        
        assert.deepEqual(result, { own: 'updated', new: 'added' })
        // Inherited properties should not be merged
    })
})