#!/usr/bin/env node
/**
 * update command wrapper
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

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
    const scriptDir = __dirname
    const tsScript = path.join(scriptDir, 'update.ts')
    const compiledScript = path.join(scriptDir, 'update-compiled.js')
    
    // Check if compiled version exists
    if (fs.existsSync(compiledScript)) {
        console.log('Running compiled updater...')
        if (await tryRun('node', [compiledScript, ...process.argv.slice(2)])) {
            return
        }
    }
    
    // Try Bun
    if (await tryRun('bun', [tsScript, ...process.argv.slice(2)])) {
        return
    }
    
    // Try tsx
    if (await tryRun('npx', ['tsx', tsScript, ...process.argv.slice(2)])) {
        return
    }
    
    // No runtime available
    {
        console.error('Unable to run update. Please install tsx: npm install -g tsx')
        process.exit(1)
    }
}

run()
