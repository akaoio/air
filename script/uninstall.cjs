#!/usr/bin/env node
/**
 * uninstall command wrapper
 */

const { spawn } = require('child_process')
const path = require('path')

// Try Bun first, then tsx, then node
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
    const scriptPath = path.join(__dirname, 'script', 'uninstall.ts')
    
    // Try Bun
    if (await tryRun('bun', [scriptPath, ...process.argv.slice(2)])) {
        return
    }
    
    // Try tsx
    if (await tryRun('npx', ['tsx', scriptPath, ...process.argv.slice(2)])) {
        return
    }
    
    // Try node with compiled JS (if exists)
    const jsPath = path.join(__dirname, 'dist', 'script', 'uninstall.js')
    if (require('fs').existsSync(jsPath)) {
        await tryRun('node', [jsPath, ...process.argv.slice(2)])
    } else {
        console.error('Unable to run uninstall. Please install tsx: npm install -g tsx')
        process.exit(1)
    }
}

run()
