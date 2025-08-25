#!/usr/bin/env node

import os from "os"
import path from "path"
import fs from "fs"
import { execSync } from "child_process"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Centralized system paths management
 * NO HARDCODED PATHS - Everything is detected intelligently
 * Respects air.json configuration when available
 */

class SystemPaths {
    constructor() {
        this.platform = os.platform()
        this.homedir = os.homedir()
        this.tmpdir = os.tmpdir()
        this.cache = {}
        this.airConfig = null
        this.loadAirConfig()
    }

    /**
     * Load air.json configuration if available
     * This allows air.json to override system detection
     */
    loadAirConfig() {
        try {
            // Try multiple locations for air.json
            const locations = [
                path.join(process.cwd(), "air.json"),
                path.join(path.dirname(path.dirname(__dirname)), "air.json"), // Parent of src/
                process.env.AIR_CONFIG // Environment variable
            ].filter(Boolean)

            for (const loc of locations) {
                if (fs.existsSync(loc)) {
                    this.airConfig = JSON.parse(fs.readFileSync(loc, "utf8"))
                    break
                }
            }
        } catch {
            // air.json not found or invalid - use auto-detection
        }
    }

    /**
     * Get root directory from air.json or auto-detect
     */
    root() {
        if (this.airConfig?.root) {
            return path.resolve(this.airConfig.root)
        }
        return process.cwd()
    }

    /**
     * Get bash/scripts directory from air.json or auto-detect
     */
    bash() {
        if (this.airConfig?.bash) {
            return path.resolve(this.airConfig.bash)
        }
        // Default to script directory
        return path.join(this.root(), "script")
    }

    /**
     * Get temporary directory (cross-platform)
     */
    tmp(filename = null) {
        const base = this.tmpdir || "/tmp"
        return filename ? path.join(base, filename) : base
    }

    /**
     * Get systemd service directory
     * Intelligently detects the correct location
     */
    systemd() {
        if (this.cache.systemd) return this.cache.systemd

        if (this.platform !== "linux") return null

        // Check standard locations in order of preference
        const locations = [
            "/etc/systemd/system", // User services (standard)
            "/usr/lib/systemd/system", // System services
            "/lib/systemd/system", // Older systems
            path.join(this.homedir, ".config/systemd/user") // User services (non-root)
        ]

        for (const loc of locations) {
            if (fs.existsSync(loc)) {
                // Check if we can write to it
                try {
                    fs.accessSync(loc, fs.constants.W_OK)
                    this.cache.systemd = loc
                    return loc
                } catch {
                    // Try with sudo
                    try {
                        execSync(`sudo test -w ${loc}`, { stdio: "ignore" })
                        this.cache.systemd = loc
                        return loc
                    } catch {
                        continue
                    }
                }
            }
        }

        // Fallback to user systemd if no system access
        const userSystemd = path.join(this.homedir, ".config/systemd/user")
        if (!fs.existsSync(userSystemd)) {
            fs.mkdirSync(userSystemd, { recursive: true })
        }
        this.cache.systemd = userSystemd
        return userSystemd
    }

    /**
     * Get systemd service file path
     */
    service(name) {
        const dir = this.systemd()
        if (!dir) return null

        // Use .service extension
        const filename = name.endsWith(".service") ? name : `${name}.service`
        return path.join(dir, filename)
    }

    /**
     * Check if using user-level systemd
     */
    isuserservice() {
        const dir = this.systemd()
        return dir && dir.includes(".config/systemd/user")
    }

    /**
     * Get Let's Encrypt directory
     * Intelligently detects the correct location
     */
    letsencrypt() {
        if (this.cache.letsencrypt) return this.cache.letsencrypt

        // Check standard locations
        const locations = [
            "/etc/letsencrypt", // Standard
            "/opt/letsencrypt", // Alternative
            path.join(this.homedir, ".letsencrypt"), // User directory
            "/usr/local/etc/letsencrypt" // BSD/MacOS
        ]

        for (const loc of locations) {
            if (fs.existsSync(loc)) {
                this.cache.letsencrypt = loc
                return loc
            }
        }

        // Check if certbot is installed and get its config dir
        try {
            const output = execSync("certbot certificates 2>&1", { encoding: "utf8" })
            const match = output.match(/Certificate Path: (\/[^\s]+)/)
            if (match) {
                const certPath = match[1]
                const leDir = certPath.split("/live/")[0]
                if (fs.existsSync(leDir)) {
                    this.cache.letsencrypt = leDir
                    return leDir
                }
            }
        } catch {
            // Certbot not installed or no certificates
        }

        return null
    }

