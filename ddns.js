#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class DDNS {
    constructor() {
        this.config = {
            root: process.cwd(),
            env: null,
            domain: null,
            host: null,
            key: null,
            secret: null
        }
        this.configFile = 'air.json'
        this.ddnsFile = 'ddns.json'
        this.ipConfig = null
        this.parseargs()
        this.loadconfig()
    }

    parseargs() {
        const args = process.argv.slice(2)
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            const next = args[i + 1]
            
            switch(arg) {
                case '--root':
                case '-r':
                    this.config.root = next
                    i++
                    break
                case '--env':
                case '-e':
                    this.config.env = next
                    i++
                    break
                case '--domain':
                case '-d':
                    this.config.domain = next
                    i++
                    break
                case '--host':
                case '-h':
                    this.config.host = next
                    i++
                    break
                case '--key':
                case '-k':
                    this.config.key = next
                    i++
                    break
                case '--secret':
                case '-s':
                    this.config.secret = next
                    i++
                    break
            }
        }
    }

    loadconfig() {
        const configPath = path.join(this.config.root, this.configFile)
        if (fs.existsSync(configPath)) {
            try {
                const airConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                
                // Get environment
                if (!this.config.env && airConfig.env) {
                    this.config.env = airConfig.env
                }
                
                // Get IP detection config
                if (airConfig.ip) {
                    this.ipConfig = airConfig.ip
                }
                
                // Get GoDaddy config from environment
                if (this.config.env && airConfig[this.config.env]) {
                    const envConfig = airConfig[this.config.env]
                    if (envConfig.godaddy) {
                        if (!this.config.domain) this.config.domain = envConfig.godaddy.domain
                        if (!this.config.host) this.config.host = envConfig.godaddy.host
                        if (!this.config.key) this.config.key = envConfig.godaddy.key
                        if (!this.config.secret) this.config.secret = envConfig.godaddy.secret
                    }
                }
            } catch (e) {
                console.error('Failed to parse config file:', e.message)
            }
        }
    }

    async run() {
        console.log(`Date: ${new Date().toISOString()}`)
        console.log(`Environment: ${this.config.env}`)
        console.log(`Domain: ${this.config.domain}`)
        console.log(`Host: ${this.config.host}`)
        
        try {
            // Get current public IP
            const newIP = await this.getpublicip()
            console.log(`Detected IP: ${newIP}`)
            
            if (!newIP) {
                console.error('Failed to detect public IP')
                process.exit(1)
            }
            
            // Get current DNS record
            let currentIP = null
            let lastIP = null
            
            // Load previous state
            const ddnsPath = path.join(this.config.root, this.ddnsFile)
            if (fs.existsSync(ddnsPath)) {
                try {
                    const ddnsData = JSON.parse(fs.readFileSync(ddnsPath, 'utf8'))
                    currentIP = ddnsData.currentIP
                    lastIP = ddnsData.lastIP || currentIP
                } catch (e) {
                    // Ignore parse errors
                }
            }
            
            // Get current IP from GoDaddy
            if (this.config.key && this.config.secret) {
                currentIP = await this.getcurrentip()
            }
            
            // Update if needed
            if (newIP && currentIP && newIP !== currentIP && 
                this.config.key && this.config.secret && 
                this.config.domain && this.config.host) {
                
                await this.updateip(newIP)
                console.log('IP address updated.')
                lastIP = currentIP
                currentIP = newIP
            } else {
                console.log('IP address not changed. No need to update.')
            }
            
            // Save state
            const ddnsData = {
                lastIP: lastIP,
                currentIP: currentIP || newIP,
                newIP: newIP,
                datetime: new Date().toISOString(),
                timestamp: Date.now()
            }
            fs.writeFileSync(ddnsPath, JSON.stringify(ddnsData, null, 2))
            
        } catch (error) {
            console.error('DDNS update failed:', error.message)
            process.exit(1)
        }
    }

    async getpublicip() {
        console.log('Attempting to detect public IP address...')
        
        // Default configuration
        let dnsServices = [
            { hostname: 'myip.opendns.com', resolver: 'resolver1.opendns.com' },
            { hostname: 'myip.opendns.com', resolver: 'resolver2.opendns.com' }
        ]
        let httpServices = [
            { url: 'https://checkip.amazonaws.com' },
            { url: 'https://ipv4.icanhazip.com' }
        ]
        let timeout = 5000
        let dnsTimeout = 3000
        
        // Use config if available
        if (this.ipConfig) {
            if (this.ipConfig.dns) dnsServices = this.ipConfig.dns
            if (this.ipConfig.http) httpServices = this.ipConfig.http
            if (this.ipConfig.timeout) timeout = this.ipConfig.timeout
            if (this.ipConfig.dnstimeout) dnsTimeout = this.ipConfig.dnstimeout
        }
        
        // Try DNS method first
        for (const service of dnsServices) {
            try {
                console.log(`Trying DNS method: ${service.hostname}@${service.resolver}`)
                const ip = await this.getipviadns(service.hostname, service.resolver, dnsTimeout)
                if (ip && this.validateip(ip)) {
                    console.log(`✓ IP detected via DNS: ${ip}`)
                    return ip
                }
            } catch (e) {
                // Continue to next method
            }
        }
        
        // Try HTTP method
        for (const service of httpServices) {
            try {
                console.log(`Trying HTTP method: ${service.url}`)
                const ip = await this.getipviahttp(service.url, timeout)
                if (ip && this.validateip(ip)) {
                    console.log(`✓ IP detected via HTTP: ${ip}`)
                    return ip
                }
            } catch (e) {
                // Continue to next method
            }
        }
        
        console.log('✗ All IP detection methods failed')
        return null
    }

    async getipviadns(hostname, resolver, timeout) {
        const timeoutSec = Math.ceil(timeout / 1000)
        
        // Try dig first
        try {
            const { stdout } = await execAsync(`timeout ${timeoutSec} dig +short ${hostname} @${resolver}`)
            const ip = stdout.trim().split('\n')[0]
            if (ip) return ip
        } catch (e) {
            // Try nslookup as fallback
            try {
                const { stdout } = await execAsync(`timeout ${timeoutSec} nslookup ${hostname} ${resolver}`)
                const match = stdout.match(/Address: ([0-9.]+)/)
                if (match) return match[1]
            } catch (e) {
                // Both failed
            }
        }
        return null
    }

    async getipviahttp(url, timeout) {
        try {
            const response = await fetch(url, {
                timeout: timeout,
                headers: {
                    'User-Agent': this.ipConfig?.agent || 'Air-DDNS/1.0'
                }
            })
            const text = await response.text()
            const match = text.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/)
            if (match) return match[1]
        } catch (e) {
            // HTTP request failed
        }
        return null
    }

    validateip(ip) {
        const parts = ip.split('.')
        if (parts.length !== 4) return false
        
        for (const part of parts) {
            const num = parseInt(part)
            if (isNaN(num) || num < 0 || num > 255) return false
        }
        
        // Exclude private/reserved ranges
        const first = parseInt(parts[0])
        const second = parseInt(parts[1])
        
        if (first === 10) return false
        if (first === 172 && second >= 16 && second <= 31) return false
        if (first === 192 && second === 168) return false
        if (first === 127) return false
        if (first === 0) return false
        if (first >= 224) return false
        
        return true
    }

    async getcurrentip() {
        const url = `https://api.godaddy.com/v1/domains/${this.config.domain}/records/A/${this.config.host}`
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `sso-key ${this.config.key}:${this.config.secret}`
                }
            })
            
            if (response.ok) {
                const data = await response.json()
                if (Array.isArray(data) && data.length > 0) {
                    return data[0].data
                }
            }
        } catch (e) {
            console.error('Failed to get current IP from GoDaddy:', e.message)
        }
        
        return null
    }

    async updateip(newIP) {
        const url = `https://api.godaddy.com/v1/domains/${this.config.domain}/records/A/${this.config.host}`
        
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `sso-key ${this.config.key}:${this.config.secret}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{ data: newIP }])
            })
            
            if (!response.ok) {
                throw new Error(`GoDaddy API returned ${response.status}`)
            }
        } catch (e) {
            console.error('Failed to update IP with GoDaddy:', e.message)
            throw e
        }
    }
}

// Run DDNS updater
const ddns = new DDNS()
ddns.run()