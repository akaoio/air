#!/usr/bin/env node
/**
 * Air Installer - Entry Point Wrapper
 * Tries to run the new Ink-based installer using best available runtime
 */

const { spawn } = require('child_process')
const path = require('path')

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
    const inkInstaller = path.join(scriptDir, 'install-ink.tsx')
    
    // Try Bun first (native TypeScript support)
    if (await tryRun('bun', [inkInstaller, ...process.argv.slice(2)])) {
        return
    }
    
    // Try tsx (TypeScript runtime for Node.js)
    if (await tryRun('npx', ['tsx', inkInstaller, ...process.argv.slice(2)])) {
        return
    }
    
    // Fallback error
    console.error('Unable to run Air installer. Please install one of:')
    console.error('  • Bun (recommended): curl -fsSL https://bun.sh/install | bash')
    console.error('  • tsx: npm install -g tsx')
    process.exit(1)
}

run()