/**
 * Air Peer - Distributed P2P Node
 * TypeScript source for Peer.js
 */

import { merge } from "./utils.js"
import http from "http"
import https from "https"
import fs from "fs"
import os from "os"
import { execSync } from "child_process"
import net from "net"
import { fileURLToPath } from "url"
import path from "path"
import fetch from "node-fetch"
import GUN from "@akaoio/gun"
import "@akaoio/gun/nts.js"
import "./types.js"
import { acquireLock, releaseLock } from "./lock-manager.js"

interface PeerConfig {
    root?: string
    bash?: string
    env?: string
    name?: string
    sync?: string | null
    path?: string
    [env: string]: any
}

export class Peer {
    config: PeerConfig
    maxRestarts: number = 5
    restarts: number = 0
    delay: number = 5000
    configDir: string
    stateDir: string
    dataDir: string
    systemLockFile!: string
    lockFile!: string  
    pidFile!: string
    options: any = {}
    server?: http.Server | https.Server
    https?: https.Server
    http?: http.Server
    gun: any = {}
    env: string
    GUN: typeof GUN

    constructor(config: PeerConfig = {}) {
        this.config = config || {}
        this.GUN = GUN

        const cwd = fileURLToPath(path.dirname(import.meta.url))

        // Use environment variables for configuration
        this.config.root = this.config.root || process.env.ROOT || process.env.PWD || process.cwd() || cwd
        this.config.bash = (this.config.bash || process.env.BASH || cwd).replace(/\/\s*$/, "")

        // XDG-compliant configuration path
        const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
        const XDG_STATE_HOME = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state')
        const XDG_DATA_HOME = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
        
        this.configDir = path.join(XDG_CONFIG_HOME, 'air')
        this.stateDir = path.join(XDG_STATE_HOME, 'air')
        this.dataDir = path.join(XDG_DATA_HOME, 'air')
        
        // Ensure directories exist
        fs.mkdirSync(this.configDir, { recursive: true })
        fs.mkdirSync(this.stateDir, { recursive: true })
        fs.mkdirSync(this.dataDir, { recursive: true })
        
        // XDG paths
        this.config.path = path.join(this.configDir, "config.json")
        
        // Migrate from legacy air.json if it exists and XDG config doesn't
        const legacyPath = path.join(this.config.root, "air.json")
        if (fs.existsSync(legacyPath) && !fs.existsSync(this.config.path)) {
            fs.copyFileSync(legacyPath, this.config.path)
            console.log(`✓ Migrated ${legacyPath} → ${this.config.path}`)
        }

        this.readConfig()

        // Parse environment
        const envArg = process.argv.find(arg => arg.startsWith('--env='))
        const envValue = envArg ? envArg.split('=')[1] : null
        this.env = this.config.env = this.config.env || process.env.NODE_ENV || process.env.ENV || envValue || "development"

        this.config.name = process.env.NAME || this.config.name || (this.env === "development" ? "localhost" : undefined)
        this.config.sync = this.config.sync || null
        this.config[this.env] = this.config[this.env] || {}
        this.config[this.env].www = this.config[this.env]?.www || path.join(this.config.bash, "www")
        this.config[this.env].domain = process.env.DOMAIN || this.config[this.env]?.domain || (this.env === "development" ? "localhost" : null)
        this.config[this.env].port = process.env.PORT || this.config[this.env]?.port || 8765
        this.config[this.env].peers = this.config[this.env]?.peers || this.config.peers || []
        
        // Domain-agnostic peer scan configuration
        this.config[this.env].scan = this.config[this.env]?.scan || {
            enabled: process.env.AIR_SCAN_ENABLED === 'true' || true,
            methods: {
                multicast: process.env.AIR_MULTICAST_ENABLED !== 'false',
                dht: process.env.AIR_DHT_ENABLED !== 'false', 
                dns: process.env.AIR_DNS_ENABLED === 'true' || false,
                manual: true
            },
            multicast: {
                address: process.env.AIR_MULTICAST_ADDR || '239.255.42.99',
                port: parseInt(process.env.AIR_MULTICAST_PORT || '8766')
            },
            dns: {
                domain: process.env.AIR_DNS_DOMAIN || '', // Empty = no DNS scan
                prefix: process.env.AIR_DNS_PREFIX || 'air-node'
            },
            dht: {
                bootstrap: process.env.AIR_DHT_BOOTSTRAP ? 
                    process.env.AIR_DHT_BOOTSTRAP.split(',') : 
                    ['gun.eco/gun', 'gunjs.herokuapp.com/gun']
            },
            limits: {
                max_peers: parseInt(process.env.AIR_MAX_PEERS || '50'),
                timeout: parseInt(process.env.AIR_PEER_TIMEOUT || '5000')
            }
        }
        this.config[this.env].system = this.config[this.env]?.system || {}

        const key = process.env.SSL_KEY || this.config[this.env]?.ssl?.key || (this.config[this.env]?.domain && this.env === "production" ? `/etc/letsencrypt/live/${this.config[this.env]?.domain}/privkey.pem` : null)
        const cert = process.env.SSL_CERT || this.config[this.env]?.ssl?.cert || (this.config[this.env]?.domain && this.env === "production" ? `/etc/letsencrypt/live/${this.config[this.env]?.domain}/cert.pem` : null)

        if (key && cert) {
            this.options.key = fs.existsSync(key) ? fs.readFileSync(key) : null
            this.options.cert = fs.existsSync(cert) ? fs.readFileSync(cert) : null
        }

        // Setup singleton management using new lock manager
        this.setupSingleton()
    }

