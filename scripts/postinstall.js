#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const configFile = path.join(projectRoot, 'air.json')

// Check if we're in CI environment
if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
    console.log(chalk.gray('CI environment detected, skipping postinstall setup'))
    process.exit(0)
}

// Check if we're in production npm install (not dev)
if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SETUP) {
    console.log(chalk.gray('Production install, skipping interactive setup'))
    process.exit(0)
}

// Check if running as part of global install
if (process.env.npm_config_global === 'true') {
    console.log(chalk.gray('Global install detected, skipping setup'))
    process.exit(0)
}

// Only run postinstall for the main project, not dependencies
const npmLifecycleEvent = process.env.npm_lifecycle_event
const npmPackageName = process.env.npm_package_name

if (npmLifecycleEvent === 'postinstall' && npmPackageName !== 'air') {
    // This is a dependency's postinstall, not ours
    process.exit(0)
}

console.log('\n' + chalk.cyan('═'.repeat(50)))
console.log(chalk.cyan.bold('     🚀 Air Installation Complete!'))
console.log(chalk.cyan('═'.repeat(50)) + '\n')

// Check if already configured
if (fs.existsSync(configFile)) {
    console.log(chalk.green('✓') + ' Configuration found at air.json')
    console.log(chalk.gray('\nTo reconfigure, run: ') + chalk.white('npm run setup'))
    console.log(chalk.gray('To start Air, run: ') + chalk.white('npm start'))
} else {
    console.log(chalk.yellow('⚠') + ' No configuration found.')
    console.log('\n' + chalk.white('To set up Air, run one of:'))
    console.log(chalk.cyan('  npm run setup') + chalk.gray('        # Interactive setup'))
    console.log(chalk.cyan('  npm run setup:quick') + chalk.gray('  # Quick setup with defaults'))
    
    // Ask if they want to run setup now
    console.log('\n' + chalk.yellow('📝 Would you like to run setup now?'))
    console.log(chalk.gray('   Run: ') + chalk.white.bold('npm run setup'))
}

console.log('\n' + chalk.gray('Documentation: https://github.com/akaoio/air'))
console.log(chalk.gray('─'.repeat(50)) + '\n')

// Show IPv6 tip if behind CGNAT
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Quick check for CGNAT (non-blocking)
execAsync('ip route | grep default | head -1').then(({ stdout }) => {
    // Check if we can detect WAN IP
    execAsync('curl -s --max-time 2 https://checkip.amazonaws.com').then(({ stdout: publicIP }) => {
        if (publicIP && publicIP.includes('.')) {
            const ip = publicIP.trim()
            // Check if it looks like CGNAT
            const parts = ip.split('.')
            if (parts[0] === '100' && parseInt(parts[1]) >= 64 && parseInt(parts[1]) <= 127) {
                console.log(chalk.yellow('\n💡 Tip: ') + 'CGNAT detected! Air supports IPv6 for external access.')
                console.log(chalk.gray('   Learn more: ') + chalk.white('cat CGNAT_SETUP.md'))
            }
        }
    }).catch(() => {
        // Ignore errors in optional check
    })
}).catch(() => {
    // Ignore if can't check
})