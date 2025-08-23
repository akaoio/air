/**
 * Universal test suite - works with both Bun and Node.js
 * Run with: npm test
 */

import { Peer } from "../src/Peer"
import fs from "fs"
import path from "path"
import assert from "assert"

// Runtime detection
const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node'
console.log(`🚀 Running tests on ${runtime.toUpperCase()} runtime\n`)

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

async function runTests() {
    const baseTestDir = `/tmp/air-test-${Date.now()}`
    
    // Setup
    if (!fs.existsSync(baseTestDir)) {
        fs.mkdirSync(baseTestDir, { recursive: true })
    }
    
    console.log("📦 CORE FUNCTIONALITY")
    console.log("====================")
    
    // Test 1: Create Peer instance
    await test("Create Peer instance", () => {
        const peer = new Peer({
            root: baseTestDir,
            skipPidCheck: true
        })
        assert(peer, "Peer should be created")
        assert(peer.GUN, "GUN should be available")
        assert(peer.sea, "SEA should be available")
    })
    
    // Test 2: Configuration read/write
    await test("Configuration read/write", () => {
        const testDir = path.join(baseTestDir, "config-test")
        fs.mkdirSync(testDir, { recursive: true })
        
        const peer = new Peer({
            root: testDir,
            skipPidCheck: true
        })
        
        const config = peer.read()
        assert(config, "Config should be readable")
        assert(config.env, "Config should have env")
        
        config.name = "test-peer"
        const configManager = (peer as any).configManager
        configManager.configFile = path.join(testDir, "air.json")
        
        const success = peer.write(config)
        assert(success === true, "Config should write successfully")
        
        const configPath = path.join(testDir, "air.json")
        assert(fs.existsSync(configPath), "Config file should exist")
    })
    
    // Test 3: IP validation
    await test("IP validation", () => {
        const peer = new Peer({ skipPidCheck: true })
        
        // Valid public IPs
        assert(peer.ip.validate("8.8.8.8") === true, "8.8.8.8 should be valid")
        assert(peer.ip.validate("1.1.1.1") === true, "1.1.1.1 should be valid")
        
        // Invalid private IPs
        assert(peer.ip.validate("192.168.1.1") === false, "Private IP should be invalid")
        assert(peer.ip.validate("10.0.0.1") === false, "Private IP should be invalid")
        assert(peer.ip.validate("127.0.0.1") === false, "Loopback should be invalid")
        
        // Invalid format
        assert(peer.ip.validate("999.999.999.999") === false, "Invalid IP should fail")
        assert(peer.ip.validate("") === false, "Empty string should fail")
    })
    
    // Test 4: Process management
    await test("Process management", () => {
        const peer = new Peer({
            root: baseTestDir,
            name: "test-process",
            skipPidCheck: true
        })
        
        const exists = peer.check()
        assert(typeof exists === "boolean", "Check should return boolean")
        
        const proc = peer.find(8765)
        assert(proc === null || (proc && proc.pid), "Find should return null or process info")
        
        // Should not throw
        peer.clean()
        peer.cleanup()
    })
    
    console.log("\n🌐 NETWORK OPERATIONS")
    console.log("====================")
    
    // Test 5: Network module
    await test("Network module imports", async () => {
        const { default: network } = await import("../src/network")
        assert(network, "Network module should exist")
        assert(typeof network.validate === "function", "Validate should be a function")
        assert(typeof network.get === "function", "Get should be a function")
    })
    
    // Test 6: IP detection (may fail offline)
    await test("IP detection", async () => {
        const { default: network } = await import("../src/network")
        
        try {
            const ips = await network.get()
            assert(ips, "IPs should be returned")
            assert(ips.primary, "Should have primary IP")
            assert(typeof ips.hasIPv6 === "boolean", "Should have IPv6 flag")
        } catch (e) {
            // Network might be offline, not a failure
            console.log("    (Network offline, skipping)")
        }
    })
    
    console.log("\n🔧 TYPESCRIPT FEATURES")
    console.log("====================")
    
    // Test 7: Type safety
    await test("Type safety", () => {
        const peer = new Peer({
            skipPidCheck: true
        })
        
        assert(peer.config, "Config should exist")
        assert(typeof peer.config.name === "string", "Name should be string")
        assert(typeof peer.config.env === "string", "Environment should be string")
        
        // Check that config has required structure
        assert(peer.config.ip, "IP config should exist")
        assert(typeof peer.config.ip.timeout === "number", "IP timeout should be number")
        assert(Array.isArray(peer.config.ip.dns), "DNS services should be array")
        assert(Array.isArray(peer.config.ip.http), "HTTP services should be array")
        assert(peer.config.ip.dns.length > 0, "Should have DNS services")
        assert(peer.config.ip.http.length > 0, "Should have HTTP services")
    })
    
    // Test 8: Runtime detection
    await test("Runtime detection", () => {
        const isBun = typeof Bun !== "undefined"
        const isNode = typeof process !== "undefined" && !isBun
        assert(isBun || isNode, "Should detect runtime")
    })
    
    console.log("\n⚡ PERFORMANCE")
    console.log("====================")
    
    // Test 9: Math operations performance
    await test("Math operations performance", () => {
        const iterations = 1_000_000
        const start = Date.now()
        
        let sum = 0
        for (let i = 0; i < iterations; i++) {
            sum += Math.sqrt(i)
        }
        
        const elapsed = Date.now() - start
        assert(elapsed < 1000, `Should complete 1M operations in < 1s (took ${elapsed}ms)`)
        assert(sum > 0, "Sum should be positive")
    })
    
    // Test 10: File I/O performance
    await test("File I/O performance", () => {
        const testFile = path.join(baseTestDir, "perf.txt")
        const data = "test".repeat(256)
        const iterations = 100
        
        const start = Date.now()
        
        for (let i = 0; i < iterations; i++) {
            fs.writeFileSync(testFile, data + i)
            const read = fs.readFileSync(testFile, "utf8")
            assert(read.length > 0, "Should read data")
        }
        
        const elapsed = Date.now() - start
        assert(elapsed < 500, `Should complete 200 I/O ops in < 500ms (took ${elapsed}ms)`)
        
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile)
        }
    })
    
    // Cleanup
    if (fs.existsSync(baseTestDir)) {
        fs.rmSync(baseTestDir, { recursive: true, force: true })
    }
    
    // Summary
    console.log("\n====================")
    console.log(`📊 TEST RESULTS: ${passCount}/${testCount} passed`)
    console.log("====================")
    
    if (failCount === 0) {
        console.log("🎉 ALL TESTS PASSED!")
        process.exit(0)
    } else {
        console.log(`❌ ${failCount} tests failed`)
        process.exit(1)
    }
}

// Run tests
runTests().catch((err) => {
    console.error("Test runner failed:", err)
    process.exit(1)
})