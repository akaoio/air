#!/usr/bin/env node

import { EventEmitter } from 'events'
import fetch from 'node-fetch'
import dns from 'dns'
import { promisify } from 'util'
import fs from 'fs'
import crypto from 'crypto'

const dnsResolve4 = promisify(dns.resolve4)
const dnsResolve6 = promisify(dns.resolve6)

/**
 * Enterprise-grade DDNS Manager
 * Handles DNS updates with zero-downtime and automatic recovery
 */
export class DDNSManager extends EventEmitter {
    constructor(config = {}) {
        super()
        
        this.config = {
            // Update strategy
            updateStrategy: 'immediate',     // immediate, batch, scheduled
            batchInterval: 60000,           // 1 minute for batch updates
            maxRetries: 5,                  // Maximum retry attempts
            retryDelay: 1000,              // Initial retry delay (exponential backoff)
            
            // Validation
            verifyAfterUpdate: true,        // Verify DNS propagation
            verificationDelay: 5000,        // Wait before verification
            maxVerificationAttempts: 10,    // Max verification attempts
            
            // TTL management
            defaultTTL: 600,                // 10 minutes default TTL
            emergencyTTL: 60,               // 1 minute for rapid changes
            
            // Rate limiting
            minUpdateInterval: 30000,       // Minimum 30 seconds between updates
            
            // Persistence
            stateFile: '.ddns-state.json',
            logFile: '.ddns-updates.log',
            
            ...config
        }
        
        // Provider configurations
        this.providers = {
            godaddy: {
                name: 'GoDaddy',
                baseUrl: 'https://api.godaddy.com/v1',
                rateLimit: 60,  // requests per minute
                supportedRecords: ['A', 'AAAA', 'CNAME', 'TXT'],
                requiresAuth: true
            },
            cloudflare: {
                name: 'Cloudflare',
                baseUrl: 'https://api.cloudflare.com/client/v4',
                rateLimit: 1200, // requests per 5 minutes
                supportedRecords: ['A', 'AAAA', 'CNAME', 'TXT', 'MX'],
                requiresAuth: true
            },
            route53: {
                name: 'AWS Route53',
                baseUrl: 'https://route53.amazonaws.com/2013-04-01',
                rateLimit: 5,    // requests per second
                supportedRecords: ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'SRV'],
                requiresAuth: true
            }
        }
        
        // State management
        this.state = {
            lastUpdate: {},           // Last update per domain/record
            pendingUpdates: [],       // Queue for batch updates
            updateHistory: [],        // Recent update history
            providerStatus: {},       // Provider health status
            rateLimits: {}           // Rate limit tracking
        }
        
        // Update queue for batch mode
        this.updateQueue = []
        this.batchTimer = null
        
