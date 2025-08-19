#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import readline from 'readline'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

// ANSI colors for better UX
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
}

class PostInstall {
    constructor() {
        this.configPath = path.join(rootPath, 'air.json')
        this.examplePath = path.join(rootPath, 'air.json.example')
        this.isCI = process.env.CI === 'true'
        this.isProduction = process.env.NODE_ENV === 'production'
        this.skipSetup = process.env.AIR_SKIP_SETUP === 'true'
    }

    log(message, color = '') {
        console.log(color + message + colors.reset)
    }

    header() {
        console.log()
        this.log('═══════════════════════════════════════════', colors.cyan)
        this.log('     Air - Post Installation Setup', colors.cyan + colors.bright)
        this.log('═══════════════════════════════════════════', colors.cyan)
        console.log()
    }

    async checkconfig() {
        // Check if configuration exists
        if (fs.existsSync(this.configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
                
                // Validate basic configuration
                if (config.name && config.env && config.root) {
                    this.log('✓ Configuration found and valid', colors.green)
                    return true
                } else {
                    this.log('⚠ Configuration incomplete', colors.yellow)
                    return false
                }
            } catch (error) {
                this.log('⚠ Configuration file corrupted', colors.yellow)
                return false
            }
        }
        
        return false
    }

    async createexample() {
        // Create example configuration if it doesn't exist
        if (!fs.existsSync(this.examplePath)) {
            const exampleConfig = {
                "root": rootPath,
                "bash": path.join(rootPath, "script"),
                "env": "development",
                "name": "air-node",
                "sync": null,
                "ip": {
                    "timeout": 5000,
                    "dnstimeout": 3000,
                    "agent": "Air-GUN-Peer/1.0"
                },
                "development": {
                    "domain": "localhost",
                    "port": 8765,
                    "peers": []
                },
                "production": {
                    "domain": "example.com",
                    "port": 443,
                    "ssl": {
                        "key": "/path/to/privkey.pem",
                        "cert": "/path/to/fullchain.pem"
                    },
                    "peers": [],
                    "godaddy": {
                        "domain": "",
                        "host": "@",
                        "key": "",
                        "secret": ""
                    }
                }
            }
            
            fs.writeFileSync(this.examplePath, JSON.stringify(exampleConfig, null, 4))
            this.log('✓ Created air.json.example', colors.green)
        }
    }

    async checksecurity() {
        const warnings = []
        
        // Check if running as root
        if (process.getuid && process.getuid() === 0) {
            warnings.push('Running as root - consider using a non-root user')
        }
        
        // Check configuration file permissions if it exists
        if (fs.existsSync(this.configPath)) {
            const stats = fs.statSync(this.configPath)
            const mode = '0' + (stats.mode & parseInt('777', 8)).toString(8)
            
            if (mode !== '0600' && mode !== '0640') {
                warnings.push(`Configuration file permissions (${mode}) are too open - should be 0600`)
            }
        }
        
        // Check for sensitive data in environment
        if (process.env.GODADDY_KEY || process.env.GODADDY_SECRET) {
            warnings.push('Sensitive API keys detected in environment variables')
        }
        
        if (warnings.length > 0) {
            this.log('\nSecurity Warnings:', colors.yellow + colors.bright)
            warnings.forEach(w => this.log(`  ⚠ ${w}`, colors.yellow))
            console.log()
        }
        
        return warnings.length === 0
    }

    async prompt(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
        
        return new Promise(resolve => {
            rl.question(question, answer => {
                rl.close()
                resolve(answer.toLowerCase().trim())
            })
        })
    }

    async run() {
        // Skip in CI/CD environments
        if (this.isCI) {
            this.log('CI environment detected - skipping setup', colors.blue)
            return
        }
        
        // Skip if explicitly disabled
        if (this.skipSetup) {
            this.log('Setup skipped (AIR_SKIP_SETUP=true)', colors.blue)
            return
        }
        
        this.header()
        
        // Create example configuration
        await this.createexample()
        
        // Check existing configuration
        const hasConfig = await this.checkconfig()
        
        // Check security
        await this.checksecurity()
        
        if (!hasConfig) {
            this.log('\n📦 Installation complete!', colors.green + colors.bright)
            this.log('\nTo get started:', colors.cyan)
            this.log('  1. Run: npm run setup', colors.bright)
            this.log('  2. Or copy air.json.example to air.json and edit', colors.bright)
            this.log('  3. Then run: npm start', colors.bright)
            
            // Ask if user wants to run setup now
            if (!this.isProduction && process.stdin.isTTY) {
                console.log()
                const answer = await this.prompt('Would you like to run setup now? (y/n): ')
                
                if (answer === 'y' || answer === 'yes') {
                    console.log()
                    this.log('Starting setup...', colors.cyan)
                    
                    try {
                        execSync('npm run setup', { 
                            stdio: 'inherit',
                            cwd: rootPath
                        })
                    } catch (error) {
                        this.log('Setup cancelled or failed', colors.yellow)
                    }
                }
            }
        } else {
            this.log('\n✨ Installation complete!', colors.green + colors.bright)
            this.log('\nYour Air instance is configured and ready.', colors.cyan)
            this.log('\nAvailable commands:', colors.cyan)
            this.log('  npm start    - Start the Air server', colors.bright)
            this.log('  npm run ui   - Start with interactive UI', colors.bright)
            this.log('  npm test     - Run tests', colors.bright)
            this.log('  npm run config - Reconfigure settings', colors.bright)
            this.log('  npm run status - Check system status', colors.bright)
            this.log('  npm run logs   - View recent logs', colors.bright)
        }
        
        console.log()
        this.log('Documentation: https://github.com/akaoio/air', colors.blue)
        this.log('═══════════════════════════════════════════', colors.cyan)
        console.log()
    }
}

// Run post-install
const installer = new PostInstall()
installer.run().catch(error => {
    console.error('Post-install failed:', error)
    // Don't exit with error to not break npm install
    process.exit(0)
})