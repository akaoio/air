#!/usr/bin/env node

import { execSync, exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Native ANSI color codes
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
}

// Simple color helpers
const color = (text, ...codes) => codes.join('') + text + colors.reset
const red = text => color(text, colors.red)
const green = text => color(text, colors.green)
const yellow = text => color(text, colors.yellow)
const blue = text => color(text, colors.blue)
const cyan = text => color(text, colors.cyan)
const gray = text => color(text, colors.gray)
const white = text => color(text, colors.white)
const bold = text => color(text, colors.bold)

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
        this.rl = null
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

    // Native readline question helper
    async question(prompt, defaultValue = '') {
        if (!this.rl) {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })
        }
        
        return new Promise(resolve => {
            const displayPrompt = defaultValue 
                ? `${prompt} ${gray(`(${defaultValue})`)} ` 
                : `${prompt} `
            
            this.rl.question(displayPrompt, answer => {
                resolve(answer || defaultValue)
            })
        })
    }
    
    async confirm(prompt, defaultValue = true) {
        const answer = await this.question(
            prompt + (defaultValue ? ' (Y/n)' : ' (y/N)'),
            defaultValue ? 'y' : 'n'
        )
        return answer.toLowerCase() !== (defaultValue ? 'n' : 'y')
    }
    
    closeReadline() {
        if (this.rl) {
            this.rl.close()
            this.rl = null
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
        
        // Interactive mode
        console.log(cyan('\n══════════════════════════════════════'))
        console.log(cyan(bold('     Air GUN Database Installer')))
        console.log(cyan('══════════════════════════════════════\n'))

        await this.checkSystem()
        await this.detectNetwork()
        await this.configureNetwork()
        await this.configureBasic()
        await this.setupSecurity()
        await this.saveConfig()
        await this.createService()
        await this.showSummary()
        
        this.closeReadline()
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
            console.log('\n' + green('✓') + ' Air is already configured!')
            console.log(gray('  Config: ') + white('air.json'))
            console.log(gray('  To reconfigure: ') + cyan('npm run setup'))
            console.log(gray('  To start: ') + cyan('npm start'))
            return
        }
        
        console.log('\n' + cyan('══════════════════════════════════════'))
        console.log(cyan(bold('     🚀 Air Installation Complete!')))
        console.log(cyan('══════════════════════════════════════\n'))
        
        console.log(yellow('⚠') + ' No configuration found.\n')
        
        // Check if TTY
        if (process.stdout.isTTY && process.stdin.isTTY) {
            const shouldSetup = await this.confirm('Would you like to configure Air now?')
            if (shouldSetup) {
                console.log('')
                await this.runInteractive()
                return
            }
        }
        
        console.log('To set up Air later, run:')
        console.log('  ' + cyan('npm run setup') + '\n')
        console.log(gray('Documentation: https://github.com/akaoio/air'))
        
        this.closeReadline()
    }

    quickSetup() {
        const configPath = path.join(this.config.root, 'air.json')
        if (fs.existsSync(configPath)) {
            console.log(yellow('Configuration already exists. Use npm run setup to reconfigure.'))
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
        console.log(green('✓') + ' Default configuration created')
        console.log(gray('  Start with: ') + cyan('npm start'))
        console.log(gray('  Customize with: ') + cyan('npm run setup'))
    }

    async runInteractive() {
        await this.checkSystem()
        await this.detectNetwork()
        await this.configureNetwork()
        await this.configureBasic()
        await this.setupSecurity()
        await this.saveConfig()
        await this.createService()
        await this.showSummary()
        this.closeReadline()
    }

    async checkSystem() {
        console.log(blue('🔍 Checking system...'))
        
        try {
            // Check OS
            const osRelease = fs.existsSync('/etc/os-release') 
                ? fs.readFileSync('/etc/os-release', 'utf8')
                : ''
            
            if (osRelease.includes('ID=debian') || osRelease.includes('ID=ubuntu')) {
                console.log(green('✓') + ' Debian/Ubuntu detected')
            } else if (osRelease.includes('ID=armbian')) {
                console.log(green('✓') + ' Armbian detected')
            } else {
                console.log(yellow('⚠') + ' Unknown OS')
            }
            
            // Check Node.js
            const nodeVersion = process.version
            console.log(green('✓') + ' Node.js ' + nodeVersion)
            
            // Check tools
            const tools = ['jq', 'dig', 'nslookup', 'ip', 'nmcli']
            for (const tool of tools) {
                try {
                    execSync(`which ${tool}`, { stdio: 'ignore' })
                    console.log(green('✓') + ` ${tool} installed`)
                } catch {
                    console.log(yellow('⚠') + ` ${tool} not found`)
                }
            }
        } catch (e) {
            console.log(red('Error checking system:'), e.message)
        }
    }

    async detectNetwork() {
        console.log(blue('\n🌐 Detecting network configuration...'))
        
        try {
            // Get current IP
            const ipOutput = execSync('ip -4 addr show | grep -oP "(?<=inet\\s)\\d+(\\.\\d+){3}" | grep -v "127.0.0.1" | head -1', { encoding: 'utf8' }).trim()
            if (ipOutput) {
                this.config.network.currentIP = ipOutput
                console.log('Current IP: ' + ipOutput)
            }
            
            // Get interface
            const ifaceOutput = execSync('ip route | grep default | head -1 | grep -oP "(?<=dev\\s)\\S+"', { encoding: 'utf8' }).trim()
            if (ifaceOutput) {
                this.config.network.interface = ifaceOutput
                console.log('Interface: ' + ifaceOutput)
            }
            
            // Get gateway
            const gwOutput = execSync('ip route | grep default | head -1 | grep -oP "(?<=via\\s)\\S+"', { encoding: 'utf8' }).trim()
            if (gwOutput) {
                this.config.network.gateway = gwOutput
                console.log('Gateway: ' + gwOutput)
            }
            
            // Get MAC
            if (this.config.network.interface) {
                const macOutput = execSync(`cat /sys/class/net/${this.config.network.interface}/address`, { encoding: 'utf8' }).trim()
                if (macOutput) {
                    this.config.network.mac = macOutput
                    console.log('MAC Address: ' + macOutput)
                }
            }
        } catch (e) {
            console.log(yellow('Could not detect all network settings'))
        }
    }

    async configureNetwork() {
        console.log(blue('\n⚙️ Network Configuration'))
        
        const setupStatic = await this.confirm('Do you want to set up a static IP address?', false)
        
        if (setupStatic) {
            const staticIP = await this.question('Enter desired static IP:', this.config.network.currentIP)
            
            if (staticIP && await this.confirm(`Configure static IP ${staticIP} on ${this.config.network.interface}?`)) {
                await this.setupStaticIP(staticIP)
            }
        }
    }

    async setupStaticIP(ip) {
        console.log(blue(`\n📍 Setting up static IP ${ip}...`))
        
        try {
            // Try NetworkManager first
            console.log('Trying NetworkManager (nmcli)...')
            try {
                const connections = execSync('nmcli con show', { encoding: 'utf8' })
                const connectionName = connections.split('\n')
                    .find(line => line.includes(this.config.network.interface))
                    ?.split(/\s+/)[0]
                
                if (connectionName) {
                    console.log(`Found connection: ${connectionName}`)
                    execSync(`sudo nmcli con mod "${connectionName}" ipv4.addresses ${ip}/24`, { stdio: 'inherit' })
                    execSync(`sudo nmcli con mod "${connectionName}" ipv4.gateway ${this.config.network.gateway}`, { stdio: 'inherit' })
                    execSync(`sudo nmcli con mod "${connectionName}" ipv4.dns "8.8.8.8 8.8.4.4"`, { stdio: 'inherit' })
                    execSync(`sudo nmcli con mod "${connectionName}" ipv4.method manual`, { stdio: 'inherit' })
                    execSync(`sudo nmcli con up "${connectionName}"`, { stdio: 'inherit' })
                    console.log(green('✓') + ` Static IP ${ip} configured via NetworkManager`)
                    this.config.network.staticIP = ip
                    return
                }
            } catch (e) {
                console.log(yellow('⚠') + ' NetworkManager not available, trying netplan...')
            }
            
            // Try netplan
            const netplanFiles = fs.readdirSync('/etc/netplan').filter(f => f.endsWith('.yaml'))
            if (netplanFiles.length > 0) {
                const netplanConfig = `/etc/netplan/${netplanFiles[0]}`
                const netplanContent = `network:
  version: 2
  renderer: networkd
  ethernets:
    ${this.config.network.interface}:
      addresses:
        - ${ip}/24
      routes:
        - to: default
          via: ${this.config.network.gateway}
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
`
                fs.writeFileSync('/tmp/netplan-config.yaml', netplanContent)
                execSync(`sudo cp /tmp/netplan-config.yaml ${netplanConfig}`)
                execSync(`sudo chmod 600 ${netplanConfig}`)
                execSync('sudo netplan apply 2>&1 | grep -v "Cannot call openvswitch" || true')
                
                console.log(green('✓') + ` Static IP ${ip} configured via netplan`)
                this.config.network.staticIP = ip
            }
        } catch (e) {
            console.log(red('✗') + ' Failed to configure static IP:', e.message)
        }
    }

    async configureBasic() {
        console.log(blue('\n📝 Basic Configuration'))
        
        this.config.env = await this.question('Environment (development/production):', this.config.env)
        this.config.name = await this.question('Instance name:', this.config.name)
        this.config.port = parseInt(await this.question('Port:', String(this.config.port)))
        this.config.domain = await this.question('Domain:', this.config.network.staticIP || this.config.domain)
        
        const addPeers = await this.confirm('Add external peers?', false)
        if (addPeers) {
            await this.addPeers()
        }
    }

    async addPeers() {
        let addMore = true
        while (addMore) {
            const peer = await this.question('Peer address (e.g., wss://peer.example.com/gun):')
            if (peer && peer.startsWith('ws')) {
                this.config.peers.push(peer)
                console.log(green('✓') + ' Peer added')
                addMore = await this.confirm('Add another peer?', false)
            } else {
                // If no valid peer entered, stop asking
                addMore = false
            }
        }
    }

    async setupSecurity() {
        console.log(blue('\n🔒 Security Configuration'))
        
        if (this.config.env === 'production') {
            // GoDaddy DDNS
            const setupGoDaddy = await this.confirm('Set up GoDaddy DDNS (Dynamic DNS)?', false)
            if (setupGoDaddy) {
                await this.setupGoDaddy()
            }
            
            // SSL
            const setupSSL = await this.confirm('Install Let\'s Encrypt SSL certificate?', false)
            if (setupSSL) {
                await this.setupSSL()
            }
        }
    }

    async setupGoDaddy() {
        const key = await this.question('GoDaddy API Key:')
        const secret = await this.question('GoDaddy API Secret:')
        
        if (key && secret) {
            const parts = this.config.domain.split('.')
            const host = parts[0]
            const domain = parts.slice(1).join('.')
            
            this.config.godaddy = { domain, host, key, secret }
            console.log(green('✓') + ' GoDaddy DDNS configured')
            
            // Setup cron job
            const cronJob = `*/5 * * * * cd ${this.config.root} && /usr/bin/node ddns.js >> /var/log/air-ddns.log 2>&1`
            try {
                execSync(`(crontab -l 2>/dev/null | grep -v "ddns.js"; echo "${cronJob}") | crontab -`)
                console.log(green('✓') + ' DDNS cron job created')
            } catch (e) {
                console.log(yellow('⚠') + ' Could not create cron job')
            }
        }
    }

    async setupSSL() {
        console.log(yellow('\n📋 SSL Certificate Setup'))
        
        // Check certbot
        try {
            execSync('which certbot', { stdio: 'ignore' })
        } catch {
            console.log(yellow('Certbot not found. Installing...'))
            try {
                if (fs.existsSync('/etc/debian_version')) {
                    execSync('sudo apt-get update && sudo apt-get install -y certbot', { stdio: 'inherit' })
                } else {
                    console.log(red('✗') + ' Please install certbot manually')
                    return
                }
            } catch {
                console.log(red('✗') + ' Failed to install certbot')
                return
            }
        }
        
        console.log(yellow('Installing Let\'s Encrypt SSL certificate...'))
        try {
            execSync(`sudo certbot certonly --standalone --preferred-challenges http -d ${this.config.domain}`, { stdio: 'inherit' })
            this.config.ssl = {
                key: `/etc/letsencrypt/live/${this.config.domain}/privkey.pem`,
                cert: `/etc/letsencrypt/live/${this.config.domain}/cert.pem`
            }
            console.log(green('✓') + ' SSL certificate installed')
        } catch {
            console.log(red('✗') + ' SSL certificate installation failed')
        }
    }

    async saveConfig() {
        const configPath = path.join(this.config.root, 'air.json')
        
        // Build config object
        const configData = {
            root: this.config.root,
            bash: this.config.bash,
            env: this.config.env,
            name: this.config.name,
            sync: this.config.sync
        }
        
        // Add environment config
        configData[this.config.env] = {
            domain: this.config.domain,
            port: this.config.port,
            peers: this.config.peers
        }
        
        if (this.config.ssl && this.config.ssl.key) {
            configData[this.config.env].ssl = this.config.ssl
        }
        
        if (this.config.godaddy && this.config.godaddy.key) {
            configData[this.config.env].godaddy = this.config.godaddy
        }
        
        if (this.config.network.staticIP) {
            configData[this.config.env].network = this.config.network
        }
        
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 4))
        console.log(green('✓') + ' Configuration saved to ' + configPath)
    }

    async createService() {
        if (this.config.env !== 'production') return
        
        const createService = await this.confirm('Create systemd service?', true)
        if (!createService) return
        
        const serviceName = this.config.name
        const serviceContent = `[Unit]
Description=Air GUN Database - ${this.config.name}
After=network.target

[Service]
Type=simple
User=${process.env.USER}
WorkingDirectory=${this.config.root}
ExecStart=/usr/bin/node ${this.config.root}/main.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
`
        
        try {
            fs.writeFileSync(`/tmp/${serviceName}.service`, serviceContent)
            execSync(`sudo mv /tmp/${serviceName}.service /etc/systemd/system/`)
            execSync('sudo systemctl daemon-reload')
            execSync(`sudo systemctl enable ${serviceName}`)
            execSync(`sudo systemctl start ${serviceName}`)
            console.log(green('✓') + ` Service ${serviceName} created and started`)
        } catch (e) {
            console.log(red('✗') + ' Failed to create service:', e.message)
        }
    }

    async showSummary() {
        console.log(blue('\n✨ Installation Complete!\n'))
        console.log(cyan('Configuration Summary:'))
        console.log(white(`  Environment: ${this.config.env}`))
        console.log(white(`  Name:        ${this.config.name}`))
        console.log(white(`  Port:        ${this.config.port}`))
        console.log(white(`  Domain:      ${this.config.domain}`))
        
        if (this.config.peers.length > 0) {
            console.log(white(`  Peers:       ${this.config.peers.length} configured`))
        }
        
        console.log(cyan('\nUseful commands:'))
        console.log(white(`  Status:     sudo systemctl status ${this.config.name}`))
        console.log(white(`  Logs:       sudo journalctl -u ${this.config.name} -f`))
        console.log(white(`  Restart:    sudo systemctl restart ${this.config.name}`))
        console.log(white(`  Stop:       sudo systemctl stop ${this.config.name}`))
        
        if (this.config.network.staticIP) {
            console.log(yellow(`\n⚠ Note: Static IP ${this.config.network.staticIP} configured.`))
            console.log(yellow('  You may need to reconnect using the new IP address.'))
        }
        
        console.log(blue('\n🚀 Air is ready to use!'))
        console.log(gray('Run ') + cyan('npm start') + gray(' to start Air'))
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const installer = new AirInstaller()
    installer.run().catch(error => {
        console.error(red('Installation failed:'), error)
        process.exit(1)
    })
}

export default AirInstaller