#!/usr/bin/env node
/**
 * Air Installer - Main Entry Point
 * Supports both CLI arguments (non-interactive) and Ink TUI
 */

import React from 'react'
import { render } from 'ink'
import { InstallUI } from '../src/UI/InstallUI.js'
import { Installer } from '../src/Installer/index.js'
import type { InstallOptions } from '../src/Installer/types.js'

// Parse command line arguments
function parseArgs(): InstallOptions & { help?: boolean; tui?: boolean } {
    const args = process.argv.slice(2)
    const options: any = {
        tui: true // Default to TUI unless disabled
    }
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        const next = args[i + 1]
        
        switch(arg) {
            // Help
            case '--help':
            case '-h':
                options.help = true
                break
                
            // Non-interactive mode (no TUI)
            case '--non-interactive':
            case '--no-tui':
            case '-n':
                options.tui = false
                options.nonInteractive = true
                break
                
            // Basic options
            case '--name':
                options.name = next
                i++
                break
                
            case '--env':
            case '-e':
                options.env = next as 'development' | 'production'
                i++
                break
                
            case '--port':
            case '-p':
                options.port = parseInt(next)
                i++
                break
                
            case '--domain':
            case '-d':
                options.domain = next
                i++
                break
                
            // SSL options
            case '--ssl':
                options.ssl = true
                break
                
            case '--ssl-email':
                options.sslEmail = next
                i++
                break
                
            // GoDaddy DDNS
            case '--godaddy-domain':
                options.godaddyDomain = next
                i++
                break
                
            case '--godaddy-host':
                options.godaddyHost = next
                i++
                break
                
            case '--godaddy-key':
                options.godaddyKey = next
                i++
                break
                
            case '--godaddy-secret':
                options.godaddySecret = next
                i++
                break
                
            // Service options
            case '--service':
                options.setupService = true
                break
                
            case '--service-type':
                options.serviceType = next
                i++
                break
                
            // Cron options
            case '--cron':
                options.setupCron = true
                break
                
            case '--ddns-cron':
                options.setupDDNSCron = true
                break
                
            case '--ssl-cron':
                options.setupSSLCron = true
                break
                
            // Other options
            case '--force':
            case '-f':
                options.force = true
                break
                
            case '--verbose':
            case '-v':
                options.verbose = true
                break
                
            case '--root':
            case '-r':
                options.root = next
                i++
                break
        }
    }
    
    return options
}

// Show help
function showHelp() {
    console.log(`
Air Database Installer v2.0

Usage: air-install [options]

Options:
  -h, --help              Show this help message
  -n, --non-interactive   Run without TUI (CLI arguments only)
  
Basic Configuration:
  --name <name>           Instance name (default: air)
  -e, --env <env>         Environment: development|production
  -p, --port <port>       Port number (default: 8765)
  -d, --domain <domain>   Domain name (production only)
  
SSL Configuration:
  --ssl                   Enable SSL
  --ssl-email <email>     Email for Let's Encrypt
  
GoDaddy DDNS:
  --godaddy-domain <domain>   GoDaddy domain
  --godaddy-host <host>       Subdomain/host (@ for root)
  --godaddy-key <key>         GoDaddy API key
  --godaddy-secret <secret>   GoDaddy API secret
  
Service & Cron:
  --service               Setup auto-start service
  --service-type <type>   Service type: systemd|user|pm2|cron
  --cron                  Setup all cron jobs
  --ddns-cron            Setup DDNS cron job
  --ssl-cron             Setup SSL renewal cron
  
Other Options:
  -f, --force            Overwrite existing installation
  -v, --verbose          Verbose output
  -r, --root <path>      Installation root directory

Examples:
  # Interactive TUI installation
  air-install
  
  # Quick development install (no TUI)
  air-install --non-interactive --env development
  
  # Full production install with all options
  air-install --non-interactive \\
    --name myapp \\
    --env production \\
    --port 8765 \\
    --domain example.com \\
    --ssl \\
    --godaddy-domain example.com \\
    --godaddy-host @ \\
    --godaddy-key YOUR_KEY \\
    --godaddy-secret YOUR_SECRET \\
    --service \\
    --ddns-cron \\
    --ssl-cron
`)
}

