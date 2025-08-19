#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths'
import readline from 'readline'
import type { AirConfig } from '../src/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const paths = getPaths()
const configPath = paths.config

// Simple ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
}

class ConfigWizard {
    constructor() {
        this.config = this.load()
        this.modified = false
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
    }

    load() {
        try {
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'))
            }
        } catch (error) {
            this.error(`Error reading config: ${error.message}`)
        }
        return this.defaults()
    }

    defaults() {
        const paths = getPaths()
        return {
            root: paths.root,
            bash: paths.bash,
            env: 'development',
            name: 'air',
            sync: null,
            development: {
                domain: 'localhost',
                port: 8765,
                peers: []
            }
        }
    }

    save() {
        try {
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2))
            this.modified = false
            return true
        } catch (error) {
            this.error(`Error saving config: ${error.message}`)
            return false
        }
    }

    // Simple output methods
    error(message) {
        console.log(colors.red + '✗ ' + message + colors.reset)
    }

    success(message) {
        console.log(colors.green + '✓ ' + message + colors.reset)
    }

    warning(message) {
        console.log(colors.yellow + '⚠ ' + message + colors.reset)
    }

    info(message) {
        console.log(colors.cyan + 'ℹ ' + message + colors.reset)
    }

    async prompt(question, defaultValue = '') {
        return new Promise((resolve) => {
            const q = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `
            this.rl.question(q, (answer) => {
                resolve(answer || defaultValue)
            })
        })
    }

    async confirm(question, defaultYes = true) {
        const defaultText = defaultYes ? 'Y/n' : 'y/N'
        const answer = await this.prompt(`${question} (${defaultText})`)
        const normalized = answer.toLowerCase().trim()
        
        if (normalized === '') {
            return defaultYes
        }
        
        return normalized === 'y' || normalized === 'yes'
    }

    async selectMenu() {
        console.log('\n' + colors.cyan + colors.bright + '=== Air Configuration Manager ===' + colors.reset)
        console.log('\nSelect an option:\n')
        console.log('  1. View current configuration')
        console.log('  2. Edit basic settings')
        console.log('  3. Edit environment settings')
        console.log('  4. Manage peers')
        console.log('  5. Configure GoDaddy DDNS')
        console.log('  6. Configure SSL')
        console.log('  7. Reset to defaults')
        console.log('  8. Save and exit')
        console.log('  9. Exit without saving')
        
        console.log('')
        const choice = await this.prompt('Enter your choice (1-9)', '9')
        return choice
    }

    async viewConfig() {
        console.log('\n' + colors.magenta + colors.bright + '▶ Current Configuration' + colors.reset)
        console.log(JSON.stringify(this.config, null, 2))
        await this.prompt('\nPress Enter to continue')
    }

    async editBasic() {
        console.log('\n' + colors.magenta + colors.bright + '▶ Basic Settings' + colors.reset)
        
        const name = await this.prompt('Node name', this.config.name)
        const env = await this.prompt('Environment (development/production)', this.config.env)
        const sync = await this.prompt('Sync URL (optional)', this.config.sync || '')
        
        this.config.name = name
        this.config.env = env
        this.config.sync = sync || null
        
        this.modified = true
        this.success('Basic settings updated')
    }

    async editEnvironment() {
        console.log('\n' + colors.magenta + colors.bright + '▶ Environment Settings' + colors.reset)
        
        const env = this.config.env
        if (!this.config[env]) {
            this.config[env] = {}
        }
        
        const domain = await this.prompt('Domain', this.config[env].domain || 'localhost')
        const port = await this.prompt('Port', String(this.config[env].port || 8765))
        
        this.config[env].domain = domain
        this.config[env].port = parseInt(port)
        
        this.modified = true
        this.success(`${env} environment settings updated`)
    }

    async managePeers() {
        console.log('\n' + colors.magenta + colors.bright + '▶ Peer Management' + colors.reset)
        
        const env = this.config.env
        if (!this.config[env]) {
            this.config[env] = {}
        }
        if (!this.config[env].peers) {
            this.config[env].peers = []
        }
        
        const peers = this.config[env].peers
        
        if (peers.length > 0) {
            console.log('\nCurrent peers:')
            peers.forEach((peer, i) => {
                console.log(`  ${i + 1}. ${peer}`)
            })
        } else {
            console.log('\nNo peers configured')
        }
        
        console.log('\n  1. Add peer')
        console.log('  2. Remove peer')
        console.log('  3. Clear all peers')
        console.log('  4. Back to main menu')
        
        const choice = await this.prompt('Choice', '4')
        
        switch (choice) {
            case '1':
                const newPeer = await this.prompt('Peer URL (e.g., wss://peer.example.com/gun)')
                if (newPeer) {
                    peers.push(newPeer)
                    this.modified = true
                    this.success('Peer added')
                }
                break
            
            case '2':
                if (peers.length > 0) {
                    const index = await this.prompt('Enter peer number to remove')
                    const idx = parseInt(index) - 1
                    if (idx >= 0 && idx < peers.length) {
                        peers.splice(idx, 1)
                        this.modified = true
                        this.success('Peer removed')
                    }
                }
                break
            
            case '3':
                if (await this.confirm('Clear all peers?', false)) {
                    this.config[env].peers = []
                    this.modified = true
                    this.success('All peers cleared')
                }
                break
        }
    }

    async configureGodaddy() {
        console.log('\n' + colors.magenta + colors.bright + '▶ GoDaddy DDNS Configuration' + colors.reset)
        
        const env = this.config.env
        if (!this.config[env]) {
            this.config[env] = {}
        }
        
        const current = this.config[env].godaddy || {}
        
        if (current.domain) {
            console.log('\nCurrent GoDaddy configuration:')
            console.log(`  Domain: ${current.domain}`)
            console.log(`  Host: ${current.host}`)
            console.log(`  Key: ${current.key ? '***' : 'not set'}`)
            console.log(`  Secret: ${current.secret ? '***' : 'not set'}`)
        }
        
        const configure = await this.confirm('Configure GoDaddy DDNS?', !current.domain)
        if (!configure) return
        
        const domain = await this.prompt('GoDaddy domain', current.domain || '')
        const host = await this.prompt('Subdomain/host', current.host || '@')
        const key = await this.prompt('API key', current.key || '')
        const secret = await this.prompt('API secret', current.secret || '')
        
        if (domain && key && secret) {
            this.config[env].godaddy = { domain, host, key, secret }
            this.modified = true
            this.success('GoDaddy DDNS configured')
        }
    }

    async configureSSL() {
        console.log('\n' + colors.magenta + colors.bright + '▶ SSL Configuration' + colors.reset)
        
        const env = this.config.env
        if (!this.config[env]) {
            this.config[env] = {}
        }
        
        const current = this.config[env].ssl || {}
        
        if (current.key) {
            console.log('\nCurrent SSL configuration:')
            console.log(`  Key: ${current.key}`)
            console.log(`  Cert: ${current.cert}`)
        }
        
        const configure = await this.confirm('Configure SSL?', !current.key)
        if (!configure) return
        
        const domain = this.config[env].domain || 'localhost'
        const defaultKey = `/etc/letsencrypt/live/${domain}/privkey.pem`
        const defaultCert = `/etc/letsencrypt/live/${domain}/fullchain.pem`
        
        const key = await this.prompt('SSL key path', current.key || defaultKey)
        const cert = await this.prompt('SSL cert path', current.cert || defaultCert)
        
        if (key && cert) {
            this.config[env].ssl = { key, cert }
            this.modified = true
            this.success('SSL configured')
        }
    }

    async resetDefaults() {
        const confirm = await this.confirm('Reset to default configuration?', false)
        if (confirm) {
            this.config = this.defaults()
            this.modified = true
            this.success('Configuration reset to defaults')
        }
    }

    async run() {
        console.log('\n' + colors.blue + colors.bright + 'Welcome to Air Configuration Manager!' + colors.reset)
        console.log(`Configuration file: ${configPath}`)
        
        let running = true
        while (running) {
            const choice = await this.selectMenu()
            
            switch (choice) {
                case '1':
                    await this.viewConfig()
                    break
                case '2':
                    await this.editBasic()
                    break
                case '3':
                    await this.editEnvironment()
                    break
                case '4':
                    await this.managePeers()
                    break
                case '5':
                    await this.configureGodaddy()
                    break
                case '6':
                    await this.configureSSL()
                    break
                case '7':
                    await this.resetDefaults()
                    break
                case '8':
                    if (this.modified) {
                        if (this.save()) {
                            this.success('Configuration saved')
                        }
                    }
                    running = false
                    break
                case '9':
                    if (this.modified) {
                        const confirm = await this.confirm('Exit without saving changes?', false)
                        if (confirm) {
                            running = false
                        }
                    } else {
                        running = false
                    }
                    break
            }
        }
        
        console.log('\n' + colors.cyan + 'Goodbye!' + colors.reset)
        this.rl.close()
    }
}

// Run the wizard
const wizard = new ConfigWizard()
wizard.run().catch(err => {
    console.error(colors.red + 'Error:' + colors.reset, err)
    process.exit(1)
})