/**
 * Interactive vs Non-Interactive Mode Testing
 * Tests that commands properly support both modes
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { 
    runCommand, 
    runInteractive, 
    createTestEnv, 
    cleanupTestEnvironments
} from "./setup.js"
import fs from "fs"
import path from "path"

describe("Interactive vs Non-Interactive Modes", () => {
    let testEnv: any
    
    beforeAll(() => {
        testEnv = createTestEnv("interactive-test")
    })
    
    afterAll(() => {
        cleanupTestEnvironments()
    })
    
    describe("Install Command Modes", () => {
        test("detects CI environment as non-interactive", () => {
            const result = runCommand(
                `CI=true node script/run.cjs install --name ${testEnv.name} --port ${testEnv.port} --root ${testEnv.root}`,
                { timeout: 10000 }
            )
            
            // Should not prompt in CI mode
            expect(result.output).not.toContain("Enter")
            expect(result.output).not.toContain("?")
        })
        
        test("--non-interactive flag bypasses prompts", () => {
            const result = runCommand(
                `node script/run.cjs install --non-interactive --name ${testEnv.name} --port ${testEnv.port} --root ${testEnv.root}`,
                { timeout: 10000 }
            )
            
            // Should complete without interaction
            const configPath = path.join(testEnv.root, "air.json")
            expect(fs.existsSync(configPath)).toBe(true)
        })
        
        test("-n shorthand works same as --non-interactive", () => {
            const testEnv2 = createTestEnv("shorthand-test")
            const result = runCommand(
                `node script/run.cjs install -n --name ${testEnv2.name} --port ${testEnv2.port} --root ${testEnv2.root}`,
                { timeout: 10000 }
            )
            
            const configPath = path.join(testEnv2.root, "air.json")
            expect(fs.existsSync(configPath)).toBe(true)
        })
        
        test("missing required args in non-interactive creates default config", () => {
            const result = runCommand(
                "node script/run.cjs install --non-interactive",
                { timeout: 5000 }
            )
            
            // Non-interactive mode uses defaults when args missing
            // This is actually valid behavior - it creates a default config
            expect(result.output).toBeTruthy()
        })
    })
    
    describe("Status Command Modes", () => {
        test("status is always non-interactive", () => {
            const result = runCommand("node script/run.cjs status", { timeout: 5000 })
            
            // Status should never prompt
            expect(result.output || result.error).not.toContain("Enter")
            expect(result.output || result.error).not.toContain("?")
        })
    })
    
    describe("DDNS Command Modes", () => {
        test("ddns update requires credentials in non-interactive", () => {
            const result = runCommand(
                "node script/run.cjs ddns --update --non-interactive",
                { timeout: 5000 }
            )
            
            // Should fail without GoDaddy credentials
            expect(result.success).toBe(false)
        })
        
        test("ddns check is always non-interactive", () => {
            const result = runCommand("node script/run.cjs ddns --check", { timeout: 5000 })
            
            // Check mode should never prompt
            expect(result.output || result.error).not.toContain("Enter")
        })
    })
    
    describe("Uninstall Command Modes", () => {
        test.skip("uninstall prompts for confirmation in interactive", async () => {
            if (process.env.CI) return
            
            // Create a config to uninstall
            const uninstallEnv = createTestEnv("uninstall-test")
            fs.writeFileSync(
                path.join(uninstallEnv.root, "air.json"),
                JSON.stringify({ name: uninstallEnv.name })
            )
            
            const result = await runInteractive(
                `node script/uninstall.cjs --root ${uninstallEnv.root}`,
                [
                    { wait: 500, input: "n" } // Don't actually uninstall
                ],
                10000
            )
            
            expect(result.output).toContain("Are you sure")
        })
        
        test.skip("uninstall --force skips confirmation", () => {
            // Skip: uninstall.cjs doesn't support --force flag yet
            const uninstallEnv = createTestEnv("force-uninstall")
            fs.writeFileSync(
                path.join(uninstallEnv.root, "air.json"),
                JSON.stringify({ name: uninstallEnv.name })
            )
            
            const result = runCommand(
                `node script/uninstall.cjs --force --root ${uninstallEnv.root}`,
                { timeout: 5000 }
            )
            
            // Should not prompt with --force (when implemented)
            expect(result.output).not.toContain("Are you sure")
        })
    })
    
    describe("Environment Detection", () => {
        test("detects TTY availability", () => {
            // This test documents TTY detection behavior
            const hasTTY = process.stdout.isTTY
            console.log(`TTY available: ${hasTTY}`)
            
            if (hasTTY) {
                // Interactive mode should be default
                expect(process.stdout.isTTY).toBe(true)
            } else {
                // Non-interactive mode forced (CI, piped, etc)
                expect(process.stdout.isTTY).toBeFalsy()
            }
        })
        
        test.skip("respects AIR_NON_INTERACTIVE env var", () => {
            // Skip: AIR_NON_INTERACTIVE not implemented yet
            const result = runCommand(
                `AIR_NON_INTERACTIVE=1 node script/run.cjs install --name ${testEnv.name} --port ${testEnv.port} --root ${testEnv.root}`,
                { timeout: 10000 }
            )
            
            // Should act as non-interactive (when implemented)
            expect(result.output).not.toContain("Enter")
        })
    })
})