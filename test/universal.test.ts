/**
 * Universal test suite - Works with both Bun and Node.js
 * Real tests, no bullshit
 */

// Runtime detection and test framework selection
const runtime = (() => {
    // @ts-ignore
    if (typeof Bun !== "undefined") return "bun"
    // @ts-ignore  
    if (typeof Deno !== "undefined") return "deno"
    return "node"
})()

console.log(`🚀 Running tests on ${runtime.toUpperCase()}`)

// Import test framework based on runtime
let describe: any, test: any, expect: any, afterAll: any

if (runtime === "bun") {
    // Bun native test
    const bunTest = await import("bun:test")
    describe = bunTest.describe
    test = bunTest.test
    expect = bunTest.expect
    afterAll = bunTest.afterAll
} else {
    // Node.js with built-in test runner
    const nodeTest = await import("node:test")
    const assert = await import("node:assert")
    
    describe = nodeTest.describe
    test = nodeTest.test
    afterAll = nodeTest.after
    
    // Simple expect wrapper for Node
    expect = (value: any) => ({
        toBe: (expected: any) => assert.strictEqual(value, expected),
        toBeDefined: () => assert.ok(value !== undefined),
        toBeNull: () => assert.strictEqual(value, null),
        toBeTruthy: () => assert.ok(value),
        toBeFalsy: () => assert.ok(!value),
        toHaveProperty: (prop: string) => assert.ok(prop in value),
        toContain: (item: any) => {
            if (typeof value === "string") {
                assert.ok(value.includes(item))
            } else {
                assert.ok(value.includes(item))
            }
        },
        toHaveLength: (length: number) => assert.strictEqual(value.length, length),
        toBeGreaterThan: (num: number) => assert.ok(value > num),
        toBeLessThan: (num: number) => assert.ok(value < num),
        toBeGreaterThanOrEqual: (num: number) => assert.ok(value >= num),
        toBeLessThanOrEqual: (num: number) => assert.ok(value <= num),
        toBeTypeOf: (type: string) => assert.strictEqual(typeof value, type),
        toBeOneOf: (arr: any[]) => assert.ok(arr.includes(value))
    })
}

import { Peer } from "../src/Peer"
import type { PeerOptions } from "../src/types"
import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

describe("Peer - Universal Tests", () => {
    const testDir = `/tmp/air-test-${Date.now()}`
    
    afterAll(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true })
        }
    })
    
    test("should create Peer instance on any runtime", async () => {
        const peer = new Peer({
            root: testDir,
            skipPidCheck: true
        })
        
        expect(peer).toBeDefined()
        expect(peer.GUN).toBeDefined()
        expect(peer.sea).toBeDefined()
        expect(peer.config).toBeDefined()
        
        console.log(`✓ Peer created successfully on ${runtime}`)
    })
    
    test("should read and write config", async () => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true })
        }
        
        const peer = new Peer({
            root: testDir,
            skipPidCheck: true
        })
        
        const config = peer.read()
        config.name = `test-${runtime}`
        config.env = "production"
        const success = peer.write(config)
        
        expect(success).toBe(true)
        
        const configPath = path.join(testDir, "air.json")
        expect(fs.existsSync(configPath)).toBe(true)
        
        const fileContent = fs.readFileSync(configPath, "utf8")
        const savedConfig = JSON.parse(fileContent)
        expect(savedConfig.name).toBe(`test-${runtime}`)
        expect(savedConfig.env).toBe("production")
        
        console.log(`✓ Config I/O works on ${runtime}`)
    })
    
    test("should validate IP addresses", async () => {
        const peer = new Peer({ skipPidCheck: true })
        
        // Public IPs
        expect(peer.ip.validate("8.8.8.8")).toBe(true)
        expect(peer.ip.validate("1.1.1.1")).toBe(true)
        
        // Private IPs
        expect(peer.ip.validate("192.168.1.1")).toBe(false)
        expect(peer.ip.validate("10.0.0.1")).toBe(false)
        expect(peer.ip.validate("127.0.0.1")).toBe(false)
        
        // Invalid
        expect(peer.ip.validate("999.999.999.999")).toBe(false)
        expect(peer.ip.validate("not.an.ip")).toBe(false)
        
        console.log(`✓ IP validation works on ${runtime}`)
    })
})

describe("Performance Comparison", () => {
    test(`${runtime} performance benchmark`, async () => {
        const iterations = 1000000
        const start = performance.now()
        
        let sum = 0
        for (let i = 0; i < iterations; i++) {
            sum += Math.sqrt(i)
        }
        
        const duration = performance.now() - start
        const opsPerSec = (iterations / duration * 1000).toFixed(0)
        
        console.log(`
╔════════════════════════════════════╗
║ ${runtime.toUpperCase()} Performance Results       ║
╠════════════════════════════════════╣
║ Iterations: ${iterations.toLocaleString().padEnd(23)}║
║ Duration:   ${duration.toFixed(2).padEnd(20)}ms ║
║ Speed:      ${opsPerSec.padEnd(16)} ops/s ║
╚════════════════════════════════════╝
        `)
        
        // Different expectations based on runtime
        if (runtime === "bun") {
            expect(duration).toBeLessThan(100) // Bun should be FAST
        } else {
            expect(duration).toBeLessThan(500) // Node is slower
        }
    })
})

describe("Network Operations", () => {
    test("should detect public IP", async () => {
        const { default: network } = await import("../src/network")
        
        console.log("Detecting public IP...")
        const ips = await network.get()
        
        expect(ips).toBeDefined()
        expect(ips.primary).toBeDefined()
        
        console.log(`✓ Public IP detected: ${ips.primary}`)
        console.log(`  IPv4: ${ips.ipv4 || "N/A"}`)
        console.log(`  IPv6: ${ips.ipv6 || "N/A"}`)
        console.log(`  Has IPv6: ${ips.hasIPv6}`)
    })
})

describe("System Integration", () => {
    test("should execute shell commands", async () => {
        const { stdout: uname } = await execAsync("uname -a")
        expect(uname).toBeTruthy()
        
        console.log(`✓ System: ${uname.trim().substring(0, 50)}...`)
    })
})

// Export for use with different test runners
export { describe, test, expect }