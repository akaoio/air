#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths.js'
import type { AirConfig } from '../src/types/index.js'
import { AirUI, AirModule, StatusItem, formatSuccess, formatWarning, formatError } from './ui-utils.js'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface DDNSConfig {
    root: string
    env: string | null
    domain: string | null
    host: string | null
    key: string | null
    secret: string | null
    enableIPv6: boolean
}

interface IPResult {
    ipv4: string | null
    ipv6: string | null
}

interface DDNSState {
    ipv4?: string | null
    ipv6?: string | null
    lastIPv4?: string
    lastIPv6?: string
    currentIPv4?: string
    currentIPv6?: string
    datetime: string
    timestamp: number
    updated: boolean
}

class DDNS extends AirModule {
    private ddnsConfig: DDNSConfig
    private configFile = 'air.json'
    private ddnsFile = 'ddns.json'
    private ipConfig: any = null
    
    constructor() {
        super('DDNS Updater')
        
        const paths = getPaths()
        this.ddnsConfig = {
            root: paths.root,
            env: null,
            domain: null,
            host: null,
            key: null,
            secret: null,
            enableIPv6: true
        }
        
        this.parseargs()
        this.loadconfig()
    }
    
    parseargs(): void {
        const args = process.argv.slice(2)
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            const next = args[i + 1]
            
            switch(arg) {
                case '--root':
                case '-r':
                    this.ddnsConfig.root = next
                    i++
                    break
                case '--env':
                case '-e':
                    this.ddnsConfig.env = next
                    i++
                    break
                case '--domain':
                case '-d':
                    this.ddnsConfig.domain = next
                    i++
                    break
                case '--host':
                case '-h':
                    this.ddnsConfig.host = next
                    i++
                    break
                case '--key':
                case '-k':
                    this.ddnsConfig.key = next
                    i++
                    break
                case '--secret':
                case '-s':
                    this.ddnsConfig.secret = next
                    i++
                    break
                case '--no-ipv6':
                    this.ddnsConfig.enableIPv6 = false
                    break
            }
        }
    }
    
    loadconfig(): void {
        const configPath = path.join(this.ddnsConfig.root, this.configFile)
        if (fs.existsSync(configPath)) {
            try {
                const airConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                
                if (!this.ddnsConfig.env && airConfig.env) {
                    this.ddnsConfig.env = airConfig.env
                }
                
                if (airConfig.ip) {
                    this.ipConfig = airConfig.ip
                }
                
                if (this.ddnsConfig.env && airConfig[this.ddnsConfig.env]) {
                    const envConfig = airConfig[this.ddnsConfig.env]
                    if (envConfig.godaddy) {
                        if (!this.ddnsConfig.domain) this.ddnsConfig.domain = envConfig.godaddy.domain
                        if (!this.ddnsConfig.host) this.ddnsConfig.host = envConfig.godaddy.host
                        if (!this.ddnsConfig.key) this.ddnsConfig.key = envConfig.godaddy.key
                        if (!this.ddnsConfig.secret) this.ddnsConfig.secret = envConfig.godaddy.secret
                    }
                    if (envConfig.enableIPv6 !== undefined) {
                        this.ddnsConfig.enableIPv6 = envConfig.enableIPv6
                    }
                }
            } catch (e: any) {
                this.ui.showWarning(`Failed to parse config file: ${e.message}`)
            }
        }
    }
    
    validate(): boolean {
        return !!(this.ddnsConfig.domain && this.ddnsConfig.host && this.ddnsConfig.key && this.ddnsConfig.secret)
    }
    
    async run(): Promise<void> {
        if (!this.validate()) {
            this.ui.showError('Missing required configuration', 'Check air.json or provide parameters')
            throw new Error('Invalid configuration')
        }
        
        // Show configuration
        const configItems: StatusItem[] = [
            { label: 'Domain', value: this.ddnsConfig.domain!, status: 'info' },
            { label: 'Host', value: this.ddnsConfig.host!, status: 'info' },
            { label: 'IPv6 Support', value: this.ddnsConfig.enableIPv6 ? 'Enabled' : 'Disabled', status: this.ddnsConfig.enableIPv6 ? 'success' : 'warning' }
        ]
        console.log(this.ui.createStatusSection('DDNS Configuration', configItems))
        
        const ddnsPath = path.join(this.ddnsConfig.root, this.ddnsFile)
        let state: DDNSState = {
            datetime: new Date().toISOString(),
            timestamp: Date.now(),
            updated: false
        }
        
        // Read existing DDNS state
        if (fs.existsSync(ddnsPath)) {
            try {
                state = { ...JSON.parse(fs.readFileSync(ddnsPath, 'utf8')), ...state }
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // Create spinner for IP detection
        const spinner = this.ui.createSpinner('Detecting public IP addresses...')
        spinner.start()
        
        // Get new public IPs
        const { ipv4, ipv6 } = await this.getpublicips()
        
        spinner.stop()
        
        const ipItems: StatusItem[] = []
        
        if (ipv4) {
            ipItems.push({ label: 'IPv4 Address', value: ipv4, status: 'success' })
        } else {
            ipItems.push({ label: 'IPv4 Address', value: 'Not detected (might be behind CGNAT)', status: 'warning' })
        }
        
        if (ipv6 && this.ddnsConfig.enableIPv6) {
            ipItems.push({ label: 'IPv6 Address', value: ipv6, status: 'success' })
        } else if (!ipv6) {
            ipItems.push({ label: 'IPv6 Address', value: 'Not detected', status: 'info' })
        }
        
        console.log(this.ui.createStatusSection('IP Detection Results', ipItems))
        
        let updated = false
        const updateItems: StatusItem[] = []
        
        // Update IPv4 if available
        if (ipv4) {
            const updateSpinner = this.ui.createSpinner('Checking IPv4 DNS record...')
            updateSpinner.start()
            
            const godaddyIPv4 = await this.getcurrentip('A')
            updateSpinner.stop()
            
            if (godaddyIPv4 !== ipv4) {
                this.ui.showInfo(`Updating GoDaddy DNS A record: ${godaddyIPv4 || 'none'} → ${ipv4}`)
                
                const updateSpinner = this.ui.createSpinner('Updating A record...')
                updateSpinner.start()
                
                try {
                    await this.updateip(ipv4, 'A')
                    updateSpinner.stop()
                    updateItems.push({ label: 'A Record', value: 'Updated successfully', status: 'success' })
                    state.lastIPv4 = state.currentIPv4 || godaddyIPv4
                    state.currentIPv4 = ipv4
                    updated = true
                } catch (e: any) {
                    updateSpinner.stop()
                    updateItems.push({ label: 'A Record', value: `Update failed: ${e.message}`, status: 'error' })
                }
            } else {
                updateItems.push({ label: 'A Record', value: 'No change needed', status: 'info' })
            }
        }
        
        // Update IPv6 if available and enabled
        if (ipv6 && this.ddnsConfig.enableIPv6) {
            const updateSpinner = this.ui.createSpinner('Checking IPv6 DNS record...')
            updateSpinner.start()
            
            const godaddyIPv6 = await this.getcurrentip('AAAA')
            updateSpinner.stop()
            
            if (godaddyIPv6 !== ipv6) {
                this.ui.showInfo(`Updating GoDaddy DNS AAAA record: ${godaddyIPv6 || 'none'} → ${ipv6}`)
                
                const updateSpinner = this.ui.createSpinner('Updating AAAA record...')
                updateSpinner.start()
                
                try {
                    await this.updateip(ipv6, 'AAAA')
                    updateSpinner.stop()
                    updateItems.push({ label: 'AAAA Record', value: 'Updated successfully', status: 'success' })
                    state.lastIPv6 = state.currentIPv6 || godaddyIPv6
                    state.currentIPv6 = ipv6
                    updated = true
                } catch (e: any) {
                    updateSpinner.stop()
                    updateItems.push({ label: 'AAAA Record', value: `Update failed: ${e.message}`, status: 'error' })
                }
            } else {
                updateItems.push({ label: 'AAAA Record', value: 'No change needed', status: 'info' })
            }
        }
        
        // Save state
        state.ipv4 = ipv4
        state.ipv6 = ipv6
        state.datetime = new Date().toISOString()
        state.timestamp = Date.now()
        state.updated = updated
        
        fs.writeFileSync(ddnsPath, JSON.stringify(state, null, 2))
        
        // Show update results
        if (updateItems.length > 0) {
            console.log(this.ui.createStatusSection('DNS Update Results', updateItems))
        }
        
        // Final summary
        if (!ipv4 && !ipv6) {
            this.ui.showError('No public IP addresses could be detected')
            throw new Error('IP detection failed')
        } else if (updated) {
            this.ui.showSuccess('DDNS update completed successfully')
        } else {
            this.ui.showInfo('DNS records are already up to date')
        }
        
        // Show next update instructions
        const instructions = [
            'To set up automatic updates, add this to cron:',
            this.ui.formatCommand(`*/15 * * * * ${process.argv[0]} ${__filename}`)
        ]
        
        console.log('\n' + formatSuccess('DDNS configuration active'))
        instructions.forEach(inst => console.log(inst))
    }
    
    async getpublicips(): Promise<IPResult> {
        const result: IPResult = { ipv4: null, ipv6: null }
        
        // Default configuration
        let dnsServices = [
            { hostname: 'myip.opendns.com', resolver: 'resolver1.opendns.com' },
            { hostname: 'myip.opendns.com', resolver: 'resolver2.opendns.com' },
            { hostname: 'myip.opendns.com', resolver: 'resolver3.opendns.com' },
            { hostname: 'myip.opendns.com', resolver: 'resolver4.opendns.com' }
        ]
        let httpServices = [
            { url: 'https://checkip.amazonaws.com' },
            { url: 'https://ipv4.icanhazip.com' },
            { url: 'https://api.ipify.org' }
        ]
        let httpServicesV6 = [
            { url: 'https://ipv6.icanhazip.com' },
            { url: 'https://api6.ipify.org' },
            { url: 'https://v6.ident.me' }
        ]
        let timeout = 5000
        let dnsTimeout = 3000
        
        // Use config if available
        if (this.ipConfig) {
            if (this.ipConfig.dns) dnsServices = this.ipConfig.dns
            if (this.ipConfig.http) httpServices = this.ipConfig.http
            if (this.ipConfig.httpv6) httpServicesV6 = this.ipConfig.httpv6
            if (this.ipConfig.timeout) timeout = this.ipConfig.timeout
            if (this.ipConfig.dnstimeout) dnsTimeout = this.ipConfig.dnstimeout
        }
        
        // Get IPv4
        // Try DNS method first
        for (const service of dnsServices) {
            try {
                const ip = await this.getipviadns(service.hostname, service.resolver, dnsTimeout)
                if (ip && this.validateipv4(ip)) {
                    result.ipv4 = ip
                    break
                }
            } catch (e) {
                // Continue to next method
            }
        }
        
        // Try HTTP method for IPv4 if DNS failed
        if (!result.ipv4) {
            for (const service of httpServices) {
                try {
                    const ip = await this.getipviahttp(service.url, timeout)
                    if (ip && this.validateipv4(ip)) {
                        result.ipv4 = ip
                        break
                    }
                } catch (e) {
                    // Continue to next method
                }
            }
        }
        
        // Get IPv6 (if enabled)
        if (this.ddnsConfig.enableIPv6) {
            // First try to get local IPv6
            try {
                const { stdout } = await execAsync('ip -6 addr show scope global | grep inet6 | head -1')
                const match = stdout.match(/inet6\s+([0-9a-fA-F:]+)/)
                if (match && this.validateipv6(match[1])) {
                    result.ipv6 = match[1]
                }
            } catch (e) {
                // Try HTTP methods
            }
            
            // Try HTTP for IPv6 if local detection failed
            if (!result.ipv6) {
                for (const service of httpServicesV6) {
                    try {
                        const ip = await this.getipviahttp(service.url, timeout, true)
                        if (ip && this.validateipv6(ip)) {
                            result.ipv6 = ip
                            break
                        }
                    } catch (e) {
                        // Continue to next method
                    }
                }
            }
        }
        
        return result
    }
    
    async getipviadns(hostname: string, resolver: string, timeout: number): Promise<string | null> {
        const timeoutSec = Math.ceil(timeout / 1000)
        
        try {
            const { stdout } = await execAsync(`timeout ${timeoutSec} dig +short ${hostname} @${resolver}`)
            const ip = stdout.trim().split('\n')[0]
            if (ip) return ip
        } catch (e) {
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
    
    async getipviahttp(url: string, timeout: number, ipv6 = false): Promise<string | null> {
        try {
            if (ipv6 && url.includes('ipv6')) {
                try {
                    const { stdout } = await execAsync(`curl -6 -s --connect-timeout ${Math.ceil(timeout/1000)} ${url}`)
                    return stdout.trim().split('\n')[0]
                } catch (e) {
                    // Fall back to regular fetch
                }
            }
            
            if (!ipv6 && url.includes('ipv4')) {
                try {
                    const { stdout } = await execAsync(`curl -4 -s --connect-timeout ${Math.ceil(timeout/1000)} ${url}`)
                    return stdout.trim().split('\n')[0]
                } catch (e) {
                    // Fall back to regular fetch
                }
            }
            
            const response = await fetch(url, {
                signal: AbortSignal.timeout(timeout),
                headers: {
                    'User-Agent': 'Air-DDNS/2.0'
                }
            })
            
            if (response.ok) {
                const text = await response.text()
                return text.trim().split('\n')[0]
            }
        } catch (e) {
            // Failed
        }
        return null
    }
    
    validateipv4(ip: string): boolean {
        if (!ip || typeof ip !== 'string') return false
        
        const parts = ip.split('.')
        if (parts.length !== 4) return false
        
        for (const part of parts) {
            const num = parseInt(part, 10)
            if (isNaN(num) || num < 0 || num > 255) return false
        }
        
        const first = parseInt(parts[0], 10)
        const second = parseInt(parts[1], 10)
        
        if (first === 10) return false
        if (first === 172 && second >= 16 && second <= 31) return false
        if (first === 192 && second === 168) return false
        if (first === 169 && second === 254) return false
        if (first === 127) return false
        if (first === 0) return false
        if (first >= 224) return false
        
        if (first === 100 && second >= 64 && second <= 127) {
            this.ui.showWarning('Detected CGNAT IP address (100.64.0.0/10). Port forwarding will not work.')
            return false
        }
        
        return true
    }
    
    validateipv6(ip: string): boolean {
        if (!ip || typeof ip !== 'string') return false
        
        ip = ip.trim()
        
        const segments = ip.split(':')
        if (segments.length < 3 || segments.length > 8) return false
        
        for (const segment of segments) {
            if (segment && !/^[0-9a-fA-F]{0,4}$/.test(segment)) {
                return false
            }
        }
        
        if (ip.toLowerCase().startsWith('fe80:')) return false
        if (ip === '::1') return false
        if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return false
        
        return true
    }
    
    async getcurrentip(type = 'A'): Promise<string | null> {
        const url = `https://api.godaddy.com/v1/domains/${this.ddnsConfig.domain}/records/${type}/${this.ddnsConfig.host}`
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `sso-key ${this.ddnsConfig.key}:${this.ddnsConfig.secret}`
                }
            })
            
            if (response.ok) {
                const data = await response.json() as any[]
                if (Array.isArray(data) && data.length > 0) {
                    return data[0].data
                }
            } else if (response.status === 404 && type === 'AAAA') {
                return null
            }
        } catch (e: any) {
            if (type === 'AAAA') {
                return null
            }
            this.ui.showError(`Failed to get current ${type} record from GoDaddy: ${e.message}`)
        }
        
        return null
    }
    
    async updateip(newIP: string, type = 'A'): Promise<void> {
        const url = `https://api.godaddy.com/v1/domains/${this.ddnsConfig.domain}/records/${type}/${this.ddnsConfig.host}`
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `sso-key ${this.ddnsConfig.key}:${this.ddnsConfig.secret}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{ 
                data: newIP,
                ttl: 600  // 10 minutes TTL for dynamic IPs
            }])
        })
        
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`GoDaddy API returned ${response.status}: ${error}`)
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const ddns = new DDNS()
    ddns.execute()
}

export default DDNS