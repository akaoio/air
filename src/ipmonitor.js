#!/usr/bin/env node

import { EventEmitter } from 'events'
import { execSync } from 'child_process'
import fetch from 'node-fetch'
import dns from 'dns'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'

const dnsResolve4 = promisify(dns.resolve4)
const dnsResolve6 = promisify(dns.resolve6)

/**
 * Enterprise-grade IP Monitor with real-time change detection
 * Built with infrastructure engineering mindset - zero failure tolerance
 */
export class IPMonitor extends EventEmitter {
    constructor(config = {}) {
        super()
        
        // Configuration with sensible defaults
        this.config = {
            // Detection intervals (milliseconds)
            fastCheckInterval: 10000,      // 10 seconds during changes
            normalCheckInterval: 60000,    // 1 minute normal operation
            slowCheckInterval: 300000,     // 5 minutes when stable
            
            // Stability thresholds
            stableAfterChecks: 10,         // Consider stable after 10 consistent checks
            changeDetectionThreshold: 2,    // Confirm change after 2 consistent different IPs
            
            // Timeouts and retries
            requestTimeout: 5000,           // 5 second timeout per request
            maxRetries: 3,                  // Max retries per service
            retryDelay: 1000,              // Initial retry delay
            
            // Service redundancy
            minSuccessfulServices: 2,      // Minimum services that must agree
            maxConcurrentRequests: 3,      // Parallel requests for speed
            
            // Persistence
            stateFile: '.ip-monitor-state.json',
            logFile: '.ip-monitor.log',
            
            // Features
            enableIPv6: true,
            enableFailover: true,
            enableCaching: true,
            enableLogging: true,
            
            ...config
        }
        
        // State management
        this.state = {
            currentIPv4: null,
            currentIPv6: null,
            previousIPv4: null,
            previousIPv6: null,
            lastCheck: null,
            lastChange: null,
            checksWithoutChange: 0,
            changesPending: 0,
            isStable: false,
            checkInterval: this.config.normalCheckInterval,
            serviceHealth: {},
            history: []
        }
        
        // Service pools with priority
        this.services = {
            ipv4: {
                primary: [
                    { url: 'https://api.ipify.org?format=json', parser: 'json', field: 'ip', weight: 10 },
                    { url: 'https://checkip.amazonaws.com', parser: 'text', weight: 9 },
                    { url: 'https://ipinfo.io/ip', parser: 'text', weight: 8 }
                ],
                secondary: [
                    { url: 'https://ifconfig.me/ip', parser: 'text', weight: 7 },
                    { url: 'https://icanhazip.com', parser: 'text', weight: 6 },
                    { url: 'https://ident.me', parser: 'text', weight: 5 }
                ],
                dns: [
                    { server: '208.67.222.222', query: 'myip.opendns.com', weight: 10 },
                    { server: '208.67.220.220', query: 'myip.opendns.com', weight: 9 },
                    { server: '1.1.1.1', query: 'whoami.cloudflare', weight: 8 }
                ]
            },
            ipv6: {
                primary: [
                    { url: 'https://api6.ipify.org?format=json', parser: 'json', field: 'ip', weight: 10 },
                    { url: 'https://v6.ident.me', parser: 'text', weight: 8 }
                ],
                secondary: [
                    { url: 'https://ipv6.icanhazip.com', parser: 'text', weight: 6 }
                ]
            }
        }
        
        // Monitoring state
        this.isMonitoring = false
        this.checkTimer = null
        this.cache = new Map()
        this.serviceStats = new Map()
        
        // Load previous state
        this.loadstate()
    }
    
    /**
     * Start monitoring with automatic interval adjustment
     */
    start() {
        if (this.isMonitoring) {
            this.log('warn', 'Monitor already running')
            return
        }
        
        this.isMonitoring = true
        this.log('info', 'IP Monitor started')
        
        // Initial check
        this.check().then(() => {
            this.scheduleNextCheck()
        })
        
        // Network interface change detection (Linux/Mac)
        if (process.platform !== 'win32') {
            this.watchNetworkInterfaces()
        }
        
        // Process signals for graceful shutdown
        process.on('SIGINT', () => this.stop())
        process.on('SIGTERM', () => this.stop())
        
        this.emit('started')
    }
    
