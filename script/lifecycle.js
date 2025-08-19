#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync, spawn } from 'child_process'
import readline from 'readline'
import os from 'os'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

// ANSI colors for beautiful output
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
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m'
}

/**
 * Unified Lifecycle Management for Air
 * Handles installation, updates, rollbacks, and uninstallation
 */
class LifecycleManager {
    constructor() {
        this.mode = process.argv[2] || 'help'
        this.options = this.parseoptions()
        this.stateFile = path.join(rootPath, '.air-state.json')
        this.backupDir = path.join(rootPath, '.air-backups')
        this.state = this.loadstate()
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
    }

    parseoptions() {
        const options = {
            force: false,
            quiet: false,
            backup: true,
            interactive: true,
            dryRun: false
        }
        
        const args = process.argv.slice(3)
        for (const arg of args) {
            switch (arg) {
                case '--force':
                case '-f':
                    options.force = true
                    options.interactive = false
                    break
                case '--quiet':
                case '-q':
                    options.quiet = true
                    break
                case '--no-backup':
                    options.backup = false
                    break
                case '--dry-run':
                    options.dryRun = true
                    break
                case '--non-interactive':
                case '-n':
                    options.interactive = false
                    break
            }
        }
        
        return options
    }

    // State management
    loadstate() {
        try {
            if (fs.existsSync(this.stateFile)) {
                return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'))
            }
        } catch {}
        
        return {
            version: '0.0.0',
            installed: false,
            installDate: null,
            lastUpdate: null,
            backups: [],
            environment: 'development',
            services: []
        }
    }