    /**
     * Get SSL certificate paths for a domain
     * Respects air.json SSL configuration first
     */
    ssl(domain) {
        // Check air.json for SSL config first
        const env = this.airConfig?.env || "development"
        if (this.airConfig?.[env]?.ssl) {
            const sslConfig = this.airConfig[env].ssl
            const root = this.airConfig?.root || process.cwd()

            // Handle relative or absolute paths
            const resolvePath = p => {
                if (!p) return null
                return path.isAbsolute(p) ? p : path.join(root, p)
            }

            return {
                key: resolvePath(sslConfig.key),
                cert: resolvePath(sslConfig.cert),
                chain: resolvePath(sslConfig.chain),
                fullchain: resolvePath(sslConfig.fullchain || sslConfig.cert)
            }
        }

        // Fallback to Let's Encrypt detection
        const leDir = this.letsencrypt()
        if (!leDir) return null

        const livePath = path.join(leDir, "live", domain)
        if (!fs.existsSync(livePath)) return null

        return {
            key: path.join(livePath, "privkey.pem"),
            cert: path.join(livePath, "cert.pem"),
            chain: path.join(livePath, "chain.pem"),
            fullchain: path.join(livePath, "fullchain.pem")
        }
    }

    /**
     * Get Let's Encrypt renewal hooks directory
     */
    renewalhooks(type = "deploy") {
        const leDir = this.letsencrypt()
        if (!leDir) return null

        return path.join(leDir, "renewal-hooks", type)
    }

    /**
     * Get log directory
     * Respects air.json configuration or intelligently determines the best location
     */
    logs(appname = "air") {
        if (this.cache.logs) return this.cache.logs

        // Check if logs path is configured in air.json
        const env = this.airConfig?.env || "development"
        if (this.airConfig?.[env]?.logs) {
            const configuredLogs = path.resolve(this.airConfig[env].logs)
            if (!fs.existsSync(configuredLogs)) {
                fs.mkdirSync(configuredLogs, { recursive: true })
            }
            this.cache.logs = configuredLogs
            return configuredLogs
        }

        // Default to logs directory in root from air.json
        if (this.airConfig?.root) {
            const rootLogs = path.join(this.airConfig.root, "logs")
            if (!fs.existsSync(rootLogs)) {
                fs.mkdirSync(rootLogs, { recursive: true })
            }
            this.cache.logs = rootLogs
            return rootLogs
        }

        // Check standard locations
        const locations = [
            `/var/log/${appname}`, // System logs
            path.join(this.homedir, `.${appname}/logs`), // User logs
            path.join(this.homedir, ".local/share", appname, "logs"), // XDG standard
            path.join(process.cwd(), "logs") // Local logs
        ]

        for (const loc of locations) {
            try {
                if (!fs.existsSync(loc)) {
                    fs.mkdirSync(loc, { recursive: true })
                }
                // Check if we can write
                fs.accessSync(loc, fs.constants.W_OK)
                this.cache.logs = loc
                return loc
            } catch {
                continue
            }
        }

        // Fallback to local logs
        const localLogs = path.join(process.cwd(), "logs")
        if (!fs.existsSync(localLogs)) {
            fs.mkdirSync(localLogs, { recursive: true })
        }
        this.cache.logs = localLogs
        return localLogs
    }

    /**
     * Get log file path
     */
    logfile(name, appname = "air") {
        const dir = this.logs(appname)
        return path.join(dir, name)
    }

    /**
     * Get journalctl command for a service
     */
    journalctl(service, options = {}) {
        const defaults = {
            lines: 50,
            follow: false,
            nopager: true
        }
        const opts = { ...defaults, ...options }

        let cmd = "journalctl"

        // Add user flag if using user services
        if (this.isuserservice()) {
            cmd += " --user"
        }

        cmd += ` -u ${service}`

        if (opts.lines) cmd += ` -n ${opts.lines}`
        if (opts.follow) cmd += " -f"
        if (opts.nopager) cmd += " --no-pager"

        return cmd
    }

    /**
     * Get node executable path
     * Never hardcode /usr/bin/node
     */
    node() {
        if (this.cache.node) return this.cache.node

        // Use current process executable
        this.cache.node = process.execPath
        return this.cache.node
    }

    /**
     * Get cron temp file path
     */
    crontmp(suffix = "") {
        return this.tmp(`air-cron${suffix}-${Date.now()}.txt`)
    }

    /**
     * Get PID file path
     */
    pidfile(name = "air") {
        // First check if we can write to /var/run
        const runDir = "/var/run"
        if (this.platform === "linux" && fs.existsSync(runDir)) {
            try {
                fs.accessSync(runDir, fs.constants.W_OK)
                return path.join(runDir, `${name}.pid`)
            } catch {
                // No write access to /var/run
            }
        }

        // Fallback to local directory
        return path.join(process.cwd(), `.${name}.pid`)
    }

