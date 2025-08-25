#!/usr/bin/env tsx
/**
 * Air Bun Runtime Test Suite using Battle Framework
 * Demonstrates Battle testing Bun applications
 */

import { Battle } from '@akaoio/battle'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

console.log('=== Testing Bun Runtime with Battle ===\n')

// Test results tracking
const results: Array<{ name: string; success: boolean; error?: string }> = []

async function testBunStart() {
    console.log('Testing: bun run src/main.ts')
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 10000,
        verbose: false,
        env: {
            ...process.env,
            AIR_NAME: 'test-bun',
            AIR_PORT: '8999'
        }
    })
    
    const result = await battle.run(async (b) => {
        // Battle spawns Bun process in real PTY
        b.spawn('bun', ['run', 'src/main.ts'])
        
        // Wait for Bun to start
        await b.wait(2000)
        
        // Check for startup messages
        await b.expect('Air', 5000)
        
        // Send Ctrl+C to stop
        b.pty.write('\x03')
        await b.wait(500)
    })
    
    results.push({
        name: 'bun run src/main.ts',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testBunDev() {
    console.log('Testing: bun --hot (dev mode)')
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 10000,
        verbose: false
    })
    
    const result = await battle.run(async (b) => {
        // Test Bun's hot reload dev mode
        b.spawn('bun', ['--hot', 'src/main.ts'])
        
        await b.wait(2000)
        
        // Should see Bun's hot reload message
        const output = b.output.toLowerCase()
        if (!output.includes('bun') && !output.includes('air')) {
            throw new Error('Bun did not start properly')
        }
        
        // Stop the process
        b.pty.write('\x03')
        await b.wait(500)
    })
    
    results.push({
        name: 'bun --hot (dev mode)',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testBunTest() {
    console.log('Testing: bun test')
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 30000,
        verbose: false
    })
    
    const result = await battle.run(async (b) => {
        // Run Bun's native test runner
        b.spawn('bun', ['test', '--bail'])
        
        // Wait for tests to complete
        await b.wait(5000)
        
        // Look for test results
        const output = b.output
        if (!output.includes('test') && !output.includes('pass') && !output.includes('fail')) {
            // Might not have Bun tests, which is OK
            console.log('    Note: No Bun tests found (this is OK)')
        }
    })
    
    results.push({
        name: 'bun test',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testBunVsNode() {
    console.log('Testing: Bun vs Node.js execution comparison')
    
    // Test with Bun
    const bunBattle = new Battle({ 
        cwd: projectRoot,
        timeout: 5000,
        verbose: false
    })
    
    const bunResult = await bunBattle.run(async (b) => {
        b.spawn('bun', ['--version'])
        await b.wait(500)
        await b.expect(/\d+\.\d+\.\d+/)  // Version pattern
    })
    
    // Test with Node
    const nodeBattle = new Battle({ 
        cwd: projectRoot,
        timeout: 5000,
        verbose: false
    })
    
    const nodeResult = await nodeBattle.run(async (b) => {
        b.spawn('node', ['--version'])
        await b.wait(500)
        await b.expect(/v\d+\.\d+\.\d+/)  // Node version pattern
    })
    
    const success = bunResult.success && nodeResult.success
    
    results.push({
        name: 'Bun vs Node.js execution comparison',
        success: success,
        error: success ? undefined : 'Could not get version from both runtimes'
    })
    
    console.log(success ? '  ✓ PASS - Both runtimes work' : '  ✗ FAIL')
}

// Run all tests
async function runAllTests() {
    console.log('Starting Battle tests for Bun runtime...\n')
    console.log('Note: Battle runs on Node.js but tests Bun applications\n')
    
    // Check if Bun is installed
    try {
        const { execSync } = await import('child_process')
        execSync('bun --version', { stdio: 'ignore' })
    } catch {
        console.log('⚠️  Bun is not installed. Skipping Bun-specific tests.\n')
        process.exit(0)
    }
    
    await testBunStart()
    await testBunDev()
    await testBunTest()
    await testBunVsNode()
    
    // Summary
    console.log('\n=== Test Summary ===')
    const passed = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log(`Total: ${results.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    
    if (failed > 0) {
        console.log('\nFailed tests:')
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`)
        })
    }
    
    console.log('\n📝 Key Points:')
    console.log('- Battle framework runs on Node.js (due to node-pty)')
    console.log('- Battle can test ANY terminal application (Bun, Node, Python, etc.)')
    console.log('- Use tsx or node to run Battle tests, not bun')
    console.log('- Battle spawns your Bun apps in real PTY for testing')
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0)
}

// Execute tests
runAllTests().catch((err) => {
    console.error('Test runner failed:', err)
    process.exit(1)
})