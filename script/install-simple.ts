#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

/**
 * Simple Air Installer without TUI
 * Plain console-based installer that works reliably
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import readline from 'readline'
import { getPaths } from '../src/paths.js'
import type { AirConfig } from '../src/types/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Simple prompt function
function prompt(question: string, defaultValue: string = ''): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    
    return new Promise((resolve) => {
        const q = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `
        rl.question(q, (answer) => {
            rl.close()
            resolve(answer || defaultValue)
        })
    })
}

// Simple confirm function
async function confirm(question: string, defaultValue: boolean = true): Promise<boolean> {
    const answer = await prompt(`${question} (y/n)`, defaultValue ? 'y' : 'n')
    return answer.toLowerCase().startsWith('y')
}

// Simple select function
async function select(question: string, options: string[]): Promise<string> {
    console.log(`\n${question}:`)
    options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`))
    const answer = await prompt('Select option', '1')
    const index = parseInt(answer) - 1
    return options[index] || options[0]
}

interface InstallerArgs {
    nonInteractive: boolean
    quick: boolean
    check: boolean
    root?: string
    bash?: string
    env?: string
    name?: string
    port?: number
    domain?: string
}

interface GoDaddyConfig {
    domain: string
    host: string
    key: string
    secret: string
}

interface InstallerConfig {
    name: string
    env: string
    root: string
    bash: string
    port?: number
    domain?: string
    ssl?: {
        cert: string
        key: string
    }
    peers?: string[]
    godaddy?: GoDaddyConfig
    [key: string]: any // For environment-specific configs
}

class SimpleAirInstaller {
    private args: InstallerArgs
    private config: InstallerConfig
    private platform: NodeJS.Platform
    private hostname: string
    
    constructor() {
        this.args = this.parseArgs()
        const paths = getPaths(this.args.root, this.args.bash)
        
        this.config = {
            name: this.args.name || 'air',
            env: this.args.env || 'development',
            root: paths.root,
            bash: paths.bash
        }
        
        this.platform = os.platform()
        this.hostname = os.hostname()
    }
    
    private parseArgs(): InstallerArgs {
        const args: InstallerArgs = {
            nonInteractive: false,
            quick: false,
            check: false
        }
        
        const argv = process.argv.slice(2)
        for (let i = 0; i < argv.length; i++) {
            const arg = argv[i]
            const next = argv[i + 1]
            
            switch(arg) {
                case '--help':
                case '-h':
                    this.showHelp()
                    process.exit(0)
                    break
                case '--check':
                    args.check = true
                    break
                case '--quick':
                case '-q':
                    args.quick = true
                    args.nonInteractive = true
                    break
                case '--non-interactive':
                case '-n':
                    args.nonInteractive = true
                    break
                case '--root':
                case '-r':
                    args.root = next
                    i++
                    break
                case '--env':
                case '-e':
                    args.env = next
                    i++
                    break
                case '--name':
                    args.name = next
                    i++
                    break
                case '--port':
                case '-p':
                    args.port = parseInt(next)
                    i++
                    break
                case '--domain':
                case '-d':
                    args.domain = next
                    i++
                    break
            }
        }
        
        return args
    }
    
    private showHelp(): void {
        console.log(`
Air GUN Database Installer

Usage: air:install [options]

Options:
  -h, --help              Show this help message
  -q, --quick             Quick install with defaults
  -n, --non-interactive   Non-interactive mode
  --check                 Check installation only
  -r, --root <path>       Set root directory
  -e, --env <env>         Set environment (development/production)
  --name <name>           Set instance name
  -p, --port <port>       Set port number
  -d, --domain <domain>   Set domain name
  --no-tui, --simple      Use simple installer (no TUI)
`)
    }
    
    async run(): Promise<void> {
        try {
            console.log('\n╔══════════════════════════════════════════════════════════╗')
            console.log('║              Air GUN Database Installer (Simple)          ║')
            console.log('╚══════════════════════════════════════════════════════════╝\n')
            
            if (this.args.check) {
                await this.checkInstallation()
                return
            }
            
            await this.checkSystem()
            await this.configureInstance()
            await this.saveConfiguration()
            await this.setupSSL()
            await this.setupCronJobs()
            await this.setupService()
            await this.finalReport()
            
        } catch (err: any) {
            console.error('\n❌ Installation failed:', err.message)
            process.exit(1)
        }
    }
    
    private async checkSystem(): Promise<void> {
        console.log('\n📋 System Check\n' + '─'.repeat(40))
        
        const checks: string[] = []
        
        // Check Node.js
        try {
            const nodeVersion = process.version
            checks.push(`✅ Node.js: ${nodeVersion}`)
        } catch {
            checks.push('❌ Node.js: Not found')
        }
        
        // Check Bun
        try {
            const bunVersion = execSync('bun --version', { encoding: 'utf8' }).trim()
            checks.push(`✅ Bun: v${bunVersion}`)
        } catch {
            checks.push('⚠️  Bun: Not installed (optional)')
        }
        
        // Check permissions
        let canWrite = false
        try {
            if (fs.existsSync(this.config.root)) {
                fs.accessSync(this.config.root, fs.constants.W_OK)
                canWrite = true
            } else {
                canWrite = true // Directory doesn't exist, we can create it
            }
        } catch {
            canWrite = false
        }
        checks.push(canWrite ? '✅ Write permissions: OK' : '❌ Write permissions: Failed')
        
        // Check existing config
        const configPath = path.join(this.config.root, 'air.json')
        if (fs.existsSync(configPath)) {
            checks.push('⚠️  Configuration: Exists')
            
            if (!this.args.nonInteractive) {
                const overwrite = await confirm('Overwrite existing configuration?', false)
                if (!overwrite) {
                    console.log('✅ Keeping existing configuration')
                    process.exit(0)
                }
            }
        } else {
            checks.push('✅ Configuration: Ready to create')
        }
        
        checks.forEach(check => console.log(check))
    }
    
    private async configureInstance(): Promise<void> {
        console.log('\n⚙️  Configuration\n' + '─'.repeat(40))
        
        if (!this.args.nonInteractive) {
            this.config.name = await prompt('Instance name', this.config.name)
            this.config.env = await select('Environment', ['development', 'production'])
            
            if (this.config.env === 'production') {
                this.config.domain = await prompt('Domain name', this.args.domain || '')
                this.config.port = parseInt(await prompt('Port', String(this.args.port || 8765)))
                
                const setupSSL = await confirm('Enable SSL?', true)
                if (setupSSL) {
                    this.config.ssl = {
                        cert: './ssl/cert.pem',
                        key: './ssl/key.pem'
                    }
                }
                
                const addPeers = await confirm('Add peer URLs?', false)
                if (addPeers) {
                    const peerList = await prompt('Peer URLs (comma-separated)', '')
                    this.config.peers = peerList.split(',').map(p => p.trim()).filter(p => p)
                }
                
                // GoDaddy DDNS
                const setupDDNS = await confirm('Configure GoDaddy DDNS?', false)
                if (setupDDNS) {
                    const godaddy: GoDaddyConfig = {
                        domain: '',
                        host: '',
                        key: '',
                        secret: ''
                    }
                    godaddy.domain = await prompt('GoDaddy domain (e.g., example.com)')
                    godaddy.host = await prompt('Subdomain/host (e.g., air)', '@')
                    godaddy.key = await prompt('GoDaddy API key')
                    godaddy.secret = await prompt('GoDaddy API secret')
                    
                    this.config.godaddy = godaddy
                }
            }
        }
        
        // Create full config structure following Air's expected format
        const fullConfig: AirConfig = {
            name: this.config.name,
            env: this.config.env as 'development' | 'production',
            root: this.config.root,
            bash: this.config.bash,
            sync: '',
            ip: {
                timeout: 5000,
                dnsTimeout: 2000,
                userAgent: 'Air/2.0',
                dns: [],
                http: []
            },
            development: {},
            production: {}
        }
        
        // Add environment-specific config
        const envConfig: any = {
            port: this.config.port || 8765,
            domain: this.config.domain,
            ssl: this.config.ssl,
            peers: this.config.peers || [],
            godaddy: this.config.godaddy
        }
        
        // Set the environment config
        fullConfig[this.config.env] = envConfig
        
        // Update internal config
        this.config = fullConfig as InstallerConfig
        
        console.log('\nConfiguration summary:')
        console.log(`  Name: ${this.config.name}`)
        console.log(`  Environment: ${this.config.env}`)
        console.log(`  Root: ${this.config.root}`)
        console.log(`  Port: ${this.config[this.config.env].port}`)
        if (this.config[this.config.env].domain) {
            console.log(`  Domain: ${this.config[this.config.env].domain}`)
        }
    }
    
    private async saveConfiguration(): Promise<void> {
        const configPath = path.join(this.config.root, 'air.json')
        
        try {
            // Ensure directory exists
            if (!fs.existsSync(this.config.root)) {
                fs.mkdirSync(this.config.root, { recursive: true })
            }
            
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2))
            console.log(`\n✅ Configuration saved to ${configPath}`)
        } catch (err: any) {
            throw new Error(`Failed to save configuration: ${err.message}`)
        }
    }
    
    private async setupSSL(): Promise<void> {
        if (!this.config[this.config.env]?.ssl) return
        
        console.log('\n🔒 SSL Setup\n' + '─'.repeat(40))
        
        // First check and install SSL tools if needed
        const { SSLToolsInstaller } = await import('../src/Installer/ssl-tools.js')
        const sslTools = new SSLToolsInstaller()
        
        // Check current SSL tools status
        const toolsStatus = await sslTools.check()
        await sslTools.printStatus()
        
        const sslDir = path.join(this.config.root, 'ssl')
        if (!fs.existsSync(sslDir)) {
            fs.mkdirSync(sslDir, { recursive: true })
        }
        
        const certPath = path.join(sslDir, 'cert.pem')
        const keyPath = path.join(sslDir, 'key.pem')
        
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
            console.log('\n✅ SSL certificates already exist')
            return
        }
        
        if (!this.args.nonInteractive) {
            const sslMethods = [
                'Self-signed (for testing)',
                'Let\'s Encrypt (production)',
                'Manual (I\'ll provide certificates)'
            ]
            
            const sslMethod = await select('SSL Certificate Method', sslMethods)
            
            if (sslMethod === 'Self-signed (for testing)') {
                // Check if OpenSSL is available
                if (!toolsStatus.openssl.installed) {
                    console.log('⚠️  OpenSSL not found. Please install it first.')
                    return
                }
                
                try {
                    const domain = this.config[this.config.env].domain || 'localhost'
                    execSync(`openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/CN=${domain}"`, {
                        stdio: 'pipe'
                    })
                    console.log('✅ Self-signed certificate generated')
                } catch (err: any) {
                    console.log('⚠️  Failed to generate certificate:', err.message)
                }
            } else if (sslMethod === 'Let\'s Encrypt (production)') {
                const domain = this.config[this.config.env].domain
                if (!domain) {
                    console.log('❌ Domain name required for Let\'s Encrypt')
                    return
                }
                
                // Check if we need to install SSL tools
                if (!toolsStatus.certbot.installed && !toolsStatus.acmesh.installed) {
                    const install = await confirm('No SSL tools found. Install recommended tool?', true)
                    if (install) {
                        const email = await prompt('Email for SSL notifications (optional)', '')
                        const installed = await sslTools.installRecommended(email)
                        if (installed) {
                            console.log(`✅ Installed ${installed === 'acmesh' ? 'acme.sh' : 'Certbot'}`)
                        } else {
                            console.log('❌ Failed to install SSL tools')
                            return
                        }
                    }
                }
                
                // Setup certificate
                const hasGoDaddy = this.config[this.config.env].godaddy?.key && this.config[this.config.env].godaddy?.secret
                
                if (hasGoDaddy) {
                    console.log('\n🔑 Using GoDaddy DNS challenge (no ports required)...')
                    const success = await sslTools.setupCertificate(domain, this.config[this.config.env])
                    if (success) {
                        console.log('✅ SSL certificate configured successfully')
                        
                        // Update paths for acme.sh certificates
                        if (toolsStatus.acmesh.installed || toolsStatus.recommended === 'acmesh') {
                            const acmeCertPath = path.join(os.homedir(), '.acme.sh', domain, 'fullchain.cer')
                            const acmeKeyPath = path.join(os.homedir(), '.acme.sh', domain, `${domain}.key`)
                            
                            if (fs.existsSync(acmeCertPath) && fs.existsSync(acmeKeyPath)) {
                                // Create symlinks
                                fs.symlinkSync(acmeCertPath, certPath)
                                fs.symlinkSync(acmeKeyPath, keyPath)
                                console.log('✅ SSL certificates linked to Air directory')
                            }
                        }
                    } else {
                        console.log('⚠️  Certificate setup failed. Please try manual setup.')
                    }
                } else {
                    console.log('\n📝 To use Let\'s Encrypt, you need to:')
                    console.log('1. Configure GoDaddy API credentials for DNS challenge')
                    console.log('2. Or run Air on port 80 (requires sudo)')
                    console.log('3. Or use a reverse proxy')
                    
                    // Show instructions
                    const tool = toolsStatus.recommended || 'certbot'
                    const instructions = sslTools.getDNSChallengeInstructions(domain, tool)
                    console.log('\nManual setup instructions:')
                    console.log(instructions)
                }
            } else {
                console.log('📝 Please place your SSL certificates in:')
                console.log(`   Certificate: ${certPath}`)
                console.log(`   Private Key: ${keyPath}`)
            }
        } else {
            // Non-interactive mode: check and install SSL tools if needed
            if (!toolsStatus.certbot.installed && !toolsStatus.acmesh.installed) {
                console.log('📦 Installing recommended SSL tool...')
                const installed = await sslTools.installRecommended()
                if (installed) {
                    console.log(`✅ Installed ${installed === 'acmesh' ? 'acme.sh' : 'Certbot'}`)
                }
            }
        }
    }
    
    private async setupService(): Promise<void> {
        if (this.args.nonInteractive) return
        
        console.log('\n🚀 Service Setup\n' + '─'.repeat(40))
        
        const setupService = await confirm('Set up auto-start service?', false)
        if (!setupService) {
            console.log('⏭️  Skipping service setup')
            return
        }
        
        if (this.platform === 'linux' && fs.existsSync('/etc/systemd/system')) {
            // Create systemd service
            const serviceName = `${this.config.name}.service`
            const serviceContent = `[Unit]
Description=Air GUN Database - ${this.config.name}
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${this.config.root}
ExecStart=/usr/bin/node ${this.config.root}/dist/main.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
`
            
            const servicePath = `/etc/systemd/system/${serviceName}`
            
            // Check if we can use sudo
            let canUseSudo = false
            try {
                execSync('sudo -n true', { stdio: 'ignore' })
                canUseSudo = true
            } catch {
                canUseSudo = false
            }
            
            if (canUseSudo) {
                try {
                    console.log('📝 Creating systemd service...')
                    
                    // Create service file
                    const tempFile = path.join(os.tmpdir(), `${serviceName}.tmp`)
                    fs.writeFileSync(tempFile, serviceContent)
                    execSync(`sudo mv ${tempFile} ${servicePath}`, { stdio: 'pipe' })
                    
                    // Set permissions
                    execSync(`sudo chmod 644 ${servicePath}`, { stdio: 'pipe' })
                    
                    // Reload systemd
                    console.log('🔄 Reloading systemd...')
                    execSync('sudo systemctl daemon-reload', { stdio: 'pipe' })
                    
                    // Enable service
                    console.log('✅ Enabling service...')
                    execSync(`sudo systemctl enable ${serviceName}`, { stdio: 'pipe' })
                    
                    // Ask if should start now
                    const startNow = await confirm('Start service now?', true)
                    if (startNow) {
                        execSync(`sudo systemctl start ${serviceName}`, { stdio: 'pipe' })
                        console.log('✅ Service started successfully!')
                        console.log(`\n📊 Check status: sudo systemctl status ${serviceName}`)
                        console.log(`📜 View logs: sudo journalctl -u ${serviceName} -f`)
                    } else {
                        console.log(`\n▶️  Start later: sudo systemctl start ${serviceName}`)
                    }
                } catch (err: any) {
                    console.error('❌ Failed to create service:', err.message)
                    console.log('\nManual setup commands:')
                    console.log(`sudo tee ${servicePath} > /dev/null << 'EOF'`)
                    console.log(serviceContent)
                    console.log('EOF')
                    console.log(`sudo systemctl daemon-reload`)
                    console.log(`sudo systemctl enable ${serviceName}`)
                    console.log(`sudo systemctl start ${serviceName}`)
                }
            } else {
                // No sudo access - try user service or provide instructions
                const userServiceDir = path.join(os.homedir(), '.config/systemd/user')
                
                if (fs.existsSync('/usr/bin/systemctl')) {
                    console.log('🔒 No sudo access. Setting up user service instead...')
                    
                    try {
                        // Create user systemd directory if needed
                        if (!fs.existsSync(userServiceDir)) {
                            fs.mkdirSync(userServiceDir, { recursive: true })
                        }
                        
                        // Modify service for user mode
                        const userServiceContent = serviceContent
                            .replace('WantedBy=multi-user.target', 'WantedBy=default.target')
                            .replace(`User=${os.userInfo().username}\n`, '') // Remove User line for user services
                        
                        const userServicePath = path.join(userServiceDir, serviceName)
                        fs.writeFileSync(userServicePath, userServiceContent)
                        
                        // Reload user systemd
                        execSync('systemctl --user daemon-reload', { stdio: 'pipe' })
                        
                        // Enable user service
                        execSync(`systemctl --user enable ${serviceName}`, { stdio: 'pipe' })
                        
                        console.log('✅ User service created successfully!')
                        
                        const startNow = await confirm('Start service now?', true)
                        if (startNow) {
                            execSync(`systemctl --user start ${serviceName}`, { stdio: 'pipe' })
                            console.log('✅ Service started!')
                            console.log(`\n📊 Check status: systemctl --user status ${serviceName}`)
                            console.log(`📜 View logs: journalctl --user -u ${serviceName} -f`)
                        } else {
                            console.log(`\n▶️  Start later: systemctl --user start ${serviceName}`)
                        }
                        
                        console.log('\n📝 Note: User services start when you log in')
                        console.log('   To start at boot: loginctl enable-linger')
                    } catch (err: any) {
                        console.error('❌ Failed to create user service:', err.message)
                        this.showAlternativeServiceOptions()
                    }
                } else {
                    this.showAlternativeServiceOptions()
                }
            }
        } else {
            this.showAlternativeServiceOptions()
        }
    }
    
    private async setupCronJobs(): Promise<void> {
        console.log('\n⏰ Cron Job Setup\n' + '─'.repeat(40))
        
        const { CronManager } = await import('../src/Installer/cron-manager.js')
        const cronManager = new CronManager()
        
        // Clean old jobs first
        const cleanResult = cronManager.cleanOldJobs(this.config as any)
        if (cleanResult.success && cleanResult.message.includes('Removed')) {
            console.log(`🧹 ${cleanResult.message}`)
        }
        
        // Setup DDNS cron if GoDaddy is configured
        if (this.config[this.config.env]?.godaddy?.key) {
            console.log('\n📡 Setting up DDNS auto-update...')
            const ddnsResult = await cronManager.setupDDNS(this.config as any)
            if (ddnsResult.success) {
                console.log(`✅ ${ddnsResult.message}`)
            } else {
                console.log(`⚠️  ${ddnsResult.message}`)
            }
        }
        
        // Setup SSL renewal if certificates exist
        if (this.config[this.config.env]?.ssl) {
            const sslDir = path.join(this.config.root, 'ssl')
            const certPath = path.join(sslDir, 'cert.pem')
            
            if (fs.existsSync(certPath)) {
                // Detect which SSL tool is being used
                const { SSLToolsInstaller } = await import('../src/Installer/ssl-tools.js')
                const sslTools = new SSLToolsInstaller()
                const toolsStatus = await sslTools.check()
                
                if (toolsStatus.certbot.installed || toolsStatus.acmesh.installed) {
                    const tool = toolsStatus.certbot.installed ? 'certbot' : 'acmesh'
                    console.log(`\n🔐 Setting up SSL auto-renewal (${tool})...`)
                    
                    const sslResult = cronManager.setupSSLRenewal(this.config as any, tool)
                    if (sslResult.success) {
                        console.log(`✅ ${sslResult.message}`)
                    } else {
                        console.log(`⚠️  ${sslResult.message}`)
                    }
                }
            }
        }
        
        // Show cron status
        const status = cronManager.getStatus()
        console.log('\n' + status)
    }
    
    private showAlternativeServiceOptions(): void {
        console.log('\n📝 Alternative auto-start options:')
        console.log('\n1. PM2 (recommended for non-systemd):')
        console.log('   npm install -g pm2')
        console.log(`   pm2 start ${this.config.root}/dist/main.js --name ${this.config.name}`)
        console.log('   pm2 save')
        console.log('   pm2 startup')
        
        console.log('\n2. Cron job:')
        console.log('   crontab -e')
        console.log(`   @reboot cd ${this.config.root} && /usr/bin/node dist/main.js >> logs/air.log 2>&1`)
        
        console.log('\n3. Docker:')
        console.log(`   docker run -d --restart=always --name ${this.config.name} \\`)
        console.log(`     -v ${this.config.root}:/app \\`)
        console.log(`     -p ${this.config[this.config.env].port}:${this.config[this.config.env].port} \\`)
        console.log('     node:18 node /app/dist/main.js')
    }
    
    private async checkInstallation(): Promise<void> {
        console.log('\n🔍 Checking Installation\n' + '─'.repeat(40))
        
        const configPath = path.join(this.config.root, 'air.json')
        if (fs.existsSync(configPath)) {
            console.log('✅ Configuration file exists')
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
            console.log(`   Name: ${config.name}`)
            console.log(`   Environment: ${config.env}`)
        } else {
            console.log('❌ Configuration file not found')
        }
        
        // Check if service is running
        try {
            execSync(`pgrep -f "${this.config.name}"`, { stdio: 'pipe' })
            console.log('✅ Service is running')
        } catch {
            console.log('⚠️  Service is not running')
        }
    }
    
    private async finalReport(): Promise<void> {
        console.log('\n' + '═'.repeat(60))
        console.log('✅ Installation complete!')
        
        console.log('\n📋 Next steps:')
        console.log('1. Start the server:')
        console.log(`   cd ${this.config.root}`)
        console.log('   npm start')
        console.log('')
        console.log('2. Test the installation:')
        console.log(`   curl http://localhost:${this.config[this.config.env].port}/gun`)
        
        if (this.config[this.config.env].domain) {
            console.log('')
            console.log('3. Access your instance:')
            console.log(`   https://${this.config[this.config.env].domain}:${this.config[this.config.env].port}/gun`)
        }
    }
}

// Run installer if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const installer = new SimpleAirInstaller()
    installer.run()
}

export default SimpleAirInstaller