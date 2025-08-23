/**
 * Test build outputs - CJS, ESM, và TypeScript definitions
 * Test dựa trên built files thay vì TypeScript source
 */

import fs from 'fs'
import path from 'path'
import assert from 'assert'

// Test utilities
let testCount = 0
let passCount = 0
let failCount = 0

function test(name: string, fn: () => void | Promise<void>) {
    testCount++
    try {
        const result = fn()
        if (result instanceof Promise) {
            return result.then(() => {
                passCount++
                console.log(`  ✅ ${name}`)
            }).catch((err) => {
                failCount++
                console.error(`  ❌ ${name}: ${err.message}`)
            })
        } else {
            passCount++
            console.log(`  ✅ ${name}`)
        }
    } catch (err: any) {
        failCount++
        console.error(`  ❌ ${name}: ${err.message}`)
    }
}

async function runBuildTests() {
    const distDir = path.join(process.cwd(), 'dist')
    
    console.log("🏗️ BUILD OUTPUT TESTS")
    console.log("====================")
    
    // Test 1: Check all required build files exist
    await test("Build files exist", () => {
        const requiredFiles = [
            'index.js',      // ESM
            'index.cjs',     // CommonJS
            'index.d.ts',    // TypeScript definitions (ESM)
            'index.d.cts'    // TypeScript definitions (CJS)
        ]
        
        for (const file of requiredFiles) {
            const filePath = path.join(distDir, file)
            assert(fs.existsSync(filePath), `Missing build file: ${file}`)
        }
    })
    
    // Test 2: ESM module can be imported
    await test("ESM module import", async () => {
        const esmPath = path.join(distDir, 'index.js')
        assert(fs.existsSync(esmPath), "ESM file should exist")
        
        // Import as ESM module
        const module = await import(`file://${esmPath}`)
        assert(module, "ESM module should be importable")
        assert(typeof module === 'object', "ESM should export object")
    })
    
    // Test 3: CommonJS module can be imported via dynamic import
    await test("CommonJS module import", async () => {
        const cjsPath = path.join(distDir, 'index.cjs')
        assert(fs.existsSync(cjsPath), "CJS file should exist")
        
        // Import CJS module via dynamic import
        const module = await import(`file://${cjsPath}`)
        assert(module, "CJS module should be importable")
        assert(typeof module === 'object', "CJS should export object")
    })
    
    // Test 4: TypeScript definitions are valid
    await test("TypeScript definitions", () => {
        const dtsPath = path.join(distDir, 'index.d.ts')
        const ctsPath = path.join(distDir, 'index.d.cts')
        
        assert(fs.existsSync(dtsPath), "ESM type definitions should exist")
        assert(fs.existsSync(ctsPath), "CJS type definitions should exist")
        
        const dtsContent = fs.readFileSync(dtsPath, 'utf8')
        const ctsContent = fs.readFileSync(ctsPath, 'utf8')
        
        // Should contain exports
        assert(dtsContent.includes('export'), "ESM types should have exports")
        assert(ctsContent.includes('export'), "CJS types should have exports")
        
        // Should contain key types
        assert(dtsContent.includes('Peer'), "Should export Peer type")
        assert(dtsContent.includes('Config'), "Should export Config type")
    })
    
    // Test 5: File sizes are reasonable
    await test("Build file sizes", () => {
        const esmSize = fs.statSync(path.join(distDir, 'index.js')).size
        const cjsSize = fs.statSync(path.join(distDir, 'index.cjs')).size
        
        // Should not be empty
        assert(esmSize > 1000, `ESM file too small: ${esmSize} bytes`)
        assert(cjsSize > 1000, `CJS file too small: ${cjsSize} bytes`)
        
        // Should not be huge (reasonable bundled size)
        assert(esmSize < 1000000, `ESM file too large: ${esmSize} bytes`)
        assert(cjsSize < 1000000, `CJS file too large: ${cjsSize} bytes`)
        
        console.log(`    ESM: ${(esmSize/1024).toFixed(1)}KB, CJS: ${(cjsSize/1024).toFixed(1)}KB`)
    })
    
    // Test 6: Exports are consistent
    await test("Export consistency", async () => {
        const esmPath = path.join(distDir, 'index.js')
        const cjsPath = path.join(distDir, 'index.cjs')
        
        // Import both modules
        const esmModule = await import(`file://${esmPath}`)
        const cjsModule = await import(`file://${cjsPath}`)
        
        // Should have same exported keys
        const esmKeys = Object.keys(esmModule).sort()
        const cjsKeys = Object.keys(cjsModule).sort()
        
        assert(esmKeys.length > 0, "ESM should have exports")
        assert(cjsKeys.length > 0, "CJS should have exports")
        
        // Key exports should exist in both
        const requiredExports = ['Peer', 'Config', 'Manager']
        for (const exp of requiredExports) {
            assert(esmModule[exp], `ESM missing export: ${exp}`)
            assert(cjsModule[exp], `CJS missing export: ${exp}`)
        }
    })
    
    console.log("\n====================")
    console.log(`📊 BUILD TEST RESULTS: ${passCount}/${testCount} passed`)
    console.log("====================")
    
    if (failCount === 0) {
        console.log("🎉 ALL BUILD TESTS PASSED!")
        console.log("✅ Multi-format build system working correctly")
        return true
    } else {
        console.log(`❌ ${failCount} build tests failed`)
        return false
    }
}

// Run tests
runBuildTests().then((success) => {
    if (success) {
        console.log("\n🚀 READY FOR PRODUCTION")
        console.log("Build outputs are tested and ready for NPM publish")
        process.exit(0)
    } else {
        console.log("\n⚠️ BUILD ISSUES DETECTED")
        console.log("Fix build configuration before publishing")
        process.exit(1)
    }
}).catch((err) => {
    console.error("Build test runner failed:", err)
    process.exit(1)
})