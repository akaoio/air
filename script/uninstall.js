#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { Terminal, colors, red, green, yellow, blue, cyan, gray, white, bold, dim } from '@akaoio/tui'
import { getPaths } from '../src/paths.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class Uninstaller {
    constructor() {
        // Initialize with smart path detection
        const paths = getPaths()
        this.config = {
            root: paths.root
        }
        this.configFile = 'air.json'
        this.terminal = new Terminal()
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
                case '--force':
                case '-f':
                    this.config.force = true
                    break
                case '--interactive':
                case '-i':
                    this.config.interactive = true
                    break
            }
        }
        
        if (!this.config.root) {
            const paths = getPaths()
            this.config.root = paths.root
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
                this.terminal.warning('Could not parse config file')
            }
        }
        
        if (!this.config.name) {
            this.config.name = 'air'
        }
    }

    async run() {
        // Clear screen for better presentation
        this.terminal.clear()
        
        // Modern header with animation
        const headerLoader = this.terminal.loader('Initializing Air Uninstaller...', {
            type: 'dots',
            color: 'red'
        })
        await new Promise(resolve => setTimeout(resolve, 800))
        headerLoader.stop(true, 'Uninstaller ready')
        
        this.terminal.spacing()
        this.terminal.header('🗑️ Air Uninstall Script')
        this.terminal.spacing()
        
        // Show what will be removed in a modern box
        this.terminal.box(
            `This will remove the following for peer "${bold(this.config.name)}":\n\n` +
            `• Systemd service (air-${this.config.name})\n` +
            `• Cron jobs for DDNS\n` +
            `• SSL certificates and configuration\n` +
            `• PID files\n\n` +
            `${yellow('⚠ This action cannot be undone!')}`,
            { borderColor: 'red', padding: 1 }
        )
        this.terminal.spacing()
        
        // Interactive confirmation if not forced
        if (!this.config.force) {
            const confirm = await this.terminal.confirm(
                'Are you sure you want to uninstall Air?', 
                false
            )
            
            if (!confirm) {
                this.terminal.info('Uninstall cancelled')
                this.terminal.close()
                process.exit(0)
            }
            
            // Double confirmation for safety
            const doubleConfirm = await this.terminal.interactiveSelect(
                'Please confirm the uninstall action:',
                [
                    'Cancel - Keep Air installed',
                    'Proceed - Remove Air completely'
                ],
                'Cancel - Keep Air installed'
            )
            
            if (doubleConfirm === null || doubleConfirm.startsWith('Cancel')) {
                this.terminal.info('Uninstall cancelled')
                this.terminal.close()
                process.exit(0)
            }
        }
        
        this.terminal.spacing()
        
        // Perform uninstall with progress tracking
        const steps = [
            { name: 'Stop and remove systemd service', fn: () => this.removeservice() },
            { name: 'Remove cron jobs', fn: () => this.removecron() },
            { name: 'Clean up SSL certificates', fn: () => this.removessl() },
            { name: 'Clean up PID files', fn: () => this.cleanpid() }
        ]
        
        let completed = 0
        for (const step of steps) {
            // Modern loader for each step
            const stepLoader = this.terminal.loader(`${step.name}...`, {
                type: 'box',
                color: 'yellow'
            })
            
            try {
                const result = await step.fn()
                stepLoader.stop(true, result || `${step.name} completed`)
            } catch (error) {
                stepLoader.stop(false, `${step.name} failed: ${error.message}`)
            }
            
            completed++
            this.terminal.progressBar(completed, steps.length, 'Uninstall Progress')
            this.terminal.spacing()
        }
        
        // Modern completion message
        this.terminal.spacing()
        this.terminal.button('✨ Uninstall Complete!', {
            borderColor: 'green',
            align: 'center',
            padding: 1,
            margin: { top: 1, bottom: 1 }
        })
        
        // Show summary
        this.terminal.section('Summary:')
        this.terminal.flex([
            dim('Peer removed:'),
            cyan(this.config.name)
        ], { gap: 2 })
        this.terminal.flex([
            dim('Configuration:'),
            white('Preserved (air.json)')
        ], { gap: 2 })
        this.terminal.flex([
            dim('Data:'),
            white('Preserved (radata/)')
        ], { gap: 2 })
        
        this.terminal.spacing(2)
        this.terminal.info('To reinstall Air, run: npm run setup')
        
        this.terminal.close()
    }

    async removeservice() {
        const serviceName = `air-${this.config.name}`
        const results = []
        
        try {
            // Stop service
            try {
                execSync(`sudo systemctl stop ${serviceName}`, { stdio: 'ignore' })
                results.push(`Service ${serviceName} stopped`)
            } catch (e) {
                results.push(`Service ${serviceName} not running`)
            }
            
            // Disable service
            try {
                execSync(`sudo systemctl disable ${serviceName}`, { stdio: 'ignore' })
                results.push(`Service ${serviceName} disabled`)
            } catch (e) {
                // Service might not be enabled
            }
            
            // Remove service file
            const servicePath = `/etc/systemd/system/${serviceName}.service`
            if (fs.existsSync(servicePath)) {
                execSync(`sudo rm ${servicePath}`)
                results.push('Service file removed')
            }
            
            // Reload systemd
            execSync('sudo systemctl daemon-reload')
            results.push('Systemd reloaded')
            
            return results.join(', ')
        } catch (e) {
            throw new Error(`Service removal partially failed: ${e.message}`)
        }
    }

    async removecron() {
        try {
            // Get current crontab
            let currentCron = ''
            try {
                currentCron = execSync('crontab -l 2>/dev/null', { encoding: 'utf8' })
            } catch {
                // No crontab exists
                return 'No cron jobs found'
            }
            
            // Filter out Air-related entries (both old and new formats)
            const lines = currentCron.split('\n')
            const filtered = lines.filter(line => {
                return !line.includes('ddns.js') && 
                       !line.includes('ddns.sh') &&
                       !line.includes('air-ddns') &&
                       !line.includes(`air-${this.config.name}`)
            })
            
            // Update crontab
            if (filtered.length < lines.length) {
                const newCron = filtered.filter(line => line.trim()).join('\n')
                if (newCron.trim()) {
                    // Write new crontab if there are remaining entries
                    fs.writeFileSync('/tmp/air-cron-uninstall.txt', newCron + '\n')
                    execSync('crontab /tmp/air-cron-uninstall.txt')
                    fs.unlinkSync('/tmp/air-cron-uninstall.txt')
                } else {
                    // Remove crontab entirely if empty
                    execSync('crontab -r 2>/dev/null || true')
                }
                return 'Cron jobs removed'
            } else {
                return 'No Air cron jobs found'
            }
        } catch (e) {
            throw new Error(`Cron removal failed: ${e.message}`)
        }
    }

    async removessl() {
        const results = []
        
        try {
            // Remove SSL directory if it exists
            const sslDir = path.join(this.config.root, 'ssl')
            if (fs.existsSync(sslDir)) {
                fs.rmSync(sslDir, { recursive: true, force: true })
                results.push('SSL directory removed')
            }
            
            // Remove renewal hook
            const hookPath = '/etc/letsencrypt/renewal-hooks/deploy/air-copy-certs.sh'
            if (fs.existsSync(hookPath)) {
                try {
                    execSync(`sudo rm ${hookPath}`, { stdio: 'ignore' })
                    results.push('Certificate renewal hook removed')
                } catch {
                    results.push('Could not remove renewal hook (requires sudo)')
                }
            }
            
            return results.length > 0 ? results.join(', ') : 'No SSL configuration found'
        } catch (e) {
            throw new Error(`SSL cleanup failed: ${e.message}`)
        }
    }

    async cleanpid() {
        try {
            // Remove all air PID files
            const files = fs.readdirSync(this.config.root)
            let pidCount = 0
            
            files.forEach(file => {
                if (file.startsWith('.air-') && file.endsWith('.pid')) {
                    fs.unlinkSync(path.join(this.config.root, file))
                    pidCount++
                }
            })
            
            if (pidCount > 0) {
                return `Removed ${pidCount} PID file(s)`
            } else {
                return 'No PID files found'
            }
        } catch (e) {
            throw new Error(`PID cleanup failed: ${e.message}`)
        }
    }
}

// Run uninstaller
const uninstaller = new Uninstaller()
uninstaller.run().catch(error => {
    console.error(red('Uninstall failed:'), error.message)
    process.exit(1)
})