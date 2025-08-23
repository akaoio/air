#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths.js'
import type { AirConfig } from '../src/types/index.js'
import { AirUI, AirModule, StatusItem, formatPath, formatSuccess, formatWarning } from './ui-utils.js'
import { LocalService, isWindows, isMac, isTermux, hasSystemd, hasSudo } from '@akaoio/tui'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface UpdateResult {
    success: boolean
    message: string
}

class AirUpdater extends AirModule {
    constructor() {
        super('System Updater')
        const paths = getPaths()
        
        this.config = {
            root: paths.root,
            name: 'air',
            env: 'development'
        }
        
        this.loadConfig()
    }
    
    loadConfig(): void {
        const configPath = path.join(this.config.root, 'air.json')
        if (fs.existsSync(configPath)) {
            try {
                const existing = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                if (existing.name) {
                    this.config.name = existing.name
                }
                if (existing.env) {
                    this.config.env = existing.env
                }
                if (existing[existing.env]) {
                    const envConfig = existing[existing.env]
                    if (envConfig.domain) {
                        this.config.domain = envConfig.domain
                    }
                    if (envConfig.ssl) {
                        this.config.ssl = envConfig.ssl
                    }
                }
            } catch (e) {
                this.ui.showWarning('Could not parse config file')
            }
        }
    }
    
    async run(): Promise<void> {
        // Show current configuration
        this.ui.showConfigSummary(this.config)
        
        let totalSteps = 4
        if (this.config.domain && this.config.domain !== 'localhost') {
            totalSteps = 5 // Include SSL renewal
        }
        
        let currentStep = 0
        const tasks: StatusItem[] = []
        let hasErrors = false
        
        // Git update
        currentStep++
        this.ui.showProgressStep(currentStep, totalSteps, 'Updating from Git repository...')
        const gitSpinner = this.ui.createSpinner('Pulling latest changes...')
        gitSpinner.start()
        
        const gitResult = await this.gitPull()
        gitSpinner.stop()
        
        tasks.push({
            label: 'Git repository',
            value: gitResult.message,
            status: gitResult.success ? 'success' : 'error'
        })
        if (!gitResult.success) hasErrors = true
        
        // NPM/Bun update
        currentStep++
        this.ui.showProgressStep(currentStep, totalSteps, 'Updating dependencies...')
        const npmSpinner = this.ui.createSpinner('Installing packages...')
        npmSpinner.start()
        
        const npmResult = await this.packageUpdate()
        npmSpinner.stop()
        
        tasks.push({
            label: 'Package dependencies',
            value: npmResult.message,
            status: npmResult.success ? 'success' : 'error'
        })
        if (!npmResult.success) hasErrors = true
        
        // SSL renewal (if configured)
        if (this.config.domain && this.config.domain !== 'localhost') {
            currentStep++
            this.ui.showProgressStep(currentStep, totalSteps, 'Checking SSL certificate...')
            const sslSpinner = this.ui.createSpinner('Verifying certificate...')
            sslSpinner.start()
            
            const sslResult = await this.renewSSL()
            sslSpinner.stop()
            
            tasks.push({
                label: 'SSL certificate',
                value: sslResult.message,
                status: sslResult.success ? 'success' : 'warning'
            })
        }
        
        // Service restart
        currentStep++
        this.ui.showProgressStep(currentStep, totalSteps, 'Restarting Air service...')
        const serviceSpinner = this.ui.createSpinner('Restarting service...')
        serviceSpinner.start()
        
        const serviceResult = await this.restartService()
        serviceSpinner.stop()
        
        tasks.push({
            label: 'Service restart',
            value: serviceResult.message,
            status: serviceResult.success ? 'success' : 'warning'
        })
        
        // Show results
        console.log('\n')
        console.log(this.ui.createTaskList('Update Results', tasks))
        
        // Final summary
        if (hasErrors) {
            this.ui.showWarning('Update completed with some errors')
            this.ui.showInfo('Please review the errors above and run the update again if needed')
        } else {
            const nextSteps = []
            
            if (!serviceResult.success) {
                const runtime = typeof Bun !== 'undefined' ? 'bun' : 'npx tsx'
                nextSteps.push(`Start Air manually: ${this.ui.formatCommand(`${runtime} ${path.join(this.config.root, 'src/main.ts')}`)}`)
            }
            
            nextSteps.push(`Check status: ${this.ui.formatCommand(`${typeof Bun !== 'undefined' ? 'bun' : 'npx tsx'} ${path.join(__dirname, 'status.ts')}`)}`)
            
            if (this.config.env === 'production' && this.config.domain) {
                const protocol = this.config.ssl ? 'https' : 'http'
                nextSteps.push(`Access your peer: ${protocol}://${this.config.domain}:${this.config.port || 8765}`)
            }
            
            this.ui.showComplete('All updates completed successfully!', nextSteps)
        }
    }
    
