#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

/**
 * Clean installation script using function-per-file architecture
 * UI layer only - all business logic in src/installer/*
 */

import { TUI } from '@akaoio/tui'
import { 
    check,
    detect,
    configure,
    save,
    ssl,
    service,
    start
} from '../src/installer/index.js'

class InstallUI {
    private ui: TUI
    private options: any = {}
    
    constructor() {
        this.ui = new TUI({ title: 'Air Installation' })
        this.parseArgs()
    }
    
    parseArgs() {
        const args = process.argv.slice(2)
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            if (arg === '--name' && args[i + 1]) {
                this.options.name = args[++i]
            } else if (arg === '--port' && args[i + 1]) {
                this.options.port = parseInt(args[++i])
            } else if (arg === '--env' && args[i + 1]) {
                this.options.env = args[++i]
            } else if (arg === '--domain' && args[i + 1]) {
                this.options.domain = args[++i]
            } else if (arg === '-y' || arg === '--yes') {
                this.options.nonInteractive = true
            }
        }
    }
    
    async run() {
        try {
            this.ui.clear()
            console.log(this.ui.createHeader())
            
            // 1. Check system using standalone function
            const systemInfo = check()
            this.showSystemInfo(systemInfo)
            
            // 2. Detect existing installation
            const existing = detect(this.options.root || process.cwd())
            if (existing && !this.options.nonInteractive) {
                const overwrite = await this.ui.confirm('Overwrite existing config?', false)
                if (!overwrite) {
                    this.ui.showSuccess('Keeping existing configuration')
                    return
                }
            }
            
            // 3. Build configuration
            if (!this.options.nonInteractive) {
                await this.interactiveConfig()
            }
            
            // 4. Create config using standalone function
            const config = configure(this.options)
            
            // 5. Generate SSL if needed
            if (this.options.ssl && config.env === 'production') {
                const sslConfig = ssl(this.options.domain || 'localhost')
                if (sslConfig) {
                    config[config.env].ssl = sslConfig
                    this.ui.showSuccess('SSL certificate generated')
                }
            }
            
            // 6. Save configuration
            save(config)
            this.ui.showSuccess('Configuration saved')
            
            // 7. Install service
            if (config.env === 'production' && !this.options.nonInteractive) {
                const setupService = await this.ui.confirm('Setup auto-start service?', true)
                if (setupService) {
                    const result = service(config)
                    if (result.success) {
                        this.ui.showSuccess(result.message)
                    }
                }
            }
            
            // 8. Start Air
            if (!this.options.nonInteractive) {
                const startNow = await this.ui.confirm('Start Air now?', true)
                if (startNow) {
                    const result = start(config)
                    if (result.success) {
                        this.ui.showSuccess(`Air started (PID: ${result.pid})`)
                    }
                }
            }
            
            this.showSummary(config)
            
        } catch (err: any) {
            this.ui.showError('Installation failed', err.message)
        } finally {
            this.ui.close()
        }
    }
    
    showSystemInfo(info: any) {
        const items = []
        items.push({ label: 'Node.js', value: info.nodeVersion, status: 'info' })
        items.push({ label: 'Platform', value: info.platform, status: 'info' })
        items.push({ label: 'Permissions', value: info.hasSudo ? 'Full' : 'Limited', status: info.hasSudo ? 'success' : 'warning' })
        console.log(this.ui.createStatusSection('System Check', items))
    }
    
    async interactiveConfig() {
        this.options.name = await this.ui.prompt('Instance name', this.options.name || 'air')
        
        const useProduction = await this.ui.confirm('Production environment?', false)
        this.options.env = useProduction ? 'production' : 'development'
        
        if (this.options.env === 'production') {
            this.options.domain = await this.ui.prompt('Domain', 'example.com')
            this.options.port = parseInt(await this.ui.prompt('Port', '8765'))
            this.options.ssl = await this.ui.confirm('Enable SSL?', true)
        }
    }
    
    showSummary(config: any) {
        console.log('\n' + '═'.repeat(60))
        this.ui.showSuccess('Installation complete!')
        console.log('\nConfiguration:')
        console.log(`  Name: ${config.name}`)
        console.log(`  Environment: ${config.env}`)
        console.log(`  Root: ${config.root}`)
        console.log('═'.repeat(60))
    }
}

// Run
const installer = new InstallUI()
installer.run()