        // Load previous state
        this.loadstate()
    }
    
    /**
     * Update DNS record with automatic provider detection
     */
    async update(config) {
        const {
            provider,
            domain,
            host,
            type = 'A',
            value,
            ttl = this.config.defaultTTL,
            credentials
        } = config
        
        // Validate input
        if (!provider || !domain || !value) {
            throw new Error('Missing required parameters: provider, domain, value')
        }
        
        // Check rate limiting
        if (!this.checkRateLimit(provider, domain)) {
            const waitTime = this.getRateLimitWaitTime(provider, domain)
            this.log('warn', `Rate limited for ${provider}/${domain}, wait ${waitTime}ms`)
            
            if (this.config.updateStrategy === 'batch') {
                this.queueUpdate(config)
                return { queued: true, waitTime }
            }
            
            throw new Error(`Rate limited, retry after ${waitTime}ms`)
        }
        
        // Check minimum update interval
        const lastUpdate = this.state.lastUpdate[`${domain}:${host}:${type}`]
        if (lastUpdate && Date.now() - lastUpdate < this.config.minUpdateInterval) {
            this.log('debug', `Skipping update, too soon since last update`)
            return { skipped: true, reason: 'too_soon' }
        }
        
        // Perform update based on provider
        let result
        switch (provider.toLowerCase()) {
            case 'godaddy':
                result = await this.updateGoDaddy(config)
                break
            case 'cloudflare':
                result = await this.updateCloudflare(config)
                break
            case 'route53':
                result = await this.updateRoute53(config)
                break
            default:
                throw new Error(`Unsupported provider: ${provider}`)
        }
        
        // Record update
        this.recordUpdate(provider, domain, host, type, value, result)
        
        // Verify if configured
        if (this.config.verifyAfterUpdate && result.success) {
            setTimeout(() => {
                this.verifyUpdate(domain, host, type, value)
            }, this.config.verificationDelay)
        }
        
        return result
    }
    
    /**
     * Update GoDaddy DNS
     */
    async updateGoDaddy(config, retries = 0) {
        const { domain, host = '@', type, value, ttl, credentials } = config
        
        if (!credentials?.key || !credentials?.secret) {
            throw new Error('GoDaddy requires API key and secret')
        }
        
        const url = `${this.providers.godaddy.baseUrl}/domains/${domain}/records/${type}/${host}`
        const headers = {
            'Authorization': `sso-key ${credentials.key}:${credentials.secret}`,
            'Content-Type': 'application/json'
        }
        
        const body = JSON.stringify([{
            data: value,
            ttl: ttl || this.config.defaultTTL
        }])
        
        try {
            this.log('info', `Updating GoDaddy DNS: ${host}.${domain} ${type} → ${value}`)
            
            const response = await fetch(url, {
                method: 'PUT',
                headers,
                body,
                timeout: 10000
            })
            
            if (response.ok) {
                this.log('info', `GoDaddy DNS updated successfully`)
                return {
                    success: true,
                    provider: 'godaddy',
                    domain,
                    host,
                    type,
                    value,
                    timestamp: Date.now()
                }
            }
            
            // Handle specific error codes
            if (response.status === 429) {
                // Rate limited
                const retryAfter = response.headers.get('Retry-After') || 60
                this.updateRateLimit('godaddy', domain, parseInt(retryAfter) * 1000)
                
                if (retries < this.config.maxRetries) {
                    await this.sleep(parseInt(retryAfter) * 1000)
                    return this.updateGoDaddy(config, retries + 1)
                }
            }
            
            if (response.status === 401) {
                throw new Error('GoDaddy authentication failed - check API credentials')
            }
            
            if (response.status === 404) {
                // Record doesn't exist, try to create it
                return this.createGoDaddyRecord(config)
            }
            
            const error = await response.text()
            throw new Error(`GoDaddy API error ${response.status}: ${error}`)
            
        } catch (error) {
            if (retries < this.config.maxRetries) {
                const delay = this.config.retryDelay * Math.pow(2, retries)
                this.log('warn', `GoDaddy update failed, retrying in ${delay}ms: ${error.message}`)
                
                await this.sleep(delay)
                return this.updateGoDaddy(config, retries + 1)
            }
            
            this.log('error', `GoDaddy update failed after ${retries} retries: ${error.message}`)
            
            return {
                success: false,
                provider: 'godaddy',
                domain,
                host,
                type,
                value,
                error: error.message,
                timestamp: Date.now()
            }
        }
    }
    
    /**
     * Create GoDaddy DNS record
     */
    async createGoDaddyRecord(config) {
        const { domain, host = '@', type, value, ttl, credentials } = config
        
        const url = `${this.providers.godaddy.baseUrl}/domains/${domain}/records`
        const headers = {
            'Authorization': `sso-key ${credentials.key}:${credentials.secret}`,
            'Content-Type': 'application/json'
        }
        
        const body = JSON.stringify([{
            type,
            name: host,
            data: value,
            ttl: ttl || this.config.defaultTTL
        }])
        
        try {
            this.log('info', `Creating GoDaddy DNS record: ${host}.${domain} ${type} → ${value}`)
            
            const response = await fetch(url, {
                method: 'PATCH',
                headers,
                body,
                timeout: 10000
            })
            
            if (response.ok) {
                this.log('info', `GoDaddy DNS record created successfully`)
                return {
                    success: true,
                    provider: 'godaddy',
                    domain,
                    host,
                    type,
                    value,
                    created: true,
                    timestamp: Date.now()
                }
            }
            
            const error = await response.text()
            throw new Error(`Failed to create record: ${error}`)
            
        } catch (error) {
            this.log('error', `Failed to create GoDaddy record: ${error.message}`)
            return {
                success: false,
                provider: 'godaddy',
                domain,
                host,
                type,
                value,
                error: error.message,
                timestamp: Date.now()
            }
        }
    }
    
    /**
     * Update Cloudflare DNS (stub for future implementation)
     */
    async updateCloudflare(config) {
        // TODO: Implement Cloudflare API
        throw new Error('Cloudflare provider not yet implemented')
    }
    
    /**
     * Update Route53 DNS (stub for future implementation)
     */
    async updateRoute53(config) {
        // TODO: Implement Route53 API
        throw new Error('Route53 provider not yet implemented')
    }
    
    /**
     * Verify DNS update propagation
     */
    async verifyUpdate(domain, host, type, expectedValue, attempts = 0) {
        const fullDomain = host === '@' ? domain : `${host}.${domain}`
        
        try {
            let actualValues = []
            
            if (type === 'A') {
                actualValues = await dnsResolve4(fullDomain)
            } else if (type === 'AAAA') {
                actualValues = await dnsResolve6(fullDomain)
            }
            
            const isVerified = actualValues.includes(expectedValue)
            
            if (isVerified) {
                this.log('info', `DNS update verified: ${fullDomain} → ${expectedValue}`)
                this.emit('verified', {
                    domain: fullDomain,
                    type,
                    value: expectedValue,
                    attempts: attempts + 1
                })
                return true
            }
            
            if (attempts < this.config.maxVerificationAttempts) {
                // Exponential backoff for verification
                const delay = Math.min(5000 * Math.pow(1.5, attempts), 60000)
                this.log('debug', `DNS not propagated yet, retrying in ${delay}ms`)
                
                setTimeout(() => {
                    this.verifyUpdate(domain, host, type, expectedValue, attempts + 1)
                }, delay)
            } else {
                this.log('warn', `DNS verification failed after ${attempts} attempts`)
                this.emit('verification-failed', {
                    domain: fullDomain,
                    type,
                    expectedValue,
                    actualValues
                })
            }
            
        } catch (error) {
            if (attempts < this.config.maxVerificationAttempts) {
                setTimeout(() => {
                    this.verifyUpdate(domain, host, type, expectedValue, attempts + 1)
                }, 5000)
            } else {
                this.log('error', `DNS verification error: ${error.message}`)
            }
        }
        
        return false
    }
    
    /**
     * Queue update for batch processing
     */
    queueUpdate(config) {
        // Check if similar update already queued
        const existingIndex = this.updateQueue.findIndex(u => 
            u.domain === config.domain && 
            u.host === config.host && 
            u.type === config.type
        )
        
        if (existingIndex >= 0) {
            // Replace with newer value
            this.updateQueue[existingIndex] = config
        } else {
            this.updateQueue.push(config)
        }
        
        // Start batch timer if not running
        if (!this.batchTimer && this.config.updateStrategy === 'batch') {
            this.batchTimer = setTimeout(() => {
                this.processBatch()
            }, this.config.batchInterval)
        }
        
        this.log('debug', `Update queued for ${config.domain}`)
    }
    
    /**
     * Process batch updates
     */
    async processBatch() {
        if (this.updateQueue.length === 0) {
            this.batchTimer = null
            return
        }
        
        this.log('info', `Processing batch of ${this.updateQueue.length} updates`)
        
        const updates = [...this.updateQueue]
        this.updateQueue = []
        this.batchTimer = null
        
        // Group by provider for efficiency
        const grouped = {}
        for (const update of updates) {
            const provider = update.provider || 'godaddy'
            if (!grouped[provider]) {
                grouped[provider] = []
            }
            grouped[provider].push(update)
        }
        
        // Process each provider group
        const results = []
        for (const [provider, configs] of Object.entries(grouped)) {
            for (const config of configs) {
                try {
                    const result = await this.update(config)
                    results.push(result)
                } catch (error) {
                    results.push({
                        success: false,
                        error: error.message,
                        ...config
                    })
                }
                
                // Small delay between updates to same provider
                await this.sleep(100)
            }
        }
        
        this.emit('batch-complete', results)
        return results
    }
    
    /**
     * Check rate limiting
     */
    checkRateLimit(provider, domain) {
        const key = `${provider}:${domain}`
        const limit = this.state.rateLimits[key]
        
        if (!limit) return true
        
        return Date.now() > limit.resetAt
    }
    
    /**
     * Get rate limit wait time
     */
    getRateLimitWaitTime(provider, domain) {
        const key = `${provider}:${domain}`
        const limit = this.state.rateLimits[key]
        
        if (!limit) return 0
        
        return Math.max(0, limit.resetAt - Date.now())
    }
    
    /**
     * Update rate limit
     */
    updateRateLimit(provider, domain, waitTime) {
        const key = `${provider}:${domain}`
        
        this.state.rateLimits[key] = {
            provider,
            domain,
            resetAt: Date.now() + waitTime,
            timestamp: Date.now()
        }
    }
    
    /**
     * Record update in history
     */
    recordUpdate(provider, domain, host, type, value, result) {
        const key = `${domain}:${host}:${type}`
        
        // Update last update time
        this.state.lastUpdate[key] = Date.now()
        
        // Add to history
        const entry = {
            timestamp: Date.now(),
            provider,
            domain,
            host,
            type,
            value,
            ...result
        }
        
        this.state.updateHistory.push(entry)
        
        // Keep history limited
        if (this.state.updateHistory.length > 1000) {
            this.state.updateHistory = this.state.updateHistory.slice(-1000)
        }
        
        // Save state
        this.savestate()
        
        // Log to file
        this.logUpdate(entry)
        
        // Emit event
        this.emit('update', entry)
    }
    
    /**
     * Get update history
     */
    getHistory(filter = {}) {
        let history = [...this.state.updateHistory]
        
        if (filter.domain) {
            history = history.filter(h => h.domain === filter.domain)
        }
        
        if (filter.provider) {
            history = history.filter(h => h.provider === filter.provider)
        }
        
        if (filter.success !== undefined) {
            history = history.filter(h => h.success === filter.success)
        }
        
        if (filter.since) {
            const since = new Date(filter.since).getTime()
            history = history.filter(h => h.timestamp >= since)
        }
        
        return history
    }
    
    /**
     * Get statistics
     */
    getStats() {
        const stats = {
            total: this.state.updateHistory.length,
            successful: 0,
            failed: 0,
            providers: {},
            domains: {},
            recentFailures: []
        }
        
        for (const entry of this.state.updateHistory) {
            if (entry.success) {
                stats.successful++
            } else {
                stats.failed++
                
                // Track recent failures
                if (Date.now() - entry.timestamp < 3600000) { // Last hour
                    stats.recentFailures.push({
                        domain: entry.domain,
                        error: entry.error,
                        timestamp: entry.timestamp
                    })
                }
            }
            
            // Provider stats
            if (!stats.providers[entry.provider]) {
                stats.providers[entry.provider] = {
                    total: 0,
                    successful: 0,
                    failed: 0
                }
            }
            
            stats.providers[entry.provider].total++
            if (entry.success) {
                stats.providers[entry.provider].successful++
            } else {
                stats.providers[entry.provider].failed++
            }
            
            // Domain stats
            if (!stats.domains[entry.domain]) {
                stats.domains[entry.domain] = {
                    total: 0,
                    lastUpdate: null
                }
            }
            
            stats.domains[entry.domain].total++
            stats.domains[entry.domain].lastUpdate = entry.timestamp
        }
        
        // Calculate success rates
        stats.successRate = stats.total > 0 
            ? (stats.successful / stats.total * 100).toFixed(2) + '%'
            : '0%'
        
        for (const provider in stats.providers) {
            const p = stats.providers[provider]
            p.successRate = p.total > 0
                ? (p.successful / p.total * 100).toFixed(2) + '%'
                : '0%'
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
                
                this.log('debug', 'DDNS state loaded')
            }
        } catch (error) {
            this.log('warn', `Failed to load DDNS state: ${error.message}`)
        }
    }
    
    /**
     * Save state to disk
     */
    savestate() {
        try {
            const data = JSON.stringify(this.state, null, 2)
            fs.writeFileSync(this.config.stateFile, data)
            
            this.log('debug', 'DDNS state saved')
        } catch (error) {
            this.log('error', `Failed to save DDNS state: ${error.message}`)
        }
    }
    
    /**
     * Log update to file
     */
    logUpdate(entry) {
        try {
            const logLine = JSON.stringify({
                ...entry,
                timestamp: new Date(entry.timestamp).toISOString()
            }) + '\n'
            
            fs.appendFileSync(this.config.logFile, logLine)
        } catch {}
    }
    
    /**
     * Log message
     */
    log(level, message) {
        const timestamp = new Date().toISOString()
        const logLine = `[${timestamp}] [DDNS] [${level.toUpperCase()}] ${message}`
        
        // Console output
        if (level === 'error' || level === 'warn') {
            console.error(logLine)
        } else if (level === 'info') {
            console.log(logLine)
        } else if (level === 'debug' && process.env.DEBUG) {
            console.log(logLine)
        }
        
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

// Export singleton
export default new DDNSManager()