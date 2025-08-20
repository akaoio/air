#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths.js'
import type { AirConfig } from '../src/types/index.js'
import { AirUI, LocalService, isWindows, isMac, isTermux, hasSystemd, hasSudo } from './ui.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class AirUpdater {
    private config: any
    private ui: AirUI
    
    constructor() {
        // Use smart path detection
        const paths = getPaths()
        
        this.config = {
            root: paths.root,
            name: 'air',
            env: 'development'
        }
        
        this.ui = new AirUI('Air System Updater')
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
        try {
            this.ui.clear()
            console.log(this.ui.createHeader())
            
            const tasks = []
            let hasErrors = false

            // Git update
            const gitResult = await this.gitPull()
            tasks.push({
                label: 'Git repository',
                value: gitResult.success ? gitResult.message : 'Failed',
                status: gitResult.success ? 'success' as const : 'error' as const
            })
            if (!gitResult.success) hasErrors = true

            // NPM/Bun update
            const npmResult = await this.packageUpdate()
            tasks.push({
                label: 'Package dependencies',
                value: npmResult.success ? npmResult.message : 'Failed',
                status: npmResult.success ? 'success' as const : 'error' as const
            })
            if (!npmResult.success) hasErrors = true

            // SSL renewal (if configured)
            if (this.config.domain && this.config.domain !== 'localhost') {
                const sslResult = await this.renewSSL()
                tasks.push({
                    label: 'SSL certificate',
                    value: sslResult.success ? sslResult.message : 'Failed',
                    status: sslResult.success ? 'success' as const : 'warning' as const
                })
            }

            // Service restart
            const serviceResult = await this.restartService()
            tasks.push({
                label: 'Service restart',
                value: serviceResult.success ? serviceResult.message : serviceResult.message,
                status: serviceResult.success ? 'success' as const : 'warning' as const
            })

            // Show results
            const statusSection = this.ui.createStatusSection('Update Results', tasks)
            console.log(statusSection)

            if (hasErrors) {
                this.ui.showWarning('Update completed with some errors')
            } else {
                this.ui.showSuccess('All updates completed successfully!')
            }

        } catch (err: any) {
            this.ui.showError('Update failed', err.message)
            process.exit(1)
        } finally {
            this.ui.close()
        }
    }

    async gitPull(): Promise<{success: boolean, message: string}> {
        try {
            // Check if it's a git repository
            execSync('git status', { stdio: 'ignore', cwd: this.config.root })
            
            // Check for uncommitted changes
            const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: this.config.root })
            if (status.trim()) {
                // Stash local changes
                execSync('git stash', { stdio: 'ignore', cwd: this.config.root })
            }
            
            // Pull latest changes
            const output = execSync('git pull', { encoding: 'utf8', cwd: this.config.root })
            
            if (output.includes('Already up to date')) {
                return { success: true, message: 'Already up to date' }
            } else {
                return { success: true, message: 'Updated from repository' }
            }
        } catch (e) {
            return { success: false, message: 'Not a git repository' }
        }
    }

    async packageUpdate(): Promise<{success: boolean, message: string}> {
        try {
            const isBun = typeof Bun !== 'undefined'
            
            if (isBun) {
                // Update with Bun
                execSync('bun update', { stdio: 'ignore', cwd: this.config.root })
                return { success: true, message: 'Bun packages updated' }
            } else {
                // Update with npm
                execSync('npm update', { stdio: 'ignore', cwd: this.config.root })
                
                // Try audit fix (non-critical)
                try {
                    execSync('npm audit fix', { stdio: 'ignore', cwd: this.config.root })
                } catch {}
                
                return { success: true, message: 'NPM packages updated' }
            }
        } catch (e) {
            return { success: false, message: 'Package update failed' }
        }
    }

    async renewSSL(): Promise<{success: boolean, message: string}> {
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
                            }
                        }
                    } catch {}
                }
            }
            
            // Try to renew with certbot if available and has sudo
            if (hasSudo()) {
                try {
                    execSync('which certbot', { stdio: 'ignore' })
                    const output = execSync('sudo certbot renew --quiet', { encoding: 'utf8' })
                    
                    if (output && output.includes('renewed')) {
                        return { success: true, message: 'Certificate renewed' }
                    } else {
                        return { success: true, message: 'Certificate up to date' }
                    }
                } catch {}
            }
            
            return { success: true, message: 'Manual renewal required' }
        } catch (e) {
            return { success: false, message: 'SSL check skipped' }
        }
    }

    async restartService(): Promise<{success: boolean, message: string}> {
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
                        
                        // Stop the process
                        process.kill(pid, 'SIGTERM')
                        await new Promise(resolve => setTimeout(resolve, 2000))
                        
                        // Start it again
                        const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node'
                        const mainFile = runtime === 'bun' ? 'src/main.ts' : 'dist/main.js'
                        const startCmd = `${runtime} ${path.join(this.config.root, mainFile)}`
                        
                        // Start in background
                        execSync(`${startCmd} > /dev/null 2>&1 &`, { 
                            cwd: this.config.root,
                            shell: '/bin/bash'
                        })
                        
                        return { success: true, message: 'Process restarted' }
                    } catch {
                        // Process not running, remove stale PID file
                        fs.unlinkSync(pidFile)
                    }
                } catch {}
            }
            
            // Try platform-specific service restart
            if (isWindows()) {
                // Windows: check if batch file exists in startup
                const startupPath = path.join(process.env.APPDATA || '', '..', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
                const batchFile = path.join(startupPath, `air-${this.config.name}.bat`)
                if (fs.existsSync(batchFile)) {
                    return { success: true, message: 'Restart on next login' }
                }
            } else if (isMac()) {
                try {
                    execSync(`launchctl stop com.air.${this.config.name}`, { stdio: 'ignore' })
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    execSync(`launchctl start com.air.${this.config.name}`, { stdio: 'ignore' })
                    return { success: true, message: 'launchd service restarted' }
                } catch {}
            } else if (isTermux()) {
                try {
                    execSync(`sv restart air-${this.config.name}`, { stdio: 'ignore' })
                    return { success: true, message: 'Termux service restarted' }
                } catch {}
            } else if (hasSystemd()) {
                // Try user-level systemd first
                try {
                    execSync(`systemctl --user restart air-${this.config.name}`, { stdio: 'ignore' })
                    return { success: true, message: 'User service restarted' }
                } catch {
                    // Try system-level with sudo if available
                    if (hasSudo()) {
                        try {
                            execSync(`sudo systemctl restart air-${this.config.name}`, { stdio: 'ignore' })
                            return { success: true, message: 'System service restarted' }
                        } catch {}
                    }
                }
            }
            
            // No service found
            return { 
                success: false, 
                message: 'No service found (start manually)' 
            }
            
        } catch (e: any) {
            return { success: false, message: e.message }
        }
    }
}

// Run updater
const updater = new AirUpdater()
updater.run().catch(e => {
    console.error('Update failed:', e.message)
    process.exit(1)
})