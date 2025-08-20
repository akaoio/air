#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths.js'
import syspaths from '../src/syspaths.js'
import permissions from '../src/permissions.js'
import type { AirConfig } from '../src/types/index.js'
import { AirUI, LocalSSL, LocalService, getPlatformPaths, hasSudo, hasSystemd, isTermux, isWindows, isMac, isLinux } from './ui.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface InstallerArgs {
    check?: boolean
    quick?: boolean
    nonInteractive?: boolean
    root?: string
    bash?: string
    env?: string
    name?: string
    port?: number
    domain?: string
    sync?: string
    ssl?: boolean
    godaddy?: {
        domain: string
        host: string
        key: string
        secret: string
    }
}

class AirInstaller {
    private config: any
    private args: InstallerArgs
    private platform: NodeJS.Platform
    private hostname: string
    private ui: AirUI
    private domainValue: string = '' // Store domain value to avoid asking twice
    
    constructor() {
        this.args = {}
        this.parseArgs()
        
        // Use smart path detection
        const paths = getPaths(this.args.root, this.args.bash)
        
        this.config = {
            root: paths.root,
            bash: paths.bash,
            env: this.args.env || 'development',
            name: this.args.name || 'air',
            port: this.args.port || 8765,
            domain: this.args.domain || 'localhost',
            peers: [],
            sync: null
        }
        this.platform = os.platform()
        this.hostname = os.hostname()
        this.ui = new AirUI('Air GUN Database Installer')
    }
    
