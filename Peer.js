import { merge } from "./libs/utils.js"
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

export class Peer {
    constructor(config = {}) {
        // argv[2] -> root
        // argv[3] -> bash
        // argv[4] -> env
        // argv[5] -> name
        // argv[6] -> domain
        // argv[7] -> port
        // argv[8] -> key
        // argv[9] -> cert
        // argv[10] -> pub
        // argv[11] -> priv

        this.config = config || {}
        this.maxRestarts = 5
        this.restarts = 0
        this.delay = 5000 // 5 seconds

        const cwd = fileURLToPath(path.dirname(import.meta.url))

        // Do NOT use process.argv for root/bash - they conflict with --env arguments
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

        // Parse --env argument properly instead of positional argv
        const envArg = process.argv.find(arg => arg.startsWith('--env='))
        const envValue = envArg ? envArg.split('=')[1] : null
        this.env = this.config.env = this.config.env || process.env.NODE_ENV || process.env.ENV || envValue || "development"

        this.config.name = process.env.NAME || this.config.name || (this.env === "development" ? "localhost" : null)

        this.config.sync = this.config.sync || null

        this.config[this.env] = this.config[this.env] || {}

        this.config[this.env].www = this.config[this.env]?.www || path.join(this.config.bash, "www")

        this.config[this.env].domain = process.env.DOMAIN || this.config[this.env]?.domain || (this.env === "development" ? "localhost" : null)

        this.config[this.env].port = process.env.PORT || this.config[this.env]?.port || 8765

        this.config[this.env].peers = this.config[this.env]?.peers || this.config.peers || []

        this.config[this.env].system = this.config[this.env]?.system || {}

        const key = process.env.SSL_KEY || this.config[this.env]?.ssl?.key || (this.config[this.env]?.domain && this.env === "production" ? `/etc/letsencrypt/live/${this.config[this.env]?.domain}/privkey.pem` : null)

        const cert = process.env.SSL_CERT || this.config[this.env]?.ssl?.cert || (this.config[this.env]?.domain && this.env === "production" ? `/etc/letsencrypt/live/${this.config[this.env]?.domain}/cert.pem` : null)

        // No authentication needed with @akaoio/gun

        this.options = {}

        if (key && cert) {
            this.options.key = fs.existsSync(key) ? fs.readFileSync(key) : null
            this.options.cert = fs.existsSync(cert) ? fs.readFileSync(cert) : null
        }

        // Don't auto-init in constructor - wait for start() call
        
        // Singleton pattern - prevent multiple instances
        this.setupSingleton()

        this.GUN = GUN
        // No SEA needed with @akaoio/gun
        this.gun = {}
        // No user object needed with @akaoio/gun
    }