    setupSingleton() {
        // Use XDG-compliant paths for lock files
        const xdgRuntimeDir = process.env.XDG_RUNTIME_DIR || path.join(os.tmpdir(), `user-${process.getuid()}`)
        const xdgStateDir = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state')
        
        try {
            if (!fs.existsSync(xdgRuntimeDir)) fs.mkdirSync(xdgRuntimeDir, { recursive: true, mode: 0o700 })
            if (!fs.existsSync(path.join(xdgStateDir, 'air'))) fs.mkdirSync(path.join(xdgStateDir, 'air'), { recursive: true })
        } catch (error) {
            console.warn('Warning: Could not create XDG directories:', error.message)
        }

        this.systemLockFile = path.join(xdgRuntimeDir, 'air-system.lock')
        this.lockFile = path.join(xdgRuntimeDir, 'air.lock')
        this.pidFile = path.join(xdgStateDir, 'air', 'air.pid')
        
        process.on('exit', () => this.cleanup())
        process.on('SIGINT', () => { this.cleanup(); process.exit(0) })
        process.on('SIGTERM', () => { this.cleanup(); process.exit(0) })
        process.on('uncaughtException', (err) => { 
            console.error('Uncaught exception:', err)
            this.cleanup()
            process.exit(1)
        })
    }

    checkSingleton(): boolean {
        // Use new lock manager with development bypass
        return acquireLock("air-peer")
    }

    cleanup() {
        releaseLock()
    }

