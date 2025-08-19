#!/usr/bin/env bun
/**
 * Peer class - TypeScript/Bun edition
 * Fuck JavaScript's type coercion and Node's slow ass
 */

import type { 
    IPeer, 
    PeerOptions, 
    AirConfig, 
    Environment,
    EnvironmentConfig,
    IPResult,
    Runtime,
    SSLConfig
} from './types'

import { ConfigManager } from './config'
import { ProcessManager } from './process'
import { StatusReporter } from './status'
import network from './network'
import permissions from './permissions'
import syspaths from './syspaths'

import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import GUN from '@akaoio/gun'
import '@akaoio/gun/sea.js'
import '@akaoio/gun/nts.js'

const sea = GUN.SEA

// Runtime detection
const runtime: Runtime = (() => {
    // @ts-ignore
    if (typeof Bun !== 'undefined') return 'bun'
    // @ts-ignore
    if (typeof Deno !== 'undefined') return 'deno'
    return 'node'
})()

console.log(`🚀 Running on ${runtime.toUpperCase()} runtime`)

export class Peer implements IPeer {
    // Managers
    private configManager: ConfigManager
    private processManager: ProcessManager
    private statusReporter: StatusReporter
    
    // Core state
    public server: http.Server | https.Server | null = null
    public gun: any = null // GUN's types are fucked
    public user: any = null // Same here
    public readonly GUN = GUN
    public readonly sea = sea
    public config: AirConfig
    
    // Restart handling
    private restarts = {
        max: 5,
        count: 0,
        baseDelay: 5000,
        maxDelay: 60000
    }
    
    // Grouped interfaces
    public readonly ip = {
        get: (): Promise<IPResult> => network.get(),
        validate: (ip: string): boolean => network.validate(ip)
    }
    
    public readonly status = {
        ddns: (): Promise<void> => this.statusReporter.ddns(),
        ip: (): Promise<void> => this.statusReporter.ip(),
        alive: (): void => this.statusReporter.alive()
    }
    
    constructor(options: PeerOptions = {}) {
        // Process command line arguments (Node.js style for compatibility)
        const cliArgs: PeerOptions = {
            rootArg: process.argv[2],
            bashArg: process.argv[3],
            env: process.argv[4] as Environment,
            name: process.argv[5],
            domain: process.argv[6],
            port: process.argv[7] ? parseInt(process.argv[7]) : undefined,
            sslKey: process.argv[8],
            sslCert: process.argv[9],
            pub: process.argv[10],
            priv: process.argv[11],
            epub: process.argv[12],
            epriv: process.argv[13]
        }
        
        // Merge options with CLI args
        const merged: PeerOptions = { ...options, ...cliArgs }
        
        // Initialize managers
        this.configManager = new ConfigManager(merged)
        this.processManager = new ProcessManager({
            name: merged.name || process.env.NAME || 'air',
            root: merged.rootArg || process.env.ROOT || process.cwd()
        })
        this.statusReporter = new StatusReporter()
        
        // Restart configuration
        if (merged.maxRestarts) this.restarts.max = merged.maxRestarts
        if (merged.restartDelay) this.restarts.baseDelay = merged.restartDelay
        if (merged.maxRestartDelay) this.restarts.maxDelay = merged.maxRestartDelay
        
        // Load configuration
        this.config = this.read()
        
        // Apply CLI overrides to config
        if (cliArgs.env) this.config.env = cliArgs.env
        if (cliArgs.name) this.config.name = cliArgs.name
        
        const env = this.config[this.config.env] as Partial<EnvironmentConfig>
        if (cliArgs.domain) env.domain = cliArgs.domain
        if (cliArgs.port) env.port = cliArgs.port
        if (cliArgs.sslKey && cliArgs.sslCert) {
            env.ssl = { key: cliArgs.sslKey, cert: cliArgs.sslCert }
        }
        if (cliArgs.pub && cliArgs.priv) {
            env.pair = {
                pub: cliArgs.pub,
                priv: cliArgs.priv,
                epub: cliArgs.epub,
                epriv: cliArgs.epriv
            }
        }
        
        // Type-safe merge
        this.config = { ...this.config, ...env } as AirConfig
        
        // Update status reporter config
        this.statusReporter.updateConfig(this.config)
    }

    /**
     * Main startup sequence
     */
    async start(): Promise<IPeer> {
        console.log('Starting Air peer...')
        
        // Check for existing instance
        if (this.processManager.check()) {
            process.exit(1)
        }
        
        // Sync configuration if URL provided
        if (this.config.sync) {
            await this.sync()
        }
        
        // Initialize server
        await this.init()
        
        // Start GUN and authenticate
        await this.run()
        
        // Go online and start status reporting
        await this.online()
        
        return this
    }