    async gitPull(): Promise<UpdateResult> {
        try {
            // Check if it's a git repository
            execSync('git status', { stdio: 'ignore', cwd: this.config.root })
            
            // Check for uncommitted changes
            const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: this.config.root })
            if (status.trim()) {
                // Stash local changes
                execSync('git stash', { stdio: 'ignore', cwd: this.config.root })
                this.ui.showInfo('Local changes stashed')
            }
            
            // Pull latest changes
            const output = execSync('git pull', { encoding: 'utf8', cwd: this.config.root })
            
            if (output.includes('Already up to date')) {
                return { success: true, message: 'Already up to date' }
            } else {
                const match = output.match(/(\d+) files? changed/)
                if (match) {
                    return { success: true, message: `Updated (${match[0]})` }
                }
                return { success: true, message: 'Updated from repository' }
            }
        } catch (e) {
            return { success: false, message: 'Not a git repository' }
        }
    }
    
    async packageUpdate(): Promise<UpdateResult> {
        try {
            const isBun = typeof Bun !== 'undefined'
            
            if (isBun) {
                // Update with Bun
                execSync('bun update', { stdio: 'pipe', cwd: this.config.root })
                
                // Check if any packages were updated
                const lockfile = path.join(this.config.root, 'bun.lockb')
                const lockfileModified = fs.statSync(lockfile).mtime > Date.now() - 10000 // Modified in last 10 seconds
                
                if (lockfileModified) {
                    return { success: true, message: 'Packages updated (Bun)' }
                } else {
                    return { success: true, message: 'All packages up to date (Bun)' }
                }
            } else {
                // Update with npm
                const output = execSync('npm update', { encoding: 'utf8', cwd: this.config.root })
                
                // Try audit fix (non-critical)
                try {
                    const auditOutput = execSync('npm audit fix', { encoding: 'utf8', cwd: this.config.root })
                    if (auditOutput.includes('fixed')) {
                        return { success: true, message: 'Packages updated & vulnerabilities fixed' }
                    }
                } catch {
                    // Audit fix failed, but that's okay
                }
                
                if (output.includes('updated')) {
                    const match = output.match(/(\d+) packages?/)
                    if (match) {
                        return { success: true, message: `${match[0]} updated` }
                    }
                    return { success: true, message: 'Packages updated' }
                } else {
                    return { success: true, message: 'All packages up to date' }
                }
            }
        } catch (e: any) {
            return { success: false, message: `Update failed: ${e.message}` }
        }
    }
    
    async renewSSL(): Promise<UpdateResult> {
        try {
            // Check for local SSL certificates
            if (this.config.ssl) {
                const keyExists = fs.existsSync(this.config.ssl.key)
                const certExists = fs.existsSync(this.config.ssl.cert)
                
                if (keyExists && certExists) {
                    // Check certificate expiry
                    try {
                        const certInfo = execSync(`openssl x509 -enddate -noout -in "${this.config.ssl.cert}"`, { encoding: 'utf8' })
                        const expiryMatch = certInfo.match(/notAfter=(.+)/)
                        if (expiryMatch) {
                            const expiryDate = new Date(expiryMatch[1])
                            const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                            
                            if (daysUntilExpiry > 30) {
                                return { success: true, message: `Valid for ${daysUntilExpiry} days` }
                            } else if (daysUntilExpiry > 0) {
                                // Try to renew
                                if (hasSudo()) {
                                    try {
                                        execSync('which certbot', { stdio: 'ignore' })
                                        execSync('sudo certbot renew --quiet', { stdio: 'ignore' })
                                        return { success: true, message: 'Certificate renewed' }
                                    } catch {
                                        return { success: true, message: `Expires in ${daysUntilExpiry} days (renewal failed)` }
                                    }
                                }
                                return { success: true, message: `Expires in ${daysUntilExpiry} days` }
                            } else {
                                return { success: false, message: 'Certificate expired' }
                            }
                        }
                    } catch (e: any) {
                        return { success: true, message: 'Could not check expiry' }
                    }
                } else {
                    return { success: false, message: 'Certificates not found' }
                }
            }
            
            return { success: true, message: 'No SSL configured' }
        } catch (e: any) {
            return { success: false, message: `SSL check failed: ${e.message}` }
        }
    }
    
    async restartService(): Promise<UpdateResult> {
        const service = new LocalService(`air-${this.config.name}`)
        
        try {
            // Check for PID file first
            const pidFile = path.join(this.config.root, `.${this.config.name}.pid`)
            if (fs.existsSync(pidFile)) {
                try {
                    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'))
                    
                    // Check if process is running
                    try {
                        process.kill(pid, 0) // Test if process exists
                        
                        this.ui.showInfo('Stopping current Air process...')
                        
                        // Stop the process
                        process.kill(pid, 'SIGTERM')
                        await new Promise(resolve => setTimeout(resolve, 2000))
                        
                        // Start it again
                        this.ui.showInfo('Starting Air process...')
                        
                        const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node'
                        const mainFile = runtime === 'bun' ? 'src/main.ts' : 'dist/main.js'
                        const startCmd = `${runtime} ${path.join(this.config.root, mainFile)}`
                        
                        // Start in background
                        if (isWindows()) {
                            execSync(`start /B ${startCmd}`, { 
                                cwd: this.config.root,
                                shell: true,
                                stdio: 'ignore'
                            })
                        } else {
                            execSync(`${startCmd} > /dev/null 2>&1 &`, { 
                                cwd: this.config.root,
                                shell: '/bin/bash',
                                stdio: 'ignore'
                            })
                        }
                        
                        // Wait for startup
                        await new Promise(resolve => setTimeout(resolve, 2000))
                        
                        // Check if new PID file was created
                        if (fs.existsSync(pidFile)) {
                            const newPid = parseInt(fs.readFileSync(pidFile, 'utf8'))
                            try {
                                process.kill(newPid, 0)
                                return { success: true, message: 'Process restarted successfully' }
                            } catch {
                                return { success: false, message: 'Process failed to start' }
                            }
                        }
                        
                        return { success: true, message: 'Process restarted' }
                    } catch {
                        // Process not running, remove stale PID file
                        fs.unlinkSync(pidFile)
                        return { success: false, message: 'Process not running' }
                    }
                } catch (e: any) {
                    return { success: false, message: `PID file error: ${e.message}` }
                }
            }
            
            // Try platform-specific service restart
            if (isWindows()) {
                const startupPath = path.join(process.env.APPDATA || '', '..', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
                const batchFile = path.join(startupPath, `air-${this.config.name}.bat`)
                if (fs.existsSync(batchFile)) {
                    return { success: true, message: 'Will restart on next login' }
                }
            } else if (isMac()) {
                try {
                    execSync(`launchctl stop com.air.${this.config.name}`, { stdio: 'ignore' })
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    execSync(`launchctl start com.air.${this.config.name}`, { stdio: 'ignore' })
                    return { success: true, message: 'launchd service restarted' }
                } catch {
                    return { success: false, message: 'launchd service not found' }
                }
            } else if (isTermux()) {
                try {
                    execSync(`sv restart air-${this.config.name}`, { stdio: 'ignore' })
                    return { success: true, message: 'Termux service restarted' }
                } catch {
                    return { success: false, message: 'Termux service not found' }
                }
            } else if (hasSystemd()) {
                // Try user-level systemd first
                try {
                    execSync(`systemctl --user restart air-${this.config.name}`, { stdio: 'ignore' })
                    
                    // Check if service is active
                    const status = execSync(`systemctl --user is-active air-${this.config.name}`, { encoding: 'utf8' }).trim()
                    if (status === 'active') {
                        return { success: true, message: 'User service restarted' }
                    } else {
                        return { success: false, message: `Service status: ${status}` }
                    }
                } catch {
                    // Try system-level with sudo if available
                    if (hasSudo()) {
                        try {
                            execSync(`sudo systemctl restart air-${this.config.name}`, { stdio: 'ignore' })
                            return { success: true, message: 'System service restarted' }
                        } catch {
                            return { success: false, message: 'Service not found' }
                        }
                    }
                    return { success: false, message: 'Service not found' }
                }
            }
            
            // No service found
            return { 
                success: false, 
                message: 'No service configured' 
            }
            
        } catch (e: any) {
            return { success: false, message: e.message }
        }
    }
}

// Run updater
const updater = new AirUpdater()
updater.execute().catch(e => {
    console.error('Update failed:', e.message)
    process.exit(1)
})