    /**
     * Stop monitoring gracefully
     */
    stop() {
        if (!this.isMonitoring) return
        
        this.isMonitoring = false
        
        if (this.checkTimer) {
            clearTimeout(this.checkTimer)
            this.checkTimer = null
        }
        
        this.savestate()
        this.log('info', 'IP Monitor stopped')
        this.emit('stopped')
    }
    
    /**
     * Perform comprehensive IP check with redundancy
     */
    async check() {
        const startTime = Date.now()
        this.log('debug', 'Starting IP check')
        
        try {
            // Parallel detection for speed
            const [ipv4, ipv6] = await Promise.all([
                this.detectIPv4(),
                this.config.enableIPv6 ? this.detectIPv6() : Promise.resolve(null)
            ])
            
            // Validate results
            const validIPv4 = this.validateIP(ipv4, 4)
            const validIPv6 = this.validateIP(ipv6, 6)
            
            // Detect changes
            const ipv4Changed = validIPv4 && validIPv4 !== this.state.currentIPv4
            const ipv6Changed = validIPv6 && validIPv6 !== this.state.currentIPv6
            
            if (ipv4Changed || ipv6Changed) {
                this.handleIPChange(validIPv4, validIPv6, ipv4Changed, ipv6Changed)
            } else {
                this.handleNoChange()
            }
            
            // Update state
            this.state.lastCheck = Date.now()
            this.updateServiceHealth(startTime)
            
            // Save state periodically
            if (this.state.checksWithoutChange % 10 === 0) {
                this.savestate()
            }
            
            return { ipv4: validIPv4, ipv6: validIPv6 }
            
        } catch (error) {
            this.log('error', `IP check failed: ${error.message}`)
            this.emit('error', error)
            
            // Use cached values if available
            if (this.state.currentIPv4 || this.state.currentIPv6) {
                return { 
                    ipv4: this.state.currentIPv4, 
                    ipv6: this.state.currentIPv6,
                    cached: true 
                }
            }
            
            throw error
        }
    }
    
    /**
     * Detect IPv4 with multiple fallback methods
     */
    async detectIPv4() {
        const results = new Map()
        
        // Try HTTP services first (faster)
        const httpResults = await this.queryHTTPServices(this.services.ipv4.primary)
        httpResults.forEach(r => {
            if (r.ip) results.set(r.ip, (results.get(r.ip) || 0) + r.weight)
        })
        
        // If not enough consensus, try secondary services
        if (results.size < this.config.minSuccessfulServices) {
            const secondaryResults = await this.queryHTTPServices(this.services.ipv4.secondary)
            secondaryResults.forEach(r => {
                if (r.ip) results.set(r.ip, (results.get(r.ip) || 0) + r.weight)
            })
        }
        
        // DNS as fallback
        if (results.size === 0 && this.config.enableFailover) {
            const dnsResults = await this.queryDNSServices(this.services.ipv4.dns)
            dnsResults.forEach(r => {
                if (r.ip) results.set(r.ip, (results.get(r.ip) || 0) + r.weight)
            })
        }
        
        // Return IP with highest weight (most services agree)
        if (results.size > 0) {
            const sorted = Array.from(results.entries()).sort((a, b) => b[1] - a[1])
            return sorted[0][0]
        }
        
        return null
    }
    
    /**
     * Detect IPv6 with fallback
     */
    async detectIPv6() {
        // First check if system has IPv6
        if (!await this.hasIPv6Support()) {
            return null
        }
        
        const results = new Map()
        
        // Try IPv6 services
        const httpResults = await this.queryHTTPServices(this.services.ipv6.primary)
        httpResults.forEach(r => {
            if (r.ip) results.set(r.ip, (results.get(r.ip) || 0) + r.weight)
        })
        
        // Secondary services if needed
        if (results.size < this.config.minSuccessfulServices) {
            const secondaryResults = await this.queryHTTPServices(this.services.ipv6.secondary)
            secondaryResults.forEach(r => {
                if (r.ip) results.set(r.ip, (results.get(r.ip) || 0) + r.weight)
            })
        }
        
        // Return IP with highest weight
        if (results.size > 0) {
            const sorted = Array.from(results.entries()).sort((a, b) => b[1] - a[1])
            return sorted[0][0]
        }
        
        return null
    }
    
