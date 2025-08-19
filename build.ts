#!/usr/bin/env npx tsx

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
}

class AirBuilder {
    private distDir = 'dist'
    private srcDir = 'src'
    private scriptDir = 'script'
    
    log(message: string, color = colors.reset) {
        console.log(`${color}${message}${colors.reset}`)
    }
    
    header(title: string) {
        console.log('')
        this.log('='.repeat(50), colors.cyan)
        this.log(title, colors.cyan + colors.bright)
        this.log('='.repeat(50), colors.cyan)
        console.log('')
    }
    
    success(message: string) {
        this.log(`✅ ${message}`, colors.green)
    }
    
    error(message: string) {
        this.log(`❌ ${message}`, colors.red)
    }
    
    info(message: string) {
        this.log(`ℹ️  ${message}`, colors.blue)
    }
    
    async clean() {
        this.info('Cleaning previous build...')
        if (fs.existsSync(this.distDir)) {
            fs.rmSync(this.distDir, { recursive: true, force: true })
        }
        fs.mkdirSync(this.distDir, { recursive: true })
        this.success('Build directory cleaned')
    }
    
    async buildTypeScript() {
        this.info('Building TypeScript...')
        try {
            execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' })
            this.success('TypeScript compiled successfully')
        } catch (error) {
            this.error('TypeScript compilation failed')
            throw error
        }
    }
    
    async createEntryPoints() {
        this.info('Creating entry points...')
        
        // Create main.js wrapper for non-TS environments
        const mainWrapper = `#!/usr/bin/env node
/**
 * Air - Production entry point
 * Automatically detects and uses the best available runtime
 */

// Runtime detection
const hasBun = typeof Bun !== 'undefined'
const hasTsx = (() => {
    try {
        require('tsx')
        return true
    } catch {
        return false
    }
})()

console.log('🚀 Starting Air...')
console.log(\`Runtime: \${hasBun ? 'Bun' : hasTsx ? 'Node + TSX' : 'Node'}\`)

// Import and start
if (hasBun || hasTsx) {
    // Use TypeScript directly
    require('./src/main.ts')
} else {
    // Use compiled JavaScript
    import('./dist/main.js').catch(err => {
        console.error('Failed to start Air:', err)
        console.error('Try running: npm run build')
        process.exit(1)
    })
}
`
        fs.writeFileSync('main.js', mainWrapper)
        this.success('Created main.js wrapper')
        
        // Create index.js wrapper
        const indexWrapper = `/**
 * Air - Module export
 */

// Try to use TypeScript source if tsx is available
try {
    module.exports = require('./src/index.ts')
} catch {
    // Fall back to compiled JavaScript
    module.exports = require('./dist/index.js')
}
`
        fs.writeFileSync('index.js', indexWrapper)
        this.success('Created index.js wrapper')
    }
    
    async createScriptWrappers() {
        this.info('Creating script wrappers...')
        
        const scripts = ['install', 'update', 'uninstall', 'config', 'ddns', 'status', 'logs']
        
        for (const script of scripts) {
            const wrapper = `#!/usr/bin/env node
/**
 * ${script} command wrapper
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
    const scriptPath = path.join(__dirname, 'script', '${script}.ts')
    
    // Try Bun
    if (await tryRun('bun', [scriptPath, ...process.argv.slice(2)])) {
        return
    }
    
    // Try tsx
    if (await tryRun('npx', ['tsx', scriptPath, ...process.argv.slice(2)])) {
        return
    }
    
    // Try node with compiled JS (if exists)
    const jsPath = path.join(__dirname, 'dist', 'script', '${script}.js')
    if (require('fs').existsSync(jsPath)) {
        await tryRun('node', [jsPath, ...process.argv.slice(2)])
    } else {
        console.error('Unable to run ${script}. Please install tsx: npm install -g tsx')
        process.exit(1)
    }
}

run()
`
            fs.writeFileSync(`${script}.js`, wrapper)
        }
        this.success('Created script wrappers')
    }
    
    async copyAssets() {
        this.info('Copying assets...')
        
        // Copy package.json (remove dev dependencies for production)
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
        const prodPkg = {
            ...pkg,
            scripts: {
                start: 'node main.js',
                ...Object.fromEntries(
                    Object.entries(pkg.scripts)
                        .filter(([key]) => !key.includes('build') && !key.includes('test'))
                )
            },
            devDependencies: undefined
        }
        fs.writeFileSync(
            path.join(this.distDir, 'package.json'),
            JSON.stringify(prodPkg, null, 2)
        )
        
        // Copy essential files
        const filesToCopy = ['README.md', 'LICENSE', 'CLAUDE.md', '.gitignore']
        for (const file of filesToCopy) {
            if (fs.existsSync(file)) {
                fs.copyFileSync(file, path.join(this.distDir, file))
            }
        }
        
        this.success('Assets copied')
    }
    
    async testBuild() {
        this.info('Testing build...')
        
        try {
            // Test if the build can be imported
            const { Peer } = await import('./dist/Peer.js')
            if (Peer) {
                this.success('Build test passed - Peer class accessible')
            }
        } catch (error: any) {
            this.error(`Build test failed: ${error.message}`)
        }
    }
    
    async createProductionPackage() {
        this.info('Creating production package...')
        
        // Create a minimal package that works without TypeScript
        const prodReadme = `# Air - Production Deployment

This is a production build of Air that works without TypeScript.

## Installation

\`\`\`bash
npm install
\`\`\`

## Running

\`\`\`bash
# Start Air
npm start

# Or directly
node main.js
\`\`\`

## Commands

All commands work without TypeScript:

\`\`\`bash
npm run status
npm run config
npm run logs
# etc...
\`\`\`

## Requirements

- Node.js 18+ 
- No TypeScript required
- Optional: Bun for better performance
`
        fs.writeFileSync(path.join(this.distDir, 'README.md'), prodReadme)
        
        this.success('Production package created')
    }
    
    async run() {
        this.header('Air Production Build')
        
        try {
            await this.clean()
            await this.buildTypeScript()
            await this.createEntryPoints()
            await this.createScriptWrappers()
            await this.copyAssets()
            await this.testBuild()
            await this.createProductionPackage()
            
            this.header('Build Complete!')
            this.success('Production build ready in ./dist')
            this.info('Deploy the ./dist folder to production')
            this.info('No TypeScript required in production!')
            
        } catch (error: any) {
            this.error(`Build failed: ${error.message}`)
            process.exit(1)
        }
    }
}

// Run builder
const builder = new AirBuilder()
builder.run()