    setupSingleton() {
        // Use XDG-compliant paths for lock files (like Access)
        const xdgRuntimeDir = process.env.XDG_RUNTIME_DIR || path.join(os.tmpdir(), `user-${process.getuid()}`)
        const xdgStateDir = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state')
        
        // Create directories if they don't exist
        try {
            if (!fs.existsSync(xdgRuntimeDir)) fs.mkdirSync(xdgRuntimeDir, { recursive: true, mode: 0o700 })
            if (!fs.existsSync(path.join(xdgStateDir, 'air'))) fs.mkdirSync(path.join(xdgStateDir, 'air'), { recursive: true })
        } catch (error) {
            console.warn('Warning: Could not create XDG directories:', error.message)
        }

        // System-wide lock file (same for all installations)
        this.systemLockFile = path.join(xdgRuntimeDir, 'air-system.lock')
        // Local lock file (per installation)
        this.lockFile = path.join(xdgRuntimeDir, 'air.lock')
        // PID file in XDG state directory (persistent)
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

    checkSingleton() {
        // System-wide Air instance detection - bulletproof singleton
        this.enforceSystemWideSingleton()
        
        // Check system-wide lock file first
        if (fs.existsSync(this.systemLockFile)) {
            try {
                const systemLockData = JSON.parse(fs.readFileSync(this.systemLockFile, 'utf8'))
                const pid = systemLockData.pid
                
                // Check if process is actually running
                try {
                    process.kill(pid, 0) // Signal 0 just checks if process exists
                    console.error(`Air is already running system-wide (PID: ${pid})`)
                    console.error(`Installation: ${systemLockData.location || 'Unknown'}`)
                    console.error(`Started: ${systemLockData.startTime || 'Unknown'}`)
                    console.error(`Port: ${systemLockData.port || 'Unknown'}`)
                    console.error('')
                    console.error('Only ONE Air instance is allowed across the entire system.')
                    console.error('To stop: pkill -f "node.*main.js" or ./air.sh stop')
                    process.exit(1)
                } catch (e) {
                    // Process doesn't exist, remove stale system lock
                    console.log('Removing stale system-wide lock file')
                    fs.unlinkSync(this.systemLockFile)
                }
            } catch (e) {
                // Invalid system lock file, remove it
                console.log('Removing invalid system lock file')
                fs.unlinkSync(this.systemLockFile)
            }
        }
        
        // Check local lock file
        if (fs.existsSync(this.lockFile)) {
            try {
                const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'))
                const pid = lockData.pid
                
                // Check if process is actually running
                try {
                    process.kill(pid, 0) // Signal 0 just checks if process exists
                    console.error(`Air is already running (PID: ${pid})`)
                    console.error(`Location: ${lockData.location || 'Unknown'}`)
                    console.error(`Started: ${lockData.startTime || 'Unknown'}`)
                    console.error('Use "air stop" to stop the running instance or ./air.sh stop')
                    process.exit(1)
                } catch (e) {
                    // Process doesn't exist, remove stale lock
                    console.log('Removing stale lock file from local directory')
                    fs.unlinkSync(this.lockFile)
                }
            } catch (e) {
                // Invalid lock file, remove it
                console.log('Removing invalid lock file')
                fs.unlinkSync(this.lockFile)
            }
        }
        
        // Create comprehensive lock data
        const lockData = {
            pid: process.pid,
            startTime: new Date().toISOString(),
            port: this.config[this.env].port,
            domain: this.config[this.env].domain,
            location: this.config.root,
            user: process.env.USER || process.env.USERNAME || 'unknown',
            nodeVersion: process.version,
            cwd: process.cwd()
        }
        
        // Create both system-wide and local lock files
        fs.writeFileSync(this.systemLockFile, JSON.stringify(lockData, null, 2))
        fs.writeFileSync(this.lockFile, JSON.stringify(lockData, null, 2))
        fs.writeFileSync(this.pidFile, process.pid.toString())
        
        console.log(`Air system-wide singleton lock created (PID: ${process.pid})`)
        console.log(`Installation: ${lockData.location}`)
        console.log(`Port: ${lockData.port}`)
        console.log('')
        console.log('Air is now the ONLY instance running system-wide.')
    }

    enforceSystemWideSingleton() {
        // System-wide singleton enforcement across all possible installations
        try {
            // Method 1: Check for any node process running Air main.js (synchronous)
            // Use more specific pattern to avoid matching bash shells
            const foundPids = execSync('pgrep -f "^node .*main\\.js" || true', { encoding: 'utf8' })
            
            if (foundPids.trim()) {
                const pids = foundPids.trim().split('\n').filter(pid => 
                    pid && parseInt(pid) !== process.pid // Don't count ourselves and filter empty
                )
                
                if (pids.length > 0) {
                    console.error(`Air is already running system-wide (PIDs: ${pids.join(', ')})`)
                    console.error('Multiple Air instances detected across the system.')
                    
                    // Show info about running processes
                    this.showRunningAirInfo(pids)
                    process.exit(1)
                }
            }
            
            // Method 2: Check by looking for Air-specific patterns in process list
            try {
                const psOutput = execSync('ps aux | grep -E "node .*main\\.js" | grep -v grep | grep -v "/bin/.*sh" || true', { encoding: 'utf8' })
                const airProcesses = psOutput.split('\n').filter(line => 
                    line && line.includes('node') && line.includes('main.js') && !line.includes(process.pid.toString()) && !line.includes('/bin/')
                )
                
                if (airProcesses.length > 0) {
                    console.error('Air processes detected:')
                    airProcesses.forEach(proc => console.error(`  ${proc}`))
                    console.error('')
                    console.error('Only one Air instance allowed system-wide.')
                    console.error('To stop all: pkill -f "node.*main.js" or use ./air.sh stop')
                    process.exit(1)
                }
            } catch (e) {
                // ps command failed, continue with other checks
            }
            
        } catch (error) {
            console.warn('Warning: Could not perform complete system-wide singleton check:', error.message)
            console.log('Proceeding with local singleton check only')
        }
    }

    showRunningAirInfo(pids) {
        try {
            if (Array.isArray(pids) && pids.length > 0) {
                const pidList = pids.join(',')
                const psOutput = execSync(`ps -p ${pidList} -o pid,ppid,time,cmd || true`, { encoding: 'utf8' })
                console.error('Running Air processes:')
                console.error(psOutput)
            }
        } catch (e) {
            // ps command failed
        }
        
        console.error('')
        console.error('To stop all Air instances: pkill -f "node.*main.js"') 
        console.error('Or use: ./air.sh stop (from any running installation)')
        console.error('Or use: systemctl --user stop air (if installed as service)')
    }

    checkAirPorts() {
        // Check if typical Air ports are in use
        const airPorts = [8765, 8766, 8767, 8768, 8769, 8770]
        const usedPorts = []
        
        airPorts.forEach(port => {
            try {
                const server = net.createServer()
                
                server.listen(port, () => {
                    server.close()
                })
                
                server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        usedPorts.push(port)
                    }
                })
            } catch (e) {
                // Port check failed, continue
            }
        })
        
        if (usedPorts.length > 0) {
            console.warn(`Warning: Air-like services detected on ports: ${usedPorts.join(', ')}`)
            console.warn('This may indicate running Air instances')
        }
    }

    cleanup() {
        // Remove all lock files on exit
        try {
            if (fs.existsSync(this.systemLockFile)) fs.unlinkSync(this.systemLockFile)
            if (fs.existsSync(this.lockFile)) fs.unlinkSync(this.lockFile)
            if (fs.existsSync(this.pidFile)) fs.unlinkSync(this.pidFile)
            console.log('Air singleton locks cleaned up')
        } catch (e) {
            // Ignore cleanup errors
        }
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

        this.server.on('error', (error) => {
            console.error('Server error:', error)
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${this.config[this.env].port} is already in use. Trying next port...`)
                this.config[this.env].port += 1
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
        this.checkSingleton()
        
        // Initialize server
        this.init()
        
        await this.syncConfig()
        await this.run()
        await this.online()
        // await this.activate()
        if (callback) await callback(this)
    }

    readConfig() {
        if (fs.existsSync(this.config.path)) {
            let config = fs.readFileSync(this.config.path, "utf8")
            config = JSON.parse(config)
            this.config = merge(this.config, config)
        }
        return this.config
    }

    writeConfig() {
        const content = JSON.stringify(this.config, null, 4)
        if (JSON.parse(content)) fs.writeFileSync(this.config.path, content)
        return this.config
    }

    syncConfig(callback = () => {}) {
        if (!this.config?.sync) return
        return new Promise((resolve, reject) => {
            fetch(this.config.sync)
                .then(response => response.json())
                .then(data => {
                    data = data || {}
                    data.system = data.system || {}

                    this.config[this.env].system = data.system.pub && data.system.epub && data.system.cert ? data.system : {}

                    // read config file content to this.config
                    this.readConfig()

                    // write config file content from this.config
                    this.writeConfig()
                    resolve()
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
            this.gun = GUN({
                web: this.server,
                peers: this.config[this.env].peers
            })
            // No user authentication needed with @akaoio/gun
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
            // Direct put without authentication - @akaoio/gun allows this
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
                (response = {}) => {
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

                    // update Godaddy DNS
                    await this.updateDDNS()

                    // update IP
                    await this.updateIP()

                    // update last online timestamp
                    await this.alive()
                    return this
                },
                e => console.error(e)
            )
            .catch(e => {
                console.error('Error in online:', e)
            })
    }

    activate(callback = () => {}) {
        return new Promise((resolve, reject) => {
            // No certification needed with @akaoio/gun
            console.log('Node activated without authentication')
            resolve(true)
        }).then(
            response => {
                if (callback) callback(response)
                return this
            },
            e => console.error(e)
        )
    }

    updateDDNS(callback = () => {}) {
        return new Promise((resolve, reject) => {
            // Direct DDNS update without authentication
            const config = path.join(this.config.root, "ddns.json")
            
            if (!fs.existsSync(config)) {
                return resolve()
            }
            
            try {
                const content = fs.readFileSync(config, 'utf8')
                const ddns = JSON.parse(content)

                if (ddns && typeof ddns === "object" && Object.keys(ddns).length > 0) {
                    // Direct put without authentication - @akaoio/gun allows this
                    this.gun.get('air').get('ddns').put(ddns, (response = {}) => {
                        if (response.err) reject(response.err)
                        else resolve(response)
                    })
                } else {
                    resolve()
                }
            } catch (error) {
                console.error('DDNS config error:', error)
                resolve()
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
            // Direct IP update without authentication
            fetch("https://api.ipify.org?format=json")
                .then(response => response.json())
                .then(data => {
                    if (data?.ip) {
                        // Direct put without authentication - @akaoio/gun allows this
                        this.gun.get('air').get('nodes').get(this.config.name || 'localhost').put(
                            {
                                newIP: data?.ip,
                                timestamp: GUN.state()
                            },
                            (response = {}) => {
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
            // Direct alive update without authentication
            this.gun.get('air').get('nodes').get(this.config.name || 'localhost').put(
                {
                    alive: GUN.state()
                },
                (response = {}) => {
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
}

export default Peer
