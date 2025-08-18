#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Terminal } from '@akaoio/tui'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.join(__dirname, 'air.json')

class ConfigWizard {
    constructor() {
        this.term = new Terminal()
        this.config = this.load()
        this.modified = false
    }

    load() {
        try {
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'))
            }
        } catch (error) {
            this.term.error(`Error reading config: ${error.message}`)
        }
        return this.defaults()
    }

    defaults() {
        return {
            root: __dirname,
            bash: __dirname,
            env: 'development',
            name: 'air',
            sync: null,
            development: {
                port: 8765,
                domain: 'localhost',
                peers: []
            },
            production: {
                domain: '',
                port: 443,
                peers: [],
                ssl: {
                    key: '',
                    cert: ''
                },
                godaddy: {
                    domain: '',
                    host: '',
                    key: '',
                    secret: ''
                },
                pair: {
                    pub: '',
                    priv: '',
                    epub: '',
                    epriv: ''
                }
            }
        }
    }

    save() {
        try {
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 4))
            this.term.success(`Configuration saved to ${configPath}`)
            this.modified = false
        } catch (error) {
            this.term.error(`Error saving config: ${error.message}`)
        }
    }

    async basic() {
        this.term.clear()
        this.term.header('Basic Configuration')
        
        this.config.name = await this.term.question('Peer name', this.config.name)
        
        // Use interactive select for environment
        const selectedEnv = await this.term.interactiveSelect(
            'Select environment',
            ['development', 'production'], 
            this.config.env
        )
        // If ESC was pressed (null returned), keep current value
        if (selectedEnv !== null) {
            this.config.env = selectedEnv
        }
        
        const envConfig = this.config[this.config.env]
        
        if (this.config.env === 'development') {
            envConfig.port = await this.term.number('Port', envConfig.port, 1, 65535)
            envConfig.domain = await this.term.question('Domain', envConfig.domain)
        } else {
            envConfig.domain = await this.term.question('Domain (required for SSL)', envConfig.domain)
            envConfig.port = await this.term.number('Port', envConfig.port, 1, 65535)
        }
        
        this.modified = true
        this.term.success('Basic configuration updated')
        await this.term.question('Press Enter to continue...')
    }

    async ssl() {
        if (this.config.env !== 'production') {
            this.term.warning('SSL configuration is only available in production mode')
            await this.term.question('Press Enter to continue...')
            return
        }
        
        this.term.clear()
        this.term.header('SSL Configuration')
        const sslConfig = this.config.production.ssl
        
        const useSSL = await this.term.confirm('Enable SSL?', !!sslConfig.key)
        
        if (useSSL) {
            sslConfig.key = await this.term.question('SSL private key path', sslConfig.key)
            sslConfig.cert = await this.term.question('SSL certificate path', sslConfig.cert)
            this.modified = true
            this.term.success('SSL configuration updated')
        } else {
            sslConfig.key = ''
            sslConfig.cert = ''
            if (sslConfig.key || sslConfig.cert) {
                this.modified = true
                this.term.info('SSL disabled')
            }
        }
        
        await this.term.question('Press Enter to continue...')
    }

    async ddns() {
        if (this.config.env !== 'production') {
            this.term.warning('DDNS configuration is only available in production mode')
            await this.term.question('Press Enter to continue...')
            return
        }
        
        this.term.clear()
        this.term.header('Dynamic DNS (GoDaddy)')
        const ddnsConfig = this.config.production.godaddy
        
        const useDDNS = await this.term.confirm('Enable GoDaddy DDNS?', !!ddnsConfig.domain)
        
        if (useDDNS) {
            ddnsConfig.domain = await this.term.question('GoDaddy domain', ddnsConfig.domain)
            ddnsConfig.host = await this.term.question('Host/subdomain', ddnsConfig.host)
            ddnsConfig.key = await this.term.question('GoDaddy API key', ddnsConfig.key)
            ddnsConfig.secret = await this.term.password('GoDaddy API secret')
            if (!ddnsConfig.secret) {
                ddnsConfig.secret = this.config.production.godaddy.secret || ''
            }
            this.modified = true
            this.term.success('DDNS configuration updated')
        } else {
            ddnsConfig.domain = ''
            ddnsConfig.host = ''
            ddnsConfig.key = ''
            ddnsConfig.secret = ''
            if (ddnsConfig.domain) {
                this.modified = true
                this.term.info('DDNS disabled')
            }
        }
        
        await this.term.question('Press Enter to continue...')
    }

    async peers() {
        this.term.clear()
        this.term.header('Peer Connections')
        const envConfig = this.config[this.config.env]
        
        while (true) {
            this.term.clear()
            this.term.header('Peer Connections')
            
            if (envConfig.peers.length === 0) {
                this.term.info('No peers configured')
            } else {
                this.term.table(
                    envConfig.peers.map((peer, i) => ({ 
                        '#': i + 1, 
                        url: this.term.truncate(peer, 50)
                    })),
                    [
                        { key: '#', label: '#', width: 3 },
                        { key: 'url', label: 'Peer URL', width: Math.min(50, this.term.width - 10) }
                    ]
                )
            }
            
            const action = await this.term.interactiveSelect(
                'Select action', 
                ['Add peer', 'Remove peer', 'Clear all', 'Back'], 
                'Back'
            )
            
            // If ESC was pressed, go back
            if (action === null || action === 'Back') {
                break
            }
            
            if (action === 'Add peer') {
                const peer = await this.term.question('Peer URL (wss://example.com/gun)')
                if (peer && !envConfig.peers.includes(peer)) {
                    envConfig.peers.push(peer)
                    this.modified = true
                    this.term.success('Peer added')
                }
            } else if (action === 'Remove peer' && envConfig.peers.length > 0) {
                const peerChoices = envConfig.peers.map((p, i) => `${i + 1}. ${p}`)
                const selected = await this.term.interactiveSelect('Select peer to remove', peerChoices)
                if (selected !== null) {
                    const index = parseInt(selected.split('.')[0]) - 1
                    if (index >= 0 && index < envConfig.peers.length) {
                        const removed = envConfig.peers.splice(index, 1)[0]
                        this.modified = true
                        this.term.success(`Removed: ${removed}`)
                    }
                }
            } else if (action === 'Clear all') {
                if (await this.term.confirm('Clear all peers?', false)) {
                    envConfig.peers = []
                    this.modified = true
                    this.term.success('All peers cleared')
                }
            }
            
            await this.term.question('Press Enter to continue...')
        }
    }

    async advanced() {
        this.term.clear()
        this.term.header('Advanced Configuration')
        
        const showAdvanced = await this.term.confirm('Configure advanced options?', false)
        if (!showAdvanced) return
        
        const syncUrl = await this.term.question('Remote config sync URL', this.config.sync || '')
        if (syncUrl !== (this.config.sync || '')) {
            this.config.sync = syncUrl || null
            this.modified = true
        }
        
        if (this.config.env === 'production') {
            this.term.info('SEA cryptographic keys are auto-generated on first run')
            const resetKeys = await this.term.confirm('Reset SEA keys?', false)
            if (resetKeys) {
                const pairConfig = this.config.production.pair
                pairConfig.pub = ''
                pairConfig.priv = ''
                pairConfig.epub = ''
                pairConfig.epriv = ''
                this.modified = true
                this.term.warning('Keys will be regenerated on next start')
            }
        }
        
        await this.term.question('Press Enter to continue...')
    }

    async interactiveMenu() {
        while (true) {
            this.term.clear()
            
            // Display status
            this.term.box(
                `Environment: ${this.config.env}\n` +
                `Peer name: ${this.config.name}\n` +
                `Modified: ${this.modified ? 'Yes (unsaved)' : 'No'}`,
                { borderColor: this.modified ? 'yellow' : 'cyan' }
            )
            
            const choice = await this.term.interactiveMenu('Air Configuration Wizard', [
                { section: 'Configuration Options' },
                { label: 'Basic settings', value: 'basic' },
                { label: 'SSL configuration', value: 'ssl' },
                { label: 'Dynamic DNS', value: 'ddns' },
                { label: 'Peer connections', value: 'peers' },
                { label: 'Advanced options', value: 'advanced' },
                { section: 'Actions' },
                { label: 'Save configuration', value: 'save' },
                { label: 'Exit', value: 'exit' }
            ], { fullscreen: false })
            
            // ESC pressed - ask if user wants to exit
            if (choice === null) {
                if (this.modified) {
                    const saveBeforeExit = await this.term.confirm('You have unsaved changes. Save before exit?', true)
                    if (saveBeforeExit) {
                        this.save()
                    }
                }
                this.term.close()
                return
            }
            
            switch (choice) {
                case 'basic':
                    await this.basic()
                    break
                case 'ssl':
                    await this.ssl()
                    break
                case 'ddns':
                    await this.ddns()
                    break
                case 'peers':
                    await this.peers()
                    break
                case 'advanced':
                    await this.advanced()
                    break
                case 'save':
                    this.save()
                    await this.term.question('Press Enter to continue...')
                    break
                case 'exit':
                    if (this.modified) {
                        const saveBeforeExit = await this.term.confirm('You have unsaved changes. Save before exit?', true)
                        if (saveBeforeExit) {
                            this.save()
                        }
                    }
                    this.term.close()
                    return
            }
        }
    }

    async menu() {
        while (true) {
            this.term.clear()
            this.term.header('Air Configuration Wizard')
            this.term.info(`Environment: ${this.config.env}`)
            this.term.info(`Peer name: ${this.config.name}`)
            if (this.modified) {
                this.term.warning('You have unsaved changes')
            }
            
            const choice = await this.term.menu('', [
                { section: 'Configuration Options' },
                { label: 'Basic settings', value: 'basic' },
                { label: 'SSL configuration', value: 'ssl' },
                { label: 'Dynamic DNS', value: 'ddns' },
                { label: 'Peer connections', value: 'peers' },
                { label: 'Advanced options', value: 'advanced' },
                { section: 'Actions' },
                { label: 'Save and exit', value: 'save' },
                { label: 'Exit without saving', value: 'exit' }
            ])
            
            switch (choice) {
                case 'basic':
                    await this.basic()
                    break
                case 'ssl':
                    await this.ssl()
                    break
                case 'ddns':
                    await this.ddns()
                    break
                case 'peers':
                    await this.peers()
                    break
                case 'advanced':
                    await this.advanced()
                    break
                case 'save':
                    this.save()
                    this.term.close()
                    return
                case 'exit':
                    if (this.modified) {
                        const confirm = await this.term.confirm('Exit without saving changes?', false)
                        if (!confirm) continue
                    }
                    this.term.warning('Exiting without saving changes')
                    this.term.close()
                    return
            }
        }
    }

    async quick() {
        this.term.header('Quick Setup')
        
        this.term.startSpinner('Loading configuration...')
        await new Promise(resolve => setTimeout(resolve, 500))
        this.term.stopSpinner(true, 'Configuration loaded')
        
        // Show progress
        let step = 0
        const totalSteps = this.config.env === 'production' ? 3 : 1
        
        this.term.progressBar(step, totalSteps, 'Setup progress')
        await this.basic()
        step++
        this.term.progressBar(step, totalSteps, 'Setup progress')
        
        if (this.config.env === 'production') {
            await this.ssl()
            step++
            this.term.progressBar(step, totalSteps, 'Setup progress')
            
            await this.ddns()
            step++
            this.term.progressBar(step, totalSteps, 'Setup progress')
        }
        
        this.save()
        this.term.close()
    }

    async run() {
        try {
            const args = process.argv.slice(2)
            
            // Check if terminal supports interactivity
            const isInteractive = process.stdin.isTTY && process.stdout.isTTY
            
            if (args.includes('--quick') || args.includes('-q')) {
                await this.quick()
            } else if (args.includes('--interactive') || args.includes('-i')) {
                if (!isInteractive) {
                    this.term.error('Interactive mode requires a TTY terminal')
                    this.term.close()
                    return
                }
                await this.interactiveMenu()
            } else {
                // Default to interactive if TTY, otherwise simple menu
                if (isInteractive) {
                    await this.interactiveMenu()
                } else {
                    await this.menu()
                }
            }
        } catch (error) {
            this.term.error(`Configuration error: ${error.message}`)
            this.term.close()
        }
    }
}

const wizard = new ConfigWizard()
wizard.run()