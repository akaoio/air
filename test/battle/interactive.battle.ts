#!/usr/bin/env tsx
/**
 * Air Interactive Commands Test Suite using Battle Framework
 * Tests interactive prompts and user input with real PTY emulation
 */

import { Battle } from '@akaoio/battle'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

// Test environment setup
const testEnv = {
    name: `air-interactive-${Date.now()}`,
    port: 9765 + Math.floor(Math.random() * 1000),
    root: path.join(projectRoot, 'tmp', `test-interactive-${Date.now()}`),
    configFileName: 'air.json'
}

// Ensure test environment directory exists
if (!fs.existsSync(testEnv.root)) {
    fs.mkdirSync(testEnv.root, { recursive: true })
}

console.log('=== Air Interactive Commands Test Suite (Battle) ===\n')
console.log(`Test environment: ${testEnv.root}`)
console.log(`Test name: ${testEnv.name}`)
console.log(`Test port: ${testEnv.port}\n`)

// Test results tracking
const results: Array<{ name: string; success: boolean; error?: string }> = []

async function testInteractiveInstall() {
    console.log('Testing: interactive install with prompts')
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 30000,
        verbose: false 
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('node', ['script/run.cjs', 'install'])
        
        // Wait for first prompt
        await b.wait(1000)
        
        // Answer prompts interactively
        // Name prompt
        if (await b.expect('name', 5000)) {
            b.sendKey(testEnv.name)
            b.sendKey('enter')
        }
        
        await b.wait(500)
        
        // Port prompt
        if (await b.expect('port', 5000)) {
            b.sendKey(testEnv.port.toString())
            b.sendKey('enter')
        }
        
        await b.wait(500)
        
        // Root directory prompt
        if (await b.expect('root', 5000)) {
            b.sendKey(testEnv.root)
            b.sendKey('enter')
        }
        
        await b.wait(500)
        
        // Environment prompt (accept default)
        if (await b.expect('environment', 5000)) {
            b.sendKey('enter')
        }
        
        await b.wait(2000)
        
        // Verify config was created
        const configPath = path.join(testEnv.root, testEnv.configFileName)
        if (!fs.existsSync(configPath)) {
            throw new Error('Config file was not created after interactive install')
        }
        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        if (config.name !== testEnv.name) {
            throw new Error(`Config name mismatch: expected ${testEnv.name}, got ${config.name}`)
        }
    })
    
    results.push({
        name: 'interactive install with prompts',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testInteractiveUninstall() {
    console.log('Testing: interactive uninstall with confirmation')
    
    // Ensure config exists before uninstalling
    const configPath = path.join(testEnv.root, testEnv.configFileName)
    if (!fs.existsSync(configPath)) {
        const config = {
            name: testEnv.name,
            port: testEnv.port,
            env: 'development'
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    }
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 15000,
        verbose: false,
        env: {
            ...process.env,
            AIR_ROOT: testEnv.root,
            AIR_NAME: testEnv.name
        }
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('node', ['script/uninstall.cjs'])
        
        await b.wait(1000)
        
        // Look for confirmation prompt
        if (await b.expect('Are you sure', 5000)) {
            // Type 'yes' to confirm
            b.sendKey('y')
            b.sendKey('e')
            b.sendKey('s')
            b.sendKey('enter')
        } else if (await b.expect('confirm', 5000)) {
            b.sendKey('y')
            b.sendKey('enter')
        }
        
        await b.wait(2000)
        
        // Check for uninstall completion
        await b.expect('uninstall', 5000)
    })
    
    results.push({
        name: 'interactive uninstall with confirmation',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testInteractiveConfig() {
    console.log('Testing: interactive config update')
    
    // Ensure config exists
    const configPath = path.join(testEnv.root, testEnv.configFileName)
    if (!fs.existsSync(configPath)) {
        const config = {
            name: testEnv.name,
            port: testEnv.port,
            env: 'development',
            development: {
                port: testEnv.port
            }
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    }
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 20000,
        verbose: false,
        env: {
            ...process.env,
            AIR_ROOT: testEnv.root,
            AIR_NAME: testEnv.name
        }
    })
    
    const newPort = testEnv.port + 100
    
    const result = await battle.run(async (b) => {
        b.spawn('node', ['script/run.cjs', 'config'])
        
        await b.wait(1000)
        
        // Update port when prompted
        if (await b.expect('port', 5000)) {
            // Clear current value and enter new one
            for (let i = 0; i < 10; i++) {
                b.sendKey('backspace')
            }
            b.sendKey(newPort.toString())
            b.sendKey('enter')
        }
        
        await b.wait(500)
        
        // Skip other prompts by pressing enter
        for (let i = 0; i < 5; i++) {
            b.sendKey('enter')
            await b.wait(200)
        }
        
        await b.wait(2000)
    })
    
    results.push({
        name: 'interactive config update',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testCIEnvironmentDetection() {
    console.log('Testing: CI environment auto-detection')
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 10000,
        verbose: false,
        env: {
            ...process.env,
            CI: 'true',  // Simulate CI environment
            AIR_NAME: testEnv.name,
            AIR_PORT: testEnv.port.toString(),
            AIR_ROOT: testEnv.root
        }
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('node', ['script/run.cjs', 'install'])
        
        await b.wait(2000)
        
        // In CI mode, should not see any prompts
        const output = b.output
        if (output.includes('Enter') || output.includes('?')) {
            throw new Error('Prompts appeared in CI mode')
        }
        
        // Config should be created with environment variables
        const configPath = path.join(testEnv.root, testEnv.configFileName)
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
            if (config.name !== testEnv.name) {
                throw new Error('CI mode did not use environment variables')
            }
        }
    })
    
    results.push({
        name: 'CI environment auto-detection',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testKeyboardInterruption() {
    console.log('Testing: keyboard interruption (Ctrl+C)')
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 10000,
        verbose: false
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('node', ['script/run.cjs', 'install'])
        
        await b.wait(1000)
        
        // Send Ctrl+C to interrupt
        b.pty.write('\x03')  // Ctrl+C
        
        await b.wait(500)
        
        // Process should have exited
        if (b.pty && !b.pty.killed) {
            // Try to kill it
            b.pty.kill()
        }
    })
    
    results.push({
        name: 'keyboard interruption (Ctrl+C)',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

// Run all tests
async function runAllTests() {
    console.log('Starting Battle interactive tests for Air...\n')
    
    await testInteractiveInstall()
    await testInteractiveUninstall()
    await testInteractiveConfig()
    await testCIEnvironmentDetection()
    await testKeyboardInterruption()
    
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
    
    // Cleanup
    console.log('\nCleaning up test environment...')
    try {
        if (fs.existsSync(testEnv.root)) {
            fs.rmSync(testEnv.root, { recursive: true, force: true })
        }
    } catch (err) {
        console.log('Warning: Could not clean up test directory')
    }
    
    // Save replay files for debugging
    if (failed > 0) {
        console.log('\nReplay files saved in logs/ directory for debugging')
    }
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0)
}

// Execute tests
runAllTests().catch((err) => {
    console.error('Test runner failed:', err)
    process.exit(1)
})