    /**
     * Initialize HTTP/HTTPS server
     */
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const env = this.config.env
                const envConfig = this.config[env] as Partial<EnvironmentConfig>
                const port = envConfig?.port || (env === 'production' ? 443 : 8765)
                
                // Check port availability
                const existing = this.processManager.find(port)
                if (existing) {
                    const message = `Port ${port} already in use by process ${existing.pid} (${existing.name})`
                    console.error(message)
                    console.error('To kill the process: kill ' + existing.pid)
                    console.error('Or change port in air.json')
                    throw new Error(message)
                }
                
                // Create server
                if (env === 'production' && envConfig?.ssl?.key && envConfig?.ssl?.cert) {
                    // HTTPS server
                    try {
                        const options = {
                            key: fs.readFileSync(envConfig.ssl.key),
                            cert: fs.readFileSync(envConfig.ssl.cert)
                        }
                        this.server = https.createServer(options, GUN.serve).listen(port)
                        console.log(`Creating HTTPS server on port ${port}...`)
                    } catch (sslError: any) {
                        console.error('SSL certificate error:', sslError.message)
                        console.log('Falling back to HTTP...')
                        this.server = http.createServer(GUN.serve).listen(port)
                    }
                } else {
                    // HTTP server
                    this.server = http.createServer(GUN.serve).listen(port)
                    console.log(`Creating HTTP server on port ${port}...`)
                }
                
                this.server.on('listening', () => {
                    const protocol = this.server instanceof https.Server ? 'https' : 'http'
                    const actualPort = (this.server!.address() as any).port
                    console.log(`✓ Server listening on ${protocol}://localhost:${actualPort}`)
                    
                    // Reset restart count on successful start
                    this.restarts.count = 0
                    resolve()
                })
                
                this.server.on('error', (error: any) => {
                    console.error('Server error:', error.message)
                    
                    if (error.code === 'EADDRINUSE') {
                        console.error(`Port ${port} is already in use`)
                        console.error('Try: lsof -i:' + port + ' to find the process')
                        reject(error)
                    } else if (error.code === 'EACCES') {
                        console.error(`Permission denied for port ${port}`)
                        console.error('Try: sudo bun start (for ports below 1024)')
                        reject(error)
                    } else {
                        // Other errors trigger restart
                        this.restart().catch(reject)
                    }
                })
                