    /**
     * Query HTTP services with timeout and retry
     */
    async queryHTTPServices(services) {
        const results = []
        
        // Limit concurrent requests
        const chunks = []
        for (let i = 0; i < services.length; i += this.config.maxConcurrentRequests) {
            chunks.push(services.slice(i, i + this.config.maxConcurrentRequests))
        }
        
        for (const chunk of chunks) {
            const promises = chunk.map(service => this.queryHTTPService(service))
            const chunkResults = await Promise.allSettled(promises)
            
            chunkResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    results.push({
                        ip: result.value,
                        weight: chunk[index].weight,
                        service: chunk[index].url
                    })
                    
                    // Update service stats
                    this.updateServiceStats(chunk[index].url, true)
                } else {
                    this.updateServiceStats(chunk[index].url, false)
                }
            })
            
            // Stop if we have enough results
            if (results.length >= this.config.minSuccessfulServices) {
                break
            }
        }
        
        return results
    }
    
    /**
     * Query single HTTP service with retry logic
     */
    async queryHTTPService(service, retries = 0) {
        const cacheKey = `http:${service.url}`
        
        // Check cache
        if (this.config.enableCaching) {
            const cached = this.cache.get(cacheKey)
            if (cached && Date.now() - cached.time < 30000) { // 30 second cache
                return cached.ip
            }
        }
        
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), this.config.requestTimeout)
            
            const response = await fetch(service.url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Air-IPMonitor/1.0'
                }
            })
            
            clearTimeout(timeout)
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }
            
            let ip = null
            
            if (service.parser === 'json') {
                const data = await response.json()
                ip = service.field ? data[service.field] : data.ip
            } else {
                ip = (await response.text()).trim()
            }
            
            // Cache result
            if (ip && this.config.enableCaching) {
                this.cache.set(cacheKey, { ip, time: Date.now() })
            }
            
            return ip
            
        } catch (error) {
            if (retries < this.config.maxRetries) {
                // Exponential backoff
                const delay = this.config.retryDelay * Math.pow(2, retries)
                await this.sleep(delay)
                return this.queryHTTPService(service, retries + 1)
            }
            
            this.log('debug', `Service ${service.url} failed: ${error.message}`)
            return null
        }
    }
    
    /**
     * Query DNS services for IP
     */
    async queryDNSServices(services) {
        const results = []
        
        for (const service of services) {
            try {
                const ip = await this.queryDNS(service.server, service.query)
                if (ip) {
                    results.push({
                        ip,
                        weight: service.weight,
                        service: `dns:${service.server}`
                    })
                    
                    this.updateServiceStats(`dns:${service.server}`, true)
                } else {
                    this.updateServiceStats(`dns:${service.server}`, false)
                }
                
                if (results.length >= this.config.minSuccessfulServices) {
                    break
                }
            } catch (error) {
                this.updateServiceStats(`dns:${service.server}`, false)
            }
        }
        
        return results
    }
    
    /**
     * Query DNS server
     */
    async queryDNS(server, query) {
        return new Promise((resolve) => {
            try {
                const cmd = process.platform === 'win32'
                    ? `nslookup ${query} ${server}`
                    : `dig +short @${server} ${query}`
                
                const result = execSync(cmd, { 
                    encoding: 'utf8',
                    timeout: this.config.requestTimeout
                })
                
                const lines = result.split('\n').filter(l => l.trim())
                
                // Extract IP from output
                for (const line of lines) {
                    const ip = line.trim()
                    if (this.validateIP(ip)) {
                        resolve(ip)
                        return
                    }
                }
                
                resolve(null)
            } catch {
                resolve(null)
            }
        })
    }
    
    /**
     * Handle IP change detection
     */
    handleIPChange(ipv4, ipv6, ipv4Changed, ipv6Changed) {
        // Increment pending changes
        this.state.changesPending++
        
        // Confirm change after threshold
        if (this.state.changesPending >= this.config.changeDetectionThreshold) {
            // Update state
            this.state.previousIPv4 = this.state.currentIPv4
            this.state.previousIPv6 = this.state.currentIPv6
            this.state.currentIPv4 = ipv4
            this.state.currentIPv6 = ipv6
            this.state.lastChange = Date.now()
            this.state.changesPending = 0
            this.state.checksWithoutChange = 0
            this.state.isStable = false
            
            // Switch to fast checking
            this.state.checkInterval = this.config.fastCheckInterval
            
            // Log change
            const changes = []
            if (ipv4Changed) changes.push(`IPv4: ${this.state.previousIPv4} → ${ipv4}`)
            if (ipv6Changed) changes.push(`IPv6: ${this.state.previousIPv6} → ${ipv6}`)
            
            this.log('info', `IP CHANGED: ${changes.join(', ')}`)
            
            // Add to history
            this.state.history.push({
                timestamp: Date.now(),
                type: 'change',
                ipv4: { from: this.state.previousIPv4, to: ipv4 },
                ipv6: { from: this.state.previousIPv6, to: ipv6 }
            })
            
            // Keep history limited
            if (this.state.history.length > 100) {
                this.state.history = this.state.history.slice(-100)
            }
            
            // Emit change event
            this.emit('change', {
                ipv4: ipv4Changed ? { old: this.state.previousIPv4, new: ipv4 } : null,
                ipv6: ipv6Changed ? { old: this.state.previousIPv6, new: ipv6 } : null,
                timestamp: Date.now()
            })
            
            // Save state immediately
            this.savestate()
        }
    }
    
    /**
     * Handle no IP change
     */
    handleNoChange() {
        this.state.checksWithoutChange++
        this.state.changesPending = 0
        
        // Adjust check interval based on stability
        if (this.state.checksWithoutChange >= this.config.stableAfterChecks) {
            if (!this.state.isStable) {
                this.state.isStable = true
                this.log('info', 'IP stable, switching to slow check interval')
            }
            this.state.checkInterval = this.config.slowCheckInterval
        } else if (this.state.checksWithoutChange >= 3) {
            this.state.checkInterval = this.config.normalCheckInterval
        }
    }
    
    /**
     * Validate IP address
     */
    validateIP(ip, version = null) {
        if (!ip || typeof ip !== 'string') return null
        
        const trimmed = ip.trim()
        
        // IPv4 validation
        if (!version || version === 4) {
            const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
            if (ipv4Regex.test(trimmed)) {
                const parts = trimmed.split('.').map(Number)
                
                // Check valid range
                if (parts.every(p => p >= 0 && p <= 255)) {
                    // Exclude private/reserved ranges
                    if (parts[0] === 10) return null
                    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return null
                    if (parts[0] === 192 && parts[1] === 168) return null
                    if (parts[0] === 127) return null
                    if (parts[0] === 0) return null
                    if (parts[0] === 169 && parts[1] === 254) return null
                    if (parts[0] >= 224) return null
                    
                    return trimmed
                }
            }
        }
        
        // IPv6 validation
        if (!version || version === 6) {
            // Basic IPv6 regex
            const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
            
            if (ipv6Regex.test(trimmed)) {
                const lower = trimmed.toLowerCase()
                
                // Exclude private/reserved
                if (lower.startsWith('fe80:')) return null
                if (lower.startsWith('fc00:') || lower.startsWith('fd00:')) return null
                if (lower === '::1') return null
                if (lower === '::') return null
                if (lower.startsWith('ff')) return null
                
                return trimmed
            }
        }
        
        return null
    }
    
    /**
     * Check IPv6 support
     */
    async hasIPv6Support() {
        try {
            const interfaces = os.networkInterfaces()
            for (const iface of Object.values(interfaces)) {
                for (const config of iface) {
                    if (config.family === 'IPv6' && !config.internal) {
                        return true
                    }
                }
            }
        } catch {}
        return false
    }
    
    /**
     * Watch network interfaces for changes (Linux/Mac)
     */
    watchNetworkInterfaces() {
        // Monitor network configuration changes
        if (process.platform === 'linux') {
            // Watch /sys/class/net for interface changes
            try {
                fs.watch('/sys/class/net', (eventType) => {
                    if (eventType === 'rename') {
                        this.log('info', 'Network interface change detected')
                        this.triggerImmediateCheck()
                    }
                })
            } catch {}
        } else if (process.platform === 'darwin') {
            // macOS: Monitor network changes via route
            setInterval(() => {
                try {
                    const routes = execSync('netstat -rn', { encoding: 'utf8' })
                    const routeHash = crypto.createHash('md5').update(routes).digest('hex')
                    
                    if (this.lastRouteHash && this.lastRouteHash !== routeHash) {
                        this.log('info', 'Network route change detected')
                        this.triggerImmediateCheck()
                    }
                    
                    this.lastRouteHash = routeHash
                } catch {}
            }, 5000) // Check every 5 seconds
        }
    }
    
    /**
     * Trigger immediate IP check
     */
    triggerImmediateCheck() {
        if (this.checkTimer) {
            clearTimeout(this.checkTimer)
        }
        
        this.check().then(() => {
            this.scheduleNextCheck()
        })
    }
    
    /**
     * Schedule next check with jitter
     */
    scheduleNextCheck() {
        if (!this.isMonitoring) return
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * this.state.checkInterval
        const nextCheck = this.state.checkInterval + jitter
        
        this.checkTimer = setTimeout(() => {
            this.check().then(() => {
                this.scheduleNextCheck()
            })
        }, nextCheck)
    }
    
    /**
     * Update service statistics
     */
    updateServiceStats(service, success) {
        if (!this.serviceStats.has(service)) {
            this.serviceStats.set(service, {
                total: 0,
                success: 0,
                failure: 0,
                lastSuccess: null,
                lastFailure: null
            })
        }
        
        const stats = this.serviceStats.get(service)
        stats.total++
        
        if (success) {
            stats.success++
            stats.lastSuccess = Date.now()
        } else {
            stats.failure++
            stats.lastFailure = Date.now()
        }
        
        // Calculate success rate
        stats.successRate = (stats.success / stats.total) * 100
    }
    
    /**
     * Update overall service health
     */
    updateServiceHealth(checkDuration) {
        const health = {
            checkDuration,
            timestamp: Date.now(),
            services: {}
        }
        
        // Calculate health for each service
        for (const [service, stats] of this.serviceStats.entries()) {
            health.services[service] = {
                successRate: stats.successRate,
                lastSuccess: stats.lastSuccess,
                isHealthy: stats.successRate > 50
            }
        }
        
        this.state.serviceHealth = health
    }
    
    /**
     * Get current status
     */
    getStatus() {
        return {
            currentIPv4: this.state.currentIPv4,
            currentIPv6: this.state.currentIPv6,
            previousIPv4: this.state.previousIPv4,
            previousIPv6: this.state.previousIPv6,
            lastCheck: this.state.lastCheck,
            lastChange: this.state.lastChange,
            isStable: this.state.isStable,
            isMonitoring: this.isMonitoring,
            checksWithoutChange: this.state.checksWithoutChange,
            checkInterval: this.state.checkInterval,
            serviceHealth: this.state.serviceHealth,
            uptime: this.startTime ? Date.now() - this.startTime : 0
        }
    }
    
    /**
     * Get service statistics
     */
    getServiceStats() {
        const stats = {}
        
        for (const [service, data] of this.serviceStats.entries()) {
            stats[service] = { ...data }
        }
        
        return stats
    }
    
    /**
     * Load state from disk
     */
    loadstate() {
        try {
            if (fs.existsSync(this.config.stateFile)) {
                const data = fs.readFileSync(this.config.stateFile, 'utf8')
                const saved = JSON.parse(data)
                
                // Merge saved state
                this.state = { ...this.state, ...saved }
                
                this.log('debug', 'State loaded from disk')
            }
        } catch (error) {
            this.log('warn', `Failed to load state: ${error.message}`)
        }
    }
    
    /**
     * Save state to disk
     */
    savestate() {
        try {
            const data = JSON.stringify(this.state, null, 2)
            fs.writeFileSync(this.config.stateFile, data)
            
            this.log('debug', 'State saved to disk')
        } catch (error) {
            this.log('error', `Failed to save state: ${error.message}`)
        }
    }
    
    /**
     * Log message
     */
    log(level, message) {
        if (!this.config.enableLogging) return
        
        const timestamp = new Date().toISOString()
        const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`
        
        // Console output
        if (level === 'error' || level === 'warn') {
            console.error(logLine)
        } else if (level === 'info') {
            console.log(logLine)
        } else if (level === 'debug' && process.env.DEBUG) {
            console.log(logLine)
        }
        
        // File logging
        try {
            fs.appendFileSync(this.config.logFile, logLine + '\n')
        } catch {}
        
        // Emit log event
        this.emit('log', { level, message, timestamp })
    }
    
    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

// Export singleton for easy use
export default new IPMonitor()