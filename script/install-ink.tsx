#!/usr/bin/env bun
/**
 * Air Installer with Ink UI
 */

import React from 'react'
import { render } from 'ink'
import { InstallUI } from '../src/UI/InstallUI.js'
import { detectConfigPaths, mergeConfig } from '../src/config-merger.js'
import fs from 'fs'
import path from 'path'

// Parse command line arguments  
function parseArgs(args: string[]) {
    const parsed: any = {
        nonInteractive: args.includes('--non-interactive') || args.includes('--no-tui') || process.env.CI,
        systemd: args.includes('--systemd'),
        ssl: args.includes('--ssl')
    }
    
    for (const arg of args) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.split('=')
            const cleanKey = key.replace('--', '').replace('-', '_')
            
            if (cleanKey === 'port') {
                parsed.port = parseInt(value)
            } else if (value) {
                parsed[cleanKey] = value
            }
        }
    }
    
    return parsed
}

const args = process.argv.slice(2)
const options = parseArgs(args)

// If non-interactive or CI environment, do CLI install
if (options.nonInteractive) {
    console.log('🛠️  Air CLI Install')
    
    // Use CLI args or defaults
    const name = options.name || 'air'
    const env = options.env || 'development'
    const port = options.port || (env === 'production' ? 443 : 8765)
    const domain = options.domain || (env === 'production' ? '' : 'localhost')
    
    const envConfig: any = {
        port,
        domain,
        peers: []
    }
    
    // Add SSL for production
    if (env === 'production' && domain && domain !== 'localhost') {
        envConfig.ssl = {
            key: `/etc/letsencrypt/live/${domain}/privkey.pem`,
            cert: `/etc/letsencrypt/live/${domain}/fullchain.pem`
        }
    }
    
    // Add GoDaddy if provided
    if (options.godaddy_domain && options.godaddy_key && options.godaddy_secret) {
        envConfig.godaddy = {
            domain: options.godaddy_domain,
            host: options.godaddy_host || 'air',
            key: options.godaddy_key,
            secret: options.godaddy_secret
        }
    }
    
    const config = {
        name,
        env,
        root: process.cwd(),
        bash: process.env.SHELL || '/bin/bash',
        ip: {
            timeout: 5000,
            dnsTimeout: 3000,
            userAgent: 'Air-GUN-Peer/2.0',
            dns: [
                { resolver: 'resolver1.opendns.com', hostname: 'myip.opendns.com' },
                { resolver: '1.1.1.1', hostname: 'whoami.cloudflare' }
            ],
            http: [
                { url: 'https://api.ipify.org', format: 'text' },
                { url: 'https://icanhazip.com', format: 'text' }
            ]
        },
        development: env === 'development' ? envConfig : {
            port: 8765,
            domain: 'localhost', 
            peers: []
        },
        production: env === 'production' ? envConfig : {
            port: 443,
            domain: '',
            peers: []
        }
    }
    
    // Use custom config path or default
    let targetPath = path.join(process.cwd(), 'air.json')
    
    if (options.config) {
        // Expand ~ to home directory
        let configPath = options.config
        if (configPath.startsWith('~/')) {
            configPath = path.join(process.env.HOME || '/tmp', configPath.slice(2))
        }
        targetPath = path.resolve(configPath)
    }
    
    // Ensure directory exists
    const configDir = path.dirname(targetPath)
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
        console.log(`📁 Created directory: ${configDir}`)
    }
    
    // Create backup if exists
    if (fs.existsSync(targetPath)) {
        const backup = targetPath + '.backup.' + Date.now()
        fs.copyFileSync(targetPath, backup)
        console.log(`📁 Backup: ${backup}`)
    }
    
    fs.writeFileSync(targetPath, JSON.stringify(config, null, 2))
    console.log(`✅ Config created: ${targetPath}`)
    
    // Setup systemd service if requested
    if (options.systemd) {
        console.log('')
        console.log('🔧 Setting up systemd service...')
        
        try {
            const { Installer } = await import('../src/Installer/index.js')
            const installer = new Installer()
            const serviceResult = await installer.service(config)
            
            if (serviceResult.created) {
                console.log('✅ Service created successfully!')
                
                // Check if user service was created
                const userServicePath = `${process.env.HOME}/.config/systemd/user/air-${name}.service`
                if (fs.existsSync(userServicePath)) {
                    console.log('📁 Using user-level systemd (no sudo required)')
                    console.log('')
                    console.log('💡 Service commands:')
                    console.log(`  systemctl --user start air-${name}    # Start service`)
                    console.log(`  systemctl --user status air-${name}   # Check status`)
                    console.log(`  systemctl --user stop air-${name}     # Stop service`)
                    console.log(`  journalctl --user -u air-${name}      # View logs`)
                } else {
                    console.log('📁 Using system-level systemd')
                    console.log('')
                    console.log('💡 Service commands:')
                    console.log(`  sudo systemctl start air-${name}      # Start service`)
                    console.log(`  sudo systemctl status air-${name}     # Check status`)
                    console.log(`  sudo systemctl stop air-${name}       # Stop service`)
                    console.log(`  sudo journalctl -u air-${name}        # View logs`)
                }
            } else {
                console.log(`⚠️  Service setup failed: ${serviceResult.error || 'Unknown error'}`)
            }
        } catch (error: any) {
            console.log(`⚠️  Service setup error: ${error.message}`)
        }
    }
    
    console.log('')
    console.log('🔧 Configuration:')
    console.log(`  Name: ${name}`)
    console.log(`  Environment: ${env}`)
    console.log(`  Port: ${port}`)
    console.log(`  Domain: ${domain || 'not set'}`)
    
    if (envConfig.godaddy) {
        console.log(`  GoDaddy: ${envConfig.godaddy.host}.${envConfig.godaddy.domain}`)
    }
    
    console.log('')
    console.log('🚀 Next steps:')
    if (options.systemd) {
        console.log(`  systemctl --user start air-${name}  # Start Air service`)
    } else {
        console.log('  npm start           # Start Air')
    }
    console.log('  npm run config show # View config')
    if (envConfig.godaddy) {
        console.log('  npm run ddns        # Update DNS')
    }
    
    console.log('\nNext: npm start')
    process.exit(0)
}

// Interactive mode
try {
    render(<InstallUI options={options} />)
} catch (error: any) {
    if (error.message.includes('Raw mode')) {
        console.log('⚠️  Terminal not supported, using simple install...')
        
        // Check if config already exists
        if (fs.existsSync('air.json')) {
            console.log('✅ Config already exists: air.json')
            console.log('💡 Use "npm run config" to modify')
        } else {
            const defaultConfig = {
                name: 'air',
                env: 'development', 
                root: process.cwd(),
                development: { port: 8765, domain: 'localhost', peers: [] }
            }
            
            fs.writeFileSync('air.json', JSON.stringify(defaultConfig, null, 2))
            console.log('✅ Config created: air.json')
        }
        console.log('Next: npm start')
    } else {
        console.error('Install failed:', error.message)
        process.exit(1)
    }
}