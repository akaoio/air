/**
 * Test Setup - Cross-runtime compatible
 * Works with Bun test, Node (with tsx), and potentially Deno
 */

import { TestEnvironmentManager } from "../src/TestEnvironment/index.js"
import { execSync, spawn } from "child_process"
import fs from "fs"
import path from "path"

// Cleanup function for test environments
export function cleanupTestEnvironments() {
    TestEnvironmentManager.cleanupAll()
}

// Setup test environment
process.env.NODE_ENV = "test"
process.env.AIR_TEST_MODE = "true"

// Helper to run commands with timeout
export function runCommand(cmd: string, options?: { timeout?: number; input?: string }) {
    const timeout = options?.timeout || 10000
    const input = options?.input || ""
    
    try {
        const result = execSync(cmd, {
            timeout,
            input,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"]
        })
        return { success: true, output: result, error: null }
    } catch (error: any) {
        return {
            success: false,
            output: error.stdout || "",
            error: error.stderr || error.message
        }
    }
}

// Helper for interactive command testing
export function runInteractive(
    cmd: string,
    inputs: Array<{ wait: number; input: string }>,
    timeout = 10000
): Promise<{ success: boolean; output: string; error: string | null }> {
    return new Promise((resolve) => {
        const [command, ...args] = cmd.split(" ")
        const child = spawn(command, args, {
            stdio: ["pipe", "pipe", "pipe"]
        })
        
        let output = ""
        let error = ""
        let timeoutHandle: NodeJS.Timeout
        
        child.stdout.on("data", (data) => {
            output += data.toString()
        })
        
        child.stderr.on("data", (data) => {
            error += data.toString()
        })
        
        // Send inputs at specified intervals
        let inputIndex = 0
        const sendNextInput = () => {
            if (inputIndex < inputs.length) {
                const { wait, input } = inputs[inputIndex]
                setTimeout(() => {
                    child.stdin.write(input + "\n")
                    inputIndex++
                    sendNextInput()
                }, wait)
            } else {
                setTimeout(() => {
                    child.stdin.end()
                }, 100)
            }
        }
        sendNextInput()
        
        // Overall timeout
        timeoutHandle = setTimeout(() => {
            child.kill("SIGTERM")
        }, timeout)
        
        child.on("exit", (code) => {
            clearTimeout(timeoutHandle)
            resolve({
                success: code === 0,
                output,
                error: error || null
            })
        })
    })
}

// Create isolated test environment
export function createTestEnv(name?: string) {
    return TestEnvironmentManager.create(name)
}

// Get environment variables for test
export function getTestEnvVars(env: any) {
    return TestEnvironmentManager.getEnv(env)
}

// Check if command exists
export function commandExists(cmd: string): boolean {
    try {
        execSync(`which ${cmd}`, { stdio: "ignore" })
        return true
    } catch {
        return false
    }
}

// Get runtime
export function getRuntime(): "bun" | "node" | "deno" | "unknown" {
    if (typeof Bun !== "undefined") return "bun"
    if (typeof Deno !== "undefined") return "deno"
    if (typeof process !== "undefined" && process.versions?.node) return "node"
    return "unknown"
}

// Skip test if not in specific runtime
export function skipIfNot(runtime: "bun" | "node" | "deno") {
    return getRuntime() !== runtime
}

// Clean exit handler
process.on("exit", () => {
    cleanupTestEnvironments()
})