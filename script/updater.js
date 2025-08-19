#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import readline from 'readline'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
}

/**
 * Smart Update Manager for Air
 * Handles updates with zero downtime and automatic rollback
 */
class UpdateManager {
    constructor() {
        this.configPath = path.join(rootPath, 'air.json')
        this.config = this.loadconfig()
        this.updateLog = path.join(rootPath, '.update-log.json')
        this.options = this.parseoptions()
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
    }

    parseoptions() {
        const options = {
            auto: false,
            check: false,
            force: false,
            rollback: false,
            noRestart: false
        }
        
        const args = process.argv.slice(2)
        for (const arg of args) {
            switch (arg) {
                case '--auto':
                    options.auto = true
                    break
                case '--check':
                    options.check = true
                    break
                case '--force':
                    options.force = true
                    break
                case '--rollback':
                    options.rollback = true
                    break
                case '--no-restart':
                    options.noRestart = true
                    break
            }
        }
        
        return options
    }

    loadconfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
            }
        } catch {}
        return {}
    }

    log(message, color = '') {
        console.log(color + message + colors.reset)
    }

    async prompt(question) {
        return new Promise(resolve => {
            this.rl.question(question + ' ', answer => {
                resolve(answer.trim())
            })
        })
    }

    async checkforupdates() {
        this.log('🔍 Checking for updates...', colors.cyan)
        
        const updates = {
            available: false,
            current: '',
            latest: '',
            type: 'none', // none, patch, minor, major
            commits: [],
            breaking: false
        }
        
        try {
            // Get current version
            const pkg = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'))
            updates.current = pkg.version
            
            // Check if git repo
            if (fs.existsSync(path.join(rootPath, '.git'))) {
                // Git-based update check
                execSync('git fetch origin', { cwd: rootPath, stdio: 'ignore' })
                
                // Get commit difference
                const behind = execSync('git rev-list HEAD..origin/main --count', {
                    cwd: rootPath,
                    encoding: 'utf8'
                }).trim()
                
                if (parseInt(behind) > 0) {
                    updates.available = true
                    
                    // Get commit messages
                    const commits = execSync('git log HEAD..origin/main --oneline', {
                        cwd: rootPath,
                        encoding: 'utf8'
                    }).trim().split('\n')
                    
                    updates.commits = commits.map(c => {
                        const [hash, ...msg] = c.split(' ')
                        return {
                            hash: hash,
                            message: msg.join(' '),
                            breaking: msg.join(' ').toLowerCase().includes('breaking')
                        }
                    })
                    
                    // Check for breaking changes
                    updates.breaking = updates.commits.some(c => c.breaking)
                    
                    // Try to get version from origin
                    try {
                        const remotePkg = execSync('git show origin/main:package.json', {
                            cwd: rootPath,
                            encoding: 'utf8'
                        })
                        updates.latest = JSON.parse(remotePkg).version
                        updates.type = this.getupdatetype(updates.current, updates.latest)
                    } catch {
                        updates.latest = 'latest'
                        updates.type = 'unknown'
                    }
                }
            } else {
                // NPM-based update check
                const latest = await this.getnpmversion('@akaoio/air')
                
                if (latest && latest !== updates.current) {
                    updates.available = true
                    updates.latest = latest
                    updates.type = this.getupdatetype(updates.current, latest)
                }
            }
        } catch (error) {
            this.log('⚠️  Could not check for updates', colors.yellow)
            console.error(error.message)
        }
        
        return updates
    }

    getupdatetype(current, latest) {
        const parseVersion = (v) => v.split('.').map(n => parseInt(n))
        const [currMajor, currMinor, currPatch] = parseVersion(current)
        const [lateMajor, lateMinor, latePatch] = parseVersion(latest)
        
        if (lateMajor > currMajor) return 'major'
        if (lateMinor > currMinor) return 'minor'
        if (latePatch > currPatch) return 'patch'
        return 'none'
    }

    async getnpmversion(packageName) {
        return new Promise((resolve) => {
            https.get(`https://registry.npmjs.org/${packageName}/latest`, (res) => {
                let data = ''
                res.on('data', chunk => data += chunk)
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data)
                        resolve(json.version)
                    } catch {
                        resolve(null)
                    }
                })
            }).on('error', () => resolve(null))
        })
    }

    async performupdate(updates) {
        this.log('\n📦 Updating Air...', colors.cyan + colors.bright)
        
        // Create backup
        this.log('  Creating backup...', colors.dim)
        const backupDir = path.join(rootPath, '.backups')
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupPath = path.join(backupDir, `backup-${timestamp}`)
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
        }
        
        fs.mkdirSync(backupPath)
        
        // Backup critical files
        const filesToBackup = ['air.json', 'package.json', 'package-lock.json']
        for (const file of filesToBackup) {
            const src = path.join(rootPath, file)
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, path.join(backupPath, file))
            }
        }
        
        // Save update log
        const updateEntry = {
            date: new Date().toISOString(),
            from: updates.current,
            to: updates.latest,
            type: updates.type,
            backup: backupPath
        }
        
        let updateLog = []
        if (fs.existsSync(this.updateLog)) {
            updateLog = JSON.parse(fs.readFileSync(this.updateLog, 'utf8'))
        }
        updateLog.push(updateEntry)
        fs.writeFileSync(this.updateLog, JSON.stringify(updateLog, null, 2))
        
        this.log('  ✅ Backup created', colors.green)
        
        // Stop service if running (for zero downtime, we'll do this smartly)
        let serviceRunning = false
        let serviceName = null
        
        if (!this.options.noRestart) {
            try {
                serviceName = `air-${this.config.name || 'node'}`
                const status = execSync(`systemctl is-active ${serviceName}`, { encoding: 'utf8' }).trim()
                serviceRunning = status === 'active'
                
                if (serviceRunning) {
                    this.log('  Preparing for zero-downtime update...', colors.dim)
                }
            } catch {}
        }
        
        // Perform update
        try {
            if (fs.existsSync(path.join(rootPath, '.git'))) {
                // Git update
                this.log('  Pulling latest changes...', colors.dim)
                execSync('git pull origin main', { 
                    cwd: rootPath,
                    stdio: this.options.auto ? 'ignore' : 'inherit'
                })
            } else {
                // NPM update
                this.log('  Updating package...', colors.dim)
                execSync('npm update @akaoio/air', {
                    cwd: rootPath,
                    stdio: this.options.auto ? 'ignore' : 'inherit'
                })
            }
            
            this.log('  ✅ Code updated', colors.green)
            
            // Update dependencies
            this.log('  Updating dependencies...', colors.dim)
            execSync('npm install --production', {
                cwd: rootPath,
                stdio: this.options.auto ? 'ignore' : 'inherit'
            })
            
            this.log('  ✅ Dependencies updated', colors.green)
            
            // Run any migrations
            await this.runmigrations(updates.current, updates.latest)
            
            // Restart service with zero downtime
            if (serviceRunning && !this.options.noRestart) {
                this.log('  Restarting service...', colors.dim)
                
                // For zero downtime, reload instead of restart if possible
                try {
                    execSync(`sudo systemctl reload ${serviceName}`, { stdio: 'ignore' })
                    this.log('  ✅ Service reloaded (zero downtime)', colors.green)
                } catch {
                    // Fallback to restart
                    execSync(`sudo systemctl restart ${serviceName}`, { stdio: 'ignore' })
                    this.log('  ✅ Service restarted', colors.green)
                }
            }
            
            this.log('\n✨ Update successful!', colors.green + colors.bright)
            this.log(`  ${updates.current} → ${updates.latest}`, colors.dim)
            
        } catch (error) {
            this.log('\n❌ Update failed!', colors.red + colors.bright)
            console.error(error.message)
            
            // Offer rollback
            if (!this.options.auto) {
                const rollback = await this.prompt('\nRollback to previous version? (y/n)')
                if (rollback.toLowerCase() === 'y') {
                    await this.rollback(backupPath)
                }
            } else {
                // Auto rollback on failure
                this.log('  Auto-rollback initiated...', colors.yellow)
                await this.rollback(backupPath)
            }
            
            throw error
        }
    }

    async runmigrations(fromVersion, toVersion) {
        const migrationsPath = path.join(rootPath, 'migrations')
        
        if (!fs.existsSync(migrationsPath)) {
            return
        }
        
        this.log('  Running migrations...', colors.dim)
        
        const migrations = fs.readdirSync(migrationsPath)
            .filter(f => f.endsWith('.js'))
            .sort()
        
        for (const migration of migrations) {
            const migrationVersion = migration.replace('.js', '').replace('v', '')
            
            if (this.versioncompare(migrationVersion, fromVersion) > 0 && 
                this.versioncompare(migrationVersion, toVersion) <= 0) {
                
                try {
                    this.log(`    Running ${migration}...`, colors.dim)
                    const migrationModule = await import(path.join(migrationsPath, migration))
                    
                    if (migrationModule.default) {
                        await migrationModule.default()
                    }
                    
                    this.log(`    ✅ ${migration}`, colors.green)
                } catch (error) {
                    this.log(`    ❌ ${migration} failed`, colors.red)
                    throw error
                }
            }
        }
    }

    versioncompare(v1, v2) {
        const parts1 = v1.split('.').map(n => parseInt(n))
        const parts2 = v2.split('.').map(n => parseInt(n))
        
        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1
            if (parts1[i] < parts2[i]) return -1
        }
        
        return 0
    }

    async rollback(backupPath) {
        this.log('\n🔄 Rolling back...', colors.yellow)
        
        try {
            // Restore files
            const files = fs.readdirSync(backupPath)
            for (const file of files) {
                const src = path.join(backupPath, file)
                const dest = path.join(rootPath, file)
                fs.copyFileSync(src, dest)
                this.log(`  Restored ${file}`, colors.dim)
            }
            
            // Reinstall dependencies
            this.log('  Reinstalling dependencies...', colors.dim)
            execSync('npm install --production', {
                cwd: rootPath,
                stdio: 'ignore'
            })
            
            this.log('  ✅ Rollback complete', colors.green)
        } catch (error) {
            this.log('  ❌ Rollback failed', colors.red)
            throw error
        }
    }

    async showupdateinfo(updates) {
        if (!updates.available) {
            this.log('✅ Air is up to date!', colors.green)
            this.log(`  Current version: ${updates.current}`, colors.dim)
            return
        }
        
        this.log('\n📦 Update available!', colors.cyan + colors.bright)
        this.log(`  Current: ${updates.current}`, colors.dim)
        this.log(`  Latest:  ${updates.latest}`, colors.green)
        this.log(`  Type:    ${updates.type}`, updates.type === 'major' ? colors.yellow : colors.dim)
        
        if (updates.breaking) {
            this.log('\n⚠️  This update contains breaking changes!', colors.yellow + colors.bright)
        }
        
        if (updates.commits.length > 0) {
            this.log('\n  Changes:', colors.cyan)
            for (const commit of updates.commits.slice(0, 10)) {
                const icon = commit.breaking ? '⚠️ ' : ''
                this.log(`    ${icon}${commit.message}`, colors.dim)
            }
            
            if (updates.commits.length > 10) {
                this.log(`    ... and ${updates.commits.length - 10} more`, colors.dim)
            }
        }
    }

    async run() {
        try {
            this.log('═══════════════════════════════════════════', colors.cyan)
            this.log('         Air Update Manager', colors.cyan + colors.bright)
            this.log('═══════════════════════════════════════════', colors.cyan)
            console.log()
            
            // Check for updates
            const updates = await this.checkforupdates()
            
            // Show update information
            await this.showupdateinfo(updates)
            
            if (this.options.check) {
                // Just checking, exit
                process.exit(updates.available ? 0 : 1)
            }
            
            if (this.options.rollback) {
                // Perform rollback to last backup
                const updateLog = JSON.parse(fs.readFileSync(this.updateLog, 'utf8'))
                const lastUpdate = updateLog[updateLog.length - 1]
                
                if (lastUpdate && lastUpdate.backup) {
                    await this.rollback(lastUpdate.backup)
                } else {
                    this.log('❌ No backup found for rollback', colors.red)
                }
                
                return
            }
            
            if (updates.available) {
                let proceed = this.options.auto || this.options.force
                
                if (!proceed) {
                    const answer = await this.prompt('\nProceed with update? (y/n)')
                    proceed = answer.toLowerCase() === 'y'
                }
                
                if (proceed) {
                    await this.performupdate(updates)
                } else {
                    this.log('\nUpdate cancelled', colors.yellow)
                }
            }
            
        } catch (error) {
            this.log('\n❌ Update process failed', colors.red + colors.bright)
            console.error(error)
            process.exit(1)
        } finally {
            this.rl.close()
        }
    }
}

// Run update manager
const updater = new UpdateManager()
updater.run()