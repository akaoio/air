#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class Uninstaller {
    constructor() {
        this.config = {}
        this.configFile = 'air.json'
        this.parseargs()
        this.loadconfig()
    }

    parseargs() {
        const args = process.argv.slice(2)
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            const next = args[i + 1]
            
            switch(arg) {
                case '--name':
                case '-n':
                    this.config.name = next
                    i++
                    break
                case '--root':
                case '-r':
                    this.config.root = next
                    i++
                    break
            }
        }
        
        if (!this.config.root) {
            this.config.root = process.cwd()
        }
    }

    loadconfig() {
        const configPath = path.join(this.config.root, this.configFile)
        if (fs.existsSync(configPath)) {
            try {
                const existing = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                if (!this.config.name && existing.name) {
                    this.config.name = existing.name
                }
            } catch (e) {
                console.log('Warning: Could not parse config file')
            }
        }
        
        if (!this.config.name) {
            this.config.name = 'air'
        }
    }

    run() {
        console.log(`
==========================================
    Air Uninstall Script
==========================================
`)

        try {
            // Stop and remove systemd service
            this.removeservice()
            
            // Remove cron jobs
            this.removecron()
            
            // Clean up PID files
            this.cleanpid()
            
            console.log(`
==========================================
    PEER UNINSTALLED
    Peer: ${this.config.name}
==========================================
`)
        } catch (error) {
            console.error('Uninstall failed:', error.message)
            process.exit(1)
        }
    }

    removeservice() {
        const serviceName = this.config.name
        console.log(`Removing systemd service: ${serviceName}`)
        
        try {
            // Stop service
            try {
                execSync(`sudo systemctl stop ${serviceName}`, { stdio: 'ignore' })
                console.log(`✓ Service ${serviceName} stopped`)
            } catch (e) {
                console.log(`⚠ Service ${serviceName} not running or not found`)
            }
            
            // Disable service
            try {
                execSync(`sudo systemctl disable ${serviceName}`, { stdio: 'ignore' })
                console.log(`✓ Service ${serviceName} disabled`)
            } catch (e) {
                console.log(`⚠ Service ${serviceName} not enabled`)
            }
            
            // Remove service file
            const servicePath = `/etc/systemd/system/${serviceName}.service`
            if (fs.existsSync(servicePath)) {
                execSync(`sudo rm ${servicePath}`)
                console.log(`✓ Service file removed`)
            }
            
            // Reload systemd
            execSync('sudo systemctl daemon-reload')
            console.log('✓ Systemd reloaded')
            
        } catch (e) {
            console.log(`⚠ Service removal partially failed: ${e.message}`)
        }
    }

    removecron() {
        console.log('Removing cron jobs...')
        
        try {
            // Remove cron jobs containing the root path
            const cronCmd = `crontab -l 2>/dev/null | grep -v "${this.config.root}" | crontab -`
            execSync(cronCmd, { shell: '/bin/bash' })
            console.log('✓ Cron jobs removed')
        } catch (e) {
            console.log('⚠ No cron jobs found or already removed')
        }
    }

    cleanpid() {
        console.log('Cleaning PID files...')
        
        try {
            // Remove all air PID files
            const files = fs.readdirSync(this.config.root)
            let pidCount = 0
            
            files.forEach(file => {
                if (file.startsWith('.') && file.endsWith('.pid') && !file.startsWith('.git')) {
                    fs.unlinkSync(path.join(this.config.root, file))
                    pidCount++
                }
            })
            
            if (pidCount > 0) {
                console.log(`✓ Removed ${pidCount} PID file(s)`)
            } else {
                console.log('✓ No PID files found')
            }
        } catch (e) {
            console.log(`⚠ PID cleanup failed: ${e.message}`)
        }
    }
}

// Run uninstaller
const uninstaller = new Uninstaller()
uninstaller.run()