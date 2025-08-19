#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths'
import syspaths from '../src/syspaths'
import permissions from '../src/permissions'
import readline from 'readline'
import type { AirConfig } from '../src/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ANSI color codes
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
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m'
}

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

interface SystemInfo {
    hasSystemd?: boolean
}

class AirInstaller {
    private config: any
    private args: InstallerArgs
    private platform: NodeJS.Platform
    private hostname: string
    private systemInfo: SystemInfo
    private rl: readline.Interface
    
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
            sync: null,
            ssl: false,
            godaddy: {},
            network: {}
        }
        this.platform = os.platform()
        this.hostname = os.hostname()
        this.systemInfo = {}
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
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
                this.args.nonInteractive = true
            } else if (arg === '--non-interactive' || arg === '-n') {
                this.args.nonInteractive = true
            } else if ((arg === '--root' || arg === '-r') && i + 1 < argv.length) {
                this.args.root = argv[++i]
            } else if ((arg === '--bash' || arg === '-b') && i + 1 < argv.length) {
                this.args.bash = argv[++i]
            } else if ((arg === '--env' || arg === '-e') && i + 1 < argv.length) {
                this.args.env = argv[++i]
            } else if ((arg === '--name') && i + 1 < argv.length) {
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
            }
        }
    }
    
    // Colored output methods
    success(message: string): void {
        console.log(colors.green + colors.bright + '✓ ' + colors.reset + colors.green + message + colors.reset)
    }
    
    error(message: string): void {
        console.log(colors.red + colors.bright + '✗ ' + colors.reset + colors.red + message + colors.reset)
    }
    
    warning(message: string): void {
        console.log(colors.yellow + colors.bright + '⚠ ' + colors.reset + colors.yellow + message + colors.reset)
    }
    
    info(message: string): void {
        console.log(colors.cyan + 'ℹ ' + message + colors.reset)
    }
    
    header(title: string): void {
        const width = 60
        const padding = Math.floor((width - title.length - 2) / 2)
        const line = '═'.repeat(width)
        
        console.log('')
        console.log(colors.cyan + colors.bright + line + colors.reset)
        console.log(colors.cyan + colors.bright + '║' + ' '.repeat(padding) + title + ' '.repeat(width - padding - title.length - 2) + '║' + colors.reset)
        console.log(colors.cyan + colors.bright + line + colors.reset)
        console.log('')
    }
    
    section(title: string): void {
        console.log('')
        console.log(colors.magenta + colors.bright + '▶ ' + title + colors.reset)
        console.log(colors.magenta + '  ' + '─'.repeat(title.length + 2) + colors.reset)
        console.log('')
    }
    
    async prompt(question: string, defaultValue = ''): Promise<string> {
        return new Promise((resolve) => {
            const q = defaultValue ? `${question} (${colors.dim}${defaultValue}${colors.reset}): ` : `${question}: `
            this.rl.question(q, (answer) => {
                resolve(answer || defaultValue)
            })
        })
    }
    
    async confirm(question: string, defaultYes = true): Promise<boolean> {
        const defaultText = defaultYes ? 'Y/n' : 'y/N'
        const answer = await this.prompt(`${question} (${colors.bright}${defaultText}${colors.reset})`)
        const normalized = answer.toLowerCase().trim()
        
        if (normalized === '') {
            return defaultYes
        }
        
        return normalized === 'y' || normalized === 'yes'
    }
    
    async checkSystem(): Promise<boolean> {
        this.section('System Check')
        
        // Check Node.js version
        const nodeVersion = process.version
        this.info(`Node.js: ${nodeVersion}`)
        
        // Check npm version
        try {
            const npmVersion = execSync('npm --version').toString().trim()
            this.info(`npm: ${npmVersion}`)
        } catch {
            this.error('npm: not found')
        }
        
        // Check Git
        try {
            const gitVersion = execSync('git --version').toString().trim()
            this.info(`Git: ${gitVersion}`)
        } catch {
            this.warning('Git: not found')
        }
        
        // Check platform
        this.info(`Platform: ${this.platform}`)
        this.info(`Hostname: ${this.hostname}`)
        
        // Check permissions
        const perms = await permissions.check(this.config.root)
        if (perms.canWrite) {
            this.success('Permissions: OK')
        } else {
            this.warning('Permissions: Limited')
        }
        
        if (perms.isRoot) {
            this.warning('Running as root/administrator')
        }
        
        // Check if systemd is available (Linux)
        if (this.platform === 'linux') {
            try {
                execSync('which systemctl', { stdio: 'ignore' })
                this.systemInfo.hasSystemd = true
                this.success('Systemd: Available')
            } catch {
                this.systemInfo.hasSystemd = false
                this.warning('Systemd: Not available')
            }
        }
        
        // Check for existing Air installation
        const configPath = path.join(this.config.root, 'air.json')
        if (fs.existsSync(configPath)) {
            this.warning('Existing Air installation found')
            const existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
            this.info(`  Name: ${existingConfig.name}`)
            this.info(`  Environment: ${existingConfig.env}`)
            
            if (!this.args.nonInteractive) {
                const overwrite = await this.confirm('Overwrite existing configuration?', false)
                if (!overwrite) {
                    this.warning('Installation cancelled')
                    process.exit(0)
                }
            }
        }
        
        return true
    }
    
    async configureBasic(): Promise<void> {
        this.section('Basic Configuration')
        
        if (!this.args.nonInteractive) {
            this.config.name = await this.prompt('Node name', this.config.name)
            this.config.env = await this.prompt('Environment (development/production)', this.config.env)
            
            if (this.config.env === 'production') {
                this.config.domain = await this.prompt('Domain name', this.config.domain)
                this.config.port = parseInt(await this.prompt('Port', String(this.config.port)))
                
                const enableSSL = await this.confirm('Enable SSL/HTTPS?', this.config.ssl)
                if (enableSSL) {
                    this.config.ssl = true
                }
            } else {
                this.config.port = parseInt(await this.prompt('Port', String(this.config.port)))
            }
            
            const syncUrl = await this.prompt('Remote config sync URL (optional)', '')
            if (syncUrl) {
                this.config.sync = syncUrl
            }
        }
        
        // Create environment-specific config
        const envConfig = {
            domain: this.config.domain,
            port: this.config.port,
            peers: this.config.peers || []
        }
        
        if (this.config.ssl) {
            envConfig.ssl = {
                key: path.join('/etc/letsencrypt/live', this.config.domain, 'privkey.pem'),
                cert: path.join('/etc/letsencrypt/live', this.config.domain, 'fullchain.pem')
            }
        }
        
        this.config[this.config.env] = envConfig
        
        // Remove temporary properties
        delete this.config.domain
        delete this.config.port
        delete this.config.peers
        delete this.config.ssl
        delete this.config.godaddy
        delete this.config.network
    }
    
    async configurePeers(): Promise<void> {
        this.section('Peer Configuration')
        
        if (this.args.nonInteractive) {
            this.info('Skipping peer configuration (non-interactive mode)')
            return
        }
        
        const addPeers = await this.confirm('Add peer connections?', false)
        if (!addPeers) return
        
        const peers = []
        let addMore = true
        
        while (addMore) {
            const peerUrl = await this.prompt('Peer URL (e.g., wss://peer.example.com/gun)')
            if (peerUrl) {
                peers.push(peerUrl)
                this.success(`Added peer: ${peerUrl}`)
            }
            
            addMore = await this.confirm('Add another peer?', false)
        }
        
        if (peers.length > 0) {
            this.config[this.config.env].peers = peers
        }
    }
    
    async configureGodaddy(): Promise<void> {
        this.section('GoDaddy DDNS Configuration')
        
        if (this.args.nonInteractive) {
            if (this.args.godaddy) {
                this.config[this.config.env].godaddy = this.args.godaddy
                this.success('GoDaddy DDNS configured from command line')
            } else {
                this.info('Skipping GoDaddy configuration (non-interactive mode)')
            }
            return
        }
        
        const useGodaddy = await this.confirm('Configure GoDaddy DDNS?', false)
        if (!useGodaddy) return
        
        const godaddy = {}
        godaddy.domain = await this.prompt('GoDaddy domain (e.g., example.com)')
        godaddy.host = await this.prompt('Subdomain/host (e.g., peer)', '@')
        godaddy.key = await this.prompt('GoDaddy API key')
        godaddy.secret = await this.prompt('GoDaddy API secret')
        
        this.config[this.config.env].godaddy = godaddy
        this.success('GoDaddy DDNS configured')
    }
    
    async setupSSL(): Promise<void> {
        if (!this.config[this.config.env].ssl) return
        
        this.section('SSL Certificate Setup')
        
        const domain = this.config[this.config.env].domain
        
        // Check if certificates already exist
        const keyPath = this.config[this.config.env].ssl.key
        const certPath = this.config[this.config.env].ssl.cert
        
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            this.success('SSL certificates already exist')
            return
        }
        
        if (this.args.nonInteractive) {
            this.warning('SSL certificates not found. Please set up manually.')
            return
        }
        
        // Install certbot if needed
        this.info('Checking for certbot...')
        try {
            execSync('which certbot', { stdio: 'ignore' })
            this.success('Certbot found')
        } catch {
            this.info('Installing certbot...')
            
            try {
                if (this.platform === 'linux') {
                    // Try apt first
                    try {
                        execSync('sudo apt-get update && sudo apt-get install -y certbot', { stdio: 'inherit' })
                    } catch {
                        // Try yum
                        try {
                            execSync('sudo yum install -y certbot', { stdio: 'inherit' })
                        } catch {
                            // Try snap
                            execSync('sudo snap install --classic certbot', { stdio: 'inherit' })
                        }
                    }
                }
                this.success('Certbot installed')
            } catch (err) {
                this.error('Failed to install certbot. Please install manually.')
                return
            }
        }
        
        // Request certificate
        this.info(`Requesting SSL certificate for ${domain}...`)
        
        try {
            const email = await this.prompt('Email for SSL notifications')
            const cmd = `sudo certbot certonly --standalone -d ${domain} --email ${email} --agree-tos --non-interactive`
            
            execSync(cmd, { stdio: 'inherit' })
            this.success('SSL certificate obtained successfully')
        } catch (err) {
            this.error('Failed to obtain SSL certificate')
            this.info('Please run certbot manually or check your domain configuration')
        }
    }
    
    async setupSystemd(): Promise<void> {
        if (!this.systemInfo.hasSystemd) return
        if (this.config.env !== 'production') return
        
        this.section('Systemd Service Setup')
        
        if (this.args.nonInteractive) {
            this.info('Skipping systemd setup (non-interactive mode)')
            return
        }
        
        const setupService = await this.confirm('Set up systemd service?', true)
        if (!setupService) return
        
        const serviceName = `air-${this.config.name}`
        const serviceFile = `/etc/systemd/system/${serviceName}.service`
        
        const serviceContent = `[Unit]
Description=Air GUN Database - ${this.config.name}
After=network.target

[Service]
Type=simple
User=${process.env.USER || 'root'}
WorkingDirectory=${this.config.root}
ExecStart=/usr/bin/node ${path.join(this.config.root, 'main.js')}
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${serviceName}
Environment="NODE_ENV=${this.config.env}"

[Install]
WantedBy=multi-user.target`
        
        try {
            // Write service file
            fs.writeFileSync(`/tmp/${serviceName}.service`, serviceContent)
            execSync(`sudo mv /tmp/${serviceName}.service ${serviceFile}`)
            
            // Reload systemd
            execSync('sudo systemctl daemon-reload')
            
            // Enable service
            execSync(`sudo systemctl enable ${serviceName}`)
            
            this.success(`Service ${serviceName} created and enabled`)
            
            const startNow = await this.confirm('Start the service now?', true)
            if (startNow) {
                execSync(`sudo systemctl start ${serviceName}`)
                this.success(`Service ${serviceName} started`)
            }
        } catch (err) {
            this.error(`Failed to set up systemd service: ${err.message}`)
        }
    }
    
    async saveConfiguration(): Promise<void> {
        this.section('Saving Configuration')
        
        const configPath = path.join(this.config.root, 'air.json')
        
        try {
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2))
            this.success(`Configuration saved to ${configPath}`)
        } catch (err) {
            this.error(`Failed to save configuration: ${err.message}`)
            process.exit(1)
        }
    }
    
    showSummary(): void {
        console.log('')
        console.log(colors.green + colors.bright + '╔════════════════════════════════════════════════════════════╗' + colors.reset)
        console.log(colors.green + colors.bright + '║' + colors.reset + '           🎉 ' + colors.green + colors.bright + 'Air Installation Complete!' + colors.reset + ' 🎉              ' + colors.green + colors.bright + '║' + colors.reset)
        console.log(colors.green + colors.bright + '╚════════════════════════════════════════════════════════════╝' + colors.reset)
        console.log('')
        console.log(colors.bright + 'Configuration:' + colors.reset)
        console.log(`  📛 Name: ${colors.cyan}${this.config.name}${colors.reset}`)
        console.log(`  🌍 Environment: ${colors.cyan}${this.config.env}${colors.reset}`)
        console.log(`  📁 Root: ${colors.cyan}${this.config.root}${colors.reset}`)
        console.log(`  🔧 Bash: ${colors.cyan}${this.config.bash}${colors.reset}`)
        console.log('')
        console.log(colors.bright + 'Next steps:' + colors.reset)
        console.log(`  1️⃣  Start Air: ${colors.green}npm start${colors.reset}`)
        console.log(`  2️⃣  Check status: ${colors.green}npm run status${colors.reset}`)
        console.log(`  3️⃣  View logs: ${colors.green}npm run logs${colors.reset}`)
        console.log('')
        console.log(colors.cyan + 'Thank you for using Air! 🚀' + colors.reset)
        console.log('')
    }
    
    async run(): Promise<void> {
        if (this.args.check) {
            this.header('Air Installer - System Check')
            await this.checkSystem()
            this.rl.close()
            process.exit(0)
        }
        
        this.header('Air GUN Database Installer')
        
        await this.checkSystem()
        await this.configureBasic()
        await this.configurePeers()
        await this.configureGodaddy()
        await this.setupSSL()
        await this.saveConfiguration()
        await this.setupSystemd()
        this.showSummary()
        
        this.rl.close()
    }
}

// Run installer
const installer = new AirInstaller()
installer.run().catch(err => {
    console.error(colors.red + colors.bright + 'Installation failed:' + colors.reset, err)
    process.exit(1)
})