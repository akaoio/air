#!/usr/bin/env node

// Set test environment to prevent process.exit in tests
process.env.NODE_ENV = 'test'

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { promises as fs } from 'fs'
import { performance } from 'perf_hooks'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
}

// Test context
class TestContext {
    constructor() {
        this.tests = []
        this.currentSuite = null
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: []
        }
    }

    suite(name, fn) {
        this.currentSuite = name
        console.log(`\n${colors.cyan}▶ ${name}${colors.reset}`)
        fn()
        this.currentSuite = null
    }

    test(name, fn) {
        this.tests.push({
            suite: this.currentSuite,
            name,
            fn
        })
    }

    skip(name, fn) {
        this.tests.push({
            suite: this.currentSuite,
            name,
            fn,
            skip: true
        })
    }

    async run() {
        console.log(`${colors.blue}Running ${this.tests.length} tests...${colors.reset}\n`)
        const startTime = performance.now()
        
        let testIndex = 0
        for (const test of this.tests) {
            testIndex++
            if (test.skip) {
                console.log(`  ${colors.gray}○ ${test.name} (skipped)${colors.reset}`)
                this.results.skipped++
                continue
            }

            try {
                const testStart = performance.now()
                await test.fn()
                const duration = (performance.now() - testStart).toFixed(2)
                console.log(`  ${colors.green}✓${colors.reset} ${test.name} ${colors.gray}(${duration}ms)${colors.reset}`)
                this.results.passed++
            } catch (error) {
                console.log(`  ${colors.red}✗ ${test.name}${colors.reset}`)
                console.log(`    ${colors.red}${error.message}${colors.reset}`)
                if (error.stack) {
                    const stackLines = error.stack.split('\n').slice(1, 3)
                    stackLines.forEach(line => {
                        console.log(`    ${colors.gray}${line.trim()}${colors.reset}`)
                    })
                }
                this.results.failed++
                this.results.errors.push({
                    test: test.name,
                    suite: test.suite,
                    error: error.message,
                    stack: error.stack
                })
            }
        }

        const totalTime = ((performance.now() - startTime) / 1000).toFixed(2)
        this.printSummary(totalTime)
        
        return this.results.failed === 0
    }

    printSummary(totalTime) {
        console.log('\n' + '─'.repeat(50))
        
        const total = this.results.passed + this.results.failed + this.results.skipped
        const passRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0
        
        console.log(`\n${colors.blue}Test Summary:${colors.reset}`)
        console.log(`  Total:   ${total}`)
        console.log(`  ${colors.green}Passed:  ${this.results.passed}${colors.reset}`)
        console.log(`  ${colors.red}Failed:  ${this.results.failed}${colors.reset}`)
        console.log(`  ${colors.gray}Skipped: ${this.results.skipped}${colors.reset}`)
        console.log(`  Pass Rate: ${passRate}%`)
        console.log(`  Time: ${totalTime}s`)

        if (this.results.failed === 0 && this.results.passed > 0) {
            console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`)
        } else if (this.results.failed > 0) {
            console.log(`\n${colors.red}✗ ${this.results.failed} test(s) failed${colors.reset}`)
        }
    }
}

// Assertion helpers
// Simple assert function
global.assert = function(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed')
    }
}

// Extended assert methods
Object.assign(global.assert, {
    equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`)
        }
    },

    notEqual(actual, expected, message) {
        if (actual === expected) {
            throw new Error(message || `Expected not ${expected}, got ${actual}`)
        }
    },

    deepEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Objects not equal:\nExpected: ${JSON.stringify(expected, null, 2)}\nActual: ${JSON.stringify(actual, null, 2)}`)
        }
    },

    ok(value, message) {
        if (!value) {
            throw new Error(message || `Expected truthy value, got ${value}`)
        }
    },

    throws(fn, expectedError, message) {
        let threw = false
        let error = null
        
        try {
            fn()
        } catch (e) {
            threw = true
            error = e
        }

        if (!threw) {
            throw new Error(message || 'Expected function to throw')
        }

        if (expectedError) {
            const matches = expectedError instanceof RegExp 
                ? expectedError.test(error.message)
                : error.message.includes(expectedError)
            
            if (!matches) {
                throw new Error(message || `Expected error matching "${expectedError}", got "${error.message}"`)
            }
        }
    },

    async rejects(fn, expectedError, message) {
        let threw = false
        let error = null
        
        try {
            await fn()
        } catch (e) {
            threw = true
            error = e
        }

        if (!threw) {
            throw new Error(message || 'Expected async function to reject')
        }

        if (expectedError) {
            const matches = expectedError instanceof RegExp 
                ? expectedError.test(error.message)
                : error.message.includes(expectedError)
            
            if (!matches) {
                throw new Error(message || `Expected error matching "${expectedError}", got "${error.message}"`)
            }
        }
    },

    match(actual, pattern, message) {
        if (!pattern.test(actual)) {
            throw new Error(message || `"${actual}" does not match ${pattern}`)
        }
    },

    includes(array, item, message) {
        if (!array.includes(item)) {
            throw new Error(message || `Array does not include ${item}`)
        }
    },

    type(value, expectedType, message) {
        const actualType = typeof value
        if (actualType !== expectedType) {
            throw new Error(message || `Expected type ${expectedType}, got ${actualType}`)
        }
    }
})

// Test runner
async function runTests() {
    const context = new TestContext()
    
    // Make context available globally
    global.suite = context.suite.bind(context)
    global.test = context.test.bind(context)
    global.skip = context.skip.bind(context)
    global.setup = () => {} // Default no-op
    global.teardown = () => {} // Default no-op

    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`)
    console.log(`${colors.blue}         Air Test Suite${colors.reset}`)
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`)

    // Load all test files
    const testDirs = ['unit', 'integration']
    
    for (const dir of testDirs) {
        const testDir = join(__dirname, dir)
        try {
            const files = await fs.readdir(testDir)
            const testFiles = files.filter(f => f.endsWith('.test.js'))
            
            for (const file of testFiles) {
                const testPath = join(testDir, file)
                await import(testPath)
            }
        } catch (e) {
            console.log(`${colors.yellow}Warning: ${dir} tests directory not found or empty${colors.reset}`)
        }
    }

    // Run all tests
    const success = await context.run()
    
    // Immediate cleanup and exit - tests should manage their own cleanup
    process.exit(success ? 0 : 1)
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(error => {
        console.error(`${colors.red}Test runner failed:${colors.reset}`, error)
        process.exit(1)
    })
}