                this.server.on('close', () => {
                    console.log('Server closed')
                })
                
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Initialize GUN database
     */
    async run(): Promise<IPeer> {
        if (!this.server) {
            throw new Error('Server not initialized')
        }
        
        const envConfig = this.config[this.config.env] as Partial<EnvironmentConfig>
        
        // Create data directory if it doesn't exist
        const dataPath = envConfig?.file || 'radata'
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true })
        }
        
        // Initialize GUN
        this.gun = GUN({
            web: this.server,
            peers: envConfig?.peers || [],
            file: dataPath,
            axe: false, // Disable to prevent WebSocket errors
            localStorage: false
        })
        
        // Create user instance
        this.user = this.gun.user()
        
        // Update status reporter
        this.statusReporter.updateUser(this.user)
        
        console.log('✓ GUN database initialized')
        console.log(`  Data directory: ${dataPath}`)
        if (envConfig?.peers && envConfig.peers.length > 0) {
            console.log(`  Connected to ${envConfig.peers.length} peer(s)`)
        }
        
        return this
    }

    /**
     * Authenticate and go online
     */
    async online(): Promise<IPeer> {
        if (!this.user) {
            throw new Error('User not initialized')
        }
        
        const envConfig = this.config[this.config.env] as Partial<EnvironmentConfig>
        
        // Authenticate with SEA pair if provided
        if (envConfig?.pair?.pub && envConfig?.pair?.priv) {
            return new Promise((resolve, reject) => {
                this.user.auth(envConfig.pair, (ack: any) => {
                    if (ack.err) {
                        console.error('Authentication failed:', ack.err)
                        // Don't reject, just run anonymously
                        console.log('Running in anonymous mode')
                        this.statusReporter.start()
                        resolve(this)
                    } else {
                        console.log('✓ Authenticated as:', envConfig.pair!.pub.slice(0, 20) + '...')
                        
                        // Start status reporting
                        this.statusReporter.start()
                        
                        // Activate with hub if configured
                        if (this.config.hub) {
                            this.activate(this.config.hub)
                        }
                        
                        resolve(this)
                    }
                })
            })
        } else {
            console.log('No authentication pair provided, running anonymously')
            
            // Start status reporting anyway (limited functionality)
            this.statusReporter.start()
            
            return this
        }
    }

    /**
     * Sync configuration from remote
     */
    async sync(): Promise<IPeer> {
        const updated = await this.configManager.sync(this.config.sync)
        if (updated) {
            this.config = updated
            this.statusReporter.updateConfig(this.config)
            
            // Schedule next sync
            setTimeout(() => this.sync(), 3600000) // 1 hour
        }
        return this
    }

    /**
     * Restart server with exponential backoff
     */
    async restart(): Promise<void> {
        this.restarts.count++
        
        if (this.restarts.count > this.restarts.max) {
            console.error(`Maximum restart attempts (${this.restarts.max}) reached. Exiting...`)
            this.processManager.clean()
            process.exit(1)
        }
        
        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = Math.min(
            this.restarts.baseDelay * Math.pow(2, this.restarts.count - 1),
            this.restarts.maxDelay
        )
        const jitter = exponentialDelay * (Math.random() * 0.4 - 0.2) // ±20% jitter
        const delay = Math.round(exponentialDelay + jitter)
        
        console.log(`Restarting in ${delay}ms (attempt ${this.restarts.count}/${this.restarts.max})...`)
        
        // Stop everything
        await this.stop()
        
        // Wait before restart
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // Restart
        try {
            await this.init()
            await this.run()
            await this.online()
            
            // Reset counter on successful restart
            this.restarts.count = 0
            console.log('✓ Restart successful')
        } catch (error: any) {
            console.error('Restart failed:', error.message)
            await this.restart() // Recursive retry
        }
    }

    /**
     * Stop server and cleanup
     */
    async stop(): Promise<void> {
        // Stop status reporting
        this.statusReporter.stop()
        
        // Close server
        if (this.server) {
            return new Promise((resolve) => {
                this.server!.close(() => {
                    console.log('Server stopped')
                    this.server = null
                    resolve()
                })
                
                // Force close after timeout
                setTimeout(() => {
                    if (this.server) {
                        console.log('Force closing server...')
                        this.server = null
                    }
                    resolve()
                }, 5000)
            })
        }
        
        return Promise.resolve()
    }

    /**
     * Activate peer with hub
     */
    async activate(hubKey: string): Promise<unknown> {
        return this.statusReporter.activate(hubKey)
    }

    /**
     * Read configuration
     */
    read(): AirConfig {
        const config = this.configManager.read()
        
        // Apply environment variables with proper typing
        if (process.env.ENV) config.env = process.env.ENV as Environment
        if (process.env.NAME) config.name = process.env.NAME
        if (process.env.ROOT) config.root = process.env.ROOT
        if (process.env.BASH) config.bash = process.env.BASH
        if (process.env.SYNC) config.sync = process.env.SYNC
        
        const env = config.env || 'development'
        const envConfig = config[env] as Partial<EnvironmentConfig>
        
        if (process.env.DOMAIN) envConfig.domain = process.env.DOMAIN
        if (process.env.PORT) envConfig.port = parseInt(process.env.PORT)
        if (process.env.SSL_KEY) {
            envConfig.ssl = { ...envConfig.ssl, key: process.env.SSL_KEY } as SSLConfig
        }
        if (process.env.SSL_CERT) {
            envConfig.ssl = { ...envConfig.ssl, cert: process.env.SSL_CERT } as SSLConfig
        }
        
        // Type-safe merge
        return { ...config, ...envConfig } as AirConfig
    }

    /**
     * Write configuration
     */
    write(config: AirConfig): boolean {
        const success = this.configManager.write(config)
        if (success) {
            this.config = config
            this.statusReporter.updateConfig(this.config)
        }
        return success
    }

    /**
     * Check PID file - delegated to ProcessManager
     */
    check(): boolean {
        return this.processManager.check()
    }

    /**
     * Clean PID file - delegated to ProcessManager
     */
    clean(): void {
        return this.processManager.clean()
    }

    /**
     * Find process using port - delegated to ProcessManager
     */
    find(port: number): { pid: string; name: string } | null {
        return this.processManager.find(port)
    }
    
    /**
     * Cleanup - backward compatibility alias for clean()
     */
    cleanup(): void {
        return this.clean()
    }
}

export default Peer