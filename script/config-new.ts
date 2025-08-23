#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Config } from '../src/Config/index.js'
import { getPaths } from '../src/path/index.js'
import type { AirConfig } from '../src/types/index.js'
import { AirUI, StatusItem, formatPath, formatSuccess, formatWarning } from './ui-utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// State management
let configManager: Config
let currentConfig: AirConfig
let modified = false
const ui = new AirUI('Configuration Manager')

// Initialize configuration
function initConfig(): void {
    const paths = getPaths()
    configManager = new Config(paths.config)
    currentConfig = configManager.load() || configManager.defaults()
}

// Save configuration
function saveConfig(): boolean {
    try {
        if (configManager.save(currentConfig)) {
            modified = false
            return true
        }
        return false
    } catch (error: any) {
        ui.showError(`Error saving config: ${error.message}`)
        return false
    }
}
    
async function run(): Promise<void> {
    const paths = getPaths()
    ui.showInfo(`Configuration file: ${formatPath(paths.config)}`)
    
    let running = true
    while (running) {
        const choice = await showMainMenu()
        
        switch (choice) {
            case 'View current configuration':
                await viewConfig()
                break
            case 'Edit basic settings':
                await editBasic()
                break
            case 'Edit environment settings':
                await editEnvironment()
                break
            case 'Manage peers':
                await managePeers()
                break
            case 'Configure GoDaddy DDNS':
                await configureGodaddy()
                break
            case 'Configure SSL':
                await configureSSL()
                break
            case 'Reset to defaults':
                await resetDefaults()
                break
            case 'Save and exit':
                if (modified) {
                    if (saveConfig()) {
                        ui.showSuccess('Configuration saved')
                    }
                }
                running = false
                break
            case 'Exit without saving':
                if (modified) {
                    const confirm = await ui.confirm('Exit without saving changes?', false)
                    if (confirm) {
                        running = false
                    }
                } else {
                    running = false
                }
                break
        }
    }
    
    ui.showInfo('Configuration manager closed')
}
    
async function showMainMenu(): Promise<string> {
        console.log('\n')
        this.ui.showDivider(50)
        
        const options = [
            'View current configuration',
            'Edit basic settings',
            'Edit environment settings',
            'Manage peers',
            'Configure GoDaddy DDNS',
            'Configure SSL',
            'Reset to defaults',
            'Save and exit',
            'Exit without saving'
        ]
        
        return await ui.select('Select an option', options, 7) // Default to "Save and exit"
    }
    
async function viewConfig(): Promise<void> {
        console.log('\n')
        const items: StatusItem[] = [
            { label: 'Name', value: currentConfig.name, status: 'info' },
            { label: 'Environment', value: currentConfig.env, status: 'info' },
            { label: 'Root', value: currentConfig.root, status: 'info' }
        ]
        
        if (currentConfig.sync) {
            items.push({ label: 'Sync URL', value: currentConfig.sync, status: 'info' })
        }
        
        console.log(ui.createStatusSection('Current Configuration', items))
        
        // Show environment-specific config
        const env = currentConfig.env
        if (currentConfig[env]) {
            const envItems: StatusItem[] = []
            const envConfig = currentConfig[env]
            
            if (envConfig.domain) {
                envItems.push({ label: 'Domain', value: envConfig.domain, status: 'info' })
            }
            if (envConfig.port) {
                envItems.push({ label: 'Port', value: String(envConfig.port), status: 'info' })
            }
            if (envConfig.peers && envConfig.peers.length > 0) {
                envItems.push({ label: 'Peers', value: `${envConfig.peers.length} configured`, status: 'success' })
            }
            if (envConfig.ssl) {
                envItems.push({ label: 'SSL', value: 'Configured', status: 'success' })
            }
            if (envConfig.godaddy) {
                envItems.push({ label: 'GoDaddy DDNS', value: 'Configured', status: 'success' })
            }
            
            if (envItems.length > 0) {
                console.log(ui.createStatusSection(`${env} Environment`, envItems))
            }
        }
        
        console.log('\nFull configuration (JSON):')
        console.log(JSON.stringify(currentConfig, null, 2))
        
        await ui.prompt('Press Enter to continue', '')
    }
    
async function editBasic(): Promise<void> {
        console.log('\n')
        ui.showInfo('Edit Basic Settings')
        ui.showDivider(40)
        
        const name = await ui.prompt('Node name', currentConfig.name)
        const envOptions = ['development', 'production']
        const currentEnvIndex = envOptions.indexOf(currentConfig.env)
        const env = await ui.select('Environment', envOptions, currentEnvIndex >= 0 ? currentEnvIndex : 0)
        const sync = await ui.prompt('Sync URL (optional)', currentConfig.sync || '')
        
        currentConfig.name = name
        currentConfig.env = env
        currentConfig.sync = sync || null
        
        // Ensure environment config exists
        if (!currentConfig[env]) {
            currentConfig[env] = {
                domain: env === 'production' ? 'example.com' : 'localhost',
                port: 8765,
                peers: []
            }
        }
        
        modified = true
        ui.showSuccess('Basic settings updated')
    }
    
async function editEnvironment(): Promise<void> {
        console.log('\n')
        const env = currentConfig.env
        ui.showInfo(`Edit ${env} Environment Settings`)
        ui.showDivider(40)
        
        if (!currentConfig[env]) {
            currentConfig[env] = {}
        }
        
        const domain = await ui.prompt('Domain', currentConfig[env].domain || 'localhost')
        const portStr = await ui.prompt('Port', String(currentConfig[env].port || 8765))
        const port = parseInt(portStr)
        
        if (isNaN(port) || port < 1 || port > 65535) {
            ui.showError('Invalid port number')
            return
        }
        
        currentConfig[env].domain = domain
        currentConfig[env].port = port
        
        modified = true
        ui.showSuccess(`${env} environment settings updated`)
    }
    
