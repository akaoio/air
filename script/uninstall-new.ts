#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths.js'
import type { AirConfig } from '../src/types/index.js'
import { 
    LocalService, 
    isWindows, 
    isMac, 
    isTermux, 
    hasSystemd, 
    hasSudo,
} from '@akaoio/tui'
import { AirModule, AirUI, StatusItem, formatCommand, formatPath } from './ui-utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface UninstallResult {
    success: boolean
    message: string
}

class AirUninstaller extends AirModule {
    constructor() {
        super('Database Uninstaller')
        
        // Use smart path detection
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
                // Store full config for SSL check
                this.config = { ...this.config, ...existing }
            } catch (e) {
                this.ui.showWarning('Could not parse config file')
            }
        }
    }
    
    async run(): Promise<void> {
        // Show installation details
        this.ui.showConfigSummary(this.config)
        console.log()
        
        // Confirm uninstallation
        const confirmed = await this.ui.confirmDangerous(
            `Uninstall Air (${this.config.name})? This action cannot be undone.`,
            true
        )
        
        if (!confirmed) {
            this.ui.showWarning('Uninstallation cancelled')
            console.log('No changes were made to your system.\n')
            return
        }
        
        this.ui.showAirHeader()
        
        const totalSteps = 6
        const tasks: StatusItem[] = []
        
        // Step 1: Stop running processes
        this.ui.showProgressStep(1, totalSteps, 'Stopping Air processes...')
        const spinner = this.ui.createSpinner('Stopping Air processes...')
        spinner.start()
        
        const stopResult = await this.stopProcesses()
        spinner.stop()
        tasks.push({
            label: 'Stop processes',
            value: stopResult.message,
            status: stopResult.success ? 'success' : 'warning'
        })
        
        // Step 2: Remove service
        this.ui.showProgressStep(2, totalSteps, 'Removing service...')
        const serviceSpinner = this.ui.createSpinner('Removing service...')
        serviceSpinner.start()
        
        const serviceResult = await this.removeService()
        serviceSpinner.stop()
        tasks.push({
            label: 'Remove service',
            value: serviceResult.message,
            status: serviceResult.success ? 'success' : 'warning'
        })
        
        // Step 3: Clean PID files
        this.ui.showProgressStep(3, totalSteps, 'Cleaning PID files...')
        const pidResult = await this.cleanPidFiles()
        tasks.push({
            label: 'Clean PID files',
            value: pidResult.message,
            status: pidResult.success ? 'success' : 'info'
        })
        
        // Step 4: Remove cron jobs
        this.ui.showProgressStep(4, totalSteps, 'Removing cron jobs...')
        const cronResult = await this.removeCronJobs()
        tasks.push({
            label: 'Remove cron jobs',
            value: cronResult.message,
            status: cronResult.success ? 'success' : 'info'
        })
        
        // Step 5: Optional configuration removal
        this.ui.showProgressStep(5, totalSteps, 'Handling configuration...')
        const removeConfig = await this.ui.confirm('Remove configuration file? (air.json)', false)
        
        if (removeConfig) {
            const configResult = await this.removeConfig()
            tasks.push({
                label: 'Remove config',
                value: configResult.message,
                status: configResult.success ? 'success' : 'warning'
            })
        } else {
            tasks.push({
                label: 'Remove config',
                value: 'Kept',
                status: 'info'
            })
        }
        
        // Step 6: Optional SSL certificate removal
        this.ui.showProgressStep(6, totalSteps, 'Handling SSL certificates...')
        if (this.config[this.config.env]?.ssl) {
            const removeSSL = await this.ui.confirm('Remove SSL certificates?', false)
            
            if (removeSSL) {
                const sslResult = await this.removeSSL()
                tasks.push({
                    label: 'Remove SSL',
                    value: sslResult.message,
                    status: sslResult.success ? 'success' : 'warning'
                })
            } else {
                tasks.push({
                    label: 'Remove SSL',
                    value: 'Kept',
                    status: 'info'
                })
            }
        }
        
        // Show results
        this.ui.showAirHeader()
        console.log(this.ui.createTaskList('Uninstall Results', tasks))
        
        // Show completion and next steps
        const instructions = [
            `Delete this directory: ${formatCommand(`rm -rf ${this.config.root}`)}`,
            `Remove npm packages (if installed globally): ${formatCommand('npm uninstall -g @akaoio/air')}`,
            `Remove local npm packages: ${formatCommand('rm -rf node_modules && rm package-lock.json')}`
        ]
        
        this.ui.showComplete('Air has been uninstalled', instructions)
        
        this.ui.showDivider()
        console.log('Thank you for using Air!')
        this.ui.showDivider()
        console.log()
    }
    
    async stopProcesses(): Promise<UninstallResult> {
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
    
    async removeService(): Promise<UninstallResult> {
        const service = new LocalService(`air-${this.config.name}`)
        
        try {
            // Use our unified service uninstaller
            await service.uninstall(this.config)
            
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
    
    async cleanPidFiles(): Promise<UninstallResult> {
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
    
    async removeCronJobs(): Promise<UninstallResult> {
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
    
    async removeConfig(): Promise<UninstallResult> {
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
    
    async removeSSL(): Promise<UninstallResult> {
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

// Handle graceful shutdown
process.on('SIGINT', () => {
    uninstaller.ui.close()
    process.exit(0)
})

process.on('SIGTERM', () => {
    uninstaller.ui.close()
    process.exit(0)
})

uninstaller.execute().catch(e => {
    console.error('Uninstallation failed:', e.message)
    process.exit(1)
})