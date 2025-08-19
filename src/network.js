#!/usr/bin/env node

import { execSync } from 'child_process'
import fetch from 'node-fetch'
import dns from 'dns'
import { promisify } from 'util'
import net from 'net'

const dnsLookup = promisify(dns.lookup)
const dnsResolve4 = promisify(dns.resolve4)
const dnsResolve6 = promisify(dns.resolve6)

/**
 * Network utilities with IPv4/IPv6 dual-stack support
 */
class Network {
    constructor() {
        this.ipv4Services = [
            'https://api.ipify.org?format=json',
            'https://ipv4.icanhazip.com',
            'https://v4.ident.me',
            'https://ipecho.net/plain',
            'https://checkip.amazonaws.com'
        ]
        
        this.ipv6Services = [
            'https://api6.ipify.org?format=json',
            'https://ipv6.icanhazip.com',
            'https://v6.ident.me',
            'https://ipv6.ipecho.net/plain'
        ]
        
        this.dnsServers = {
            ipv4: [
                { server: 'resolver1.opendns.com', query: 'myip.opendns.com' },
                { server: '1.1.1.1', query: 'whoami.cloudflare' },
                { server: '8.8.8.8', query: 'o-o.myaddr.l.google.com' }
            ],
            ipv6: [
                { server: '2620:119:35::35', query: 'myip.opendns.com' },
                { server: '2606:4700:4700::1111', query: 'whoami.cloudflare' }
            ]
        }
    }

    /**
     * Check if IPv6 is available on the system
     */
    async has() {
        try {
            // Try to create an IPv6 socket
            const socket = net.createConnection({ port: 443, host: '::1', family: 6 })
            socket.on('error', () => {})
            socket.destroy()
            
            // Check for IPv6 interfaces
            const interfaces = require('os').networkInterfaces()
            for (const iface of Object.values(interfaces)) {
                for (const config of iface) {
                    if (config.family === 'IPv6' && !config.internal) {
                        return true
                    }
                }
            }
            return false
        } catch {
            return false
        }
    }

    /**
     * Validate IP address (IPv4 or IPv6)
     */
    validate(ip) {
        if (!ip || typeof ip !== 'string') return false
        
        // Check IPv4
        if (net.isIPv4(ip)) {
            // Exclude private and reserved ranges
            const parts = ip.split('.').map(Number)
            if (parts[0] === 10) return false // 10.0.0.0/8
            if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false // 172.16.0.0/12
            if (parts[0] === 192 && parts[1] === 168) return false // 192.168.0.0/16
            if (parts[0] === 127) return false // 127.0.0.0/8 (loopback)
            if (parts[0] === 0) return false // 0.0.0.0/8
            if (parts[0] === 169 && parts[1] === 254) return false // 169.254.0.0/16 (link-local)
            if (parts[0] >= 224) return false // 224.0.0.0/4 (multicast) and 240.0.0.0/4 (reserved)
            return true
        }
        
        // Check IPv6
        if (net.isIPv6(ip)) {
            // Exclude private and reserved ranges
            const lower = ip.toLowerCase()
            if (lower.startsWith('fe80:')) return false // Link-local
            if (lower.startsWith('fc00:') || lower.startsWith('fd00:')) return false // Unique local
            if (lower === '::1') return false // Loopback
            if (lower === '::') return false // Unspecified
            if (lower.startsWith('ff')) return false // Multicast
            return true
        }
        
        return false
    }

    /**
     * Get IPv4 address via DNS
     */
    async getipv4dns() {
        for (const { server, query } of this.dnsServers.ipv4) {
            try {
                const result = await this.dnsquery(query, server, 'A')
                if (result && this.validate(result)) {
                    return result
                }
            } catch {
                continue
            }
        }
        return null
    }

    /**
     * Get IPv6 address via DNS
     */
    async getipv6dns() {
        for (const { server, query } of this.dnsServers.ipv6) {
            try {
                const result = await this.dnsquery(query, server, 'AAAA')
                if (result && this.validate(result)) {
                    return result
                }
            } catch {
                continue
            }
        }
        return null
    }

    /**
     * Get IPv4 address via HTTP
     */
    async getipv4http() {
        for (const service of this.ipv4Services) {
            try {
                const response = await fetch(service, {
                    timeout: 5000,
                    headers: { 'User-Agent': 'Air-GUN-Peer/1.0' }
                })
                const text = await response.text()
                
                // Handle JSON responses
                let ip = text.trim()
                try {
                    const json = JSON.parse(text)
                    ip = json.ip || json.address || ip
                } catch {}
                
                if (this.validate(ip)) {
                    return ip
                }
            } catch {
                continue
            }
        }
        return null
    }