async function managePeers(): Promise<void> {
        const env = currentConfig.env
        if (!currentConfig[env]) {
            currentConfig[env] = {}
        }
        if (!currentConfig[env].peers) {
            currentConfig[env].peers = []
        }
        
        let managing = true
        while (managing) {
            console.log('\n')
            ui.showInfo('Peer Management')
            ui.showDivider(40)
            
            const peers = currentConfig[env].peers
            
            if (peers.length > 0) {
                console.log('\nCurrent peers:')
                peers.forEach((peer: string, i: number) => {
                    console.log(`  ${i + 1}. ${peer}`)
                })
            } else {
                console.log('\nNo peers configured')
            }
            
            const options = [
                'Add peer',
                'Remove peer',
                'Clear all peers',
                'Back to main menu'
            ]
            
            const choice = await ui.select('Choose action', options, 3)
            
            switch (choice) {
                case 'Add peer':
                    const newPeer = await ui.prompt('Peer URL (e.g., wss://peer.example.com/gun)')
                    if (newPeer) {
                        peers.push(newPeer)
                        modified = true
                        ui.showSuccess('Peer added')
                    }
                    break
                
                case 'Remove peer':
                    if (peers.length > 0) {
                        const peerOptions = peers.map((p: string, i: number) => `${i + 1}. ${p}`)
                        peerOptions.push('Cancel')
                        const selected = await ui.select('Select peer to remove', peerOptions, peerOptions.length - 1)
                        
                        if (selected !== 'Cancel') {
                            const index = parseInt(selected.split('.')[0]) - 1
                            if (index >= 0 && index < peers.length) {
                                peers.splice(index, 1)
                                modified = true
                                ui.showSuccess('Peer removed')
                            }
                        }
                    } else {
                        ui.showWarning('No peers to remove')
                    }
                    break
                
                case 'Clear all peers':
                    if (peers.length > 0) {
                        const confirm = await ui.confirm('Clear all peers?', false)
                        if (confirm) {
                            currentConfig[env].peers = []
                            modified = true
                            ui.showSuccess('All peers cleared')
                        }
                    } else {
                        ui.showWarning('No peers to clear')
                    }
                    break
                
                case 'Back to main menu':
                    managing = false
                    break
            }
        }
    }
    
async function configureGodaddy(): Promise<void> {
        console.log('\n')
        ui.showInfo('GoDaddy DDNS Configuration')
        ui.showDivider(40)
        
        const env = currentConfig.env
        if (!currentConfig[env]) {
            currentConfig[env] = {}
        }
        
        const current = currentConfig[env].godaddy || {}
        
        if (current.domain) {
            const items: StatusItem[] = [
                { label: 'Domain', value: current.domain, status: 'info' },
                { label: 'Host', value: current.host, status: 'info' },
                { label: 'Key', value: current.key ? '***' + current.key.slice(-4) : 'not set', status: current.key ? 'success' : 'warning' },
                { label: 'Secret', value: current.secret ? '***' : 'not set', status: current.secret ? 'success' : 'warning' }
            ]
            console.log(ui.createStatusSection('Current GoDaddy Configuration', items))
        }
        
        const configure = await ui.confirm('Configure GoDaddy DDNS?', !current.domain)
        if (!configure) return
        
        const domain = await ui.prompt('GoDaddy domain (e.g., example.com)', current.domain || '')
        const host = await ui.prompt('Subdomain/host (@ for root)', current.host || '@')
        const key = await ui.prompt('API key', current.key || '')
        const secret = await ui.prompt('API secret', current.secret || '')
        
        if (domain && key && secret) {
            currentConfig[env].godaddy = { domain, host, key, secret }
            modified = true
            ui.showSuccess('GoDaddy DDNS configured')
        } else {
            ui.showWarning('GoDaddy DDNS configuration incomplete')
        }
    }
    
async function configureSSL(): Promise<void> {
        console.log('\n')
        ui.showInfo('SSL Configuration')
        ui.showDivider(40)
        
        const env = currentConfig.env
        if (!currentConfig[env]) {
            currentConfig[env] = {}
        }
        
        const current = currentConfig[env].ssl || {}
        
        if (current.key) {
            const items: StatusItem[] = [
                { label: 'Key', value: current.key, status: 'info' },
                { label: 'Cert', value: current.cert, status: 'info' }
            ]
            console.log(ui.createStatusSection('Current SSL Configuration', items))
        }
        
        const configure = await ui.confirm('Configure SSL?', !current.key)
        if (!configure) return
        
        const domain = currentConfig[env].domain || 'localhost'
        const defaultKey = `/etc/letsencrypt/live/${domain}/privkey.pem`
        const defaultCert = `/etc/letsencrypt/live/${domain}/fullchain.pem`
        
        const key = await ui.prompt('SSL key path', current.key || defaultKey)
        const cert = await ui.prompt('SSL cert path', current.cert || defaultCert)
        
        if (key && cert) {
            currentConfig[env].ssl = { key, cert }
            modified = true
            ui.showSuccess('SSL configured')
        } else {
            ui.showWarning('SSL configuration incomplete')
        }
    }
    
async function resetDefaults(): Promise<void> {
        const confirm = await ui.confirmDangerous('Reset configuration to defaults? This will lose all current settings.')
        if (confirm) {
            currentConfig = configManager.defaults()
            modified = true
            ui.showSuccess('Configuration reset to defaults')
        }
    }

// Run the configuration manager
initConfig()
run().catch(err => {
    console.error('Configuration manager failed:', err)
    process.exit(1)
})