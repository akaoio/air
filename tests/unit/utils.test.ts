/**
 * @akaoio/air - Utils Unit Tests
 * Testing utility functions with @akaoio/battle
 */

import { merge } from "../../src/utils.js"

// Battle test format
export const tests = [
    {
        name: "merge - basic object merging",
        test: () => {
            const obj1 = { a: 1, b: 2 }
            const obj2 = { b: 3, c: 4 }
            const result = merge(obj1, obj2)
            
            return result.a === 1 && result.b === 3 && result.c === 4
        }
    },
    
    {
        name: "merge - array handling", 
        test: () => {
            const obj1 = { arr: [1, 2] }
            const obj2 = { arr: [2, 3] }
            const result = merge(obj1, obj2)
            
            return result.arr.includes(1) && result.arr.includes(2) && result.arr.includes(3)
        }
    },
    
    {
        name: "merge - nested objects",
        test: () => {
            const obj1 = { nested: { a: 1 } }
            const obj2 = { nested: { b: 2 } }  
            const result = merge(obj1, obj2)
            
            return result.nested.a === 1 && result.nested.b === 2
        }
    },
    
    {
        name: "merge - invalid input handling",
        test: () => {
            const result = merge("string", { a: 1 })
            return result === undefined
        }
    }
]