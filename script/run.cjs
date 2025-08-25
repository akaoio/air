#!/usr/bin/env node
/**
 * Runtime Detector and Script Runner
 * Automatically selects best runtime and handles TS/JS execution
 */

const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

/**
 * Detect available runtimes
 */
function detectRuntime() {
    // Check for Bun (fastest, native TS support)
    try {
        require("child_process").execSync("which bun", { stdio: "ignore" })
        return { name: "bun", supportsTS: true }
    } catch {}

    // Check for tsx (TypeScript runner for Node)
    try {
        require("child_process").execSync("which tsx", { stdio: "ignore" })
        return { name: "tsx", supportsTS: true }
    } catch {}

    // Check for ts-node
    try {
        require("child_process").execSync("which ts-node", { stdio: "ignore" })
        return { name: "ts-node", supportsTS: true }
    } catch {}

    // Fallback to Node.js (requires compiled JS)
    return { name: "node", supportsTS: false }
}

/**
 * Get the appropriate script file
 */
function getScriptFile(scriptName, runtime) {
    const scriptDir = path.join(__dirname)

    // TypeScript source
    const tsFile = path.join(scriptDir, `${scriptName}.ts`)

    // Compiled JavaScript
    const jsFile = path.join(scriptDir, "compiled", `${scriptName}.js`)

    // If runtime supports TS and TS file exists, use it
    if (runtime.supportsTS && fs.existsSync(tsFile)) {
        return { file: tsFile, type: "ts" }
    }

    // Otherwise use compiled JS
    if (fs.existsSync(jsFile)) {
        return { file: jsFile, type: "js" }
    }

    // If no compiled JS, try to compile TS on the fly
    if (fs.existsSync(tsFile)) {
        console.log(`⚠️  No compiled JS found for ${scriptName}, compiling...`)
        try {
            require("child_process").execSync(`npx tsc ${tsFile} --outDir ${path.join(scriptDir, "compiled")} --module NodeNext --moduleResolution NodeNext`, { stdio: "inherit" })
            if (fs.existsSync(jsFile)) {
                return { file: jsFile, type: "js" }
            }
        } catch (e) {
            console.error(`Failed to compile ${scriptName}.ts`)
        }
    }

    throw new Error(`Script not found: ${scriptName}`)
}

/**
 * Run the script with appropriate runtime
 */
function runScript(scriptName, args) {
    const runtime = detectRuntime()

    try {
        const script = getScriptFile(scriptName, runtime)

        // Build command based on runtime
        let command, commandArgs

        if (runtime.name === "bun" && script.type === "ts") {
            command = "bun"
            commandArgs = [script.file, ...args]
        } else if (runtime.name === "tsx" && script.type === "ts") {
            command = "tsx"
            commandArgs = [script.file, ...args]
        } else if (runtime.name === "ts-node" && script.type === "ts") {
            command = "ts-node"
            commandArgs = [script.file, ...args]
        } else {
            // Node.js with compiled JS
            command = "node"
            commandArgs = [script.file, ...args]
        }

        // Log runtime info in debug mode
        if (process.env.DEBUG) {
            console.log(`🚀 Runtime: ${runtime.name}`)
            console.log(`📄 Script: ${script.file}`)
            console.log(`🔧 Command: ${command} ${commandArgs.join(" ")}`)
        }

        // Spawn the process
        const child = spawn(command, commandArgs, {
            stdio: "inherit",
            shell: false
        })

        child.on("exit", code => {
            process.exit(code || 0)
        })

        child.on("error", err => {
            console.error(`Failed to run ${scriptName}:`, err.message)
            process.exit(1)
        })
    } catch (err) {
        console.error(err.message)

        // Provide helpful error messages
        if (!runtime.supportsTS) {
            console.log("\n💡 To run TypeScript directly, install one of:")
            console.log("  • Bun: curl -fsSL https://bun.sh/install | bash")
            console.log("  • tsx: npm install -g tsx")
            console.log("  • ts-node: npm install -g ts-node")
        }

        process.exit(1)
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2)

    if (args.length === 0) {
        console.error("Usage: node run.js <script-name> [args...]")
        console.error("Example: node run.js install --help")
        process.exit(1)
    }

    const scriptName = args[0]
    const scriptArgs = args.slice(1)

    runScript(scriptName, scriptArgs)
}

module.exports = { detectRuntime, runScript }