    init() {
        if (this.server) this.server.close()

        if (this.options.key && this.options.cert) {
            this.https = https.createServer(this.options, GUN.serve(this.config[this.env].www))
            this.server = this.https
        } else {
            this.http = http.createServer(GUN.serve(this.config[this.env].www))
            this.server = this.http
        }

        this.server.on('error', (error: any) => {
            console.error('Server error:', error)
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${this.config[this.env].port} is already in use. Trying next port...`)
                this.config[this.env].port = parseInt(this.config[this.env].port) + 1
                this.writeConfig()
                this.restart()
            } else {
                this.restart()
            }
        })

        this.server.on('close', () => {
            console.log('Server closed gracefully')
        })

        try {
            this.server.listen(this.config[this.env].port)
            this.restarts = 0
            console.log(`Server started successfully on port ${this.config[this.env].port}`)
        } catch (error) {
            console.error('Failed to start server:', error)
            this.restart()
        }
    }

    restart() {
        if (this.restarts < this.maxRestarts) {
            this.restarts++
            console.log(`Attempting restart ${this.restarts}/${this.maxRestarts} in ${this.delay/1000} seconds...`)
            
            setTimeout(() => {
                try {
                    this.init()
                } catch (error) {
                    console.error('Failed to restart server:', error)
                    this.restart()
                }
            }, this.delay)
        } else {
            console.error(`Maximum restart attempts (${this.maxRestarts}) reached. Server will not restart automatically.`)
            process.exit(1)
        }
    }

    async start(callback = () => {}) {
        // Check singleton first
        if (!this.checkSingleton()) {
            console.error('Another Air instance is already running')
            process.exit(1)
        }
        
        // Initialize server
        this.init()
        
        await this.syncConfig()
        await this.run()
        await this.online()
        await this.startPeerScan()
        
        if (callback) await callback(this)
    }

    /**
     * Connect as client to existing Air/GUN servers
     * NEW METHOD - This enables client mode without starting a server
     */
    async connect(options: { peers?: string[], autoReconnect?: boolean } = {}) {
        // Don't check singleton - clients can run multiple instances
        
        // Don't create server
        if (this.server) {
            throw new Error('Already started as server, cannot connect as client')
        }
        
        // Use provided peers or default to localhost
        const peers = options.peers || [`http://localhost:${this.config[this.env].port || 8765}/gun`]
        
        console.log('🔌 Connecting Air as client to:', peers)
        
        // Initialize GUN in client-only mode (no server!)
        this.gun = this.GUN({
            peers: peers,
            localStorage: false,
            radisk: false,
            file: false,  // No local storage in client mode
            web: false    // Critical: no web server!
        })
        
        // Still register in network but as client
        await this.online()
        
        console.log('✅ Connected as client')
        return this
    }

    /**
     * Smart auto-initialization
     * Tries server first, falls back to client if port is taken
     */
    async auto() {
        console.log('🧠 Air auto-detecting best mode...')
        
        // Try to start as server
        try {
            if (this.checkSingleton()) {
                console.log('🚀 Starting as server (port available)')
                return await this.start()
            }
        } catch (e) {
            console.log('Server slot taken, trying client mode...')
        }
        
        // Check if local server exists
        const port = this.config[this.env]?.port || 8765
        try {
            const response = await fetch(`http://localhost:${port}/gun`)
            if (response.ok) {
                console.log('📡 Connecting as client (local server found)')
                return await this.connect()
            }
        } catch (e) {
            // No local server, try starting one
        }
        
        // Try to start server if no local server exists
        try {
            console.log('🚀 No server found, starting new server')
            return await this.start()
        } catch (e) {
            // If we can't start server, connect as client anyway
            console.log('⚠️ Cannot start server, connecting as client')
            return await this.connect()
        }
    }

    readConfig() {
        if (fs.existsSync(this.config.path!)) {
            let config = fs.readFileSync(this.config.path!, "utf8")
            config = JSON.parse(config)
            this.config = merge(this.config, config)
        }
        return this.config
    }

    writeConfig() {
        const content = JSON.stringify(this.config, null, 4)
        if (JSON.parse(content)) fs.writeFileSync(this.config.path!, content)
        return this.config
    }

    syncConfig(callback = () => {}) {
        if (!this.config?.sync) return Promise.resolve()
        
        return new Promise((resolve, reject) => {
            fetch(this.config.sync!)
                .then(response => response.json())
                .then(data => {
                    data = data || {}
                    data.system = data.system || {}

                    this.config[this.env].system = data.system.pub && data.system.epub && data.system.cert ? data.system : {}

                    this.readConfig()
                    this.writeConfig()
                    resolve(undefined)
                })
                .catch(e => reject(e))
        }).then(
            response => {
                if (callback) callback(response)
                setTimeout(() => this.syncConfig(), 60 * 60 * 1000)
                return this
            },
            e => console.error(e)
        )
    }

    run(callback = () => {}) {
        return new Promise((resolve, reject) => {
            // Configure single data source for all Air instances
            const gunConfig: any = {
                web: this.server,
                peers: this.config[this.env].peers
            }
            
            // Use shared data directory for all Air instances - SINGLE DATA SOURCE
            const sharedDataPath = path.join(this.dataDir, 'shared')
            fs.mkdirSync(sharedDataPath, { recursive: true })
            gunConfig.file = sharedDataPath
            
            console.log(`🔗 Using shared data source: ${sharedDataPath}`)
            
            this.gun = GUN(gunConfig)
            resolve(true)

            console.log(`Environment: ${this.env}\nHTTPS: ${this.https ? true : false}\nHTTP: ${this.http ? true : false}\nPort: ${this.config[this.env].port}`)
        }).then(
            response => {
                this.writeConfig()
                if (callback) callback(response)
                return this
            },
            e => console.error(e)
        )
    }

    online(callback = () => {}) {
        return new Promise((resolve, reject) => {
            this.gun.get('air').get('nodes').get(this.config.name || 'localhost').put(
                {
                    since: GUN.state(),
                    name: this.config.name || null,
                    domain: this.config[this.env]?.domain || null,
                    https: this.https ? true : false,
                    http: this.http ? true : false,
                    port: this.config[this.env]?.port || null,
                    peers: JSON.stringify(this.config[this.env]?.peers) || null
                },
                (response: any = {}) => {
                    if (response.err) reject(response.err)
                    else {
                        console.log(`Node registered: ${this.config.name || 'localhost'}`)
                        resolve(response)
                    }
                }
            )
        })
        .then(
            async response => {
                if (callback) callback(response)
                await this.updateDDNS()
                await this.updateIP()
                await this.alive()
                return this
            },
            e => console.error(e)
        )
        .catch(e => {
            console.error('Error in online:', e)
        })
    }

    updateDDNS(callback = () => {}) {
        return new Promise((resolve, reject) => {
            const config = path.join(this.config.root!, "ddns.json")
            
            if (!fs.existsSync(config)) {
                return resolve(undefined)
            }
            
            try {
                const content = fs.readFileSync(config, 'utf8')
                const ddns = JSON.parse(content)

                if (ddns && typeof ddns === "object" && Object.keys(ddns).length > 0) {
                    this.gun.get('air').get('ddns').put(ddns, (response: any = {}) => {
                        if (response.err) reject(response.err)
                        else resolve(response)
                    })
                } else {
                    resolve(undefined)
                }
            } catch (error) {
                console.error('DDNS config error:', error)
                resolve(undefined)
            }
        }).then(
            response => {
                if (callback) callback(response)
                setTimeout(() => this.updateDDNS(), 5 * 60 * 1000)
                return this
            },
            e => console.error(e)
        )
    }

    updateIP(callback = () => {}) {
        return new Promise((resolve, reject) => {
            fetch("https://api.ipify.org?format=json")
                .then(response => response.json())
                .then((data: any) => {
                    if (data?.ip) {
                        this.gun.get('air').get('nodes').get(this.config.name || 'localhost').put(
                            {
                                newIP: data?.ip,
                                timestamp: GUN.state()
                            },
                            (response: any = {}) => {
                                if (response.err) reject(response.err)
                                else resolve(response)
                            }
                        )
                    }
                })
                .catch(e => reject(e))
        }).then(
            response => {
                if (callback) callback(response)
                setTimeout(() => this.updateIP(), 5 * 60 * 1000)
                return this
            },
            e => console.error(e)
        )
    }

    alive(callback = () => {}) {
        return new Promise((resolve, reject) => {
            this.gun.get('air').get('nodes').get(this.config.name || 'localhost').put(
                {
                    alive: GUN.state()
                },
                (response: any = {}) => {
                    if (response.err) reject(response.err)
                    else resolve(response)
                }
            )
        }).then(
            response => {
                if (callback) callback(response)
                setTimeout(() => this.alive(), 60 * 1000)
                return this
            },
            e => console.error(e)
        )
    }

    /**
     * Domain-agnostic peer scan system
     * Designed for the world, not tied to any specific domain
     */
    async startPeerScan() {
        const scan = this.config[this.env].scan
        if (!scan?.enabled) {
            console.log('Peer scan disabled')
            return
        }

        console.log('🌍 Starting domain-agnostic peer scan...')
        
        // Start scan methods
        if (scan.methods.multicast) {
            this.startMulticastScan()
        }
        
        if (scan.methods.dht) {
            this.startDHTScan()
        }
        
        if (scan.methods.dns && scan.dns.domain) {
            this.startDNSScan()
        }
        
        if (scan.methods.manual) {
            this.loadManualPeers()
        }
        
        console.log('✅ Peer scan initialized')
    }

    /**
     * Multicast scan for local network peers
     */
    private startMulticastScan() {
        const { address, port } = this.config[this.env].scan.multicast
        console.log(`🏠 Starting multicast scan on ${address}:${port}`)
        
        // This would use Node.js dgram for multicast UDP
        // For now, delegate to shell scan script
        try {
            const { spawn } = require('child_process')
            const scan = spawn('sh', ['-c', './scan.sh multicast &'])
            console.log('Multicast scan process started')
        } catch (error) {
            console.warn('Multicast scan failed:', error)
        }
    }

    /**
     * DHT-based scan using GUN's native DHT capabilities
     */
    private startDHTScan() {
        const bootstrap = this.config[this.env].scan.dht.bootstrap
        console.log('🌐 Starting DHT scan with bootstrap peers:', bootstrap)
        
        // GUN handles DHT natively - just ensure bootstrap peers are configured
        if (bootstrap && bootstrap.length > 0) {
            // Add bootstrap peers to GUN configuration
            bootstrap.forEach((peer: string) => {
                if (!this.config[this.env].peers.includes(peer)) {
                    this.config[this.env].peers.push(peer)
                }
            })
            
            console.log(`Added ${bootstrap.length} DHT bootstrap peers`)
        }
    }

    /**
     * DNS-based scan (optional, only if domain is configured)
     */
    private startDNSScan() {
        const { domain, prefix } = this.config[this.env].scan.dns
        if (!domain) {
            console.log('DNS scan: no domain configured, skipping')
            return
        }
        
        console.log(`🌐 Starting DNS scan for ${domain} with prefix ${prefix}`)
        
        // Delegate to shell scan script for DNS operations
        try {
            const { spawn } = require('child_process')
            const scan = spawn('sh', ['-c', `./scan.sh configure dns ${domain} && ./scan.sh start &`])
            console.log('DNS scan process started')
        } catch (error) {
            console.warn('DNS scan failed:', error)
        }
    }

    /**
     * Load manual peer configuration
     */
    private loadManualPeers() {
        const configPath = path.join(this.configDir, 'manual-peers.json')
        
        if (fs.existsSync(configPath)) {
            try {
                const manualPeers = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                console.log(`📝 Loading ${manualPeers.length} manual peers`)
                
                manualPeers.forEach((peer: string) => {
                    if (!this.config[this.env].peers.includes(peer)) {
                        this.config[this.env].peers.push(peer)
                    }
                })
            } catch (error) {
                console.warn('Failed to load manual peers:', error)
            }
        }
    }

    /**
     * Add a discovered peer to the network
     */
    async addDiscoveredPeer(peerAddress: string) {
        if (!this.config[this.env].peers.includes(peerAddress)) {
            this.config[this.env].peers.push(peerAddress)
            console.log(`🔗 Added discovered peer: ${peerAddress}`)
            
            // If we're already running, connect to the new peer
            if (this.gun) {
                this.gun.opt({ peers: [peerAddress] })
            }
            
            // Save to configuration
            this.writeConfig()
        }
    }

    /**
     * Show current peer network status
     */
    showPeerStatus() {
        const peers = this.config[this.env].peers || []
        const scan = this.config[this.env].scan
        
        console.log('\n📊 Air Peer Network Status:')
        console.log(`  Connected Peers: ${peers.length}`)
        console.log(`  Scan Enabled: ${scan?.enabled ? 'Yes' : 'No'}`)
        
        if (scan?.enabled) {
            console.log('  Scan Methods:')
            console.log(`    • Multicast: ${scan.methods.multicast ? 'Enabled' : 'Disabled'}`)
            console.log(`    • DHT: ${scan.methods.dht ? 'Enabled' : 'Disabled'}`) 
            console.log(`    • DNS: ${scan.methods.dns && scan.dns.domain ? `Enabled (${scan.dns.domain})` : 'Disabled'}`)
            console.log(`    • Manual: ${scan.methods.manual ? 'Enabled' : 'Disabled'}`)
        }
        
        if (peers.length > 0) {
            console.log('\n  Current Peers:')
            peers.forEach((peer: string, index: number) => {
                console.log(`    ${index + 1}. ${peer}`)
            })
        }
        
        console.log()
    }
}

export default Peer