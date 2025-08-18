#!/usr/bin/env node

import inquirer from 'inquirer'
import chalk from 'chalk'
import { execSync, exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class AirInstaller {
    constructor() {
        // Parse CLI arguments first
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
            godaddy: this.args.godaddy ? {} : {},
            network: {}
        }
        this.platform = os.platform()
        this.hostname = os.hostname()
    }
    
    parseArgs() {
        this.args = {
            nonInteractive: false,
            checkOnly: false,
            quick: false,
            root: null,
            name: null,
            env: null,
            port: null,
            domain: null,
            godaddy: false
        }
        
        const argv = process.argv.slice(2)
        for (let i = 0; i < argv.length; i++) {
            const arg = argv[i]
            
            if (arg === '--non-interactive') {
                this.args.nonInteractive = true
            } else if (arg === '--check-only') {
                this.args.checkOnly = true
            } else if (arg === '--quick') {
                this.args.quick = true
                this.args.nonInteractive = true  // Quick mode implies non-interactive
            } else if (arg === '--root' && argv[i + 1]) {
                this.args.root = argv[++i]
            } else if (arg === '--name' && argv[i + 1]) {
                this.args.name = argv[++i]
            } else if (arg === '--env' && argv[i + 1]) {
                const env = argv[++i]
                // Validate environment
                if (env === 'development' || env === 'production') {
                    this.args.env = env
                }
            } else if (arg === '--port' && argv[i + 1]) {
                const port = parseInt(argv[++i])
                // Validate port number
                if (port > 0 && port <= 65535) {
                    this.args.port = port
                }
            } else if (arg === '--domain' && argv[i + 1]) {
                this.args.domain = argv[++i]
            } else if (arg === '--godaddy') {
                this.args.godaddy = true
            }
        }
    }

    async run() {
        // Check-only mode for tests
        if (this.args.checkOnly) {
            return this.checkSystemSimple()
        }
        
        // Non-interactive mode for tests
        if (this.args.nonInteractive) {
            return this.runNonInteractive()
        }
        
        // Interactive mode (original)
        console.log(chalk.cyan('\n══════════════════════════════════════'))
        console.log(chalk.cyan.bold('     Air GUN Database Installer'))
        console.log(chalk.cyan('══════════════════════════════════════\n'))

        await this.checkSystem()
        await this.detectNetwork()
        await this.configureNetwork()
        await this.setupCore()
        await this.setupSecurity()
        await this.setupService()
        await this.finish()
    }
    
    checkSystemSimple() {
        console.log('Checking system requirements...')
        console.log(`✓ Node.js ${process.version} detected`)
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim()
            console.log(`✓ npm ${npmVersion} detected`)
        } catch (e) {
            console.log('✗ npm not found')
        }
        return true
    }
    
    async runNonInteractive() {
        console.log('Running in non-interactive mode...')
        
        // Load existing config if it exists
        const configPath = path.join(this.config.root, 'air.json')
        let existingConfig = null
        
        try {
            if (fs.existsSync(configPath)) {
                existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                console.log('Found existing configuration')
            }
        } catch (e) {
            // Ignore errors
        }
        
        // Merge with existing config
        if (existingConfig) {
            // Preserve custom fields
            Object.keys(existingConfig).forEach(key => {
                if (!(key in this.config) || typeof existingConfig[key] === 'object') {
                    if (key === this.config.env || key === 'development' || key === 'production') {
                        // Merge environment configs
                        this.config[key] = { ...existingConfig[key] }
                        if (key === this.config.env) {
                            // Update with CLI args for current env
                            if (this.args.port) this.config[key].port = this.args.port
                            if (this.args.domain) this.config[key].domain = this.args.domain
                        }
                    } else if (key !== 'name' && key !== 'env' && key !== 'root') {
                        this.config[key] = existingConfig[key]
                    }
                }
            })
            
            // Preserve custom fields that are not in default config
            if (existingConfig.customField) {
                this.config.customField = existingConfig.customField
            }
            if (existingConfig[this.config.env]?.customSetting) {
                if (!this.config[this.config.env]) {
                    this.config[this.config.env] = {}
                }
                this.config[this.config.env].customSetting = existingConfig[this.config.env].customSetting
            }
        }
        
        // Add IP detection config
        if (!this.config.ip) {
            this.config.ip = {
                timeout: 5000,
                dnstimeout: 3000,
                agent: 'Air-GUN-Peer/1.0',
                dns: [
                    { hostname: 'myip.opendns.com', resolver: 'resolver1.opendns.com' },
                    { hostname: 'myip.opendns.com', resolver: 'resolver2.opendns.com' }
                ],
                http: [
                    { url: 'https://checkip.amazonaws.com' },
                    { url: 'https://api.ipify.org' }
                ]
            }
        }
        
        // Ensure environment config exists
        if (!this.config[this.config.env]) {
            this.config[this.config.env] = {
                port: this.config.port,
                domain: this.config.domain,
                peers: this.config.peers || []
            }
        }
        
        // Write config file
        const configData = {
            root: this.config.root,
            bash: this.config.bash,
            env: this.config.env,
            name: this.config.name,
            ip: this.config.ip,
            ...Object.keys(this.config).reduce((acc, key) => {
                if (!['root', 'bash', 'env', 'name', 'ip', 'port', 'domain', 'peers', 'ssl', 'godaddy', 'network', 'platform', 'hostname'].includes(key)) {
                    acc[key] = this.config[key]
                }
                return acc
            }, {}),
            [this.config.env]: this.config[this.config.env]
        }
        
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2))
        console.log(`Configuration saved to ${configPath}`)
        
        // Skip service creation in non-interactive mode
        console.log('Skipping service creation in non-interactive mode')
        
        return true
    }

    async checkSystem() {
        console.log(chalk.yellow('🔍 Checking system...'))
        
        // Check OS
        if (this.platform === 'linux') {
            try {
                const release = fs.readFileSync('/etc/os-release', 'utf8')
                if (release.includes('Armbian')) {
                    console.log(chalk.green('✓ Armbian detected'))
                } else if (release.includes('Ubuntu')) {
                    console.log(chalk.green('✓ Ubuntu detected'))
                } else if (release.includes('Debian')) {
                    console.log(chalk.green('✓ Debian detected'))
                }
            } catch (e) {
                console.log(chalk.yellow('⚠ Linux detected (unknown distribution)'))
            }
        } else {
            console.log(chalk.red(`✗ Unsupported OS: ${this.platform}`))
            process.exit(1)
        }

        // Check Node.js
        try {
            const nodeVersion = execSync('node --version').toString().trim()
            console.log(chalk.green(`✓ Node.js ${nodeVersion}`))
        } catch (e) {
            console.log(chalk.red('✗ Node.js not found'))
            process.exit(1)
        }

        // Check for required tools
        const tools = ['jq', 'dig', 'nslookup', 'ip', 'nmcli']
        for (const tool of tools) {
            try {
                execSync(`which ${tool}`, { stdio: 'ignore' })
                console.log(chalk.green(`✓ ${tool} installed`))
            } catch (e) {
                console.log(chalk.yellow(`⚠ ${tool} not found, installing...`))
                try {
                    if (tool === 'jq') execSync('sudo apt install -y jq', { stdio: 'inherit' })
                    if (tool === 'dig' || tool === 'nslookup') execSync('sudo apt install -y dnsutils', { stdio: 'inherit' })
                    if (tool === 'ip') execSync('sudo apt install -y iproute2', { stdio: 'inherit' })
                    if (tool === 'nmcli') execSync('sudo apt install -y network-manager', { stdio: 'inherit' })
                } catch (installError) {
                    console.log(chalk.yellow(`⚠ Could not install ${tool}`))
                }
            }
        }
    }

    async detectNetwork() {
        console.log(chalk.yellow('\n🌐 Detecting network configuration...'))
        
        try {
            // Get current IP
            const currentIP = execSync("ip addr show | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d'/' -f1").toString().trim()
            console.log(chalk.cyan(`Current IP: ${currentIP}`))
            this.config.network.currentIP = currentIP

            // Get interface name
            const iface = execSync("ip route | grep default | awk '{print $5}' | head -1").toString().trim()
            console.log(chalk.cyan(`Interface: ${iface}`))
            this.config.network.interface = iface

            // Get gateway
            const gateway = execSync("ip route | grep default | awk '{print $3}' | head -1").toString().trim()
            console.log(chalk.cyan(`Gateway: ${gateway}`))
            this.config.network.gateway = gateway

            // Get MAC address
            const mac = execSync(`ip link show ${iface} | grep ether | awk '{print $2}'`).toString().trim()
            console.log(chalk.cyan(`MAC Address: ${mac}`))
            this.config.network.mac = mac

        } catch (e) {
            console.log(chalk.yellow('⚠ Could not detect network configuration'))
        }
    }

    async configureNetwork() {
        console.log(chalk.yellow('\n⚙️ Network Configuration'))
        
        const { setupStaticIP } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'setupStaticIP',
                message: 'Do you want to set up a static IP address?',
                default: true
            }
        ])

        if (setupStaticIP) {
            const { staticIP, confirmStatic } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'staticIP',
                    message: 'Enter desired static IP:',
                    default: '192.168.1.100',
                    validate: (input) => {
                        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
                        return ipRegex.test(input) || 'Please enter a valid IP address'
                    }
                },
                {
                    type: 'confirm',
                    name: 'confirmStatic',
                    message: (answers) => `Configure static IP ${answers.staticIP} on ${this.config.network.interface}?`,
                    default: true
                }
            ])

            if (confirmStatic) {
                await this.setupStaticIP(staticIP)
            }
        }
    }

    async setupStaticIP(ip) {
        console.log(chalk.yellow(`\n📍 Setting up static IP ${ip}...`))
        
        const iface = this.config.network.interface
        const gateway = this.config.network.gateway
        
        // Method 1: Using nmcli (NetworkManager)
        try {
            console.log(chalk.cyan('Trying NetworkManager (nmcli)...'))
            
            // Check if connection exists
            const connections = execSync(`nmcli con show | grep ${iface} || true`).toString()
            let connectionName = iface
            
            if (connections) {
                connectionName = connections.split(/\s+/)[0]
                console.log(chalk.cyan(`Found connection: ${connectionName}`))
            } else {
                // Create new connection
                execSync(`sudo nmcli con add con-name ${iface} ifname ${iface} type ethernet`)
            }
            
            // Set static IP
            execSync(`sudo nmcli con mod ${connectionName} ipv4.addresses ${ip}/24`)
            execSync(`sudo nmcli con mod ${connectionName} ipv4.gateway ${gateway}`)
            execSync(`sudo nmcli con mod ${connectionName} ipv4.dns "8.8.8.8 8.8.4.4"`)
            execSync(`sudo nmcli con mod ${connectionName} ipv4.method manual`)
            
            // Apply changes
            execSync(`sudo nmcli con down ${connectionName}`, { stdio: 'ignore' }).catch(() => {})
            execSync(`sudo nmcli con up ${connectionName}`)
            
            console.log(chalk.green(`✓ Static IP ${ip} configured via NetworkManager`))
            this.config.network.staticIP = ip
            return
            
        } catch (e) {
            console.log(chalk.yellow('⚠ NetworkManager not available, trying netplan...'))
        }
        
        // Method 2: Using netplan (Ubuntu/Armbian)
        try {
            const netplanConfig = `/etc/netplan/01-netcfg.yaml`
            const netplanContent = `
network:
  version: 2
  renderer: networkd
  ethernets:
    ${iface}:
      dhcp4: no
      addresses:
        - ${ip}/24
      routes:
        - to: 0.0.0.0/0
          via: ${gateway}
          metric: 100
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
`
            fs.writeFileSync('/tmp/netplan-config.yaml', netplanContent)
            execSync(`sudo cp /tmp/netplan-config.yaml ${netplanConfig}`)
            execSync(`sudo chmod 600 ${netplanConfig}`)  // Fix permissions
            // Suppress openvswitch warning - it's harmless if not using OVS
            execSync('sudo netplan apply 2>&1 | grep -v "Cannot call openvswitch" || true')
            
            console.log(chalk.green(`✓ Static IP ${ip} configured via netplan`))
            this.config.network.staticIP = ip
            return
            
        } catch (e) {
            console.log(chalk.yellow('⚠ Netplan not available, trying /etc/network/interfaces...'))
        }
        
        // Method 3: Using /etc/network/interfaces (Debian/older systems)
        try {
            const interfacesContent = `
auto ${iface}
iface ${iface} inet static
    address ${ip}
    netmask 255.255.255.0
    gateway ${gateway}
    dns-nameservers 8.8.8.8 8.8.4.4
`
            fs.appendFileSync('/tmp/interfaces', interfacesContent)
            execSync('sudo cp /tmp/interfaces /etc/network/interfaces.d/static-ip')
            execSync('sudo systemctl restart networking')
            
            console.log(chalk.green(`✓ Static IP ${ip} configured via /etc/network/interfaces`))
            this.config.network.staticIP = ip
            
        } catch (e) {
            console.log(chalk.red('✗ Could not configure static IP automatically'))
            console.log(chalk.yellow('Please configure manually in your network settings'))
        }
    }

    async setupCore() {
        console.log(chalk.yellow('\n🚀 Core Configuration'))
        
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'env',
                message: 'Environment:',
                choices: ['development', 'production'],
                default: this.config.env
            },
            {
                type: 'input',
                name: 'name',
                message: 'Peer name:',
                default: this.config.name,
                validate: (input) => input.length > 0 || 'Name is required'
            },
            {
                type: 'number',
                name: 'port',
                message: 'Port:',
                default: this.config.port,
                validate: (input) => (input > 0 && input < 65536) || 'Invalid port'
            },
            {
                type: 'input',
                name: 'domain',
                message: 'Domain:',
                default: this.config.network.staticIP || this.config.domain
            },
            {
                type: 'confirm',
                name: 'addPeers',
                message: 'Add external peers?',
                default: false
            }
        ])
        
        Object.assign(this.config, answers)
        
        if (answers.addPeers) {
            await this.addPeers()
        }
    }

    async addPeers() {
        let addMore = true
        while (addMore) {
            const { peer, more } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'peer',
                    message: 'Peer address (e.g., wss://peer.example.com/gun):',
                    validate: (input) => input.startsWith('ws') || 'Must start with ws:// or wss://'
                },
                {
                    type: 'confirm',
                    name: 'more',
                    message: 'Add another peer?',
                    default: false
                }
            ])
            
            if (peer && !this.config.peers.includes(peer)) {
                this.config.peers.push(peer)
            }
            addMore = more
        }
    }

    async setupSecurity() {
        console.log(chalk.yellow('\n🔒 Security Configuration'))
        
        if (this.config.env === 'production') {
            const { ssl, godaddy } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'ssl',
                    message: 'Install Let\'s Encrypt SSL certificate?',
                    default: false
                },
                {
                    type: 'confirm',
                    name: 'godaddy',
                    message: 'Set up GoDaddy DDNS?',
                    default: false
                }
            ])
            
            if (ssl) {
                await this.setupSSL()
            }
            
            if (godaddy) {
                await this.setupGoDaddy()
            }
        }
    }

    async setupSSL() {
        console.log(chalk.yellow('Installing Let\'s Encrypt SSL...'))
        try {
            execSync(`sudo certbot certonly --standalone --preferred-challenges http -d ${this.config.domain}`, { stdio: 'inherit' })
            this.config.ssl = {
                key: `/etc/letsencrypt/live/${this.config.domain}/privkey.pem`,
                cert: `/etc/letsencrypt/live/${this.config.domain}/cert.pem`
            }
            console.log(chalk.green('✓ SSL certificate installed'))
        } catch (e) {
            console.log(chalk.red('✗ SSL installation failed'))
        }
    }

    async setupGoDaddy() {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'key',
                message: 'GoDaddy API Key:',
                validate: (input) => input.length > 0 || 'Key is required'
            },
            {
                type: 'input',
                name: 'secret',
                message: 'GoDaddy API Secret:',
                validate: (input) => input.length > 0 || 'Secret is required'
            }
        ])
        
        this.config.godaddy = {
            domain: this.config.domain.split('.').slice(-2).join('.'),
            host: this.config.domain.split('.')[0] || '@',
            ...answers
        }
    }

    async setupService() {
        console.log(chalk.yellow('\n⚙️ Service Installation'))
        
        // Write air.json config
        const configPath = path.join(this.config.root, 'air.json')
        const configData = {
            root: this.config.root,
            bash: this.config.bash,
            env: this.config.env,
            name: this.config.name,
            sync: this.config.sync,
            [this.config.env]: {
                domain: this.config.domain,
                port: this.config.port,
                peers: this.config.peers,
                ssl: this.config.ssl || {},
                godaddy: this.config.godaddy || {},
                network: this.config.network || {}
            }
        }
        
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 4))
        console.log(chalk.green(`✓ Configuration saved to ${configPath}`))
        
        // Create systemd service
        const serviceName = `air-${this.config.name}`
        const serviceContent = `[Unit]
Description=Air GUN Database - ${this.config.name}
After=network.target

[Service]
Type=simple
User=${process.env.USER}
WorkingDirectory=${this.config.root}
Environment="NODE_ENV=${this.config.env}"
ExecStart=/usr/bin/node ${path.join(this.config.root, 'main.js')}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`
        
        fs.writeFileSync(`/tmp/${serviceName}.service`, serviceContent)
        execSync(`sudo cp /tmp/${serviceName}.service /etc/systemd/system/`)
        execSync('sudo systemctl daemon-reload')
        execSync(`sudo systemctl enable ${serviceName}`)
        execSync(`sudo systemctl start ${serviceName}`)
        
        console.log(chalk.green(`✓ Service ${serviceName} installed and started`))
    }

    async finish() {
        console.log(chalk.green('\n══════════════════════════════════════'))
        console.log(chalk.green.bold('     Installation Complete!'))
        console.log(chalk.green('══════════════════════════════════════'))
        
        console.log(chalk.cyan('\nConfiguration Summary:'))
        console.log(chalk.white(`  Name:       ${this.config.name}`))
        console.log(chalk.white(`  Environment: ${this.config.env}`))
        console.log(chalk.white(`  Domain:     ${this.config.domain}`))
        console.log(chalk.white(`  Port:       ${this.config.port}`))
        
        if (this.config.network.staticIP) {
            console.log(chalk.white(`  Static IP:  ${this.config.network.staticIP}`))
        }
        
        if (this.config.peers.length > 0) {
            console.log(chalk.white(`  Peers:      ${this.config.peers.length} configured`))
        }
        
        console.log(chalk.cyan('\nUseful commands:'))
        console.log(chalk.white(`  Status:     sudo systemctl status air-${this.config.name}`))
        console.log(chalk.white(`  Logs:       sudo journalctl -u air-${this.config.name} -f`))
        console.log(chalk.white(`  Restart:    sudo systemctl restart air-${this.config.name}`))
        console.log(chalk.white(`  Stop:       sudo systemctl stop air-${this.config.name}`))
        
        if (this.config.network.staticIP) {
            console.log(chalk.yellow(`\n⚠ Note: Static IP ${this.config.network.staticIP} configured.`))
            console.log(chalk.yellow('  You may need to reconnect using the new IP address.'))
        }
    }
}

// Run installer
const installer = new AirInstaller()
installer.run().catch(console.error)