    parseArgs(): void {
        this.args = {
            check: false,
            quick: false,
            nonInteractive: false
        }
        
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
            } else if (arg === '--godaddy' && i + 3 < argv.length) {
                this.args.godaddy = {
                    domain: argv[++i],
                    host: argv[++i],
                    key: argv[++i],
                    secret: argv[++i]
                }
                i++ // Skip secret arg
            }
        }
    }
    
    async run(): Promise<void> {
        try {
            this.ui.clear()
            const header = this.ui.createHeader()
            console.log(header)
            
            await this.checkSystem()
            
            if (this.args.check) {
                console.log('\nSystem check complete.')
                process.exit(0)
            }
            
            await this.buildConfig()
            await this.setupDDNS()
            await this.setupSSL()
            await this.saveConfig()
            await this.setupService()
            await this.finalReport()
            
        } catch (err) {
            this.ui.showError('Installation failed', err.message)
            process.exit(1)
        }
    }
    
    async checkSystem(): Promise<void> {
        const items = []
        
        // Node.js version
        const nodeVersion = process.version
        items.push({ label: 'Node.js', value: nodeVersion, status: 'info' })
        
        // npm version
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim()
            items.push({ label: 'npm', value: npmVersion, status: 'info' })
        } catch {
            items.push({ label: 'npm', value: 'Not found', status: 'warning' })
        }
        
        // Git version
        try {
            const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim()
            items.push({ label: 'Git', value: gitVersion, status: 'info' })
        } catch {
            items.push({ label: 'Git', value: 'Not found', status: 'warning' })
        }
        
        // Platform info
        items.push({ label: 'Platform', value: this.platform, status: 'info' })
        items.push({ label: 'Hostname', value: this.hostname, status: 'info' })
        
        // Permissions
        const sudoAvailable = hasSudo()
        items.push({ 
            label: 'Permissions', 
            value: sudoAvailable ? 'Full (sudo available)' : 'Limited (no sudo)', 
            status: sudoAvailable ? 'success' : 'warning' 
        })
        
        // Service management
        if (isWindows()) {
            items.push({ label: 'Service', value: 'Windows Startup', status: 'success' })
        } else if (isMac()) {
            items.push({ label: 'Service', value: 'launchd', status: 'success' })
        } else if (isTermux()) {
            items.push({ label: 'Service', value: 'Termux service', status: 'success' })
        } else if (hasSystemd()) {
            items.push({ label: 'Systemd', value: 'Available', status: 'success' })
        } else {
            items.push({ label: 'Service', value: 'Cron fallback', status: 'warning' })
        }
        
        // Check for existing installation
        const configPath = path.join(this.config.root, 'air.json')
        if (fs.existsSync(configPath)) {
            try {
                const existing = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                items.push({ label: 'Existing Air installation found', value: '', status: 'warning' })
                items.push({ label: '  Name', value: existing.name, status: 'info' })
                items.push({ label: '  Environment', value: existing.env, status: 'info' })
                
                if (!this.args.nonInteractive) {
                    const overwrite = await this.ui.confirm('Overwrite existing configuration?', false)
                    if (!overwrite) {
                        this.ui.showSuccess('Keeping existing configuration')
                        process.exit(0)
                    }
                }
            } catch (err) {
                // Invalid JSON, proceed with installation
            }
        }
        
        const statusSection = this.ui.createStatusSection('System Check', items)
        console.log(statusSection)
    }
    
    async buildConfig(): Promise<void> {
        const items = []
        
        if (!this.args.nonInteractive) {
            this.config.name = await this.ui.prompt('Instance name', this.config.name)
            this.config.env = await this.ui.select('Environment', ['development', 'production'], 
                this.config.env === 'production' ? 1 : 0)
            
            if (this.config.env === 'production') {
                // Store domain to avoid asking twice
                this.domainValue = await this.ui.prompt('Domain name', this.config.domain)
                this.config.domain = this.domainValue
                this.config.port = parseInt(await this.ui.prompt('Port', String(this.config.port)))
                
                const setupSSL = await this.ui.confirm('Enable SSL?', true)
                if (setupSSL) {
                    this.config.ssl = true
                }
                
                const addPeers = await this.ui.confirm('Add peer URLs?', false)
                if (addPeers) {
                    const peerList = await this.ui.prompt('Peer URLs (comma-separated)', '')
                    this.config.peers = peerList.split(',').map(p => p.trim()).filter(p => p)
                }
            }
            
            const syncUrl = await this.ui.prompt('Remote config sync URL (optional)', '')
            if (syncUrl) {
                this.config.sync = syncUrl
            }
        }
        
        // Create environment-specific config
        const envConfig: any = {
            domain: this.config.domain,
            port: this.config.port,
            peers: this.config.peers || []
        }
        
        if (this.config.ssl) {
            const paths = getPlatformPaths()
            const sslPath = paths.ssl
            envConfig.ssl = {
                key: path.join(sslPath, `${this.config.domain}.key`),
                cert: path.join(sslPath, `${this.config.domain}.crt`)
            }
        }
        
        this.config[this.config.env] = envConfig
        
        // Clean up temporary properties but keep domain for later use
        this.domainValue = this.config.domain // Store for later
        delete this.config.domain
        delete this.config.port
        delete this.config.peers
        delete this.config.ssl
        
        items.push({ label: 'Name', value: this.config.name, status: 'success' })
        items.push({ label: 'Environment', value: this.config.env, status: 'success' })
        items.push({ label: 'Root', value: this.config.root, status: 'success' })
        
        const configSection = this.ui.createStatusSection('Configuration', items)
        console.log(configSection)
    }
    
    async setupDDNS(): Promise<void> {
        if (this.config.env !== 'production') return
        if (this.args.nonInteractive && !this.args.godaddy) return
        
        const items = []
        
        const useGodaddy = this.args.godaddy || await this.ui.confirm('Configure GoDaddy DDNS?', false)
        if (!useGodaddy) return
        
        const godaddy: any = this.args.godaddy || {}
        
        if (!this.args.godaddy) {
            // Use stored domain value if it matches or ask for a new one
            const defaultDomain = this.domainValue?.includes('.') ? 
                this.domainValue.split('.').slice(-2).join('.') : ''
            godaddy.domain = await this.ui.prompt('GoDaddy domain (e.g., example.com)', defaultDomain)
            
            const defaultHost = this.domainValue?.includes('.') ? 
                this.domainValue.split('.').slice(0, -2).join('.') || '@' : '@'
            godaddy.host = await this.ui.prompt('Subdomain/host (e.g., peer)', defaultHost)
            
            godaddy.key = await this.ui.prompt('GoDaddy API key')
            godaddy.secret = await this.ui.prompt('GoDaddy API secret', '', true)
        }
        
        this.config[this.config.env].godaddy = godaddy
        
        items.push({ label: 'Domain', value: godaddy.domain, status: 'success' })
        items.push({ label: 'Host', value: godaddy.host, status: 'success' })
        items.push({ label: 'API Key', value: '***' + godaddy.key.slice(-4), status: 'success' })
        
        const ddnsSection = this.ui.createStatusSection('GoDaddy DDNS', items)
        console.log(ddnsSection)
    }
    
    async setupSSL(): Promise<void> {
        if (!this.config[this.config.env].ssl) return
        
        const items = []
        const ssl = new LocalSSL()
        const domain = this.config[this.config.env].domain || this.domainValue
        
        // Check if certificates already exist
        const keyPath = this.config[this.config.env].ssl.key
        const certPath = this.config[this.config.env].ssl.cert
        
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            items.push({ label: 'SSL Status', value: 'Certificates exist', status: 'success' })
        } else {
            if (this.args.nonInteractive) {
                items.push({ label: 'SSL Status', value: 'Manual setup required', status: 'warning' })
            } else {
                const sslMethod = await this.ui.select('SSL Certificate Method', [
                    'Self-signed (for testing)',
                    'Let\'s Encrypt (production)',
                    'Skip SSL setup'
                ], 0)
                
                if (sslMethod === 'Self-signed (for testing)') {
                    try {
                        const result = await ssl.generateSelfSigned(domain)
                        this.config[this.config.env].ssl = result
                        items.push({ label: 'SSL Status', value: 'Self-signed created', status: 'success' })
                    } catch (err) {
                        items.push({ label: 'SSL Status', value: 'Failed: ' + err.message, status: 'error' })
                    }
                } else if (sslMethod === 'Let\'s Encrypt (production)') {
                    const email = await this.ui.prompt('Email for SSL notifications')
                    try {
                        const result = await ssl.generateLetsEncrypt(domain, email)
                        this.config[this.config.env].ssl = result
                        items.push({ label: 'SSL Status', value: 'Let\'s Encrypt obtained', status: 'success' })
                    } catch (err) {
                        items.push({ label: 'SSL Status', value: 'Failed: ' + err.message, status: 'error' })
                        items.push({ label: 'Note', value: 'Manual setup required', status: 'warning' })
                    }
                } else {
                    delete this.config[this.config.env].ssl
                    items.push({ label: 'SSL Status', value: 'Skipped', status: 'info' })
                }
            }
        }
        
        if (items.length > 0) {
            const sslSection = this.ui.createStatusSection('SSL Certificate', items)
            console.log(sslSection)
        }
    }
    
    async saveConfig(): Promise<void> {
        const configPath = path.join(this.config.root, 'air.json')
        
        try {
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2))
            this.ui.showSuccess(`Configuration saved to ${configPath}`)
        } catch (err) {
            throw new Error(`Failed to save configuration: ${err.message}`)
        }
    }
    
    async setupService(): Promise<void> {
        if (this.config.env !== 'production') return
        if (this.args.nonInteractive) return
        
        const items = []
        const setupService = await this.ui.confirm('Set up auto-start service?', true)
        
        if (setupService) {
            const service = new LocalService(`air-${this.config.name}`)
            
            try {
                service.install(this.config)
                
                if (isWindows()) {
                    items.push({ label: 'Service', value: 'Windows Startup configured', status: 'success' })
                } else if (isMac()) {
                    items.push({ label: 'Service', value: 'launchd configured', status: 'success' })
                } else if (isTermux()) {
                    items.push({ label: 'Service', value: 'Termux service configured', status: 'success' })
                } else if (hasSystemd()) {
                    items.push({ label: 'Service', value: 'Systemd user service configured', status: 'success' })
                } else {
                    items.push({ label: 'Service', value: 'Cron job configured', status: 'success' })
                }
                
                items.push({ label: 'Auto-start', value: 'Enabled', status: 'success' })
            } catch (err) {
                items.push({ label: 'Service', value: 'Setup failed: ' + err.message, status: 'error' })
            }
        } else {
            items.push({ label: 'Service', value: 'Skipped', status: 'info' })
        }
        
        if (items.length > 0) {
            const serviceSection = this.ui.createStatusSection('Service Setup', items)
            console.log(serviceSection)
        }
    }
    
    async finalReport(): Promise<void> {
        console.log('\n' + '═'.repeat(60))
        this.ui.showSuccess('Installation complete!')
        
        console.log('\nNext steps:')
        console.log('1. Start Air:')
        console.log(`   bun run ${this.config.root}/src/main.ts`)
        console.log('')
        console.log('2. Check status:')
        console.log(`   bun ${path.join(__dirname, 'status.ts')}`)
        console.log('')
        
        if (this.config.env === 'production' && this.config[this.config.env].ssl) {
            console.log('3. Access your peer:')
            const domain = this.config[this.config.env].domain || this.domainValue
            console.log(`   https://${domain}:${this.config[this.config.env].port}`)
        }
        
        console.log('\n' + '═'.repeat(60))
    }
}

// Run installer
const installer = new AirInstaller()
installer.run().catch(err => {
    console.error('Installation failed:', err)
    process.exit(1)
})