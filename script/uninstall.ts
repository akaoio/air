#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths.js'
import type { AirConfig } from '../src/types/index.js'
import { TUI, LocalService, isWindows, isMac, isTermux, hasSystemd, hasSudo } from '@akaoio/tui'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class AirUninstaller {
    private config: any
    private ui: TUI
    
    constructor() {
        // Use smart path detection
        const paths = getPaths()
        
        this.config = {
            root: paths.root,
            name: 'air',
            env: 'development'
        }
        
        this.ui = new TUI({ title: 'Air Uninstaller' })
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
            } catch (e) {
                this.ui.showWarning('Could not parse config file')
            }
        }
    }

    async run(): Promise<void> {
        try {
            this.ui.clear()
            console.log(this.ui.createHeader())
            
            // Confirm uninstallation
            const confirm = await this.ui.confirm(
                `Are you sure you want to uninstall Air (${this.config.name})?`,
                false
            )
            
            if (!confirm) {
                this.ui.showInfo('Uninstallation cancelled')
                this.ui.close()
                return
            }
            
            const tasks = []
            
            // Stop running processes
            const stopResult = await this.stopProcesses()
            tasks.push({
                label: 'Stop processes',
                value: stopResult.message,
                status: stopResult.success ? 'success' as const : 'warning' as const
            })
            
            // Remove service
            const serviceResult = await this.removeService()
            tasks.push({
                label: 'Remove service',
                value: serviceResult.message,
                status: serviceResult.success ? 'success' as const : 'warning' as const
            })
            
            // Clean PID files
            const pidResult = await this.cleanPidFiles()
            tasks.push({
                label: 'Clean PID files',
                value: pidResult.message,
                status: pidResult.success ? 'success' as const : 'info' as const
            })
            
            // Remove cron jobs
            const cronResult = await this.removeCronJobs()
            tasks.push({
                label: 'Remove cron jobs',
                value: cronResult.message,
                status: cronResult.success ? 'success' as const : 'info' as const
            })
            
            // Optional: Remove configuration
            const removeConfig = await this.ui.confirm('Remove configuration file?', false)
            if (removeConfig) {
                const configResult = await this.removeConfig()
                tasks.push({
                    label: 'Remove config',
                    value: configResult.message,
                    status: configResult.success ? 'success' as const : 'warning' as const
                })
            }
            
            // Optional: Remove SSL certificates
            if (this.config.ssl) {
                const removeSSL = await this.ui.confirm('Remove SSL certificates?', false)
                if (removeSSL) {
                    const sslResult = await this.removeSSL()
                    tasks.push({
                        label: 'Remove SSL',
                        value: sslResult.message,
                        status: sslResult.success ? 'success' as const : 'warning' as const
                    })
                }
            }
            
            // Show results
            const statusSection = this.ui.createStatusSection('Uninstall Results', tasks)
            console.log(statusSection)
            
            this.ui.showSuccess('Air has been uninstalled')
            
            console.log('\nTo completely remove Air, you can:')
            console.log('1. Delete this directory:')
            console.log(`   rm -rf ${this.config.root}`)
            console.log('\n2. Remove npm packages:')
            console.log('   npm uninstall -g @akaoio/air')
            
        } catch (err: any) {
            this.ui.showError('Uninstallation failed', err.message)
            process.exit(1)
        } finally {
            this.ui.close()
        }
    }
    
    async stopProcesses(): Promise<{success: boolean, message: string}> {
        try {
            let stopped = false
            
            // Check for PID file
            const pidFile = path.join(this.config.root, `.${this.config.name}.pid`)
            if (fs.existsSync(pidFile)) {
                try {
                    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'))
                    
                    // Check if process is running
                    try {
                        process.kill(pid, 0) // Test if process exists
                        process.kill(pid, 'SIGTERM') // Terminate it
                        
                        // Wait a moment for graceful shutdown
                        await new Promise(resolve => setTimeout(resolve, 2000))
                        
                        // Force kill if still running
                        try {
                            process.kill(pid, 0)
                            process.kill(pid, 'SIGKILL')
                        } catch {
                            // Process is gone, good
                        }
                        
                        stopped = true
                    } catch {
                        // Process not running
                    }
                } catch (e) {
                    // Invalid PID file
                }
            }
            
            // Also try to stop by name
            try {
                if (isWindows()) {
                    execSync(`taskkill /F /IM node.exe /FI "WINDOWTITLE eq *air*"`, { stdio: 'ignore' })
                    stopped = true
                } else {
                    // Try pkill
                    try {
                        execSync(`pkill -f "air.*main\\.(ts|js)"`, { stdio: 'ignore' })
                        stopped = true
                    } catch {}
                }
            } catch {}
            
            if (stopped) {
                return { success: true, message: 'Processes stopped' }
            } else {
                return { success: true, message: 'No running processes found' }
            }
            
        } catch (e: any) {
            return { success: false, message: 'Failed to stop processes' }
        }
    }
    
    async removeService(): Promise<{success: boolean, message: string}> {
        const service = new LocalService(`air-${this.config.name}`)
        
        try {
            // Use our unified service uninstaller
            service.uninstall(this.config)
            
            // Verify service is gone
            if (isWindows()) {
                return { success: true, message: 'Windows startup removed' }
            } else if (isMac()) {
                return { success: true, message: 'launchd service removed' }
            } else if (isTermux()) {
                return { success: true, message: 'Termux service removed' }
            } else if (hasSystemd()) {
                // Check both user and system services
                let found = false
                try {
                    execSync(`systemctl --user status air-${this.config.name}`, { stdio: 'ignore' })
                    found = true
                } catch {}
                
                if (!found && hasSudo()) {
                    try {
                        execSync(`sudo systemctl status air-${this.config.name}`, { stdio: 'ignore' })
                        found = true
                    } catch {}
                }
                
                if (!found) {
                    return { success: true, message: 'Systemd service removed' }
                } else {
                    return { success: false, message: 'Service may still exist' }
                }
            }
            
            return { success: true, message: 'No service found' }
            
        } catch (e: any) {
            return { success: false, message: e.message }
        }
    }
    
    async cleanPidFiles(): Promise<{success: boolean, message: string}> {
        try {
            let cleaned = 0
            
            // Remove main PID file
            const pidFile = path.join(this.config.root, `.${this.config.name}.pid`)
            if (fs.existsSync(pidFile)) {
                fs.unlinkSync(pidFile)
                cleaned++
            }
            
            // Remove any other Air PID files
            const files = fs.readdirSync(this.config.root)
            files.forEach(file => {
                if (file.startsWith('.air') && file.endsWith('.pid')) {
                    fs.unlinkSync(path.join(this.config.root, file))
                    cleaned++
                }
            })
            
            if (cleaned > 0) {
                return { success: true, message: `${cleaned} PID file(s) removed` }
            } else {
                return { success: true, message: 'No PID files found' }
            }
            
        } catch (e: any) {
            return { success: false, message: 'Failed to clean PID files' }
        }
    }
    
    async removeCronJobs(): Promise<{success: boolean, message: string}> {
        if (isWindows() || isMac()) {
            return { success: true, message: 'Not applicable' }
        }
        
        try {
            let currentCron = ''
            try {
                currentCron = execSync('crontab -l', { encoding: 'utf8' })
            } catch {
                return { success: true, message: 'No crontab found' }
            }
            
            // Filter out Air-related cron jobs
            const lines = currentCron.split('\n').filter(line => 
                !line.includes(this.config.root) && 
                !line.includes('air') &&
                !line.includes(this.config.name)
            )
            
            if (lines.length !== currentCron.split('\n').length) {
                // Some lines were removed
                const newCron = lines.join('\n')
                const tmpFile = path.join('/tmp', `cron-${Date.now()}`)
                fs.writeFileSync(tmpFile, newCron)
                execSync(`crontab "${tmpFile}"`, { stdio: 'ignore' })
                fs.unlinkSync(tmpFile)
                return { success: true, message: 'Cron jobs removed' }
            } else {
                return { success: true, message: 'No cron jobs found' }
            }
            
        } catch (e: any) {
            return { success: false, message: 'Failed to remove cron jobs' }
        }
    }
    
    async removeConfig(): Promise<{success: boolean, message: string}> {
        try {
            const configPath = path.join(this.config.root, 'air.json')
            if (fs.existsSync(configPath)) {
                // Backup first
                const backupPath = configPath + '.backup'
                fs.copyFileSync(configPath, backupPath)
                fs.unlinkSync(configPath)
                return { success: true, message: 'Config removed (backup saved)' }
            } else {
                return { success: true, message: 'No config file found' }
            }
        } catch (e: any) {
            return { success: false, message: 'Failed to remove config' }
        }
    }
    
    async removeSSL(): Promise<{success: boolean, message: string}> {
        try {
            let removed = 0
            
            // Remove local SSL directory
            const sslDir = path.join(this.config.root, 'ssl')
            if (fs.existsSync(sslDir)) {
                fs.rmSync(sslDir, { recursive: true })
                removed++
            }
            
            // Remove user SSL directory
            const userSSLDir = path.join(process.env.HOME || '', '.local', 'share', 'air', 'ssl')
            if (fs.existsSync(userSSLDir)) {
                fs.rmSync(userSSLDir, { recursive: true })
                removed++
            }
            
            if (removed > 0) {
                return { success: true, message: 'SSL certificates removed' }
            } else {
                return { success: true, message: 'No SSL certificates found' }
            }
            
        } catch (e: any) {
            return { success: false, message: 'Failed to remove SSL' }
        }
    }
}

// Run uninstaller
const uninstaller = new AirUninstaller()
uninstaller.run().catch(e => {
    console.error('Uninstallation failed:', e.message)
    process.exit(1)
})