    savestate() {
        fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2))
    }

    // Logging utilities
    log(message, color = '') {
        if (!this.options.quiet) {
            console.log(color + message + colors.reset)
        }
    }

    success(message) {
        this.log(`✅ ${message}`, colors.green)
    }

    error(message) {
        this.log(`❌ ${message}`, colors.red)
    }

    warning(message) {
        this.log(`⚠️  ${message}`, colors.yellow)
    }

    info(message) {
        this.log(`ℹ️  ${message}`, colors.cyan)
    }

    progress(message) {
        if (!this.options.quiet) {
            process.stdout.write(`\r${colors.cyan}⏳ ${message}...${colors.reset}`)
        }
    }

    progressdone(message = 'Done') {
        if (!this.options.quiet) {
            process.stdout.write(`\r${colors.green}✅ ${message}        \n${colors.reset}`)
        }
    }

    header(title) {
        if (!this.options.quiet) {
            console.log()
            this.log('╔════════════════════════════════════════════╗', colors.cyan + colors.bright)
            const padding = Math.floor((44 - title.length) / 2)
            const paddedTitle = ' '.repeat(padding) + title + ' '.repeat(44 - title.length - padding)
            this.log(`║${paddedTitle}║`, colors.cyan + colors.bright)
            this.log('╚════════════════════════════════════════════╝', colors.cyan + colors.bright)
            console.log()
        }
    }

    // User interaction
    async prompt(question, defaultValue = '') {
        if (!this.options.interactive) {
            return defaultValue
        }
        
        return new Promise(resolve => {
            const q = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `
            this.rl.question(q, answer => {
                resolve(answer.trim() || defaultValue)
            })
        })
    }

    async confirm(question, defaultValue = true) {
        if (!this.options.interactive || this.options.force) {
            return true
        }
        
        const suffix = defaultValue ? '[Y/n]' : '[y/N]'
        const answer = await this.prompt(`${question} ${suffix}`)
        
        if (answer === '') return defaultValue
        return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
    }

    // Backup management
    async createbackup(type = 'manual') {
        if (!this.options.backup) return null
        
        this.progress('Creating backup')
        
        // Create backup directory
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true })
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupId = `${type}-${timestamp}-${crypto.randomBytes(4).toString('hex')}`
        const backupPath = path.join(this.backupDir, backupId)
        
        fs.mkdirSync(backupPath)
        
        // Backup configuration
        const configPath = path.join(rootPath, 'air.json')
        if (fs.existsSync(configPath)) {
            fs.copyFileSync(configPath, path.join(backupPath, 'air.json'))
        }
        
        // Backup state
        if (fs.existsSync(this.stateFile)) {
            fs.copyFileSync(this.stateFile, path.join(backupPath, '.air-state.json'))
        }
        
        // Backup data directory (if not too large)
        const dataPath = path.join(rootPath, 'radata')
        if (fs.existsSync(dataPath)) {
            const stats = fs.statSync(dataPath)
            if (stats.size < 100 * 1024 * 1024) { // Less than 100MB
                this.copydir(dataPath, path.join(backupPath, 'radata'))
            } else {
                this.warning('Data directory too large, skipping data backup')
            }
        }
        
        // Update state
        this.state.backups.push({
            id: backupId,
            type,
            date: new Date().toISOString(),
            version: this.state.version
        })
        
        // Keep only last 10 backups
        if (this.state.backups.length > 10) {
            const oldBackup = this.state.backups.shift()
            const oldPath = path.join(this.backupDir, oldBackup.id)
            if (fs.existsSync(oldPath)) {
                fs.rmSync(oldPath, { recursive: true })
            }
        }
        
        this.savestate()
        this.progressdone('Backup created')
        
        return backupId
    }

    async rollback(backupId = null) {
        if (!backupId && this.state.backups.length > 0) {
            // Show available backups
            this.info('Available backups:')
            for (let i = 0; i < this.state.backups.length; i++) {
                const backup = this.state.backups[i]
                this.log(`  ${i + 1}. ${backup.id} (${backup.type}, ${backup.date})`, colors.dim)
            }
            
            const choice = await this.prompt('Select backup number')
            const index = parseInt(choice) - 1
            
            if (index >= 0 && index < this.state.backups.length) {
                backupId = this.state.backups[index].id
            } else {
                this.error('Invalid selection')
                return false
            }
        }
        
        const backupPath = path.join(this.backupDir, backupId)
        if (!fs.existsSync(backupPath)) {
            this.error('Backup not found')
            return false
        }
        
        this.progress('Rolling back')
        
        // Restore configuration
        const backupConfig = path.join(backupPath, 'air.json')
        if (fs.existsSync(backupConfig)) {
            fs.copyFileSync(backupConfig, path.join(rootPath, 'air.json'))
        }
        
        // Restore state
        const backupState = path.join(backupPath, '.air-state.json')
        if (fs.existsSync(backupState)) {
            fs.copyFileSync(backupState, this.stateFile)
            this.state = this.loadstate()
        }
        
        // Restore data
        const backupData = path.join(backupPath, 'radata')
        if (fs.existsSync(backupData)) {
            const dataPath = path.join(rootPath, 'radata')
            if (fs.existsSync(dataPath)) {
                fs.rmSync(dataPath, { recursive: true })
            }
            this.copydir(backupData, dataPath)
        }
        
        this.progressdone('Rollback complete')
        return true
    }

    copydir(src, dest) {
        fs.mkdirSync(dest, { recursive: true })
        const entries = fs.readdirSync(src, { withFileTypes: true })
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name)
            const destPath = path.join(dest, entry.name)
            
            if (entry.isDirectory()) {
                this.copydir(srcPath, destPath)
            } else {
                fs.copyFileSync(srcPath, destPath)
            }
        }
    }

    // System checks
    async checksystem() {
        const checks = {
            node: { required: '18.0.0', current: process.version },
            npm: { required: '8.0.0', current: '' },
            git: { required: true, installed: false },
            systemd: { available: false },
            pm2: { available: false },
            docker: { available: false },
            permissions: { writable: false },
            diskSpace: { available: 0, required: 100 * 1024 * 1024 } // 100MB
        }
        
        // Check npm version
        try {
            checks.npm.current = execSync('npm --version', { encoding: 'utf8' }).trim()
        } catch {}
        
        // Check git
        try {
            execSync('which git', { stdio: 'ignore' })
            checks.git.installed = true
        } catch {}
        
        // Check systemd
        try {
            execSync('which systemctl', { stdio: 'ignore' })
            checks.systemd.available = true
        } catch {}
        
        // Check PM2
        try {
            execSync('which pm2', { stdio: 'ignore' })
            checks.pm2.available = true
        } catch {}
        
        // Check Docker
        try {
            execSync('which docker', { stdio: 'ignore' })
            checks.docker.available = true
        } catch {}
        
        // Check permissions
        try {
            fs.accessSync(rootPath, fs.constants.W_OK)
            checks.permissions.writable = true
        } catch {}
        
        // Check disk space
        try {
            const dfOutput = execSync('df -B1 ' + rootPath, { encoding: 'utf8' })
            const lines = dfOutput.split('\n')
            if (lines.length > 1) {
                const parts = lines[1].split(/\s+/)
                checks.diskSpace.available = parseInt(parts[3])
            }
        } catch {}
        
        return checks
    }

    // Installation
    async install() {
        this.header('Air Installation')
        
        // Check if already installed
        if (this.state.installed && !this.options.force) {
            this.warning('Air is already installed')
            
            const reinstall = await this.confirm('Do you want to reinstall?', false)
            if (!reinstall) {
                return
            }
        }
        
        // System checks
        this.info('Checking system requirements...')
        const checks = await this.checksystem()
        
        // Validate requirements
        const issues = []
        
        if (!checks.permissions.writable) {
            issues.push('No write permission in installation directory')
        }
        
        if (checks.diskSpace.available < checks.diskSpace.required) {
            issues.push('Insufficient disk space (need 100MB)')
        }
        
        if (!checks.git.installed) {
            this.warning('Git not installed (updates will be limited)')
        }
        
        if (issues.length > 0) {
            this.error('Installation cannot proceed:')
            for (const issue of issues) {
                this.error(`  - ${issue}`)
            }
            return
        }
        
        // Create backup if updating
        if (this.state.installed) {
            await this.createbackup('pre-install')
        }
        
        // Install dependencies
        this.progress('Installing dependencies')
        
        if (!this.options.dryRun) {
            try {
                execSync('npm install --production', { 
                    cwd: rootPath,
                    stdio: this.options.quiet ? 'ignore' : 'inherit'
                })
                this.progressdone('Dependencies installed')
            } catch (error) {
                this.error('Failed to install dependencies')
                return
            }
        } else {
            this.progressdone('Dependencies installed (dry run)')
        }
        
        // Run setup
        this.info('Running setup wizard...')
        
        if (!this.options.dryRun) {
            try {
                execSync('node script/quicksetup.js', {
                    cwd: rootPath,
                    stdio: 'inherit'
                })
            } catch (error) {
                this.error('Setup failed')
                
                if (this.state.backups.length > 0) {
                    const rollback = await this.confirm('Rollback to previous state?', true)
                    if (rollback) {
                        await this.rollback()
                    }
                }
                return
            }
        }
        
        // Update state
        this.state.installed = true
        this.state.installDate = new Date().toISOString()
        this.state.version = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8')).version
        this.savestate()
        
        this.success('Installation complete!')
        
        // Show next steps
        this.info('\nNext steps:')
        this.log('  1. Start Air: npm start', colors.bright)
        this.log('  2. Check status: npm run status', colors.bright)
        this.log('  3. View logs: npm run logs', colors.bright)
    }

    // Update
    async update() {
        this.header('Air Update')
        
        if (!this.state.installed) {
            this.error('Air is not installed. Run: npm run lifecycle install')
            return
        }
        
        // Check for updates
        this.progress('Checking for updates')
        
        let hasUpdates = false
        let currentVersion = this.state.version
        let latestVersion = currentVersion
        
        try {
            // Check git updates
            if (fs.existsSync(path.join(rootPath, '.git'))) {
                execSync('git fetch', { cwd: rootPath, stdio: 'ignore' })
                const status = execSync('git status -uno', { cwd: rootPath, encoding: 'utf8' })
                hasUpdates = status.includes('Your branch is behind')
                
                if (hasUpdates) {
                    const log = execSync('git log HEAD..origin/main --oneline', { 
                        cwd: rootPath, 
                        encoding: 'utf8' 
                    })
                    this.progressdone('Updates available')
                    this.info('\nChanges:')
                    log.split('\n').filter(l => l).forEach(line => {
                        this.log(`  ${line}`, colors.dim)
                    })
                }
            } else {
                // Check npm updates
                const npmInfo = execSync('npm view @akaoio/air version', { encoding: 'utf8' }).trim()
                latestVersion = npmInfo
                hasUpdates = latestVersion !== currentVersion
            }
        } catch (error) {
            this.progressdone('Could not check updates')
            this.warning('Failed to check for updates')
        }
        
        if (!hasUpdates) {
            this.progressdone('Already up to date')
            return
        }
        
        const proceed = await this.confirm('\nProceed with update?', true)
        if (!proceed) {
            return
        }
        
        // Create backup
        await this.createbackup('pre-update')
        
        // Stop service if running
        await this.stopservice()
        
        // Update code
        this.progress('Updating Air')
        
        try {
            if (fs.existsSync(path.join(rootPath, '.git'))) {
                execSync('git pull', { 
                    cwd: rootPath, 
                    stdio: this.options.quiet ? 'ignore' : 'inherit' 
                })
            } else {
                execSync('npm update @akaoio/air', { 
                    cwd: rootPath,
                    stdio: this.options.quiet ? 'ignore' : 'inherit'
                })
            }
            this.progressdone('Code updated')
        } catch (error) {
            this.error('Update failed')
            
            const rollback = await this.confirm('Rollback to previous version?', true)
            if (rollback) {
                await this.rollback()
            }
            return
        }
        
        // Update dependencies
        this.progress('Updating dependencies')
        
        try {
            execSync('npm install --production', { 
                cwd: rootPath,
                stdio: this.options.quiet ? 'ignore' : 'inherit'
            })
            this.progressdone('Dependencies updated')
        } catch (error) {
            this.error('Failed to update dependencies')
            
            const rollback = await this.confirm('Rollback?', true)
            if (rollback) {
                await this.rollback()
            }
            return
        }
        
        // Run migrations if needed
        await this.runmigrations()
        
        // Update state
        this.state.lastUpdate = new Date().toISOString()
        this.state.version = latestVersion
        this.savestate()
        
        // Restart service
        await this.startservice()
        
        this.success('Update complete!')
        this.info(`Updated from ${currentVersion} to ${latestVersion}`)
    }

    // Uninstall
    async uninstall() {
        this.header('Air Uninstallation')
        
        if (!this.state.installed && !this.options.force) {
            this.warning('Air is not installed')
            return
        }
        
        this.warning('This will remove Air from your system')
        
        const confirm = await this.confirm('Are you sure you want to uninstall?', false)
        if (!confirm && !this.options.force) {
            this.info('Uninstallation cancelled')
            return
        }
        
        // Stop services
        await this.stopservice()
        
        // Remove systemd service
        if (this.state.services.includes('systemd')) {
            this.progress('Removing systemd service')
            
            try {
                const serviceName = `air-${this.state.name || 'node'}`
                execSync(`sudo systemctl disable ${serviceName}`, { stdio: 'ignore' })
                execSync(`sudo rm /etc/systemd/system/${serviceName}.service`, { stdio: 'ignore' })
                execSync('sudo systemctl daemon-reload', { stdio: 'ignore' })
                this.progressdone('Systemd service removed')
            } catch {}
        }
        
        // Remove PM2 process
        if (this.state.services.includes('pm2')) {
            this.progress('Removing PM2 process')
            
            try {
                const processName = `air-${this.state.name || 'node'}`
                execSync(`pm2 delete ${processName}`, { stdio: 'ignore' })
                execSync('pm2 save', { stdio: 'ignore' })
                this.progressdone('PM2 process removed')
            } catch {}
        }
        
        // Remove cron jobs
        this.progress('Removing cron jobs')
        
        try {
            const crontab = execSync('crontab -l', { encoding: 'utf8' })
            const newCrontab = crontab.split('\n')
                .filter(line => !line.includes('air'))
                .join('\n')
            
            fs.writeFileSync('/tmp/crontab.tmp', newCrontab)
            execSync('crontab /tmp/crontab.tmp')
            fs.unlinkSync('/tmp/crontab.tmp')
            this.progressdone('Cron jobs removed')
        } catch {}
        
        // Ask about data removal
        const removeData = await this.confirm('Remove configuration and data?', false)
        
        if (removeData) {
            // Create final backup
            await this.createbackup('pre-uninstall')
            
            this.progress('Removing configuration and data')
            
            // Remove configuration
            const configPath = path.join(rootPath, 'air.json')
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath)
            }
            
            // Remove data
            const dataPath = path.join(rootPath, 'radata')
            if (fs.existsSync(dataPath)) {
                fs.rmSync(dataPath, { recursive: true })
            }
            
            // Remove logs
            const logsPath = path.join(rootPath, 'logs')
            if (fs.existsSync(logsPath)) {
                fs.rmSync(logsPath, { recursive: true })
            }
            
            this.progressdone('Data removed')
        }
        
        // Remove state
        if (fs.existsSync(this.stateFile)) {
            fs.unlinkSync(this.stateFile)
        }
        
        this.success('Uninstallation complete!')
        
        if (!removeData) {
            this.info('Configuration and data preserved in:')
            this.log(`  ${rootPath}`, colors.dim)
        }
        
        this.info('\nTo reinstall: npm run lifecycle install')
    }

    // Service management
    async stopservice() {
        if (this.state.services.length === 0) return
        
        this.progress('Stopping services')
        
        for (const service of this.state.services) {
            try {
                switch (service) {
                    case 'systemd':
                        execSync(`sudo systemctl stop air-${this.state.name || 'node'}`, { stdio: 'ignore' })
                        break
                    case 'pm2':
                        execSync(`pm2 stop air-${this.state.name || 'node'}`, { stdio: 'ignore' })
                        break
                }
            } catch {}
        }
        
        this.progressdone('Services stopped')
    }

    async startservice() {
        if (this.state.services.length === 0) return
        
        this.progress('Starting services')
        
        for (const service of this.state.services) {
            try {
                switch (service) {
                    case 'systemd':
                        execSync(`sudo systemctl start air-${this.state.name || 'node'}`, { stdio: 'ignore' })
                        break
                    case 'pm2':
                        execSync(`pm2 start air-${this.state.name || 'node'}`, { stdio: 'ignore' })
                        break
                }
            } catch {}
        }
        
        this.progressdone('Services started')
    }

    // Migrations
    async runmigrations() {
        // Check for migration scripts
        const migrationsPath = path.join(rootPath, 'migrations')
        if (!fs.existsSync(migrationsPath)) return
        
        const migrations = fs.readdirSync(migrationsPath)
            .filter(f => f.endsWith('.js'))
            .sort()
        
        for (const migration of migrations) {
            if (!this.state.migrations?.includes(migration)) {
                this.progress(`Running migration: ${migration}`)
                
                try {
                    await import(path.join(migrationsPath, migration))
                    
                    if (!this.state.migrations) {
                        this.state.migrations = []
                    }
                    this.state.migrations.push(migration)
                    this.savestate()
                    
                    this.progressdone(`Migration complete: ${migration}`)
                } catch (error) {
                    this.error(`Migration failed: ${migration}`)
                    throw error
                }
            }
        }
    }

    // Health check
    async health() {
        this.header('Air Health Check')
        
        const checks = []
        
        // Check installation
        checks.push({
            name: 'Installation',
            status: this.state.installed ? 'OK' : 'Not installed',
            ok: this.state.installed
        })
        
        // Check configuration
        const configPath = path.join(rootPath, 'air.json')
        checks.push({
            name: 'Configuration',
            status: fs.existsSync(configPath) ? 'Found' : 'Missing',
            ok: fs.existsSync(configPath)
        })
        
        // Check services
        for (const service of this.state.services || []) {
            let status = 'Unknown'
            let ok = false
            
            try {
                switch (service) {
                    case 'systemd':
                        const systemdStatus = execSync(`systemctl is-active air-${this.state.name || 'node'}`, { encoding: 'utf8' }).trim()
                        status = systemdStatus === 'active' ? 'Running' : 'Stopped'
                        ok = systemdStatus === 'active'
                        break
                    case 'pm2':
                        const pm2Status = execSync(`pm2 status air-${this.state.name || 'node'}`, { encoding: 'utf8' })
                        status = pm2Status.includes('online') ? 'Running' : 'Stopped'
                        ok = pm2Status.includes('online')
                        break
                }
            } catch {}
            
            checks.push({
                name: `Service (${service})`,
                status,
                ok
            })
        }
        
        // Check disk space
        const diskCheck = await this.checksystem()
        checks.push({
            name: 'Disk Space',
            status: `${Math.round(diskCheck.diskSpace.available / 1024 / 1024)}MB available`,
            ok: diskCheck.diskSpace.available > diskCheck.diskSpace.required
        })
        
        // Display results
        this.info('System Status:')
        
        for (const check of checks) {
            const icon = check.ok ? '✅' : '❌'
            const color = check.ok ? colors.green : colors.red
            this.log(`  ${icon} ${check.name}: ${check.status}`, color)
        }
        
        // Overall status
        const allOk = checks.every(c => c.ok)
        
        console.log()
        if (allOk) {
            this.success('All systems operational')
        } else {
            this.warning('Some issues detected')
            this.info('Run "npm run lifecycle install" to fix')
        }
    }

    // Help
    showhelp() {
        console.log(`
${colors.cyan + colors.bright}Air Lifecycle Manager${colors.reset}

${colors.bright}Usage:${colors.reset}
  npm run lifecycle <command> [options]

${colors.bright}Commands:${colors.reset}
  ${colors.green}install${colors.reset}     Install Air with guided setup
  ${colors.green}update${colors.reset}      Check and apply updates
  ${colors.green}uninstall${colors.reset}   Remove Air from system
  ${colors.green}rollback${colors.reset}    Restore from backup
  ${colors.green}backup${colors.reset}      Create manual backup
  ${colors.green}health${colors.reset}      Check system health
  ${colors.green}help${colors.reset}        Show this help

${colors.bright}Options:${colors.reset}
  ${colors.yellow}--force, -f${colors.reset}         Skip confirmations
  ${colors.yellow}--quiet, -q${colors.reset}         Minimal output
  ${colors.yellow}--no-backup${colors.reset}         Skip backup creation
  ${colors.yellow}--dry-run${colors.reset}           Preview without changes
  ${colors.yellow}--non-interactive${colors.reset}   No user prompts

${colors.bright}Examples:${colors.reset}
  ${colors.dim}# Fresh installation${colors.reset}
  npm run lifecycle install

  ${colors.dim}# Update to latest version${colors.reset}
  npm run lifecycle update

  ${colors.dim}# Complete removal${colors.reset}
  npm run lifecycle uninstall --force

  ${colors.dim}# Check system health${colors.reset}
  npm run lifecycle health

${colors.bright}Backup Management:${colors.reset}
  Backups are automatically created before major operations.
  Location: ${colors.dim}${this.backupDir}${colors.reset}

${colors.bright}Documentation:${colors.reset}
  ${colors.blue}https://github.com/akaoio/air${colors.reset}
`)
    }

    // Main execution
    async run() {
        try {
            switch (this.mode) {
                case 'install':
                    await this.install()
                    break
                case 'update':
                    await this.update()
                    break
                case 'uninstall':
                    await this.uninstall()
                    break
                case 'rollback':
                    await this.rollback()
                    break
                case 'backup':
                    const backupId = await this.createbackup('manual')
                    this.success(`Backup created: ${backupId}`)
                    break
                case 'health':
                    await this.health()
                    break
                case 'help':
                default:
                    this.showhelp()
            }
        } catch (error) {
            this.error(`Operation failed: ${error.message}`)
            
            if (!this.options.quiet) {
                console.error(error)
            }
            
            process.exit(1)
        } finally {
            this.rl.close()
        }
    }
}

// Run lifecycle manager
const manager = new LifecycleManager()
manager.run()