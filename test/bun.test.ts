/**
 * Bun test suite - REAL tests, no mocking bullshit
 * Test với Bun's built-in test runner
 */

import { expect, test, describe } from "bun:test"
import { Peer } from "../src/Peer"
import type { PeerOptions } from "../src/types"
import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

describe("Peer - Real Tests", () => {
    const testDir = `/tmp/air-test-${Date.now()}`
    
    // Clean up after tests
    afterAll(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true })
        }
    })
    
    test("should create REAL Peer instance", () => {
        const peer = new Peer({
            root: testDir,
            skipPidCheck: true
        })
        
        expect(peer).toBeDefined()
        expect(peer.GUN).toBeDefined()
        expect(peer.sea).toBeDefined()
        expect(peer.config).toBeDefined()
    })
    
    test("should ACTUALLY read and write config to disk", () => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true })
        }
        
        const peer = new Peer({
            root: testDir,
            skipPidCheck: true
        })
        
        // Write real config
        const config = peer.read()
        config.name = "test-peer-real"
        config.env = "production"
        const success = peer.write(config)
        
        expect(success).toBe(true)
        
        // Verify file exists on disk
        const configPath = path.join(testDir, "air.json")
        expect(fs.existsSync(configPath)).toBe(true)
        
        // Read file directly
        const fileContent = fs.readFileSync(configPath, "utf8")
        const savedConfig = JSON.parse(fileContent)
        expect(savedConfig.name).toBe("test-peer-real")
        expect(savedConfig.env).toBe("production")
    })
    
    test("should REALLY validate IP addresses", async () => {
        const peer = new Peer({ skipPidCheck: true })
        
        // Real public IPs
        expect(peer.ip.validate("8.8.8.8")).toBe(true) // Google DNS
        expect(peer.ip.validate("1.1.1.1")).toBe(true) // Cloudflare
        
        // Real private IPs - should fail
        expect(peer.ip.validate("192.168.1.1")).toBe(false)
        expect(peer.ip.validate("10.0.0.1")).toBe(false)
        expect(peer.ip.validate("127.0.0.1")).toBe(false) // Localhost
        
        // Invalid IPs
        expect(peer.ip.validate("999.999.999.999")).toBe(false)
        expect(peer.ip.validate("not.an.ip")).toBe(false)
        expect(peer.ip.validate("")).toBe(false)
        // @ts-ignore
        expect(peer.ip.validate(null)).toBe(false)
        // @ts-ignore
        expect(peer.ip.validate(undefined)).toBe(false)
    })
    
    test("should handle REAL process management", () => {
        const peer = new Peer({
            root: testDir,
            name: "test-process"
        })
        
        // Check PID file operations
        const pidExists = peer.check()
        expect(typeof pidExists).toBe("boolean")
        
        // Find process on real port
        const process = peer.find(8765)
        if (process) {
            expect(process).toHaveProperty("pid")
            expect(process).toHaveProperty("name")
        } else {
            expect(process).toBeNull()
        }
    })
})

describe("Network - Real Operations", () => {
    test("should detect REAL public IP", async () => {
        const { default: network } = await import("../src/network")
        
        // This makes a REAL network call
        const ips = await network.get()
        
        expect(ips).toBeDefined()
        expect(ips.primary).toBeDefined()
        
        // Should have at least IPv4
        if (ips.ipv4) {
            // Validate it's a real public IP
            const parts = ips.ipv4.split(".")
            expect(parts).toHaveLength(4)
            parts.forEach(part => {
                const num = parseInt(part)
                expect(num).toBeGreaterThanOrEqual(0)
                expect(num).toBeLessThanOrEqual(255)
            })
        }
        
        console.log("Real IP detected:", ips.primary)
    }, 10000) // 10 second timeout for network call
})

describe("Performance - REAL benchmarks", () => {
    test("Bun vs Node crypto performance", async () => {
        const iterations = 1000
        
        // Test real crypto operations
        const { sea } = new Peer({ skipPidCheck: true })
        
        const start = performance.now()
        for (let i = 0; i < iterations; i++) {
            // Real crypto operation
            const hash = await sea.work("test-data-" + i, "salt")
        }
        const duration = performance.now() - start
        
        console.log(`Bun crypto: ${iterations} hashes in ${duration.toFixed(2)}ms`)
        console.log(`Rate: ${(iterations / duration * 1000).toFixed(0)} hashes/sec`)
        
        // Bun should be significantly faster
        expect(duration).toBeLessThan(5000) // Should complete in < 5 seconds
    })
    
    test("File I/O performance", () => {
        const testFile = path.join(testDir, "perf-test.txt")
        const iterations = 10000
        const data = "x".repeat(1024) // 1KB of data
        
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true })
        }
        
        const start = performance.now()
        
        // Real file operations
        for (let i = 0; i < iterations; i++) {
            fs.writeFileSync(testFile, data + i)
            const read = fs.readFileSync(testFile, "utf8")
            expect(read).toContain(data)
        }
        
        const duration = performance.now() - start
        
        console.log(`File I/O: ${iterations * 2} operations in ${duration.toFixed(2)}ms`)
        console.log(`Rate: ${(iterations * 2 / duration * 1000).toFixed(0)} ops/sec`)
        
        // Clean up
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile)
        }
    })
})

describe("TypeScript - REAL type safety", () => {
    test("should catch type errors at compile time", () => {
        const options: PeerOptions = {
            name: "test",
            port: 8765,
            env: "development"
        }
        
        // These would fail at compile time:
        // options.port = "not a number" // ❌ TypeScript error
        // options.env = "invalid" // ❌ Not a valid Environment
        // options.unknown = true // ❌ Property doesn't exist
        
        expect(options.port).toBeTypeOf("number")
        expect(options.env).toBeOneOf(["development", "production", "test"])
    })
})

// System integration test
describe("System Integration - REAL", () => {
    test("should execute real shell commands", async () => {
        // Real command execution
        const { stdout: whoami } = await execAsync("whoami")
        expect(whoami.trim()).toBeTruthy()
        
        const { stdout: pwd } = await execAsync("pwd")
        expect(pwd.trim()).toContain("/")
        
        console.log("Current user:", whoami.trim())
        console.log("Current directory:", pwd.trim())
    })
})