    /**
     * Get config directory
     * Following XDG Base Directory specification
     */
    config(appname = "air") {
        if (this.cache.config) return this.cache.config

        // Check XDG_CONFIG_HOME first
        const xdgConfig = process.env.XDG_CONFIG_HOME
        if (xdgConfig) {
            const configDir = path.join(xdgConfig, appname)
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true })
            }
            this.cache.config = configDir
            return configDir
        }

        // Check standard locations
        const locations = [
            path.join(this.homedir, ".config", appname), // XDG default
            path.join(this.homedir, `.${appname}`), // Hidden directory
            `/etc/${appname}`, // System config
            process.cwd() // Current directory
        ]

        for (const loc of locations) {
            try {
                if (!fs.existsSync(loc)) {
                    fs.mkdirSync(loc, { recursive: true })
                }
                fs.accessSync(loc, fs.constants.W_OK)
                this.cache.config = loc
                return loc
            } catch {
                continue
            }
        }

        // Fallback to current directory
        this.cache.config = process.cwd()
        return process.cwd()
    }

    /**
     * Get data directory
     * Following XDG Base Directory specification
     */
    data(appname = "air") {
        if (this.cache.data) return this.cache.data

        // Check XDG_DATA_HOME first
        const xdgData = process.env.XDG_DATA_HOME
        if (xdgData) {
            const dataDir = path.join(xdgData, appname)
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true })
            }
            this.cache.data = dataDir
            return dataDir
        }

        // Default XDG location
        const defaultData = path.join(this.homedir, ".local/share", appname)
        if (!fs.existsSync(defaultData)) {
            fs.mkdirSync(defaultData, { recursive: true })
        }
        this.cache.data = defaultData
        return defaultData
    }

    /**
     * Get cache directory
     * Following XDG Base Directory specification
     */
    cachedir(appname = "air") {
        if (this.cache.cachedir) return this.cache.cachedir

        // Check XDG_CACHE_HOME first
        const xdgCache = process.env.XDG_CACHE_HOME
        if (xdgCache) {
            const cacheDir = path.join(xdgCache, appname)
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true })
            }
            this.cache.cachedir = cacheDir
            return cacheDir
        }

        // Default XDG location
        const defaultCache = path.join(this.homedir, ".cache", appname)
        if (!fs.existsSync(defaultCache)) {
            fs.mkdirSync(defaultCache, { recursive: true })
        }
        this.cache.cachedir = defaultCache
        return defaultCache
    }

    /**
     * Detect which init system is being used
     */
    initsystem() {
        if (this.cache.initsystem) return this.cache.initsystem

        if (this.platform !== "linux") {
            this.cache.initsystem = "none"
            return "none"
        }

        // Check for systemd
        try {
            execSync("systemctl --version", { stdio: "ignore" })
            this.cache.initsystem = "systemd"
            return "systemd"
        } catch {}

        // Check for upstart
        try {
            execSync("initctl --version", { stdio: "ignore" })
            this.cache.initsystem = "upstart"
            return "upstart"
        } catch {}

        // Check for openrc
        if (fs.existsSync("/sbin/openrc")) {
            this.cache.initsystem = "openrc"
            return "openrc"
        }

        // Check for sysvinit
        if (fs.existsSync("/etc/init.d")) {
            this.cache.initsystem = "sysvinit"
            return "sysvinit"
        }

        this.cache.initsystem = "unknown"
        return "unknown"
    }

    /**
     * Get all system paths info
     */
    info() {
        return {
            platform: this.platform,
            homedir: this.homedir,
            tmpdir: this.tmpdir,
            initsystem: this.initsystem(),
            systemd: this.systemd(),
            isuserservice: this.isuserservice(),
            letsencrypt: this.letsencrypt(),
            logs: this.logs(),
            config: this.config(),
            data: this.data(),
            cache: this.cachedir(),
            node: this.node()
        }
    }

    /**
     * Clear cache (for testing)
     */
    clearcache() {
        this.cache = {}
    }

    /**
     * Update configuration from air.json
     * This allows dynamic updates when air.json changes
     */
    updateConfig(config) {
        if (config && typeof config === "object") {
            this.airConfig = config
            this.clearcache() // Clear cache to use new config
        }
    }

    /**
     * Get service name from air.json or default
     */
    serviceName(defaultName = "air") {
        return this.airConfig?.name || defaultName
    }

    /**
     * Check if running as a module
     * Air can run standalone or as an npm module
     */
    isModule() {
        // Check if we're in node_modules
        const scriptPath = __dirname
        return scriptPath.includes("node_modules")
    }

    /**
     * Get configuration priority
     * Returns where configuration should be read from
     */
    configPriority() {
        return {
            isModule: this.isModule(),
            hasAirJson: !!this.airConfig,
            configSource: this.airConfig ? "air.json" : "auto-detection",
            root: this.root(),
            bash: this.bash()
        }
    }
}

// Export as singleton but allow config updates
const syspaths = new SystemPaths()
export default syspaths