    /**
     * Get IPv6 address via HTTP
     */
    async getipv6http() {
        for (const service of this.ipv6Services) {
            try {
                const response = await fetch(service, {
                    timeout: 5000,
                    headers: { 'User-Agent': 'Air-GUN-Peer/1.0' }
                })
                const text = await response.text()
                
                // Handle JSON responses
                let ip = text.trim()
                try {
                    const json = JSON.parse(text)
                    ip = json.ip || json.address || ip
                } catch {}
                
                if (this.validate(ip)) {
                    return ip
                }
            } catch {
                continue
            }
        }
        return null
    }

    /**
     * Get both IPv4 and IPv6 addresses
     */
    async get() {
        const result = {
            ipv4: null,
            ipv6: null,
            primary: null,
            hasIPv6: await this.has()
        }
        
        // Get IPv4
        result.ipv4 = await this.getipv4dns() || await this.getipv4http()
        
        // Get IPv6 if available
        if (result.hasIPv6) {
            result.ipv6 = await this.getipv6dns() || await this.getipv6http()
        }
        
        // Determine primary IP (prefer IPv4 for compatibility)
        result.primary = result.ipv4 || result.ipv6
        
        return result
    }

    /**
     * Monitor IP changes
     */
    async monitor(callback, interval = 300000) { // 5 minutes default
        let lastIPs = await this.get()
        callback(lastIPs)
        
        return setInterval(async () => {
            const currentIPs = await this.get()
            
            // Check for changes
            if (currentIPs.ipv4 !== lastIPs.ipv4 || currentIPs.ipv6 !== lastIPs.ipv6) {
                callback(currentIPs, lastIPs)
                lastIPs = currentIPs
            }
        }, interval)
    }

    /**
     * DNS query helper
     */
    async dnsquery(hostname, server, type = 'A') {
        return new Promise((resolve, reject) => {
            const resolver = new dns.Resolver()
            resolver.setServers([server])
            
            const method = type === 'AAAA' ? 'resolve6' : 'resolve4'
            resolver[method](hostname, (err, addresses) => {
                if (err) reject(err)
                else resolve(addresses[0])
            })
        })
    }

    /**
     * Get network interfaces info
     */
    getinterfaces() {
        const os = require('os')
        const interfaces = os.networkInterfaces()
        const result = []
        
        for (const [name, configs] of Object.entries(interfaces)) {
            for (const config of configs) {
                if (!config.internal) {
                    result.push({
                        name,
                        address: config.address,
                        family: config.family,
                        mac: config.mac,
                        netmask: config.netmask,
                        cidr: config.cidr
                    })
                }
            }
        }
        
        return result
    }

    /**
     * Update DDNS with IPv4/IPv6 support
     */
    async update(config, ips) {
        if (!config.godaddy || !config.godaddy.domain) return null
        
        const { domain, host, key, secret } = config.godaddy
        const headers = {
            'Authorization': `sso-key ${key}:${secret}`,
            'Content-Type': 'application/json'
        }
        
        const results = []
        
        // Update A record (IPv4)
        if (ips.ipv4) {
            try {
                const url = `https://api.godaddy.com/v1/domains/${domain}/records/A/${host}`
                const response = await fetch(url, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify([{ data: ips.ipv4, ttl: 600 }])
                })
                
                results.push({
                    type: 'A',
                    ip: ips.ipv4,
                    success: response.ok,
                    status: response.status
                })
            } catch (error) {
                results.push({
                    type: 'A',
                    ip: ips.ipv4,
                    success: false,
                    error: error.message
                })
            }
        }
        
        // Update AAAA record (IPv6)
        if (ips.ipv6) {
            try {
                const url = `https://api.godaddy.com/v1/domains/${domain}/records/AAAA/${host}`
                const response = await fetch(url, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify([{ data: ips.ipv6, ttl: 600 }])
                })
                
                results.push({
                    type: 'AAAA',
                    ip: ips.ipv6,
                    success: response.ok,
                    status: response.status
                })
            } catch (error) {
                results.push({
                    type: 'AAAA',
                    ip: ips.ipv6,
                    success: false,
                    error: error.message
                })
            }
        }
        
        return results
    }
}

const network = new Network()
export default network