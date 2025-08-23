#!/usr/bin/env node
/**
 * Simple Air installer without complex dependencies
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

// Colors
const c = {
    r: '\x1b[0m', b: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', 
    yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function showHelp() {
    console.log(`
Air Database Installer v2.0

Usage: air-install [options]

Options:
  -h, --help              Show this help message
  -n, --non-interactive   Run without prompts
  
Basic Configuration:
  --name <name>           Instance name (default: air)
  -e, --env <env>         Environment: development|production (default: development)
  -p, --port <port>       Port number (default: 8765)
  -d, --domain <domain>   Domain name (production only)

Examples:
  air-install                          # Interactive installation
  air-install -n --name myapp          # Non-interactive basic setup
`)
}

function parseArgs() {
    const args = process.argv.slice(2)
    const options = { nonInteractive: false }
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        const next = args[i + 1]
        
        switch(arg) {
            case '--help':
            case '-h':
                options.help = true
                break
            case '--non-interactive':
            case '-n':
                options.nonInteractive = true
                break
            case '--name':
                options.name = next
                i++
                break
            case '--env':
            case '-e':
                options.env = next
                i++
                break
            case '--port':
            case '-p':
                options.port = parseInt(next)
                i++
                break
            case '--domain':
            case '-d':
                options.domain = next
                i++
                break
        }
    }
    
    return options
}

function prompt(question, defaultValue = '') {
    return new Promise((resolve) => {
        const q = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `
        rl.question(q, (answer) => {
            resolve(answer || defaultValue)
        })
    })
}

function confirm(question, defaultYes = true) {
    return new Promise((resolve) => {
        const q = defaultYes ? `${question} (Y/n): ` : `${question} (y/N): `
        rl.question(q, (answer) => {
            const ans = answer.toLowerCase()
            if (ans === 'y' || ans === 'yes') resolve(true)
            else if (ans === 'n' || ans === 'no') resolve(false)  
            else resolve(defaultYes)
        })
    })
}

async function install(options = {}) {
    console.clear()
    console.log(c.cyan + '    ___     ____  ____  ' + c.r)
    console.log(c.cyan + '   /   |   /  _/ / __ \\ ' + c.r)
    console.log(c.cyan + '  / /| |   / /  / /_/ / ' + c.r)
    console.log(c.cyan + ' / ___ | _/ /  / _, _/  ' + c.r)
    console.log(c.cyan + '/_/  |_|/___/ /_/ |_|   ' + c.r)
    console.log()
    console.log(c.b + 'Air Database Installer v2.0' + c.r)
    console.log()
    
    // Gather configuration
    if (!options.nonInteractive) {
        console.log(c.magenta + '=== Basic Configuration ===' + c.r)
        options.name = await prompt('Instance name', options.name || 'air')
        options.env = await prompt('Environment (development/production)', options.env || 'development')
        options.port = parseInt(await prompt('Port number', String(options.port || 8765)))
        
        if (options.env === 'production') {
            options.domain = await prompt('Domain name', options.domain || 'example.com')
        }
    }
    
    // Create configuration
    const config = {
        name: options.name || 'air',
        env: options.env || 'development', 
        root: process.cwd(),
        bash: process.env.SHELL || '/bin/bash',
        development: {
            port: options.port || 8765,
            domain: 'localhost',
            peers: []
        }
    }
    
    if (options.env === 'production') {
        config.production = {
            port: options.port || 8765,
            domain: options.domain || 'example.com',
            peers: []
        }
    }
    
    // Show summary
    console.log()
    console.log(c.magenta + '=== Installation Summary ===' + c.r)
    console.log(`  Name: ${config.name}`)
    console.log(`  Environment: ${config.env}`)
    console.log(`  Port: ${config[config.env].port}`)
    console.log(`  Domain: ${config[config.env].domain}`)
    
    if (!options.nonInteractive) {
        if (!await confirm('\\nProceed with installation?', true)) {
            console.log('Installation cancelled.')
            process.exit(0)
        }
    }
    
    // Save configuration
    const configPath = path.join(process.cwd(), 'air.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log(c.green + '\\n✓ Configuration saved to air.json' + c.r)
    
    // Final instructions
    console.log()
    console.log(c.green + '=== Installation Complete! ===' + c.r)
    console.log()
    console.log('To start Air:')
    console.log(c.cyan + '  npm start' + c.r)
    console.log()
    console.log('To check status:')
    console.log(c.cyan + '  npm run status' + c.r)
}

async function main() {
    const options = parseArgs()
    
    if (options.help) {
        showHelp()
        process.exit(0)
    }
    
    try {
        await install(options)
    } catch (error) {
        console.error(c.red + `\\nInstallation failed: ${error.message}` + c.r)
        process.exit(1)
    } finally {
        rl.close()
    }
}

main()