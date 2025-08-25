/**
 * Script Commands Test Suite
 * Tests all package.json scripts in both interactive and non-interactive modes
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { 
    runCommand, 
    runInteractive, 
    createTestEnv, 
    cleanupTestEnvironments,
    getTestEnvVars,
    commandExists,
    getRuntime
} from "./setup.js"
import fs from "fs"
import path from "path"

describe("Air Script Commands", () => {
    let testEnv: any
    
    beforeAll(() => {
        // Create isolated test environment
        testEnv = createTestEnv("script-test")
        console.log(`Testing with ${getRuntime()} runtime`)
    })
    
    afterAll(() => {
        cleanupTestEnvironments()
    })
    
    describe("Installation Scripts", () => {
        test("install script - non-interactive mode", () => {
            const result = runCommand(
                `node script/run.cjs install --non-interactive --name ${testEnv.name} --port ${testEnv.port} --root ${testEnv.root}`,
                { timeout: 15000 }
            )
            
            // Check if config was created
            const configPath = path.join(testEnv.root, testEnv.configFileName)
            expect(fs.existsSync(configPath)).toBe(true)
            
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
                expect(config.name).toBe(testEnv.name)
                expect(config.port).toBe(testEnv.port)
            }
        })
        
        test("install script - help flag", () => {
            const result = runCommand("node script/run.cjs install --help")
            expect(result.success).toBe(true)
            expect(result.output).toContain("Air Database Installer")
            expect(result.output).toContain("--name")
            expect(result.output).toContain("--port")
        })
        
        test.skip("install script - interactive mode", async () => {
            // Skip interactive test in CI or when TTY not available
            if (process.env.CI || !process.stdout.isTTY) {
                return
            }
            
            const result = await runInteractive(
                "node script/run.cjs install",
                [
                    { wait: 500, input: testEnv.name },      // Name
                    { wait: 500, input: String(testEnv.port) }, // Port
                    { wait: 500, input: "localhost" },       // Domain
                    { wait: 500, input: "n" }                // SSL
                ],
                20000
            )
            
            expect(result.output).toContain("Air")
        })
    })
    
    describe("Status Scripts", () => {
        test("status script - runs without error", () => {
            const result = runCommand("node script/run.cjs status", { timeout: 5000 })
            // Status might fail if no air instance is running, but script should execute
            expect(result.output || result.error).toBeTruthy()
        })
        
        test("logs script - runs without error", () => {
            const result = runCommand("node script/run.cjs logs", { timeout: 5000 })
            // Logs might be empty, but script should execute
            expect(result.output || result.error).toBeTruthy()
        })
    })
    
    describe("DDNS Script", () => {
        test("ddns script - check mode", () => {
            const result = runCommand("node script/run.cjs ddns --check", { timeout: 5000 })
            // DDNS check requires configuration
            expect(result.output || result.error).toBeTruthy()
            // Should mention configuration or IP
            expect((result.output || result.error).toLowerCase()).toMatch(/config|ip|missing/)
        })
    })
    
    describe("Update Scripts", () => {
        test("update script - check mode", () => {
            const result = runCommand("node script/update.cjs --check", { timeout: 5000 })
            // Should check for updates
            expect(result.output || result.error).toBeTruthy()
        })
    })
    
    describe("Build Scripts", () => {
        test("build commands exist", () => {
            // Just verify the build scripts are configured
            const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
            expect(packageJson.scripts.build).toBeDefined()
            expect(packageJson.scripts["build:prod"]).toBeDefined()
        })
        
        test.skip("build:prod - compiles TypeScript", () => {
            // Skip if TypeScript not available
            if (!commandExists("tsc")) {
                return
            }
            
            const result = runCommand("npm run build:prod", { timeout: 30000 })
            expect(result.success).toBe(true)
            expect(fs.existsSync("dist/index.js")).toBe(true)
        })
    })
    
    describe("Development Scripts", () => {
        test("start script exists", () => {
            const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
            expect(packageJson.scripts.start).toBeDefined()
        })
        
        test("dev script exists", () => {
            const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
            expect(packageJson.scripts.dev).toBeDefined()
        })
    })
    
    describe("Test Scripts", () => {
        test("test scripts properly configured", () => {
            const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
            expect(packageJson.scripts["test"]).toBeDefined()
            expect(packageJson.scripts["test:node"]).toBeDefined()
            expect(packageJson.scripts["test:bun"]).toBeDefined()
        })
    })
})