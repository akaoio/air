#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Terminal } from './src/lib/terminal.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.join(__dirname, 'air.json')

class ConfigWizard {
    constructor() {
        this.term = new Terminal()
        this.config = this.load()
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
        } catch (error) {
            this.term.error(`Error saving config: ${error.message}`)
        }
    }

    async basic() {
        this.term.section('Basic Configuration')
        
        this.config.name = await this.term.question('Peer name', this.config.name)
        this.config.env = await this.term.select('Environment', 
            ['development', 'production'], 
            this.config.env
        )
        
        const envConfig = this.config[this.config.env]
        
        if (this.config.env === 'development') {
            envConfig.port = await this.term.number('Port', envConfig.port, 1, 65535)
            envConfig.domain = await this.term.question('Domain', envConfig.domain)
        } else {
            envConfig.domain = await this.term.question('Domain (required for SSL)', envConfig.domain)
            envConfig.port = await this.term.number('Port', envConfig.port, 1, 65535)
        }
    }

    async ssl() {
        if (this.config.env !== 'production') return
        
        this.term.section('SSL Configuration')
        const sslConfig = this.config.production.ssl
        
        const useSSL = await this.term.confirm('Enable SSL?', !!sslConfig.key)
        
        if (useSSL) {
            sslConfig.key = await this.term.question('SSL private key path', sslConfig.key)
            sslConfig.cert = await this.term.question('SSL certificate path', sslConfig.cert)
        } else {
            sslConfig.key = ''
            sslConfig.cert = ''
        }
    }

    async ddns() {
        if (this.config.env !== 'production') return
        
        this.term.section('Dynamic DNS (GoDaddy)')
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
        } else {
            ddnsConfig.domain = ''
            ddnsConfig.host = ''
            ddnsConfig.key = ''
            ddnsConfig.secret = ''
        }
    }

    async peers() {
        this.term.section('Peer Connections')
        const envConfig = this.config[this.config.env]
        
        if (envConfig.peers.length === 0) {
            this.term.info('No peers configured')
        } else {
            this.term.table(
                envConfig.peers.map((peer, i) => ({ 
                    '#': i + 1, 
                    url: peer 
                })),
                [
                    { key: '#', label: '#', width: 3 },
                    { key: 'url', label: 'Peer URL', width: 50 }
                ]
            )
        }
        
        const action = await this.term.select('Peer action', 
            ['add', 'remove', 'clear', 'skip'], 
            'skip'
        )
        
        if (action === 'add') {
            const peer = await this.term.question('Peer URL (wss://example.com/gun)')
            if (peer && !envConfig.peers.includes(peer)) {
                envConfig.peers.push(peer)
                this.term.success('Peer added')
            }
        } else if (action === 'remove' && envConfig.peers.length > 0) {
            const index = await this.term.number('Remove peer number', 1, 1, envConfig.peers.length) - 1
            if (index >= 0 && index < envConfig.peers.length) {
                const removed = envConfig.peers.splice(index, 1)[0]
                this.term.success(`Removed: ${removed}`)
            }
        } else if (action === 'clear') {
            envConfig.peers = []
            this.term.success('All peers cleared')
        }
    }

    async advanced() {
        this.term.section('Advanced Configuration')
        
        const showAdvanced = await this.term.confirm('Configure advanced options?', false)
        if (!showAdvanced) return
        
        const syncUrl = await this.term.question('Remote config sync URL', this.config.sync || '')
        this.config.sync = syncUrl || null
        
        if (this.config.env === 'production') {
            this.term.info('SEA cryptographic keys are auto-generated on first run')
            const resetKeys = await this.term.confirm('Reset SEA keys?', false)
            if (resetKeys) {
                const pairConfig = this.config.production.pair
                pairConfig.pub = ''
                pairConfig.priv = ''
                pairConfig.epub = ''
                pairConfig.epriv = ''
                this.term.warning('Keys will be regenerated on next start')
            }
        }
    }

    async menu() {
        while (true) {
            this.term.clear()
            this.term.header('Air Configuration Wizard')
            this.term.info(`Environment: ${this.config.env}`)
            this.term.info(`Peer name: ${this.config.name}`)
            
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
        
        await this.basic()
        
        if (this.config.env === 'production') {
            await this.ssl()
            await this.ddns()
        }
        
        this.save()
        this.term.close()
    }

    async run() {
        try {
            const args = process.argv.slice(2)
            
            if (args.includes('--quick') || args.includes('-q')) {
                await this.quick()
            } else {
                await this.menu()
            }
        } catch (error) {
            this.term.error(`Configuration error: ${error.message}`)
            this.term.close()
        }
    }
}

const wizard = new ConfigWizard()
wizard.run()