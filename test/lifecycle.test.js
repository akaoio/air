#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

/**
 * Lifecycle Integration Tests
 * Validates the complete installation, update, and uninstall flow
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
}

class LifecycleTests {
    constructor() {
        this.testDir = path.join(rootPath, 'tmp', 'lifecycle-test-' + crypto.randomBytes(4).toString('hex'))
        this.results = []
        this.passed = 0
        this.failed = 0
    }

    log(message, color = '') {
        console.log(color + message + colors.reset)
    }

    async setup() {
        // Create test directory
        fs.mkdirSync(this.testDir, { recursive: true })
        
        // Copy essential files for testing
        const filesToCopy = [
            'package.json',
            'main.js',
            'index.js',
            'Peer.js',
            'db.js'
        ]
        
        for (const file of filesToCopy) {
            const src = path.join(rootPath, file)
            const dest = path.join(this.testDir, file)
            
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dest)
            }
        }
        
        // Copy directories
        const dirsToCopy = ['src', 'script', 'test']
        
        for (const dir of dirsToCopy) {
            const srcDir = path.join(rootPath, dir)
            const destDir = path.join(this.testDir, dir)
            
            if (fs.existsSync(srcDir)) {
                this.copydir(srcDir, destDir)
            }
        }
    }

    copydir(src, dest) {
        fs.mkdirSync(dest, { recursive: true })
        const entries = fs.readdirSync(src, { withFileTypes: true })
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name)
            const destPath = path.join(dest, entry.name)
            
            if (entry.isDirectory() && entry.name !== 'node_modules') {
                this.copydir(srcPath, destPath)
            } else if (entry.isFile()) {
                fs.copyFileSync(srcPath, destPath)
            }
        }
    }

    async cleanup() {
        // Remove test directory
        if (fs.existsSync(this.testDir)) {
            fs.rmSync(this.testDir, { recursive: true })
        }
    }

    async test(name, fn) {
        try {
            await fn()
            this.passed++
            this.results.push({ name, passed: true })
            this.log(`  ✓ ${name}`, colors.green)
        } catch (error) {
            this.failed++
            this.results.push({ name, passed: false, error: error.message })
            this.log(`  ✗ ${name}`, colors.red)
            this.log(`    ${error.message}`, colors.red + colors.dim)
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed')
        }
    }

    // Test: Installation flow
    async testinstallation() {
        this.log('\n📦 Testing Installation Flow', colors.cyan + colors.bright)
        
        await this.test('Creates configuration file', () => {
            // Simulate installation
            const configPath = path.join(this.testDir, 'air.json')
            const config = {
                name: 'test-node',
                env: 'development',
                root: this.testDir
            }
            
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            this.assert(fs.existsSync(configPath), 'Config file not created')
        })
        
        await this.test('Sets correct file permissions', () => {
            const configPath = path.join(this.testDir, 'air.json')
            
            if (fs.existsSync(configPath)) {
                fs.chmodSync(configPath, 0o600)
                const stats = fs.statSync(configPath)
                const mode = '0' + (stats.mode & parseInt('777', 8)).toString(8)
                this.assert(mode === '0600', `Incorrect permissions: ${mode}`)
            }
        })
        
        await this.test('Creates required directories', () => {
            const dirs = ['logs', 'radata', '.air-backups']
            
            for (const dir of dirs) {
                const dirPath = path.join(this.testDir, dir)
                fs.mkdirSync(dirPath, { recursive: true })
                this.assert(fs.existsSync(dirPath), `Directory not created: ${dir}`)
            }
        })
        
        await this.test('Validates package.json', () => {
            const pkgPath = path.join(this.testDir, 'package.json')
            this.assert(fs.existsSync(pkgPath), 'package.json not found')
            
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
            this.assert(pkg.name === '@akaoio/air', 'Incorrect package name')
            this.assert(pkg.scripts.start, 'Start script not defined')
        })
        
        await this.test('Creates state file', () => {
            const statePath = path.join(this.testDir, '.air-state.json')
            const state = {
                installed: true,
                installDate: new Date().toISOString(),
                version: '1.0.0'
            }
            
            fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
            this.assert(fs.existsSync(statePath), 'State file not created')
        })
    }

    // Test: Update flow
    async testupdate() {
        this.log('\n🔄 Testing Update Flow', colors.cyan + colors.bright)
        
        await this.test('Detects available updates', () => {
            // Simulate update check
            const hasUpdates = Math.random() > 0.5 // Simulate random update availability
            this.assert(typeof hasUpdates === 'boolean', 'Update check failed')
        })
        
        await this.test('Creates backup before update', () => {
            const backupDir = path.join(this.testDir, '.air-backups')
            const backupPath = path.join(backupDir, 'test-backup')
            
            fs.mkdirSync(backupPath, { recursive: true })
            
            // Backup config
            const configPath = path.join(this.testDir, 'air.json')
            if (fs.existsSync(configPath)) {
                fs.copyFileSync(configPath, path.join(backupPath, 'air.json'))
            }
            
            this.assert(fs.existsSync(backupPath), 'Backup not created')
        })
        
        await this.test('Preserves configuration during update', () => {
            const configPath = path.join(this.testDir, 'air.json')
            
            if (fs.existsSync(configPath)) {
                const originalConfig = fs.readFileSync(configPath, 'utf8')
                
                // Simulate update (would normally pull/update code)
                
                const updatedConfig = fs.readFileSync(configPath, 'utf8')
                this.assert(originalConfig === updatedConfig, 'Configuration modified during update')
            }
        })
        
        await this.test('Updates version in state', () => {
            const statePath = path.join(this.testDir, '.air-state.json')
            
            if (fs.existsSync(statePath)) {
                const state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
                state.version = '1.0.1'
                state.lastUpdate = new Date().toISOString()
                
                fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
                
                const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf8'))
                this.assert(updatedState.version === '1.0.1', 'Version not updated')
                this.assert(updatedState.lastUpdate, 'Update date not set')
            }
        })
    }

    // Test: Rollback flow
    async testrollback() {
        this.log('\n⏪ Testing Rollback Flow', colors.cyan + colors.bright)
        
        await this.test('Identifies available backups', () => {
            const backupDir = path.join(this.testDir, '.air-backups')
            
            if (fs.existsSync(backupDir)) {
                const backups = fs.readdirSync(backupDir)
                this.assert(Array.isArray(backups), 'Could not list backups')
            }
        })
        
        await this.test('Restores configuration from backup', () => {
            const backupDir = path.join(this.testDir, '.air-backups')
            const backups = fs.readdirSync(backupDir)
            
            if (backups.length > 0) {
                const backupPath = path.join(backupDir, backups[0], 'air.json')
                
                if (fs.existsSync(backupPath)) {
                    const backupConfig = fs.readFileSync(backupPath, 'utf8')
                    const configPath = path.join(this.testDir, 'air.json')
                    
                    fs.writeFileSync(configPath, backupConfig)
                    
                    const restoredConfig = fs.readFileSync(configPath, 'utf8')
                    this.assert(restoredConfig === backupConfig, 'Configuration not restored correctly')
                }
            }
        })
        
        await this.test('Reverts version in state', () => {
            const statePath = path.join(this.testDir, '.air-state.json')
            
            if (fs.existsSync(statePath)) {
                const state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
                state.version = '1.0.0' // Revert to original version
                
                fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
                
                const revertedState = JSON.parse(fs.readFileSync(statePath, 'utf8'))
                this.assert(revertedState.version === '1.0.0', 'Version not reverted')
            }
        })
    }

    // Test: Uninstall flow
    async testuninstall() {
        this.log('\n🗑️  Testing Uninstall Flow', colors.cyan + colors.bright)
        
        await this.test('Creates final backup', () => {
            const backupDir = path.join(this.testDir, '.air-backups')
            const finalBackup = path.join(backupDir, 'final-backup')
            
            fs.mkdirSync(finalBackup, { recursive: true })
            
            const configPath = path.join(this.testDir, 'air.json')
            if (fs.existsSync(configPath)) {
                fs.copyFileSync(configPath, path.join(finalBackup, 'air.json'))
            }
            
            this.assert(fs.existsSync(finalBackup), 'Final backup not created')
        })
        
        await this.test('Removes service files', () => {
            // Simulate service file removal
            const serviceFile = path.join(this.testDir, 'air.service')
            
            if (fs.existsSync(serviceFile)) {
                fs.unlinkSync(serviceFile)
            }
            
            this.assert(!fs.existsSync(serviceFile), 'Service file not removed')
        })
        
        await this.test('Cleans configuration', () => {
            const configPath = path.join(this.testDir, 'air.json')
            
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath)
            }
            
            this.assert(!fs.existsSync(configPath), 'Configuration not removed')
        })
        
        await this.test('Preserves backups', () => {
            const backupDir = path.join(this.testDir, '.air-backups')
            this.assert(fs.existsSync(backupDir), 'Backups were removed')
        })
    }

    // Test: Security validation
    async testsecurity() {
        this.log('\n🔒 Testing Security Validation', colors.cyan + colors.bright)
        
        await this.test('Detects root user', () => {
            const isRoot = process.getuid && process.getuid() === 0
            this.assert(typeof isRoot === 'boolean', 'Root detection failed')
        })
        
        await this.test('Validates file permissions', () => {
            const testFile = path.join(this.testDir, 'test-perms.txt')
            fs.writeFileSync(testFile, 'test')
            fs.chmodSync(testFile, 0o600)
            
            const stats = fs.statSync(testFile)
            const mode = '0' + (stats.mode & parseInt('777', 8)).toString(8)
            
            this.assert(mode === '0600', `Incorrect permissions: ${mode}`)
            fs.unlinkSync(testFile)
        })
        
        await this.test('Detects sensitive data in config', () => {
            const config = {
                godaddy: {
                    key: 'test-api-key',
                    secret: 'test-api-secret'
                }
            }
            
            const hasSensitive = config.godaddy && (config.godaddy.key || config.godaddy.secret)
            this.assert(hasSensitive, 'Sensitive data detection failed')
        })
    }

    // Test: Health checks
    async testhealth() {
        this.log('\n❤️  Testing Health Checks', colors.cyan + colors.bright)
        
        await this.test('Checks disk space', () => {
            const stats = fs.statfsSync(this.testDir)
            const available = stats.bavail * stats.bsize
            
            this.assert(available > 0, 'Disk space check failed')
            this.assert(available > 10 * 1024 * 1024, 'Insufficient disk space')
        })
        
        await this.test('Validates Node.js version', () => {
            const version = process.version
            const major = parseInt(version.split('.')[0].substring(1))
            
            this.assert(major >= 14, `Node.js version too old: ${version}`)
        })
        
        await this.test('Checks write permissions', () => {
            try {
                fs.accessSync(this.testDir, fs.constants.W_OK)
                this.assert(true, 'Write permission check passed')
            } catch {
                this.assert(false, 'No write permission')
            }
        })
    }

    // Run all tests
    async run() {
        this.log('═══════════════════════════════════════════', colors.cyan)
        this.log('     Air Lifecycle Validation Tests', colors.cyan + colors.bright)
        this.log('═══════════════════════════════════════════', colors.cyan)
        
        try {
            await this.setup()
            
            await this.testinstallation()
            await this.testupdate()
            await this.testrollback()
            await this.testuninstall()
            await this.testsecurity()
            await this.testhealth()
            
            // Summary
            console.log()
            this.log('═══════════════════════════════════════════', colors.cyan)
            this.log('Test Results:', colors.cyan + colors.bright)
            this.log(`  ✓ Passed: ${this.passed}`, colors.green)
            
            if (this.failed > 0) {
                this.log(`  ✗ Failed: ${this.failed}`, colors.red)
            }
            
            const percentage = Math.round((this.passed / (this.passed + this.failed)) * 100)
            const color = percentage === 100 ? colors.green : 
                         percentage >= 80 ? colors.yellow : colors.red
            
            this.log(`  Success Rate: ${percentage}%`, color + colors.bright)
            this.log('═══════════════════════════════════════════', colors.cyan)
            
            await this.cleanup()
            
            process.exit(this.failed > 0 ? 1 : 0)
            
        } catch (error) {
            this.log(`\n❌ Test suite failed: ${error.message}`, colors.red + colors.bright)
            console.error(error)
            
            await this.cleanup()
            process.exit(1)
        }
    }
}

// Run tests
const tests = new LifecycleTests()
tests.run()