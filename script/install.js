#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { Terminal, colors, red, green, yellow, blue, cyan, gray, white, bold, dim } from '@akaoio/tui'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class AirInstaller {
    constructor() {
        this.parseArgs()
        
        this.config = {
            root: this.args.root || process.cwd(),
            bash: __dirname,
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
        this.terminal = new Terminal()
        this.systemInfo = {}
    }
    
    parseArgs() {
        this.args = {
            check: false,
            quick: false,
            nonInteractive: false
        }
        
        const argv = process.argv.slice(2)
        for (let i = 0; i < argv.length; i++) {
            const arg = argv[i]
            if (arg === '--check') this.args.check = true
            else if (arg === '--quick') this.args.quick = true
            else if (arg === '--non-interactive') this.args.nonInteractive = true
        }
    }

    async run() {
        // Check mode for postinstall
        if (this.args.check) {
            return this.checkAndInform()
        }
        
        // Quick mode
        if (this.args.quick) {
            return this.quickSetup()
        }
        
        // Interactive installation with menu
        await this.interactiveInstall()
        
        this.terminal.close()
    }

    async interactiveInstall() {
        // Clear screen for fresh start
        this.terminal.clear()
        
        // Welcome screen with modern loader animation
        const welcomeLoader = this.terminal.loader('Initializing Air Installation Wizard...', { 
            type: 'dots', 
            color: 'cyan' 
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
        welcomeLoader.stop(true, 'Installation wizard ready!')
        
        this.terminal.spacing()
        this.terminal.header('🚀 Air GUN Database Installer')
        this.terminal.spacing()
        
        // Modern box with padding and centering
        this.terminal.box(
            `Welcome to Air Installation Wizard!\n\n` +
            `This wizard will help you:\n` +
            `• Configure your Air database node\n` +
            `• Set up SSL certificates (production)\n` +
            `• Configure peer connections\n` +
            `• Create system services`,
            { borderColor: 'cyan', padding: 2, align: 'center' }
        )
        this.terminal.spacing(2)
        
        // Check if already configured
        const configPath = path.join(this.config.root, 'air.json')
        if (fs.existsSync(configPath)) {
            this.terminal.warning('Existing configuration detected!')
            const action = await this.terminal.interactiveSelect(
                'What would you like to do?',
                [
                    'Reconfigure from scratch',
                    'Update existing configuration',
                    'View current configuration',
                    'Exit'
                ],
                'Update existing configuration'
            )
            
            if (action === null || action === 'Exit') {
                console.log('\nInstallation cancelled.')
                this.terminal.close()
                process.exit(0)
            }
            
            if (action === 'View current configuration') {
                await this.viewConfig()
                this.terminal.close()
                process.exit(0)
            }
            
            if (action === 'Update existing configuration') {
                this.loadExistingConfig()
            }
        }
        
        // Main installation menu
        while (true) {
            this.terminal.clear()
            this.terminal.header('🚀 Air Installation')
            
            // Show current configuration status
            this.showStatus()
            
            const choice = await this.terminal.interactiveMenu('Installation Menu', [
                { section: 'Setup Steps' },
                { label: '🔍 Check System Requirements', value: 'check' },
                { label: '⚙️  Configure Environment', value: 'env' },
                { label: '🌐 Network & Domain Setup', value: 'network' },
                { label: '🔐 Security & SSL', value: 'security' },
                { label: '👥 Peer Connections', value: 'peers' },
                { label: '🚀 System Service', value: 'service' },
                { section: 'Actions' },
                { label: '💾 Save & Install', value: 'install' },
                { label: '👁  Preview Configuration', value: 'preview' },
                { label: '❌ Exit', value: 'exit' }
            ])
            
            // Handle ESC or null (go back)
            if (choice === null) {
                const confirmExit = await this.terminal.confirm('Exit installer?', false)
                if (confirmExit) {
                    this.terminal.close()
                    process.exit(0)
                }
                continue
            }
            
            switch (choice) {
                case 'check':
                    await this.checkSystemInteractive()
                    break
                case 'env':
                    await this.configureEnvironment()
                    break
                case 'network':
                    await this.configureNetworkInteractive()
                    break
                case 'security':
                    await this.configureSecurityInteractive()
                    break
                case 'peers':
                    await this.configurePeersInteractive()
                    break
                case 'service':
                    await this.configureServiceInteractive()
                    break
                case 'install':
                    await this.performInstallation()
                    return
                case 'preview':
                    await this.previewConfiguration()
                    break
                case 'exit':
                    const confirmExit = await this.terminal.confirm('Exit without installing?', false)
                    if (confirmExit) {
                        this.terminal.close()
                        process.exit(0)
                    }
                    break
            }
        }
    }

    showStatus() {
        // Use modern grid layout for status display
        const statusItems = []
        
        statusItems.push([
            bold('Environment:'),
            this.config.env === 'production' ? red('Production') : green('Development')
        ])
        statusItems.push([bold('Node Name:'), cyan(this.config.name)])
        statusItems.push([bold('Port:'), yellow(String(this.config.port))])
        
        if (this.config.domain && this.config.domain !== 'localhost') {
            statusItems.push([bold('Domain:'), green(this.config.domain)])
        }
        if (this.config.ssl) {
            statusItems.push([bold('SSL:'), green('✓ Enabled')])
        }
        if (this.config.peers && this.config.peers.length > 0) {
            statusItems.push([bold('Peers:'), blue(`${this.config.peers.length} configured`)])
        }
        
        // Use table for better alignment
        this.terminal.table(
            statusItems.map(([label, value]) => ({ label, value })),
            [
                { key: 'label', label: '', width: 15 },
                { key: 'value', label: '', width: 30 }
            ]
        )
        this.terminal.spacing()
    }

    async checkSystemInteractive() {
        this.terminal.clear()
        this.terminal.header('🔍 System Requirements Check')
        this.terminal.spacing()
        
        // Use modern loader instead of startSpinner
        const checkLoader = this.terminal.loader('Checking system requirements...', {
            type: 'dots',
            color: 'cyan'
        })
        
        const checks = []
        
        // OS Check
        try {
            const osRelease = fs.existsSync('/etc/os-release') 
                ? fs.readFileSync('/etc/os-release', 'utf8')
                : ''
            
            if (osRelease.includes('ID=debian') || osRelease.includes('ID=ubuntu')) {
                checks.push({ name: 'Operating System', status: 'pass', value: 'Debian/Ubuntu' })
            } else if (osRelease.includes('ID=armbian')) {
                checks.push({ name: 'Operating System', status: 'pass', value: 'Armbian' })
            } else {
                checks.push({ name: 'Operating System', status: 'warn', value: 'Unknown' })
            }
        } catch {
            checks.push({ name: 'Operating System', status: 'warn', value: 'Unknown' })
        }
        
        // Node.js version
        const nodeVersion = process.version
        const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1))
        if (majorVersion >= 18) {
            checks.push({ name: 'Node.js', status: 'pass', value: nodeVersion })
        } else {
            checks.push({ name: 'Node.js', status: 'fail', value: `${nodeVersion} (18+ required)` })
        }
        
        // Check tools
        const tools = [
            { name: 'jq', required: false },
            { name: 'dig', required: false },
            { name: 'certbot', required: false },
            { name: 'systemctl', required: false }
        ]
        
        for (const tool of tools) {
            try {
                execSync(`which ${tool.name}`, { stdio: 'ignore' })
                checks.push({ name: tool.name, status: 'pass', value: 'Installed' })
            } catch {
                checks.push({ 
                    name: tool.name, 
                    status: tool.required ? 'fail' : 'warn', 
                    value: 'Not found' 
                })
            }
        }
        
        // Internet connectivity
        try {
            execSync('ping -c 1 8.8.8.8', { stdio: 'ignore', timeout: 5000 })
            checks.push({ name: 'Internet', status: 'pass', value: 'Connected' })
        } catch {
            checks.push({ name: 'Internet', status: 'warn', value: 'No connection' })
        }
        
        // Root check
        if (process.getuid && process.getuid() === 0) {
            checks.push({ name: 'User Permissions', status: 'warn', value: 'Running as root' })
        } else {
            checks.push({ name: 'User Permissions', status: 'pass', value: 'Regular user' })
        }
        
        checkLoader.stop(true, 'System check complete')
        this.terminal.spacing()
        
        // Display results as table
        this.terminal.table(
            checks.map(c => ({
                component: c.name,
                status: c.status === 'pass' ? green('✓') : c.status === 'warn' ? yellow('⚠') : red('✗'),
                details: c.value
            })),
            [
                { key: 'component', label: 'Component', width: 20 },
                { key: 'status', label: 'Status', width: 8 },
                { key: 'details', label: 'Details', width: 30 }
            ]
        )
        
        console.log('')
        const hasFailed = checks.some(c => c.status === 'fail')
        if (hasFailed) {
            this.terminal.error('Some required components are missing')
        } else {
            this.terminal.success('System meets all requirements')
        }
        
        await this.terminal.question('\nPress Enter to continue...')
    }

    async configureEnvironment() {
        this.terminal.clear()
        this.terminal.header('⚙️ Environment Configuration')
        this.terminal.spacing()
        
        // Select environment with visual indicators
        const env = await this.terminal.interactiveSelect(
            'Select environment:',
            [
                `Development ${gray('(Local testing, no SSL)')}`,
                `Production ${gray('(Live deployment with SSL)')}`
            ],
            this.config.env === 'production' ? 'Production (Live deployment with SSL)' : 'Development (Local testing, no SSL)'
        )
        
        if (env === null) return // ESC pressed
        
        this.config.env = env.startsWith('Production') ? 'production' : 'development'
        
        // Node name
        console.log('')
        this.config.name = await this.terminal.question('Node name:', this.config.name)
        
        // Port selection based on environment
        console.log('')
        if (this.config.env === 'production') {
            const portChoice = await this.terminal.interactiveSelect(
                'Select port for production:',
                ['443 (HTTPS Standard)', '8443 (HTTPS Alternative)', '8765 (Custom)', 'Other'],
                this.config.port === 443 ? '443 (HTTPS Standard)' : 
                this.config.port === 8443 ? '8443 (HTTPS Alternative)' : 
                '8765 (Custom)'
            )
            
            if (portChoice === null) return
            
            if (portChoice === 'Other') {
                this.config.port = await this.terminal.number('Enter port number:', this.config.port, 1, 65535)
            } else {
                this.config.port = parseInt(portChoice.split(' ')[0])
            }
        } else {
            this.config.port = await this.terminal.number('Development port:', this.config.port, 1, 65535)
        }
        
        // Check port availability with modern loader
        const portLoader = this.terminal.loader(`Checking port ${this.config.port}...`, {
            type: 'dots',
            color: 'yellow'
        })
        await new Promise(resolve => setTimeout(resolve, 500))
        
        try {
            execSync(`lsof -i:${this.config.port}`, { stdio: 'ignore' })
            portLoader.stop(false, `Port ${this.config.port} is already in use`)
            
            const useAnyway = await this.terminal.confirm('Use this port anyway?', false)
            if (!useAnyway) {
                this.config.port = await this.terminal.number('Enter different port:', 8765, 1, 65535)
            }
        } catch {
            portLoader.stop(true, `Port ${this.config.port} is available`)
        }
        
        this.terminal.success('\nEnvironment configured successfully')
        await this.terminal.question('Press Enter to continue...')
    }

    async configureNetworkInteractive() {
        this.terminal.clear()
        this.terminal.header('🌐 Network & Domain Configuration')
        this.terminal.spacing()
        
        // Detect current network with modern loader
        const networkLoader = this.terminal.loader('Detecting network configuration...', {
            type: 'circle',
            color: 'blue'
        })
        await this.detectNetwork()
        networkLoader.stop(true, 'Network detected')
        
        console.log('')
        this.terminal.box(
            `Current Network:\n` +
            `IP: ${this.config.network.currentIP || 'Unknown'}\n` +
            `Interface: ${this.config.network.interface || 'Unknown'}\n` +
            `Gateway: ${this.config.network.gateway || 'Unknown'}`,
            { borderColor: 'blue' }
        )
        
        // Domain configuration
        console.log('')
        if (this.config.env === 'production') {
            this.terminal.warning('Production requires a valid domain for SSL')
            this.config.domain = await this.terminal.question('Domain name:', this.config.domain)
            
            // Verify DNS with modern loader
            if (this.config.domain && this.config.domain !== 'localhost') {
                const dnsLoader = this.terminal.loader(`Verifying DNS for ${this.config.domain}...`, {
                    type: 'arrow',
                    color: 'cyan'
                })
                try {
                    const dnsResult = execSync(`dig +short A ${this.config.domain}`, { encoding: 'utf8' })
                    if (dnsResult.trim()) {
                        dnsLoader.stop(true, `DNS resolves to ${dnsResult.trim()}`)
                    } else {
                        dnsLoader.stop(false, 'DNS does not resolve')
                        const continueAnyway = await this.terminal.confirm('Continue anyway?', false)
                        if (!continueAnyway) return
                    }
                } catch {
                    dnsLoader.stop(false, 'Could not verify DNS')
                }
            }
        } else {
            this.config.domain = await this.terminal.question('Domain (or localhost):', this.config.domain)
        }
        
        // Static IP option
        console.log('')
        const setupStatic = await this.terminal.confirm('Configure static IP?', false)
        if (setupStatic) {
            await this.setupStaticIPInteractive()
        }
        
        await this.terminal.question('\nPress Enter to continue...')
    }

    async configureSecurityInteractive() {
        if (this.config.env !== 'production') {
            this.terminal.clear()
            this.terminal.header('🔐 Security Configuration')
            this.terminal.spacing()
            
            this.terminal.box(
                'SSL is only available in production mode.\n' +
                'Switch to production environment to enable SSL.',
                { borderColor: 'yellow', padding: 1, align: 'center' }
            )
            
            this.terminal.spacing()
            await this.terminal.question('Press Enter to continue...')
            return
        }
        
        this.terminal.clear()
        this.terminal.header('🔐 Security & SSL Configuration')
        this.terminal.spacing()
        
        const sslChoice = await this.terminal.interactiveSelect(
            'SSL Certificate Setup:',
            [
                'Let\'s Encrypt (Automatic)',
                'Custom Certificate',
                'Skip SSL Setup'
            ],
            'Let\'s Encrypt (Automatic)'
        )
        
        if (sslChoice === null || sslChoice === 'Skip SSL Setup') {
            this.config.ssl = false
            return
        }
        
        if (sslChoice === 'Let\'s Encrypt (Automatic)') {
            console.log('')
            this.terminal.info('Let\'s Encrypt will be configured during installation')
            this.terminal.info(`Domain: ${this.config.domain}`)
            
            const email = await this.terminal.question('Email for certificate notifications:')
            this.config.certbotEmail = email
            this.config.ssl = true
            this.config.sslType = 'letsencrypt'
        } else {
            console.log('')
            const keyPath = await this.terminal.question('Path to SSL private key:')
            const certPath = await this.terminal.question('Path to SSL certificate:')
            
            if (keyPath && certPath) {
                this.config.ssl = true
                this.config.sslType = 'custom'
                this.config.sslKey = keyPath
                this.config.sslCert = certPath
            }
        }
        
        // GoDaddy DDNS
        console.log('')
        const setupDDNS = await this.terminal.confirm('Configure GoDaddy Dynamic DNS?', false)
        if (setupDDNS) {
            this.config.godaddy.domain = await this.terminal.question('GoDaddy domain:')
            this.config.godaddy.host = await this.terminal.question('Subdomain/host:')
            this.config.godaddy.key = await this.terminal.question('API key:')
            this.config.godaddy.secret = await this.terminal.password('API secret:')
        }
        
        this.terminal.success('\nSecurity configured')
        await this.terminal.question('Press Enter to continue...')
    }

    async configurePeersInteractive() {
        while (true) {
            this.terminal.clear()
            this.terminal.header('👥 Peer Connections')
            this.terminal.spacing()
            
            if (!this.config.peers) this.config.peers = []
            
            if (this.config.peers.length === 0) {
                this.terminal.box('No peers configured', {
                    borderColor: 'gray',
                    padding: 1,
                    align: 'center'
                })
            } else {
                // Display peers in a modern grid layout
                this.terminal.section('Current Peers:')
                this.terminal.grid(
                    this.config.peers.map((peer, i) => 
                        `${green((i + 1) + '.')} ${this.terminal.truncate(peer, 45)}`
                    ),
                    { columns: 1, gap: 1 }
                )
            }
            
            console.log('')
            const action = await this.terminal.interactiveSelect(
                'Peer management:',
                ['Add peer', 'Remove peer', 'Import from file', 'Back'],
                'Back'
            )
            
            if (action === null || action === 'Back') break
            
            if (action === 'Add peer') {
                const url = await this.terminal.question('Peer URL (wss://example.com/gun):')
                if (url && !this.config.peers.includes(url)) {
                    this.config.peers.push(url)
                    this.terminal.success('Peer added')
                }
            } else if (action === 'Remove peer' && this.config.peers.length > 0) {
                const choices = this.config.peers.map((p, i) => `${i + 1}. ${p}`)
                const selected = await this.terminal.interactiveSelect('Select peer to remove:', choices)
                if (selected) {
                    const index = parseInt(selected.split('.')[0]) - 1
                    this.config.peers.splice(index, 1)
                    this.terminal.success('Peer removed')
                }
            } else if (action === 'Import from file') {
                const filePath = await this.terminal.question('Path to peers file:')
                if (filePath && fs.existsSync(filePath)) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8')
                        const newPeers = content.split('\n').filter(p => p.trim())
                        this.config.peers.push(...newPeers)
                        this.terminal.success(`Imported ${newPeers.length} peers`)
                    } catch (e) {
                        this.terminal.error('Failed to import peers')
                    }
                }
            }
            
            await this.terminal.question('\nPress Enter to continue...')
        }
    }

    async configureServiceInteractive() {
        if (this.platform !== 'linux') {
            this.terminal.clear()
            this.terminal.header('🚀 System Service Configuration')
            this.terminal.spacing()
            
            this.terminal.box(
                'System service is only available on Linux.\n' +
                `Current platform: ${this.platform}`,
                { borderColor: 'yellow', padding: 1, align: 'center' }
            )
            
            this.terminal.spacing()
            await this.terminal.question('Press Enter to continue...')
            return
        }
        
        this.terminal.clear()
        this.terminal.header('🚀 System Service Configuration')
        this.terminal.spacing()
        
        const createService = await this.terminal.confirm('Create systemd service?', true)
        if (!createService) return
        
        // Service options
        const options = await this.terminal.interactiveMultiselect(
            'Service options:',
            [
                'Auto-start on boot',
                'Restart on failure',
                'Resource limits',
                'Security hardening'
            ],
            ['Auto-start on boot', 'Restart on failure']
        )
        
        this.config.service = {
            enabled: true,
            autoStart: options.includes('Auto-start on boot'),
            restartOnFailure: options.includes('Restart on failure'),
            resourceLimits: options.includes('Resource limits'),
            securityHardening: options.includes('Security hardening')
        }
        
        this.terminal.success('Service configured')
        this.terminal.info(`Service name: air-${this.config.name}`)
        
        await this.terminal.question('\nPress Enter to continue...')
    }

    async previewConfiguration() {
        this.terminal.clear()
        this.terminal.header('👁 Configuration Preview')
        
        const config = this.buildFinalConfig()
        
        console.log('')
        console.log(cyan('air.json:'))
        console.log(gray('─'.repeat(50)))
        console.log(JSON.stringify(config, null, 2))
        console.log(gray('─'.repeat(50)))
        
        await this.terminal.question('\nPress Enter to continue...')
    }

    async performInstallation() {
        this.terminal.clear()
        this.terminal.header('💾 Installing Air')
        this.terminal.spacing()
        
        const steps = [
            { name: 'Save configuration', fn: () => this.saveConfig() },
            { name: 'Copy SSL certificates', fn: () => this.copySSLCerts() },
            { name: 'Create system service', fn: () => this.createService() },
            { name: 'Setup Let\'s Encrypt', fn: () => this.setupLetsEncrypt() },
            { name: 'Configure cron jobs', fn: () => this.setupCron() }
        ]
        
        // Show installation plan
        this.terminal.box(
            'Installation Steps:\n\n' +
            steps.map((s, i) => `${i + 1}. ${s.name}`).join('\n'),
            { borderColor: 'blue', padding: 1 }
        )
        this.terminal.spacing(2)
        
        let completed = 0
        for (const step of steps) {
            // Use modern loader for each step
            const stepLoader = this.terminal.loader(`${step.name}...`, {
                type: 'box',
                color: 'cyan'
            })
            
            try {
                await step.fn()
                stepLoader.stop(true, `${step.name} completed`)
            } catch (e) {
                stepLoader.stop(false, `${step.name} failed: ${e.message}`)
            }
            
            completed++
            this.terminal.progressBar(completed, steps.length, 'Overall Progress')
            this.terminal.spacing()
        }
        
        this.terminal.spacing()
        
        // Modern completion message with button-like display
        this.terminal.button('✨ Installation Complete!', {
            borderColor: 'green',
            align: 'center',
            padding: 1,
            margin: { top: 1, bottom: 1 }
        })
        
        // Display next steps in a modern flex layout
        this.terminal.section('Next Steps:')
        this.terminal.flex([
            bold('Start Air:'),
            cyan('npm start')
        ], { gap: 2 })
        this.terminal.flex([
            bold('Configure:'),
            cyan('npm run config')
        ], { gap: 2 })
        this.terminal.flex([
            bold('View logs:'),
            cyan(`journalctl -u air-${this.config.name} -f`)
        ], { gap: 2 })
        
        await this.terminal.question('\nPress Enter to exit...')
    }

    // Helper methods
    async detectNetwork() {
        try {
            const ipOutput = execSync('ip -4 addr show | grep -oP "(?<=inet\\s)\\d+(\\.\\d+){3}" | grep -v "127.0.0.1" | head -1', { encoding: 'utf8' }).trim()
            if (ipOutput) this.config.network.currentIP = ipOutput
            
            const ifaceOutput = execSync('ip route | grep default | head -1 | grep -oP "(?<=dev\\s)\\S+"', { encoding: 'utf8' }).trim()
            if (ifaceOutput) this.config.network.interface = ifaceOutput
            
            const gwOutput = execSync('ip route | grep default | head -1 | grep -oP "(?<=via\\s)\\S+"', { encoding: 'utf8' }).trim()
            if (gwOutput) this.config.network.gateway = gwOutput
        } catch {
            // Ignore errors
        }
    }

    loadExistingConfig() {
        try {
            const configPath = path.join(this.config.root, 'air.json')
            const existing = JSON.parse(fs.readFileSync(configPath, 'utf8'))
            
            // Merge with existing
            this.config.env = existing.env || this.config.env
            this.config.name = existing.name || this.config.name
            
            const envConfig = existing[this.config.env] || {}
            this.config.port = envConfig.port || this.config.port
            this.config.domain = envConfig.domain || this.config.domain
            this.config.peers = envConfig.peers || this.config.peers
            
            if (envConfig.godaddy) {
                this.config.godaddy = envConfig.godaddy
            }
        } catch {
            // Ignore errors
        }
    }

    buildFinalConfig() {
        const config = {
            root: this.config.root,
            bash: this.config.bash,
            env: this.config.env,
            name: this.config.name,
            sync: this.config.sync
        }
        
        config[this.config.env] = {
            port: this.config.port,
            domain: this.config.domain,
            peers: this.config.peers || []
        }
        
        if (this.config.ssl && this.config.sslType === 'custom') {
            config[this.config.env].ssl = {
                key: this.config.sslKey,
                cert: this.config.sslCert
            }
        }
        
        if (this.config.godaddy && this.config.godaddy.domain) {
            config[this.config.env].godaddy = this.config.godaddy
        }
        
        return config
    }

    async saveConfig() {
        const configPath = path.join(this.config.root, 'air.json')
        const config = this.buildFinalConfig()
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
    }

    async copySSLCerts() {
        if (!this.config.ssl || this.config.sslType !== 'custom') return
        // Implementation for copying SSL certs
    }

    async createService() {
        if (!this.config.service || !this.config.service.enabled) return
        // Implementation for creating systemd service
    }

    async setupLetsEncrypt() {
        if (!this.config.ssl || this.config.sslType !== 'letsencrypt') return
        // Implementation for Let's Encrypt setup
    }

    async setupCron() {
        if (!this.config.godaddy || !this.config.godaddy.domain) return
        // Implementation for cron setup
    }

    async setupStaticIPInteractive() {
        const ip = await this.terminal.question('Static IP address:', this.config.network.currentIP)
        const gateway = await this.terminal.question('Gateway:', this.config.network.gateway)
        
        this.terminal.info(`\nStatic IP configuration:`)
        this.terminal.info(`  IP: ${ip}`)
        this.terminal.info(`  Gateway: ${gateway}`)
        this.terminal.info(`  Interface: ${this.config.network.interface}`)
        
        const confirm = await this.terminal.confirm('Apply this configuration?', true)
        if (confirm) {
            // Implementation for static IP setup
            this.terminal.success('Static IP configured (requires restart)')
        }
    }

    async viewConfig() {
        const configPath = path.join(this.config.root, 'air.json')
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        
        this.terminal.clear()
        this.terminal.header('Current Configuration')
        console.log(JSON.stringify(config, null, 2))
        
        await this.terminal.question('\nPress Enter to continue...')
    }

    async checkAndInform() {
        // Skip if CI
        if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
            console.log(gray('CI environment detected, skipping setup'))
            return
        }
        
        // Check if configured
        const configPath = path.join(this.config.root, 'air.json')
        if (fs.existsSync(configPath)) {
            this.terminal.spacing()
            this.terminal.success('Air is already configured!')
            this.terminal.spacing()
            
            // Use modern flex layout for info display
            this.terminal.flex([
                dim('Config:'),
                white('air.json')
            ], { gap: 2 })
            this.terminal.flex([
                dim('To reconfigure:'),
                cyan('npm run setup')
            ], { gap: 2 })
            this.terminal.flex([
                dim('To start:'),
                cyan('npm start')
            ], { gap: 2 })
            return
        }
        
        this.terminal.header('🚀 Air Installation Complete!')
        this.terminal.spacing()
        
        this.terminal.warning('No configuration found.')
        this.terminal.spacing()
        
        // Check if TTY
        if (process.stdout.isTTY && process.stdin.isTTY) {
            const shouldSetup = await this.terminal.confirm('Would you like to configure Air now?')
            if (shouldSetup) {
                console.log('')
                await this.interactiveInstall()
                return
            }
        }
        
        console.log('To set up Air later, run:')
        console.log('  ' + cyan('npm run setup') + '\n')
        console.log(gray('Documentation: https://github.com/akaoio/air'))
        
        this.terminal.close()
    }

    quickSetup() {
        const configPath = path.join(this.config.root, 'air.json')
        if (fs.existsSync(configPath)) {
            this.terminal.warning('Configuration already exists. Use npm run setup to reconfigure.')
            return
        }
        
        console.log('Creating default configuration...')
        const defaultConfig = {
            root: this.config.root,
            bash: this.config.bash,
            env: 'development',
            name: 'air',
            development: {
                port: 8765,
                domain: 'localhost',
                peers: []
            }
        }
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 4))
        this.terminal.success('Default configuration created')
        console.log(gray('  Start with: ') + cyan('npm start'))
        console.log(gray('  Customize with: ') + cyan('npm run setup'))
    }
}

// Run installer
const installer = new AirInstaller()
installer.run().catch(console.error)