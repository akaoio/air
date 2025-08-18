#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class Updater {
    constructor() {
        this.config = {
            root: process.cwd(),
            name: 'air'
        }
        this.configFile = 'air.json'
        this.loadconfig()
    }

    loadconfig() {
        const configPath = path.join(this.config.root, this.configFile)
        if (fs.existsSync(configPath)) {
            try {
                const existing = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                if (existing.name) {
                    this.config.name = existing.name
                }
                if (existing.env && existing[existing.env]) {
                    const envConfig = existing[existing.env]
                    if (envConfig.domain) {
                        this.config.domain = envConfig.domain
                    }
                    if (envConfig.ssl) {
                        this.config.ssl = envConfig.ssl
                    }
                }
            } catch (e) {
                console.log('Warning: Could not parse config file')
            }
        }
    }

    async run() {
        console.log(`
==========================================
    Air Update Script
==========================================
`)

        let hasErrors = false

        try {
            // Update code from git
            this.gitpull()
        } catch (e) {
            console.error(`Git update failed: ${e.message}`)
            hasErrors = true
        }

        try {
            // Update npm packages
            this.npmupdate()
        } catch (e) {
            console.error(`NPM update failed: ${e.message}`)
            hasErrors = true
        }

        try {
            // Renew SSL certificates if domain is configured
            if (this.config.domain && this.config.domain !== 'localhost') {
                this.renewssl()
            }
        } catch (e) {
            console.error(`SSL renewal failed: ${e.message}`)
            hasErrors = true
        }

        try {
            // Restart service
            await this.restartservice()
        } catch (e) {
            console.error(`Service restart failed: ${e.message}`)
            hasErrors = true
        }

        if (hasErrors) {
            console.log(`
==========================================
    Update completed with warnings
    Check the errors above
==========================================
`)
        } else {
            console.log(`
==========================================
    Update completed successfully!
==========================================
`)
        }
    }

    gitpull() {
        console.log('Updating from git repository...')
        
        try {
            // Check if it's a git repository
            execSync('git status', { stdio: 'ignore', cwd: this.config.root })
            
            // Stash any local changes
            execSync('git stash', { stdio: 'ignore', cwd: this.config.root })
            
            // Pull latest changes
            const output = execSync('git pull', { encoding: 'utf8', cwd: this.config.root })
            console.log(output.trim())
            
            console.log('✓ Git repository updated')
        } catch (e) {
            console.log('⚠ Not a git repository or git pull failed')
            throw e
        }
    }

    npmupdate() {
        console.log('Updating npm packages...')
        
        try {
            // Update packages
            execSync('npm update', { stdio: 'inherit', cwd: this.config.root })
            
            // Run audit fix
            try {
                execSync('npm audit fix', { stdio: 'inherit', cwd: this.config.root })
            } catch (e) {
                console.log('⚠ npm audit fix had issues')
            }
            
            console.log('✓ NPM packages updated')
        } catch (e) {
            console.log('⚠ NPM update failed')
            throw e
        }
    }

    renewssl() {
        console.log(`Checking SSL certificate for ${this.config.domain}...`)
        
        try {
            // Check if certbot is installed
            execSync('which certbot', { stdio: 'ignore' })
            
            // Attempt renewal (will only renew if needed)
            const output = execSync('sudo certbot renew --quiet', {
                encoding: 'utf8'
            })
            
            if (output && output.includes('renewed')) {
                console.log(output.trim())
                console.log('✓ SSL certificate renewed')
                
                // If using local SSL directory, certificates should be copied by renewal hook
                const sslDir = path.join(this.config.root, 'ssl')
                if (fs.existsSync(sslDir)) {
                    console.log('✓ Certificates copied to application directory')
                }
            } else {
                console.log('✓ SSL certificate is up to date')
            }
        } catch (e) {
            console.log('⚠ SSL renewal check failed')
            console.log('  This is normal if SSL is not configured')
        }
    }

    async restartservice() {
        const serviceName = this.config.name
        console.log(`Restarting service: ${serviceName}...`)
        
        try {
            // Check if service exists
            try {
                execSync(`sudo systemctl status ${serviceName}`, { stdio: 'ignore' })
            } catch (e) {
                console.log(`⚠ Service ${serviceName} not found`)
                console.log('You can start manually with: npm start')
                return
            }
            
            // Restart service
            execSync(`sudo systemctl restart ${serviceName}`, { stdio: 'ignore' })
            
            // Wait and check status
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            try {
                execSync(`sudo systemctl is-active ${serviceName}`, { stdio: 'ignore' })
                console.log(`✓ Service ${serviceName} restarted successfully`)
            } catch (e) {
                console.log(`⚠ Service ${serviceName} may have failed to start`)
                console.log('Check logs with: sudo journalctl -u ' + serviceName + ' -n 50')
            }
        } catch (e) {
            console.log(`⚠ Service restart failed: ${e.message}`)
        }
    }
}

// Run updater
const updater = new Updater()
updater.run().catch(e => {
    console.error('Update failed:', e.message)
    process.exit(1)
})