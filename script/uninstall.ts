#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths'
import syspaths from '../src/syspaths'
import readline from 'readline'
import type { AirConfig } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
}

class Uninstaller {
    constructor() {
        // Initialize with smart path detection
        const paths = getPaths()
        this.config = {
            root: paths.root
        }
        this.configFile = 'air.json'
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
        this.parseargs()
        this.loadconfig()
    }

    parseargs() {
        const args = process.argv.slice(2)
        
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--force' || args[i] === '-f') {
                this.force = true
            } else if (args[i] === '--help' || args[i] === '-h') {
                this.showhelp()
                process.exit(0)
            }
        }
    }

    showhelp() {
        console.log(`
${colors.bright}Air Uninstaller${colors.reset}

${colors.bright}Usage:${colors.reset} npm run uninstall [options]

${colors.bright}Options:${colors.reset}
  --force, -f    Force uninstall without confirmation
  --help, -h     Show this help message

${colors.bright}This script will:${colors.reset}
  - Stop and disable systemd service
  - Remove systemd service file
  - Remove cron jobs
  - Optionally remove configuration and data
`)
    }

    loadconfig() {
        const configPath = path.join(this.config.root, this.configFile)
        if (fs.existsSync(configPath)) {
            try {
                const configData = fs.readFileSync(configPath, 'utf8')
                this.config = { ...this.config, ...JSON.parse(configData) }
            } catch (err) {
                console.error(colors.yellow + 'Warning: Could not read configuration file' + colors.reset)
            }
        }
    }

    // Colored output methods
    success(message) {
        console.log(colors.green + colors.bright + '✓ ' + colors.reset + colors.green + message + colors.reset)
    }
    
    error(message) {
        console.log(colors.red + colors.bright + '✗ ' + colors.reset + colors.red + message + colors.reset)
    }
    
    warning(message) {
        console.log(colors.yellow + colors.bright + '⚠ ' + colors.reset + colors.yellow + message + colors.reset)
    }
    
    info(message) {
        console.log(colors.cyan + 'ℹ ' + message + colors.reset)
    }
    
    header(title) {
        const width = 60
        const padding = Math.floor((width - title.length - 2) / 2)
        const line = '═'.repeat(width)
        
        console.log('')
        console.log(colors.red + colors.bright + line + colors.reset)
        console.log(colors.red + colors.bright + '║' + ' '.repeat(padding) + title + ' '.repeat(width - padding - title.length - 2) + '║' + colors.reset)
        console.log(colors.red + colors.bright + line + colors.reset)
        console.log('')
    }
    
    section(title) {
        console.log('')
        console.log(colors.magenta + colors.bright + '▶ ' + title + colors.reset)
        console.log(colors.magenta + '  ' + '─'.repeat(title.length + 2) + colors.reset)
        console.log('')
    }

    async prompt(question, defaultValue = '') {
        return new Promise((resolve) => {
            const q = defaultValue ? `${question} (${colors.dim}${defaultValue}${colors.reset}): ` : `${question}: `
            this.rl.question(q, (answer) => {
                resolve(answer || defaultValue)
            })
        })
    }

    async confirm(question, defaultYes = true) {
        if (this.force) return true
        
        const defaultText = defaultYes ? 'Y/n' : 'y/N'
        const answer = await this.prompt(`${question} (${colors.bright}${defaultText}${colors.reset})`)
        const normalized = answer.toLowerCase().trim()
        
        if (normalized === '') {
            return defaultYes
        }
        
        return normalized === 'y' || normalized === 'yes'
    }

    async removeSystemdService() {
        this.section('Removing systemd service')
        
        const serviceName = `air-${this.config.name || 'air'}`
        const serviceFile = `/etc/systemd/system/${serviceName}.service`
        
        // Check if service exists
        if (!fs.existsSync(serviceFile)) {
            this.info('No systemd service found')
            return
        }
        
        try {
            // Stop service
            try {
                execSync(`sudo systemctl stop ${serviceName}`, { stdio: 'inherit' })
                this.success(`Service ${serviceName} stopped`)
            } catch {
                // Service might already be stopped
            }
            
            // Disable service
            try {
                execSync(`sudo systemctl disable ${serviceName}`, { stdio: 'inherit' })
                this.success(`Service ${serviceName} disabled`)
            } catch {
                // Service might already be disabled
            }
            
            // Remove service file
            execSync(`sudo rm ${serviceFile}`)
            this.success(`Service file removed: ${serviceFile}`)
            
            // Reload systemd
            execSync('sudo systemctl daemon-reload')
            this.success('Systemd configuration reloaded')
            
        } catch (err) {
            this.error(`Error removing systemd service: ${err.message}`)
        }
    }

    async removeCronJobs() {
        this.section('Removing cron jobs')
        
        try {
            // Get current crontab
            let crontab = ''
            try {
                crontab = execSync('crontab -l 2>/dev/null').toString()
            } catch {
                this.info('No cron jobs found')
                return
            }
            
            // Filter out Air-related jobs
            const lines = crontab.split('\n')
            const filtered = lines.filter(line => {
                return !line.includes('air') && 
                       !line.includes('Air') && 
                       !line.includes('ddns.sh') &&
                       !line.includes(this.config.root)
            })
            
            if (lines.length === filtered.length) {
                this.info('No Air-related cron jobs found')
                return
            }
            
            // Save new crontab
            const newCrontab = filtered.join('\n')
            fs.writeFileSync('/tmp/new_crontab', newCrontab)
            execSync('crontab /tmp/new_crontab')
            fs.unlinkSync('/tmp/new_crontab')
            
            const removed = lines.length - filtered.length
            this.success(`Removed ${removed} Air-related cron job(s)`)
            
        } catch (err) {
            this.error(`Error removing cron jobs: ${err.message}`)
        }
    }

    async stopRunningProcess() {
        this.section('Stopping Air process')
        
        try {
            // Check if Air is running
            const pids = execSync('pgrep -f "node.*main.js" 2>/dev/null || true').toString().trim()
            
            if (!pids) {
                this.info('Air is not running')
                return
            }
            
            // Kill the process
            execSync('pkill -f "node.*main.js"')
            this.success('Air process stopped')
            
            // Remove PID files
            const pidFiles = fs.readdirSync(this.config.root).filter(f => f.startsWith('.air') && f.endsWith('.pid'))
            pidFiles.forEach(file => {
                const pidFile = path.join(this.config.root, file)
                fs.unlinkSync(pidFile)
                this.success(`Removed PID file: ${file}`)
            })
            
        } catch (err) {
            this.error(`Error stopping process: ${err.message}`)
        }
    }

    async removeConfiguration() {
        this.section('Configuration removal')
        
        const configPath = path.join(this.config.root, this.configFile)
        
        if (!fs.existsSync(configPath)) {
            this.info('No configuration file found')
            return
        }
        
        const remove = await this.confirm('Remove configuration file (air.json)?', false)
        
        if (remove) {
            fs.unlinkSync(configPath)
            this.success('Configuration file removed')
        } else {
            this.info('Configuration file kept')
        }
    }

    async removeData() {
        this.section('Data removal')
        
        const dataDir = path.join(this.config.root, 'radata')
        
        if (!fs.existsSync(dataDir)) {
            this.info('No data directory found')
            return
        }
        
        // Calculate size
        let size = 0
        try {
            const output = execSync(`du -sh "${dataDir}" 2>/dev/null`).toString()
            size = output.split('\t')[0]
        } catch {
            size = 'unknown size'
        }
        
        const remove = await this.confirm(`Remove data directory (${size})?`, false)
        
        if (remove) {
            execSync(`rm -rf "${dataDir}"`)
            this.success('Data directory removed')
        } else {
            this.info('Data directory kept')
        }
    }

    async removeLogs() {
        this.section('Log removal')
        
        const logPaths = [
            path.join(this.config.root, 'logs'),
            '/var/log/air',
            path.join(this.config.root, '*.log')
        ]
        
        let logsFound = false
        
        for (const logPath of logPaths) {
            if (fs.existsSync(logPath) || logPath.includes('*')) {
                logsFound = true
                break
            }
        }
        
        if (!logsFound) {
            this.info('No log files found')
            return
        }
        
        const remove = await this.confirm('Remove log files?', false)
        
        if (remove) {
            for (const logPath of logPaths) {
                try {
                    if (logPath.includes('*')) {
                        execSync(`rm -f ${logPath} 2>/dev/null || true`)
                    } else if (fs.existsSync(logPath)) {
                        execSync(`rm -rf "${logPath}"`)
                    }
                } catch {
                    // Ignore errors
                }
            }
            this.success('Log files removed')
        } else {
            this.info('Log files kept')
        }
    }

    showSummary() {
        console.log('')
        console.log(colors.red + colors.bright + '╔════════════════════════════════════════════════════════════╗' + colors.reset)
        console.log(colors.red + colors.bright + '║' + colors.reset + '         ' + colors.bright + 'Air Uninstallation Complete!' + colors.reset + '                 ' + colors.red + colors.bright + '║' + colors.reset)
        console.log(colors.red + colors.bright + '╚════════════════════════════════════════════════════════════╝' + colors.reset)
        console.log('')
        console.log(colors.bright + 'The following components have been processed:' + colors.reset)
        console.log(`  ✓ Systemd service`)
        console.log(`  ✓ Cron jobs`)
        console.log(`  ✓ Running processes`)
        console.log(`  ✓ Configuration files`)
        console.log(`  ✓ Data directory`)
        console.log(`  ✓ Log files`)
        console.log('')
        console.log(colors.cyan + 'Air has been uninstalled from your system.' + colors.reset)
        console.log(colors.cyan + 'Thank you for using Air!' + colors.reset)
        console.log('')
    }

    async run() {
        this.header('Air Uninstaller')
        
        this.warning('This will uninstall Air from your system.')
        
        if (!this.force) {
            const proceed = await this.confirm('Continue with uninstallation?', false)
            if (!proceed) {
                this.info('Uninstallation cancelled')
                this.rl.close()
                process.exit(0)
            }
        }
        
        // Perform uninstallation steps
        await this.stopRunningProcess()
        await this.removeSystemdService()
        await this.removeCronJobs()
        await this.removeConfiguration()
        await this.removeData()
        await this.removeLogs()
        
        this.showSummary()
        
        this.rl.close()
    }
}

// Run uninstaller
const uninstaller = new Uninstaller()
uninstaller.run().catch(err => {
    console.error(colors.red + colors.bright + 'Uninstallation failed:' + colors.reset, err)
    process.exit(1)
})