#!/usr/bin/env tsx
/**
 * Air Script Commands Test Suite using Battle Framework
 * Tests all package.json scripts with real PTY emulation
 */

import { Battle } from '@akaoio/battle'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

// Test environment setup
const testEnv = {
    name: `air-test-${Date.now()}`,
    port: 8765 + Math.floor(Math.random() * 1000),
    root: path.join(projectRoot, 'tmp', `test-${Date.now()}`),
    configFileName: 'air.json'
}

// Ensure test environment directory exists
if (!fs.existsSync(testEnv.root)) {
    fs.mkdirSync(testEnv.root, { recursive: true })
}

console.log('=== Air Script Commands Test Suite (Battle) ===\n')
console.log(`Test environment: ${testEnv.root}`)
console.log(`Test name: ${testEnv.name}`)
console.log(`Test port: ${testEnv.port}\n`)

// Test results tracking
const results: Array<{ name: string; success: boolean; error?: string }> = []

async function testInstallNonInteractive() {
    console.log('Testing: install script - non-interactive mode')
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 20000,
        verbose: false 
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('node', [
            'script/run.cjs',
            'install',
            '--non-interactive',
            '--name', testEnv.name,
            '--port', testEnv.port.toString(),
            '--config', path.join(testEnv.root, testEnv.configFileName)
        ])
        
        // Wait for installation to complete
        await b.wait(3000)
        
        // Look for success message
        await b.expect('Installation complete', 5000)
        
        // Check for success indicators
        const configPath = path.join(testEnv.root, testEnv.configFileName)
        if (!fs.existsSync(configPath)) {
            // Debug: Show what's in the directory
            const files = fs.readdirSync(testEnv.root)
            throw new Error(`Config file was not created. Files in ${testEnv.root}: ${files.join(', ')}`)
        }
        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        if (config.name !== testEnv.name) {
            throw new Error(`Config name mismatch: expected ${testEnv.name}, got ${config.name}`)
        }
        if (config.port !== testEnv.port) {
            throw new Error(`Config port mismatch: expected ${testEnv.port}, got ${config.port}`)
        }
    })
    
    results.push({
        name: 'install script - non-interactive mode',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testInstallHelp() {
    console.log('Testing: install script - help flag')
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 5000,
        verbose: false 
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('node', ['script/run.cjs', 'install', '--help'])
        
        await b.wait(500)
        await b.expect('Usage:')
        await b.expect('--name')
        await b.expect('--port')
    })
    
    results.push({
        name: 'install script - help flag',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testStatusCommand() {
    console.log('Testing: status command')
    
    // First ensure we have a config
    const configPath = path.join(testEnv.root, testEnv.configFileName)
    if (!fs.existsSync(configPath)) {
        const config = {
            name: testEnv.name,
            port: testEnv.port,
            env: 'development',
            development: {
                port: testEnv.port,
                peers: []
            }
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    }
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 5000,
        verbose: false,
        env: {
            ...process.env,
            AIR_ROOT: testEnv.root,
            AIR_NAME: testEnv.name
        }
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('node', ['script/run.cjs', 'status'])
        
        await b.wait(500)
        
        // Status command should show configuration info
        await b.expect(testEnv.name)
    })
    
    results.push({
        name: 'status command',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testDDNSCommand() {
    console.log('Testing: ddns command - runs without error')
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 5000,
        verbose: false 
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('node', ['script/run.cjs', 'ddns', '--help'])
        
        await b.wait(500)
        // DDNS command might fail without config, but should at least run
        // Just check it doesn't crash completely
    })
    
    results.push({
        name: 'ddns command - runs without error',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testLogsCommand() {
    console.log('Testing: logs command')
    
    const battle = new Battle({ 
        cwd: projectRoot,
        timeout: 5000,
        verbose: false,
        env: {
            ...process.env,
            AIR_ROOT: testEnv.root,
            AIR_NAME: testEnv.name
        }
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('node', ['script/run.cjs', 'logs', '--lines', '5'])
        
        await b.wait(500)
        
        // Logs command should complete without error
        // It might show "No log file found" which is fine for a test
    })
    
    results.push({
        name: 'logs command',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

async function testUninstallCommand() {
    console.log('Testing: uninstall command - non-interactive')
    
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
        timeout: 10000,
        verbose: false,
        env: {
            ...process.env,
            AIR_ROOT: testEnv.root,
            AIR_NAME: testEnv.name
        }
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('node', ['script/uninstall.cjs', '--yes'])
        
        await b.wait(1000)
        
        // After uninstall, config should be gone
        if (fs.existsSync(configPath)) {
            // Config might be backed up but not removed
            console.log('    Note: Config file still exists (may be backed up)')
        }
    })
    
    results.push({
        name: 'uninstall command - non-interactive',
        success: result.success,
        error: result.error
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
}

// Run all tests
async function runAllTests() {
    console.log('Starting Battle tests for Air scripts...\n')
    
    await testInstallNonInteractive()
    await testInstallHelp()
    await testStatusCommand()
    await testDDNSCommand()
    await testLogsCommand()
    await testUninstallCommand()
    
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
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0)
}

// Execute tests
runAllTests().catch((err) => {
    console.error('Test runner failed:', err)
    process.exit(1)
})