#!/usr/bin/env node

import { IPMonitor } from '../src/ipmonitor.js'
import { DDNSManager } from '../src/ddnsmanager.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

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
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
}

/**
 * IP Watch - Real-time IP monitoring and DDNS update tool
 */
class IPWatch {
    constructor() {
        this.configPath = path.join(rootPath, 'air.json')
        this.config = this.loadconfig()
        
        // Initialize components
        this.monitor = new IPMonitor({
            stateFile: path.join(rootPath, '.ip-monitor-state.json'),
            logFile: path.join(rootPath, 'logs', 'ip-monitor.log'),
            fastCheckInterval: 10000,     // 10 seconds during changes
            normalCheckInterval: 60000,   // 1 minute normal
            slowCheckInterval: 300000     // 5 minutes when stable
        })
        
        this.ddns = new DDNSManager({
            stateFile: path.join(rootPath, '.ddns-state.json'),
            logFile: path.join(rootPath, 'logs', 'ddns-updates.log'),
            updateStrategy: 'immediate',
            verifyAfterUpdate: true
        })
        
        // Setup event handlers
        this.setupEventHandlers()
        
        // Interactive mode
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
        
        // Statistics
        this.stats = {
            startTime: Date.now(),
            ipChanges: 0,
            ddnsUpdates: 0,
            ddnsSuccess: 0,
            ddnsFailed: 0
        }
    }
    
    loadconfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
            }
        } catch {}
        return {}
    }
    
    setupEventHandlers() {
        // IP Monitor events
        this.monitor.on('change', async (data) => {
            this.stats.ipChanges++
            
            console.log()
            this.log('🔄 IP CHANGE DETECTED', colors.yellow + colors.bright)
            
            if (data.ipv4) {
                this.log(`  IPv4: ${data.ipv4.old || 'none'} → ${data.ipv4.new}`, colors.cyan)
            }
            
            if (data.ipv6) {
                this.log(`  IPv6: ${data.ipv6.old || 'none'} → ${data.ipv6.new}`, colors.cyan)
            }
            
            this.log(`  Time: ${new Date().toLocaleString()}`, colors.dim)
            
            // Update DDNS if configured
            await this.updateDDNS(data)
        })
        
        this.monitor.on('error', (error) => {
            this.log(`❌ Monitor error: ${error.message}`, colors.red)
        })
        
        // DDNS Manager events
        this.ddns.on('update', (result) => {
            this.stats.ddnsUpdates++
            
            if (result.success) {
                this.stats.ddnsSuccess++
                this.log(`✅ DDNS updated: ${result.domain} ${result.type} → ${result.value}`, colors.green)
            } else {
                this.stats.ddnsFailed++
                this.log(`❌ DDNS failed: ${result.error}`, colors.red)
            }
        })
        
        this.ddns.on('verified', (data) => {
            this.log(`✓ DNS propagated: ${data.domain} (${data.attempts} checks)`, colors.green + colors.dim)
        })
        
        this.ddns.on('verification-failed', (data) => {
            this.log(`⚠ DNS propagation failed: ${data.domain}`, colors.yellow)
        })
    }
    
    async updateDDNS(changeData) {
        const env = this.config.env || 'development'
        const envConfig = this.config[env]
        
        if (!envConfig?.godaddy) {
            this.log('  DDNS not configured', colors.dim)
            return
        }
        
        const updates = []
        
        // Update A record for IPv4
        if (changeData.ipv4?.new) {
            updates.push(this.ddns.update({
                provider: 'godaddy',
                domain: envConfig.godaddy.domain,
                host: envConfig.godaddy.host || '@',
                type: 'A',
                value: changeData.ipv4.new,
                ttl: 600,
                credentials: {
                    key: envConfig.godaddy.key,
                    secret: envConfig.godaddy.secret
                }
            }))
        }
        
        // Update AAAA record for IPv6
        if (changeData.ipv6?.new && envConfig.godaddy.enableIPv6) {
            updates.push(this.ddns.update({
                provider: 'godaddy',
                domain: envConfig.godaddy.domain,
                host: envConfig.godaddy.host || '@',
                type: 'AAAA',
                value: changeData.ipv6.new,
                ttl: 600,
                credentials: {
                    key: envConfig.godaddy.key,
                    secret: envConfig.godaddy.secret
                }
            }))
        }
        
        if (updates.length > 0) {
            this.log('  Updating DDNS...', colors.cyan)
            await Promise.all(updates)
        }
    }
    
    async start() {
        console.clear()
        this.header()
        
        // Start monitoring
        this.log('Starting IP monitor...', colors.cyan)
        this.monitor.start()
        
        // Initial check
        const current = await this.monitor.check()
        
        this.log('Current IP addresses:', colors.cyan + colors.bright)
        this.log(`  IPv4: ${current.ipv4 || 'Not detected'}`, current.ipv4 ? colors.green : colors.yellow)
        this.log(`  IPv6: ${current.ipv6 || 'Not detected'}`, current.ipv6 ? colors.green : colors.yellow)
        
        // Show configuration
        const env = this.config.env || 'development'
        const envConfig = this.config[env]
        
        console.log()
        this.log('Configuration:', colors.cyan + colors.bright)
        this.log(`  Environment: ${env}`, colors.dim)
        this.log(`  Node name: ${this.config.name || 'unnamed'}`, colors.dim)
        
        if (envConfig?.godaddy) {
            this.log(`  DDNS: ${envConfig.godaddy.host || '@'}.${envConfig.godaddy.domain}`, colors.green)
        } else {
            this.log(`  DDNS: Not configured`, colors.yellow)
        }
        
        // Show monitoring status
        console.log()
        this.log('Monitoring active. Press:', colors.cyan)
        this.log('  [s] Show status', colors.dim)
        this.log('  [h] Show history', colors.dim)
        this.log('  [c] Force check now', colors.dim)
        this.log('  [d] DDNS statistics', colors.dim)
        this.log('  [q] Quit', colors.dim)
        console.log()
        
        // Start interactive mode
        this.interactive()
    }
    
    interactive() {
        process.stdin.setRawMode(true)
        process.stdin.resume()
        process.stdin.setEncoding('utf8')
        
        process.stdin.on('data', async (key) => {
            switch (key) {
                case 's':
                    this.showStatus()
                    break
                    
                case 'h':
                    this.showHistory()
                    break
                    
                case 'c':
                    console.log()
                    this.log('🔍 Forcing IP check...', colors.cyan)
                    const result = await this.monitor.check()
                    this.log(`  IPv4: ${result.ipv4 || 'none'}`, colors.green)
                    this.log(`  IPv6: ${result.ipv6 || 'none'}`, colors.green)
                    break
                    
                case 'd':
                    this.showDDNSStats()
                    break
                    
                case 'q':
                case '\u0003': // Ctrl+C
                    this.quit()
                    break
            }
        })
    }
    
    showStatus() {
        console.log()
        this.log('═══════════════════════════════════════════', colors.cyan)
        this.log('Status Report', colors.cyan + colors.bright)
        this.log('═══════════════════════════════════════════', colors.cyan)
        
        const status = this.monitor.getStatus()
        const uptime = this.formatDuration(Date.now() - this.stats.startTime)
        
        this.log(`Uptime: ${uptime}`, colors.green)
        this.log(`Current IPv4: ${status.currentIPv4 || 'none'}`, colors.cyan)
        this.log(`Current IPv6: ${status.currentIPv6 || 'none'}`, colors.cyan)
        
        if (status.lastChange) {
            const ago = this.formatDuration(Date.now() - status.lastChange)
            this.log(`Last change: ${ago} ago`, colors.dim)
        }
        
        this.log(`Stability: ${status.isStable ? 'Stable' : 'Monitoring changes'}`, 
            status.isStable ? colors.green : colors.yellow)
        
        this.log(`Check interval: ${Math.round(status.checkInterval / 1000)}s`, colors.dim)
        this.log(`Checks without change: ${status.checksWithoutChange}`, colors.dim)
        
        // Service health
        const serviceStats = this.monitor.getServiceStats()
        const healthyServices = Object.values(serviceStats).filter(s => s.successRate > 50).length
        const totalServices = Object.keys(serviceStats).length
        
        this.log(`Service health: ${healthyServices}/${totalServices} healthy`, 
            healthyServices === totalServices ? colors.green : colors.yellow)
        
        // Statistics
        console.log()
        this.log('Statistics:', colors.cyan + colors.bright)
        this.log(`  IP changes: ${this.stats.ipChanges}`, colors.dim)
        this.log(`  DDNS updates: ${this.stats.ddnsUpdates}`, colors.dim)
        this.log(`  DDNS success rate: ${this.getDDNSSuccessRate()}%`, colors.dim)
        
        console.log()
    }
    
    showHistory() {
        console.log()
        this.log('═══════════════════════════════════════════', colors.cyan)
        this.log('Recent IP Changes', colors.cyan + colors.bright)
        this.log('═══════════════════════════════════════════', colors.cyan)
        
        const state = this.monitor.state
        const recent = state.history.slice(-10).reverse()
        
        if (recent.length === 0) {
            this.log('No IP changes recorded', colors.dim)
        } else {
            for (const entry of recent) {
                const time = new Date(entry.timestamp).toLocaleString()
                
                if (entry.type === 'change') {
                    if (entry.ipv4.from !== entry.ipv4.to) {
                        this.log(`${time}`, colors.cyan)
                        this.log(`  IPv4: ${entry.ipv4.from || 'none'} → ${entry.ipv4.to}`, colors.green)
                    }
                    
                    if (entry.ipv6 && entry.ipv6.from !== entry.ipv6.to) {
                        this.log(`  IPv6: ${entry.ipv6.from || 'none'} → ${entry.ipv6.to}`, colors.green)
                    }
                }
            }
        }
        
        console.log()
    }
    
    showDDNSStats() {
        console.log()
        this.log('═══════════════════════════════════════════', colors.cyan)
        this.log('DDNS Statistics', colors.cyan + colors.bright)
        this.log('═══════════════════════════════════════════', colors.cyan)
        
        const stats = this.ddns.getStats()
        
        this.log(`Total updates: ${stats.total}`, colors.green)
        this.log(`Success rate: ${stats.successRate}`, 
            parseFloat(stats.successRate) > 90 ? colors.green : colors.yellow)
        
        // Provider breakdown
        if (Object.keys(stats.providers).length > 0) {
            console.log()
            this.log('By provider:', colors.cyan)
            
            for (const [provider, data] of Object.entries(stats.providers)) {
                this.log(`  ${provider}:`, colors.dim)
                this.log(`    Total: ${data.total}`, colors.dim)
                this.log(`    Success: ${data.successRate}`, colors.dim)
            }
        }
        
        // Recent failures
        if (stats.recentFailures.length > 0) {
            console.log()
            this.log('Recent failures:', colors.yellow)
            
            for (const failure of stats.recentFailures.slice(0, 5)) {
                const ago = this.formatDuration(Date.now() - failure.timestamp)
                this.log(`  ${failure.domain}: ${failure.error} (${ago} ago)`, colors.red)
            }
        }
        
        // Domain status
        if (Object.keys(stats.domains).length > 0) {
            console.log()
            this.log('Domains:', colors.cyan)
            
            for (const [domain, data] of Object.entries(stats.domains)) {
                const ago = this.formatDuration(Date.now() - data.lastUpdate)
                this.log(`  ${domain}: ${data.total} updates, last ${ago} ago`, colors.dim)
            }
        }
        
        console.log()
    }
    
    getDDNSSuccessRate() {
        if (this.stats.ddnsUpdates === 0) return 100
        return Math.round((this.stats.ddnsSuccess / this.stats.ddnsUpdates) * 100)
    }
    
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)
        
        if (days > 0) return `${days}d ${hours % 24}h`
        if (hours > 0) return `${hours}h ${minutes % 60}m`
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`
        return `${seconds}s`
    }
    
    header() {
        console.log(colors.cyan + '═══════════════════════════════════════════' + colors.reset)
        console.log(colors.cyan + colors.bright + '       Air IP Watch - Real-time Monitor' + colors.reset)
        console.log(colors.cyan + '═══════════════════════════════════════════' + colors.reset)
        console.log()
    }
    
    log(message, color = '') {
        console.log(color + message + colors.reset)
    }
    
    quit() {
        console.log()
        this.log('Stopping monitor...', colors.yellow)
        
        // Stop components
        this.monitor.stop()
        
        // Show final stats
        console.log()
        this.log('Session summary:', colors.cyan + colors.bright)
        this.log(`  Duration: ${this.formatDuration(Date.now() - this.stats.startTime)}`, colors.dim)
        this.log(`  IP changes detected: ${this.stats.ipChanges}`, colors.dim)
        this.log(`  DDNS updates: ${this.stats.ddnsUpdates}`, colors.dim)
        
        if (this.stats.ddnsUpdates > 0) {
            this.log(`  Success rate: ${this.getDDNSSuccessRate()}%`, colors.dim)
        }
        
        console.log()
        this.log('Goodbye!', colors.green)
        
        process.exit(0)
    }
}

// Handle process signals
process.on('SIGINT', () => {
    process.exit(0)
})

process.on('SIGTERM', () => {
    process.exit(0)
})

// Run IP Watch
const watch = new IPWatch()
watch.start().catch(error => {
    console.error(colors.red + 'Failed to start IP Watch:' + colors.reset, error)
    process.exit(1)
})