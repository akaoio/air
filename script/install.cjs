#!/usr/bin/env node
/**
 * Install command wrapper
 * Tries to run the installer using best available runtime
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Try different runtimes in order
const tryRun = (runtime, args) => {
    return new Promise((resolve) => {
        const child = spawn(runtime, args, {
            stdio: 'inherit',
            shell: false
        })
        child.on('error', () => resolve(false))
        child.on('exit', (code) => resolve(code === 0))
    })
}

async function run() {
    const scriptDir = __dirname
    const tsScript = path.join(scriptDir, 'install.ts')
    const compiledScript = path.join(scriptDir, 'install-compiled.js')
    
    // Check for --no-tui flag to use simple version
    if (process.argv.includes('--no-tui') || process.argv.includes('--simple')) {
        const simpleScript = path.join(scriptDir, 'install-notui.js')
        if (fs.existsSync(simpleScript)) {
            console.log('Running simple installer (no TUI)...')
            if (await tryRun('node', [simpleScript, ...process.argv.slice(2).filter(arg => arg !== '--no-tui' && arg !== '--simple')])) {
                return
            }
        }
    }
    
    // Check if compiled version exists
    if (fs.existsSync(compiledScript)) {
        console.log('Running compiled installer...')
        if (await tryRun('node', [compiledScript, ...process.argv.slice(2)])) {
            return
        }
    }
    
    // Try Bun (can run TypeScript directly)
    if (await tryRun('bun', [tsScript, ...process.argv.slice(2)])) {
        return
    }
    
    // Try tsx (TypeScript runtime)
    if (await tryRun('npx', ['tsx', tsScript, ...process.argv.slice(2)])) {
        return
    }
    
    // Try to compile on the fly with tsc then run
    console.error('Unable to run installer. Please install bun or tsx:')
    console.error('  npm install -g tsx')
    console.error('or')
    console.error('  curl -fsSL https://bun.sh/install | bash')
    process.exit(1)
}

run()