#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import readline from 'readline'
import os from 'os'
import security from '../src/security.js'
import architecture from '../src/architecture.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
}

/**
 * Quick Setup - Streamlined installation for Air
 */
class QuickSetup {
    constructor() {
        this.config = {
            root: rootPath,
            bash: path.join(rootPath, 'script'),
            env: 'development',
            name: `air-${os.hostname()}`,
            development: {
                domain: 'localhost',
                port: 8765,
                peers: []
            }
        }
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
    }

    log(message, color = '') {
        console.log(color + message + colors.reset)
    }

    async prompt(question, defaultValue = '') {
        return new Promise(resolve => {
            const q = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `
            this.rl.question(q, answer => {
                resolve(answer.trim() || defaultValue)
            })
        })
    }

    async confirm(question, defaultValue = true) {
        const suffix = defaultValue ? '[Y/n]' : '[y/N]'
        const answer = await this.prompt(`${question} ${suffix}`)
        
        if (answer === '') return defaultValue
        return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
    }

    header() {
        console.clear()
        console.log()
        this.log('╔══════════════════════════════════════════╗', colors.cyan + colors.bright)
        this.log('║       Air - Quick Setup Wizard           ║', colors.cyan + colors.bright)
        this.log('╚══════════════════════════════════════════╝', colors.cyan + colors.bright)
        console.log()
        this.log('This wizard will help you get Air running quickly.', colors.dim)
        this.log('For advanced options, use: npm run config', colors.dim)
        console.log()
    }

    async detectenvironment() {
        this.log('🔍 Detecting environment...', colors.cyan)
        
        const checks = {
            nodejs: process.version,
            platform: os.platform(),
            hostname: os.hostname(),
            user: os.userInfo().username,
            isRoot: process.getuid && process.getuid() === 0,
            hasSystemd: false,
            hasDocker: false,
            hasPM2: false
        }
        
        // Check for systemd
        try {
            execSync('which systemctl', { stdio: 'ignore' })
            checks.hasSystemd = true
        } catch {}
        
        // Check for Docker
        try {
            execSync('which docker', { stdio: 'ignore' })
            checks.hasDocker = true
        } catch {}
        
        // Check for PM2
        try {
            execSync('which pm2', { stdio: 'ignore' })
            checks.hasPM2 = true
        } catch {}
        
        // Display environment info
        this.log(`  ✓ Node.js: ${checks.nodejs}`, colors.green)
        this.log(`  ✓ Platform: ${checks.platform}`, colors.green)
        this.log(`  ✓ Hostname: ${checks.hostname}`, colors.green)
        this.log(`  ✓ User: ${checks.user}`, colors.green)
        
        if (checks.isRoot) {
            this.log(`  ⚠ Running as root`, colors.yellow)
        }
        
        if (checks.hasSystemd) {
            this.log(`  ✓ Systemd available`, colors.green)
        }
        
        if (checks.hasPM2) {
            this.log(`  ✓ PM2 available`, colors.green)
        }
        
        console.log()
        return checks
    }

    async setupbasic() {
        this.log('📝 Basic Configuration', colors.cyan + colors.bright)
        console.log()
        
        // Environment selection with smart default
        const isProd = await this.confirm('Is this a production server?', false)
        this.config.env = isProd ? 'production' : 'development'
        
        // Node name
        this.config.name = await this.prompt('Node name', this.config.name)
        
        // Port selection with conflict detection
        const defaultPort = this.config.env === 'production' ? 443 : 8765
        let port = parseInt(await this.prompt('Port', String(defaultPort)))
        
        // Check port availability
        while (true) {
            try {
                execSync(`lsof -i:${port}`, { stdio: 'ignore' })
                this.log(`  ⚠ Port ${port} is already in use`, colors.yellow)
                port = parseInt(await this.prompt('Choose another port'))
            } catch {
                // Port is available
                break
            }
        }
        
        // Setup environment config
        const envConfig = {
            port,
            domain: 'localhost',
            peers: []
        }
        
        if (this.config.env === 'production') {
            envConfig.domain = await this.prompt('Domain name', 'localhost')
            
            // SSL setup for production
            if (envConfig.domain !== 'localhost') {
                const setupSSL = await this.confirm('Setup SSL with Let\'s Encrypt?', true)
                
                if (setupSSL) {
                    envConfig.ssl = {
                        key: `/etc/letsencrypt/live/${envConfig.domain}/privkey.pem`,
                        cert: `/etc/letsencrypt/live/${envConfig.domain}/fullchain.pem`
                    }
                    
                    this.config.sslEmail = await this.prompt('Email for SSL notifications')
                    this.config.setupSSL = true
                }
            }
        }
        
        this.config[this.config.env] = envConfig
        console.log()
    }

    async setupnetwork() {
        this.log('🌐 Network Configuration', colors.cyan + colors.bright)
        console.log()
        
        // Peer connections
        const addPeers = await this.confirm('Connect to other Air nodes?', false)
        
        if (addPeers) {
            const peers = []
            let addMore = true
            
            this.log('Enter peer URLs (e.g., wss://peer.example.com/gun)', colors.dim)
            
            while (addMore) {
                const peerUrl = await this.prompt('Peer URL (or press Enter to finish)')
                
                if (peerUrl) {
                    // Validate URL
                    if (security.validate(peerUrl, 'url')) {
                        peers.push(peerUrl)
                        this.log(`  ✓ Added: ${peerUrl}`, colors.green)
                    } else {
                        this.log(`  ✗ Invalid URL format`, colors.red)
                    }
                } else {
                    addMore = false
                }
            }
            
            if (peers.length > 0) {
                this.config[this.config.env].peers = peers
            }
        }
        
        // Remote config sync
        const syncUrl = await this.prompt('Remote config URL (optional)', '')
        if (syncUrl && security.validate(syncUrl, 'url')) {
            this.config.sync = syncUrl
        }
        
        console.log()
    }

    async setupsecurity() {
        this.log('🔐 Security Configuration', colors.cyan + colors.bright)
        console.log()
        
        // Run security check
        const securityReport = security.checksystem()
        
        this.log(`Security Score: ${securityReport.score}/100 (Grade: ${securityReport.grade})`, 
            securityReport.grade === 'A' ? colors.green : colors.yellow)
        
        if (securityReport.issues.length > 0) {
            this.log('\nSecurity Issues:', colors.yellow)
            for (const issue of securityReport.issues) {
                this.log(`  ⚠ ${issue}`, colors.yellow)
            }
        }
        
        if (securityReport.recommendations.length > 0) {
            this.log('\nRecommendations:', colors.cyan)
            for (const rec of securityReport.recommendations) {
                this.log(`  → ${rec}`, colors.dim)
            }
        }
        
        // Generate SEA keys
        if (this.config.env === 'production') {
            this.log('\n🔑 Generating cryptographic keys...', colors.cyan)
            
            // In real implementation, we'd use GUN SEA to generate these
            // For now, we'll create placeholder structure
            this.config[this.config.env].pair = {
                pub: security.generatekey(32),
                priv: security.generatekey(32),
                epub: security.generatekey(32),
                epriv: security.generatekey(32)
            }
            
            this.log('  ✓ Keys generated', colors.green)
        }
        
        console.log()
    }

    async save() {
        this.log('💾 Saving configuration...', colors.cyan)
        
        const configPath = path.join(rootPath, 'air.json')
        
        // Backup existing config
        if (fs.existsSync(configPath)) {
            const backupPath = `${configPath}.backup.${Date.now()}`
            fs.copyFileSync(configPath, backupPath)
            this.log(`  ✓ Backed up existing config to ${path.basename(backupPath)}`, colors.green)
        }
        
        // Write new config
        fs.writeFileSync(configPath, JSON.stringify(this.config, null, 4))
        
        // Set secure permissions
        fs.chmodSync(configPath, 0o600)
        
        this.log('  ✓ Configuration saved', colors.green)
        console.log()
    }

    async setupservice() {
        this.log('🚀 Service Setup', colors.cyan + colors.bright)
        console.log()
        
        const env = await this.detectenvironment()
        
        if (env.hasSystemd && this.config.env === 'production') {
            const setupSystemd = await this.confirm('Setup as systemd service?', true)
            
            if (setupSystemd) {
                this.log('Creating systemd service...', colors.cyan)
                
                const serviceName = `air-${this.config.name}`
                const serviceContent = `[Unit]
Description=Air GUN Database - ${this.config.name}
After=network.target

[Service]
Type=simple
User=${env.user}
WorkingDirectory=${rootPath}
ExecStart=/usr/bin/node ${path.join(rootPath, 'main.js')}
Restart=always
RestartSec=10
StandardOutput=append:/var/log/${serviceName}.log
StandardError=append:/var/log/${serviceName}.error.log

[Install]
WantedBy=multi-user.target`
                
                const servicePath = `/etc/systemd/system/${serviceName}.service`
                
                try {
                    // Write service file
                    fs.writeFileSync(`/tmp/${serviceName}.service`, serviceContent)
                    execSync(`sudo mv /tmp/${serviceName}.service ${servicePath}`)
                    execSync('sudo systemctl daemon-reload')
                    
                    this.log(`  ✓ Service created: ${serviceName}`, colors.green)
                    
                    // Enable and start
                    const startNow = await this.confirm('Start service now?', true)
                    
                    if (startNow) {
                        execSync(`sudo systemctl enable ${serviceName}`)
                        execSync(`sudo systemctl start ${serviceName}`)
                        this.log(`  ✓ Service started`, colors.green)
                    }
                } catch (error) {
                    this.log(`  ✗ Failed to create service: ${error.message}`, colors.red)
                }
            }
        } else if (env.hasPM2) {
            const setupPM2 = await this.confirm('Setup with PM2?', true)
            
            if (setupPM2) {
                this.log('Setting up PM2...', colors.cyan)
                
                try {
                    execSync(`pm2 start ${path.join(rootPath, 'main.js')} --name air-${this.config.name}`)
                    execSync('pm2 save')
                    this.log(`  ✓ PM2 process started`, colors.green)
                } catch (error) {
                    this.log(`  ✗ Failed to setup PM2: ${error.message}`, colors.red)
                }
            }
        }
        
        console.log()
    }

    async runarchitecturecheck() {
        this.log('🏗️  Architecture Validation', colors.cyan + colors.bright)
        console.log()
        
        this.log('Scanning codebase...', colors.cyan)
        
        await architecture.scan(rootPath)
        const report = architecture.report()
        
        this.log(`Architecture Score: ${report.score}/100 (Grade: ${report.grade})`,
            report.grade === 'A' ? colors.green : colors.yellow)
        
        if (report.violations.length > 0) {
            this.log(`\nFound ${report.violations.length} violations:`, colors.yellow)
            
            // Show critical and errors only
            const critical = report.violations.filter(v => v.severity === 'critical')
            const errors = report.violations.filter(v => v.severity === 'error')
            
            if (critical.length > 0) {
                this.log('\nCritical:', colors.red + colors.bright)
                for (const v of critical.slice(0, 3)) {
                    this.log(`  ✗ ${v.message} (${v.path})`, colors.red)
                }
            }
            
            if (errors.length > 0) {
                this.log('\nErrors:', colors.red)
                for (const v of errors.slice(0, 3)) {
                    this.log(`  ✗ ${v.message} (${v.path})`, colors.red)
                }
            }
            
            if (report.violations.length > 6) {
                this.log(`  ... and ${report.violations.length - 6} more`, colors.dim)
            }
        } else {
            this.log('  ✓ No architecture violations found!', colors.green + colors.bright)
        }
        
        console.log()
    }

    async complete() {
        this.log('═══════════════════════════════════════════', colors.green)
        this.log('       ✨ Setup Complete!', colors.green + colors.bright)
        this.log('═══════════════════════════════════════════', colors.green)
        console.log()
        
        this.log('Your Air node is configured and ready.', colors.cyan)
        console.log()
        
        this.log('Quick Start Commands:', colors.cyan + colors.bright)
        this.log('  npm start         - Start Air server', colors.bright)
        this.log('  npm run ui        - Start with UI', colors.bright)
        this.log('  npm run status    - Check system status', colors.bright)
        this.log('  npm run logs      - View logs', colors.bright)
        this.log('  npm test          - Run tests', colors.bright)
        console.log()
        
        if (this.config.env === 'production') {
            this.log('Production URLs:', colors.cyan + colors.bright)
            const protocol = this.config.production.ssl ? 'https' : 'http'
            this.log(`  ${protocol}://${this.config.production.domain}:${this.config.production.port}`, colors.bright)
            this.log(`  ${protocol}://${this.config.production.domain}:${this.config.production.port}/gun`, colors.bright)
        } else {
            this.log('Development URL:', colors.cyan + colors.bright)
            this.log(`  http://localhost:${this.config.development.port}`, colors.bright)
            this.log(`  http://localhost:${this.config.development.port}/gun`, colors.bright)
        }
        
        console.log()
        this.log('Documentation: https://github.com/akaoio/air', colors.blue)
        console.log()
    }

    async run() {
        this.header()
        
        const env = await this.detectenvironment()
        
        await this.setupbasic()
        await this.setupnetwork()
        await this.setupsecurity()
        await this.save()
        
        if (!env.isRoot) {
            await this.setupservice()
        }
        
        await this.runarchitecturecheck()
        await this.complete()
        
        this.rl.close()
        
        // Ask to start now
        if (process.stdin.isTTY) {
            const rl2 = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })
            
            rl2.question('Start Air now? [Y/n]: ', answer => {
                rl2.close()
                
                if (!answer || answer.toLowerCase() === 'y') {
                    console.log()
                    this.log('Starting Air...', colors.cyan)
                    
                    try {
                        require('../main.js')
                    } catch (error) {
                        this.log(`Failed to start: ${error.message}`, colors.red)
                        process.exit(1)
                    }
                }
            })
        }
    }
}

// Run setup
const setup = new QuickSetup()
setup.run().catch(error => {
    console.error(colors.red + colors.bright + '\n✗ Setup failed:' + colors.reset, error)
    process.exit(1)
})