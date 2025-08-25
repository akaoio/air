#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
// Native fetch is available in Node.js 18+
import { fileURLToPath } from "url"
import { getPaths } from "../src/paths"
import type { AirConfig } from "../src/types"

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class DDNS {
    constructor() {
        // Use smart path detection
        const paths = getPaths()

        this.config = {
            root: paths.root,
            env: null,
            domain: null,
            host: null,
            key: null,
            secret: null,
            enableIPv6: true // Enable IPv6 by default
        }
        this.configFile = "air.json"
        this.ddnsFile = "ddns.json"
        this.ipConfig = null
        this.parseargs()
        this.loadconfig()
    }

    parseargs() {
        const args = process.argv.slice(2)

        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            const next = args[i + 1]

            switch (arg) {
                case "--root":
                case "-r":
                    this.config.root = next
                    i++
                    break
                case "--env":
                case "-e":
                    this.config.env = next
                    i++
                    break
                case "--domain":
                case "-d":
                    this.config.domain = next
                    i++
                    break
                case "--host":
                case "-h":
                    this.config.host = next
                    i++
                    break
                case "--key":
                case "-k":
                    this.config.key = next
                    i++
                    break
                case "--secret":
                case "-s":
                    this.config.secret = next
                    i++
                    break
                case "--no-ipv6":
                    this.config.enableIPv6 = false
                    break
            }
        }
    }

    loadconfig() {
        const configPath = path.join(this.config.root, this.configFile)
        if (fs.existsSync(configPath)) {
            try {
                const airConfig = JSON.parse(fs.readFileSync(configPath, "utf8"))

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
                    // Check if IPv6 is explicitly disabled in config
                    if (envConfig.enableIPv6 !== undefined) {
                        this.config.enableIPv6 = envConfig.enableIPv6
                    }
                }
            } catch (e) {
                console.error("Failed to parse config file:", e.message)
            }
        }
    }

    validate() {
        return this.config.domain && this.config.host && this.config.key && this.config.secret
    }

    async run() {
        if (!this.validate()) {
            console.error("Missing required configuration. Check air.json or provide parameters.")
            process.exit(1)
        }

        try {
            const ddnsPath = path.join(this.config.root, this.ddnsFile)
            let state = {}

            // Read existing DDNS state
            if (fs.existsSync(ddnsPath)) {
                try {
                    state = JSON.parse(fs.readFileSync(ddnsPath, "utf8"))
                } catch (e) {
                    // Ignore parse errors
                }
            }

            // Get new public IPs (both IPv4 and IPv6)
            const { ipv4, ipv6 } = await this.getpublicips()

            let updated = false

            // Update IPv4 if available
            if (ipv4) {
                const godaddyIPv4 = await this.getcurrentip("A")
                if (godaddyIPv4 !== ipv4) {
                    console.log(`Updating GoDaddy DNS A record: ${godaddyIPv4} -> ${ipv4}`)
                    await this.updateip(ipv4, "A")
                    console.log("✓ GoDaddy DNS A record updated successfully")
                    state.lastIPv4 = state.currentIPv4 || godaddyIPv4
                    state.currentIPv4 = ipv4
                    updated = true
                } else {
                    console.log("IPv4 address not changed. No need to update A record.")
                }
            } else {
                console.log("⚠ No public IPv4 detected (might be behind CGNAT)")
            }

            // Update IPv6 if available and enabled
            if (ipv6 && this.config.enableIPv6) {
                const godaddyIPv6 = await this.getcurrentip("AAAA")
                if (godaddyIPv6 !== ipv6) {
                    console.log(`Updating GoDaddy DNS AAAA record: ${godaddyIPv6} -> ${ipv6}`)
                    await this.updateip(ipv6, "AAAA")
                    console.log("✓ GoDaddy DNS AAAA record updated successfully")
                    state.lastIPv6 = state.currentIPv6 || godaddyIPv6
                    state.currentIPv6 = ipv6
                    updated = true
                } else {
                    console.log("IPv6 address not changed. No need to update AAAA record.")
                }
            } else if (!ipv6) {
                console.log("ℹ No public IPv6 detected")
            }

            // Save state
            state.ipv4 = ipv4
            state.ipv6 = ipv6
            state.datetime = new Date().toISOString()
            state.timestamp = Date.now()
            state.updated = updated

            fs.writeFileSync(ddnsPath, JSON.stringify(state, null, 2))

            if (!ipv4 && !ipv6) {
                console.error("✗ No public IP addresses could be detected")
                process.exit(1)
            }
        } catch (error) {
            console.error("DDNS update failed:", error.message)
            process.exit(1)
        }
    }

    async getpublicips() {
        console.log("Attempting to detect public IP addresses (IPv4 and IPv6)...")

        const result = { ipv4: null, ipv6: null }

        // Default configuration
        let dnsServices = [
            { hostname: "myip.opendns.com", resolver: "resolver1.opendns.com" },
            { hostname: "myip.opendns.com", resolver: "resolver2.opendns.com" },
            { hostname: "myip.opendns.com", resolver: "resolver3.opendns.com" },
            { hostname: "myip.opendns.com", resolver: "resolver4.opendns.com" }
        ]
        let httpServices = [{ url: "https://checkip.amazonaws.com" }, { url: "https://ipv4.icanhazip.com" }, { url: "https://api.ipify.org" }]
        let httpServicesV6 = [{ url: "https://ipv6.icanhazip.com" }, { url: "https://api6.ipify.org" }, { url: "https://v6.ident.me" }]
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
                    console.log(`✓ IPv4 detected via DNS: ${ip}`)
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
                        console.log(`✓ IPv4 detected via HTTP: ${ip}`)
                        result.ipv4 = ip
                        break
                    }
                } catch (e) {
                    // Continue to next method
                }
            }
        }

        // Get IPv6 (if enabled)
        if (this.config.enableIPv6) {
            // First try to get local IPv6
            try {
                const { stdout } = await execAsync("ip -6 addr show scope global | grep inet6 | head -1")
                const match = stdout.match(/inet6\s+([0-9a-fA-F:]+)/)
                if (match && this.validateipv6(match[1])) {
                    console.log(`✓ IPv6 detected locally: ${match[1]}`)
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
                            console.log(`✓ IPv6 detected via HTTP: ${ip}`)
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

    async getipviadns(hostname, resolver, timeout) {
        const timeoutSec = Math.ceil(timeout / 1000)

        // Try dig first
        try {
            const { stdout } = await execAsync(`timeout ${timeoutSec} dig +short ${hostname} @${resolver}`)
            const ip = stdout.trim().split("\n")[0]
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

    async getipviahttp(url, timeout, ipv6 = false) {
        try {
            // Force IPv6 for IPv6 URLs by using curl
            if (ipv6 && url.includes("ipv6")) {
                try {
                    const { stdout } = await execAsync(`curl -6 -s --connect-timeout ${Math.ceil(timeout / 1000)} ${url}`)
                    return stdout.trim().split("\n")[0]
                } catch (e) {
                    // Fall back to regular fetch
                }
            }

            // Force IPv4 for IPv4 URLs
            if (!ipv6 && url.includes("ipv4")) {
                try {
                    const { stdout } = await execAsync(`curl -4 -s --connect-timeout ${Math.ceil(timeout / 1000)} ${url}`)
                    return stdout.trim().split("\n")[0]
                } catch (e) {
                    // Fall back to regular fetch
                }
            }

            const response = await fetch(url, {
                timeout: timeout,
                headers: {
                    "User-Agent": "Air-DDNS/1.0"
                }
            })

            if (response.ok) {
                const text = await response.text()
                return text.trim().split("\n")[0]
            }
        } catch (e) {
            // Failed
        }
        return null
    }

    validateipv4(ip) {
        if (!ip || typeof ip !== "string") return false

        // Check if it's a valid IPv4 address
        const parts = ip.split(".")
        if (parts.length !== 4) return false

        for (const part of parts) {
            const num = parseInt(part, 10)
            if (isNaN(num) || num < 0 || num > 255) return false
        }

        // Exclude private and reserved ranges
        const first = parseInt(parts[0], 10)
        const second = parseInt(parts[1], 10)

        if (first === 10) return false
        if (first === 172 && second >= 16 && second <= 31) return false
        if (first === 192 && second === 168) return false
        if (first === 169 && second === 254) return false
        if (first === 127) return false
        if (first === 0) return false
        if (first >= 224) return false

        // Check for CGNAT range (100.64.0.0/10)
        if (first === 100 && second >= 64 && second <= 127) {
            console.log("⚠ Warning: Detected CGNAT IP address (100.64.0.0/10). Port forwarding will not work.")
            return false // CGNAT is not a public IP
        }

        return true
    }

    validateipv6(ip) {
        if (!ip || typeof ip !== "string") return false

        // Remove leading/trailing whitespace
        ip = ip.trim()

        // Basic IPv6 validation
        const segments = ip.split(":")
        if (segments.length < 3 || segments.length > 8) return false

        // Check for valid hexadecimal segments
        for (const segment of segments) {
            if (segment && !/^[0-9a-fA-F]{0,4}$/.test(segment)) {
                return false
            }
        }

        // Exclude link-local addresses (fe80::)
        if (ip.toLowerCase().startsWith("fe80:")) return false

        // Exclude loopback (::1)
        if (ip === "::1") return false

        // Exclude private/ULA addresses (fc00::/7)
        if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd")) return false

        return true
    }

    async getcurrentip(type = "A") {
        const url = `https://api.godaddy.com/v1/domains/${this.config.domain}/records/${type}/${this.config.host}`

        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `sso-key ${this.config.key}:${this.config.secret}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                if (Array.isArray(data) && data.length > 0) {
                    return data[0].data
                }
            } else if (response.status === 404 && type === "AAAA") {
                // AAAA record doesn't exist yet, which is fine
                return null
            }
        } catch (e) {
            if (type === "AAAA") {
                // AAAA records might not exist, which is fine
                return null
            }
            console.error(`Failed to get current ${type} record from GoDaddy:`, e.message)
        }

        return null
    }

    async updateip(newIP, type = "A") {
        const url = `https://api.godaddy.com/v1/domains/${this.config.domain}/records/${type}/${this.config.host}`

        try {
            const response = await fetch(url, {
                method: "PUT",
                headers: {
                    Authorization: `sso-key ${this.config.key}:${this.config.secret}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify([
                    {
                        data: newIP,
                        ttl: 600 // 10 minutes TTL for dynamic IPs
                    }
                ])
            })

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`GoDaddy API returned ${response.status}: ${error}`)
            }
        } catch (e) {
            console.error(`Failed to update ${type} record with GoDaddy:`, e.message)
            throw e
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const ddns = new DDNS()
    ddns.run()
}

export default DDNS