// Run non-interactive installation
async function runNonInteractive(options: InstallOptions) {
    try {
        console.log('🚀 Starting Air installation (non-interactive)...\n')
        
        const installer = new Installer(options)
        
        // Check system
        const systemInfo = installer.check()
        console.log('✅ System check passed')
        console.log(`   Platform: ${systemInfo.platform}`)
        console.log(`   Node.js: ${systemInfo.nodeVersion}`)
        if (systemInfo.hasBun) console.log('   Bun: Available')
        
        // Configure
        const config = installer.configure(options)
        console.log('\n📝 Configuration:')
        console.log(`   Name: ${config.name}`)
        console.log(`   Environment: ${config.env}`)
        console.log(`   Port: ${config[config.env]?.port || config.port}`)
        if (config[config.env]?.domain) {
            console.log(`   Domain: ${config[config.env].domain}`)
        }
        
        // Save configuration
        installer.save(config)
        console.log('\n✅ Configuration saved to air.json')
        
        // Setup SSL if requested
        if (options.ssl && config[config.env]?.ssl) {
            console.log('\n🔒 Setting up SSL...')
            const sslResult = await installer.ssl(config)
            if (sslResult) {
                console.log('✅ SSL configured')
            } else {
                console.log('⚠️  SSL setup skipped or failed')
            }
        }
        
        // Setup cron jobs
        if (options.setupCron || options.setupDDNSCron || options.setupSSLCron) {
            console.log('\n⏰ Setting up cron jobs...')
            const { CronManager } = await import('../src/Installer/cron-manager.js')
            const cronManager = new CronManager()
            
            // Clean old jobs
            cronManager.cleanOldJobs(config)
            
            // Setup DDNS cron
            if (options.setupDDNSCron && config[config.env]?.godaddy) {
                const ddnsResult = await cronManager.setupDDNS(config)
                console.log(ddnsResult.success ? '✅' : '⚠️', ddnsResult.message)
            }
            
            // Setup SSL renewal cron
            if (options.setupSSLCron) {
                const { SSLToolsInstaller } = await import('../src/Installer/ssl-tools.js')
                const sslTools = new SSLToolsInstaller()
                const toolsStatus = await sslTools.check()
                
                if (toolsStatus.certbot.installed || toolsStatus.acmesh.installed) {
                    const tool = toolsStatus.certbot.installed ? 'certbot' : 'acmesh'
                    const sslResult = cronManager.setupSSLRenewal(config, tool)
                    console.log(sslResult.success ? '✅' : '⚠️', sslResult.message)
                }
            }
        }
        
        // Setup service
        if (options.setupService) {
            console.log('\n🚀 Setting up service...')
            const serviceResult = await installer.service(config)
            if (serviceResult.success) {
                console.log(`✅ Service ${serviceResult.type} configured`)
            } else {
                console.log(`⚠️  Service setup failed: ${serviceResult.error}`)
            }
        }
        
        console.log('\n✅ Installation complete!')
        console.log('\nNext steps:')
        console.log('1. Start the server: npm start')
        console.log(`2. Test the API: curl http://localhost:${config[config.env]?.port || 8765}/gun`)
        if (config[config.env]?.domain) {
            console.log(`3. Access: https://${config[config.env].domain}/gun`)
        }
        
    } catch (error: any) {
        console.error('\n❌ Installation failed:', error.message)
        process.exit(1)
    }
}

// Main
async function main() {
    const options = parseArgs()
    
    // Show help if requested
    if (options.help) {
        showHelp()
        process.exit(0)
    }
    
    // Run appropriate mode
    if (options.tui && !options.nonInteractive) {
        // Run TUI
        render(<InstallUI options={options} />)
    } else {
        // Run non-interactive
        await runNonInteractive(options)
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error)
}

export default main