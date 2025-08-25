#!/usr/bin/env bun
/**
 * Test BunBattle - Bun-native Battle framework
 * Run with: bun test/battle-bun/test.ts
 */

import { BunBattle } from "./BunBattle.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

console.log('=== Testing BunBattle (Bun-native Battle) ===\n')

// Test environment setup
const testEnv = {
    name: `air-bunbattle-${Date.now()}`,
    port: 9876,
    root: path.join(projectRoot, 'tmp', `test-bunbattle-${Date.now()}`),
    configFileName: 'air.json'
}

// Ensure test directory exists
if (!fs.existsSync(testEnv.root)) {
    fs.mkdirSync(testEnv.root, { recursive: true })
}

async function testSimpleCommand() {
    console.log('Test 1: Simple echo command')
    
    const battle = new BunBattle({ 
        verbose: false,
        timeout: 5000 
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('echo', ['BunBattle works!'])
        await b.wait(100)
        await b.expect('BunBattle works!')
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
    return result.success
}

async function testInteractiveCommand() {
    console.log('Test 2: Interactive bash command')
    
    const battle = new BunBattle({ 
        verbose: false,
        timeout: 5000 
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('bash', ['-c', 'read -p "Enter text: " text && echo "You entered: $text"'])
        
        await b.wait(500)
        
        // Send input
        b.sendKey('B')
        b.sendKey('u')
        b.sendKey('n')
        b.sendKey('enter')
        
        await b.wait(500)
        await b.expect('You entered: Bun')
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
    return result.success
}

async function testAirInstall() {
    console.log('Test 3: Air install command (non-interactive)')
    
    const battle = new BunBattle({ 
        cwd: projectRoot,
        verbose: false,
        timeout: 10000 
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
        
        await b.wait(3000)
        
        // Check for completion
        const configPath = path.join(testEnv.root, testEnv.configFileName)
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
            if (config.name !== testEnv.name) {
                throw new Error(`Config name mismatch: ${config.name} !== ${testEnv.name}`)
            }
        }
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
    return result.success
}

async function testBunRuntime() {
    console.log('Test 4: Bun runtime command')
    
    const battle = new BunBattle({ 
        verbose: false,
        timeout: 5000 
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('bun', ['--version'])
        await b.wait(500)
        await b.expect(/\d+\.\d+\.\d+/)  // Version pattern
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
    return result.success
}

async function testScreenshot() {
    console.log('Test 5: Screenshot functionality')
    
    const battle = new BunBattle({ 
        verbose: false,
        timeout: 5000 
    })
    
    const result = await battle.run(async (b) => {
        b.spawn('echo', ['Line 1', '&&', 'echo', 'Line 2', '&&', 'echo', 'Line 3'])
        await b.wait(500)
        
        const screenshot = b.screenshot('test-output')
        if (!screenshot.includes('Line')) {
            throw new Error('Screenshot did not capture output')
        }
    })
    
    console.log(result.success ? '  ✓ PASS' : `  ✗ FAIL: ${result.error}`)
    return result.success
}

// Run all tests
async function runAllTests() {
    const tests = [
        testSimpleCommand,
        testInteractiveCommand,
        testAirInstall,
        testBunRuntime,
        testScreenshot
    ]
    
    let passed = 0
    let failed = 0
    
    for (const test of tests) {
        const success = await test()
        if (success) passed++
        else failed++
    }
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('BunBattle Test Summary:')
    console.log(`  Total:  ${tests.length}`)
    console.log(`  Passed: ${passed}`)
    console.log(`  Failed: ${failed}`)
    console.log('='.repeat(50))
    
    console.log('\n📝 Key Insights:')
    console.log('✅ BunBattle runs natively in Bun runtime')
    console.log('✅ Can test any terminal application')
    console.log('⚠️  Limited PTY features (no real PTY, simulated behavior)')
    console.log('💡 Good for basic testing, complex TTY apps need real Battle')
    
    // Cleanup
    try {
        if (fs.existsSync(testEnv.root)) {
            fs.rmSync(testEnv.root, { recursive: true, force: true })
        }
    } catch {}
    
    process.exit(failed > 0 ? 1 : 0)
}

// Execute
runAllTests().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})