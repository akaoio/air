#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

/**
 * Installation script - UI layer only
 * Uses core installer for business logic
 */

import { fileURLToPath } from 'url'
import path from 'path'
import { CoreInstaller } from '../src/core/installer.js'
import { TUI } from '@akaoio/tui'
import type { AirConfig } from '../src/types/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class AirInstallerUI {
    private installer: CoreInstaller
    private ui: TUI
    private args: any = {}
    
    constructor() {
        this.parseArgs()
        this.installer = new CoreInstaller(this.args)
        this.ui = new TUI({ title: 'Air GUN Database Installer' })
    }
    
    parseArgs(): void {
        const argv = process.argv.slice(2)
        
        for (let i = 0; i < argv.length; i++) {
            const arg = argv[i]
            
            if (arg === '--check') {
                this.args.check = true
            } else if (arg === '--quick' || arg === '-q') {
                this.args.quick = true
            } else if (arg === '--non-interactive' || arg === '--yes' || arg === '-y') {
                this.args.nonInteractive = true
            } else if ((arg === '--root' || arg === '-r') && i + 1 < argv.length) {
                this.args.root = argv[++i]
            } else if ((arg === '--bash' || arg === '-b') && i + 1 < argv.length) {
                this.args.bash = argv[++i]
            } else if ((arg === '--env' || arg === '-e') && i + 1 < argv.length) {
                this.args.env = argv[++i]
            } else if ((arg === '--name' || arg === '-n') && i + 1 < argv.length) {
                this.args.name = argv[++i]
            } else if ((arg === '--port' || arg === '-p') && i + 1 < argv.length) {
                this.args.port = parseInt(argv[++i])
            } else if ((arg === '--domain' || arg === '-d') && i + 1 < argv.length) {
                this.args.domain = argv[++i]
            } else if ((arg === '--sync' || arg === '-s') && i + 1 < argv.length) {
                this.args.sync = argv[++i]
            } else if (arg === '--ssl') {
                this.args.ssl = true
            }
        }
    }
    
    async run(): Promise<void> {
        try {
            this.ui.clear()
            console.log(this.ui.createHeader())
            
            // 1. System check
            await this.checkSystem()
            
            if (this.args.check) {
                this.ui.showSuccess('System check complete')
                process.exit(0)
            }
            
            // 2. Build configuration
            if (!this.args.nonInteractive) {
                await this.interactiveConfig()
            }
            
            // 3. Save configuration
            this.installer.saveConfig()
            this.ui.showSuccess('Configuration saved')
            
            // 4. Setup service (if production)
            const config = this.installer.getInstallationSummary().config
            if (config.env === 'production' && !this.args.nonInteractive) {
                const setupService = await this.ui.confirm('Set up auto-start service?', true)
                if (setupService) {
                    const result = this.installer.installService()
                    if (result.success) {
                        this.ui.showSuccess(result.message)
                    } else {
                        this.ui.showWarning(`Service setup failed: ${result.message}`)
                    }
                }
            }
            
            // 5. Show summary
            this.showSummary()
            
            // 6. Start Air (optional)
            if (!this.args.nonInteractive) {
                const startNow = await this.ui.confirm('Start Air now?', true)
                if (startNow) {
                    const result = this.installer.startAir()
                    if (result.success) {
                        this.ui.showSuccess(`Air started (PID: ${result.pid})`)
                    } else {
                        this.ui.showError('Failed to start Air', result.error)
                    }
                }
            }
            
        } catch (err: any) {
            this.ui.showError('Installation failed', err.message)
            process.exit(1)
        } finally {
            this.ui.close()
        }
    }
    
    async checkSystem(): Promise<void> {
        const info = this.installer.getSystemInfo()
        const items = []
        
        items.push({ label: 'Node.js', value: info.nodeVersion, status: 'info' })
        if (info.npmVersion) {
            items.push({ label: 'npm', value: info.npmVersion, status: 'info' })
        }
        if (info.gitVersion) {
            items.push({ label: 'Git', value: info.gitVersion, status: 'info' })
        }
        items.push({ label: 'Platform', value: info.platform, status: 'info' })
        items.push({ label: 'Hostname', value: info.hostname, status: 'info' })
        
        const permStatus = info.hasSudo ? 'Full (sudo available)' : 'Limited (no sudo)'
        items.push({
            label: 'Permissions',
            value: permStatus,
            status: info.hasSudo ? 'success' : 'warning'
        })
        
        // Service type
        let serviceType = 'Unknown'
        if (info.isWindows) serviceType = 'Windows Startup'
        else if (info.isMac) serviceType = 'launchd'
        else if (info.isTermux) serviceType = 'Termux service'
        else if (info.hasSystemd) serviceType = 'Systemd'
        else serviceType = 'Cron fallback'
        
        items.push({ label: 'Service', value: serviceType, status: 'success' })
        
        // Check existing installation
        const existing = this.installer.checkExistingInstallation()
        if (existing) {
            items.push({ label: 'Existing installation', value: 'Found', status: 'warning' })
            
            if (!this.args.nonInteractive) {
                const overwrite = await this.ui.confirm('Overwrite existing configuration?', false)
                if (!overwrite) {
                    this.ui.showSuccess('Keeping existing configuration')
                    process.exit(0)
                }
            }
        }
        
        const statusSection = this.ui.createStatusSection('System Check', items)
        console.log(statusSection)
    }
    
    async interactiveConfig(): Promise<void> {
        // Basic settings
        const name = await this.ui.prompt('Instance name', this.args.name || 'air')
        this.installer.updateConfig({ name })
        
        const useProduction = await this.ui.confirm('Use production environment?', false)
        const env = useProduction ? 'production' : 'development'
        
        if (env === 'production') {
            const domain = await this.ui.prompt('Domain name', this.args.domain || 'example.com')
            const port = parseInt(await this.ui.prompt('Port', String(this.args.port || 8765)))
            
            const setupSSL = await this.ui.confirm('Enable SSL?', true)
            let sslConfig = null
            
            if (setupSSL) {
                const sslMethod = await this.ui.select('SSL Certificate Method', [
                    'Self-signed (for testing)',
                    'Manual setup later',
                    'Skip SSL'
                ])
                
                if (sslMethod === 'Self-signed (for testing)') {
                    sslConfig = this.installer.generateSelfSignedSSL(domain)
                    if (sslConfig) {
                        this.ui.showSuccess('Self-signed certificate generated')
                    }
                }
            }
            
            // Set production config
            this.installer.setEnvironmentConfig('production', {
                domain,
                port,
                peers: [],
                ssl: sslConfig
            })
            
            // DDNS setup
            const setupDDNS = await this.ui.confirm('Configure GoDaddy DDNS?', false)
            if (setupDDNS) {
                const godaddyDomain = await this.ui.prompt('GoDaddy domain', domain.split('.').slice(-2).join('.'))
                const godaddyHost = await this.ui.prompt('Subdomain/host', '@')
                const godaddyKey = await this.ui.prompt('API key')
                const godaddySecret = await this.ui.prompt('API secret', '', true)
                
                this.installer.setupDDNS({
                    domain: godaddyDomain,
                    host: godaddyHost,
                    key: godaddyKey,
                    secret: godaddySecret
                })
            }
        } else {
            // Development config
            this.installer.setEnvironmentConfig('development', {
                domain: 'localhost',
                port: this.args.port || 8765,
                peers: []
            })
        }
        
        // Sync URL (optional)
        const syncUrl = await this.ui.prompt('Remote config sync URL (optional)', '')
        if (syncUrl) {
            this.installer.updateConfig({ sync: syncUrl })
        }
    }
    
    showSummary(): void {
        const summary = this.installer.getInstallationSummary()
        
        console.log('\n' + '═'.repeat(60))
        this.ui.showSuccess('Installation complete!')
        
        console.log('\nNext steps:')
        console.log('─'.repeat(40))
        
        console.log('\n1. Start Air:')
        console.log(`   ${summary.commands.start}`)
        
        console.log('\n2. Check status:')
        console.log(`   ${summary.commands.status}`)
        
        if (summary.urls.access) {
            console.log('\n3. Access your peer:')
            console.log(`   ${summary.urls.access}`)
        }
        
        console.log('\n' + '═'.repeat(60))
    }
}

// Run installer
const installer = new AirInstallerUI()
installer.run().catch(err => {
    console.error('Installation failed:', err)
    process.exit(1)
})