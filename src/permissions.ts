#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import os from "os"
import syspaths from "./syspaths.js"

/**
 * Smart permission handling for Air
 * Handles file/directory permissions intelligently
 */

class Permissions {
    constructor() {
        this.isRoot = process.getuid && process.getuid() === 0
        this.user = os.userInfo().username
        this.platform = os.platform()
    }

    /**
     * Check if we have write permission to a path
     */
    canwrite(filepath) {
        try {
            fs.accessSync(filepath, fs.constants.W_OK)
            return true
        } catch {
            return false
        }
    }

    /**
     * Check if we have read permission to a path
     */
    canread(filepath) {
        try {
            fs.accessSync(filepath, fs.constants.R_OK)
            return true
        } catch {
            return false
        }
    }

    /**
     * Check if we can execute a file
     */
    canexecute(filepath) {
        try {
            fs.accessSync(filepath, fs.constants.X_OK)
            return true
        } catch {
            return false
        }
    }

    /**
     * Create directory with proper permissions
     */
    mkdir(dirpath, options = {}) {
        const defaults = {
            recursive: true,
            mode: 0o755
        }
        const opts = { ...defaults, ...options }

        try {
            if (!fs.existsSync(dirpath)) {
                fs.mkdirSync(dirpath, opts)
                return { success: true, path: dirpath }
            }
            return { success: true, path: dirpath, existed: true }
        } catch (error) {
            // Try with sudo if needed and we're not root
            if (error.code === "EACCES" && !this.isRoot) {
                return this.sudoMkdir(dirpath, opts)
            }
            return { success: false, error: error.message }
        }
    }

    /**
     * Create directory with sudo
     */
    sudoMkdir(dirpath, options) {
        try {
            const mode = options.mode.toString(8)
            execSync(`sudo mkdir -p -m ${mode} "${dirpath}"`)

            // Change ownership to current user if not root
            if (!this.isRoot) {
                execSync(`sudo chown ${this.user}:${this.user} "${dirpath}"`)
            }

            return { success: true, path: dirpath, sudo: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    /**
     * Write file with proper permissions
     */
    writefile(filepath, content, options = {}) {
        const defaults = {
            mode: 0o644,
            encoding: "utf8"
        }
        const opts = { ...defaults, ...options }

        try {
            // Ensure directory exists
            const dir = path.dirname(filepath)
            this.mkdir(dir)

            // Write file
            fs.writeFileSync(filepath, content, opts)
            return { success: true, path: filepath }
        } catch (error) {
            // Try with sudo if needed
            if (error.code === "EACCES" && !this.isRoot) {
                return this.sudoWriteFile(filepath, content, opts)
            }
            return { success: false, error: error.message }
        }
    }

    /**
     * Write file with sudo
     */
    sudoWriteFile(filepath, content, options) {
        try {
            // Write to temp file first
            const tempFile = syspaths.tmp(`air-temp-${Date.now()}`)
            fs.writeFileSync(tempFile, content, options)

            // Copy with sudo
            execSync(`sudo cp "${tempFile}" "${filepath}"`)

            // Set permissions
            const mode = options.mode.toString(8)
            execSync(`sudo chmod ${mode} "${filepath}"`)

            // Change ownership if not root
            if (!this.isRoot) {
                execSync(`sudo chown ${this.user}:${this.user} "${filepath}"`)
            }

            // Clean up temp file
            fs.unlinkSync(tempFile)

            return { success: true, path: filepath, sudo: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    /**
     * Check system service permissions
     */
    canmanageservice() {
        if (this.platform !== "linux") return false

        try {
            // Check if systemctl exists
            execSync("which systemctl", { stdio: "ignore" })

            // Check if we can access systemd directory
            if (this.isRoot) return true

            // Check if we have sudo privileges
            try {
                execSync("sudo -n true", { stdio: "ignore" })
                return true
            } catch {
                return false
            }
        } catch {
            return false
        }
    }

    /**
     * Check if we can modify crontab
     */
    canmanagecron() {
        try {
            execSync("crontab -l", { stdio: "ignore" })
            return true
        } catch {
            // No crontab or no permission
            return this.isRoot
        }
    }

    /**
     * Get recommended permissions for Air directories
     */
    getrecommended(type) {
        const recommendations = {
            config: { mode: 0o600, owner: this.user }, // Private config
            logs: { mode: 0o755, owner: this.user }, // Readable logs
            data: { mode: 0o700, owner: this.user }, // Private data
            scripts: { mode: 0o755, owner: this.user }, // Executable scripts
            ssl: { mode: 0o600, owner: this.user } // Private SSL keys
        }

        return recommendations[type] || { mode: 0o755, owner: this.user }
    }

    /**
     * Fix permissions for Air installation
     */
    async fix(rootPath) {
        const results = []

        // Fix config file permissions
        const configPath = path.join(rootPath, "air.json")
        if (fs.existsSync(configPath)) {
            try {
                fs.chmodSync(configPath, 0o600)
                results.push({ path: configPath, fixed: true })
            } catch (error) {
                results.push({ path: configPath, fixed: false, error: error.message })
            }
        }

        // Fix logs directory
        const logsPath = path.join(rootPath, "logs")
        const logsResult = this.mkdir(logsPath, { mode: 0o755 })
        results.push({ path: logsPath, ...logsResult })

        // Fix data directory
        const dataPath = path.join(rootPath, "radata")
        if (fs.existsSync(dataPath)) {
            try {
                fs.chmodSync(dataPath, 0o700)
                results.push({ path: dataPath, fixed: true })
            } catch (error) {
                results.push({ path: dataPath, fixed: false, error: error.message })
            }
        }

        return results
    }

    /**
     * Check all permissions for Air
     */
    check(rootPath) {
        const checks = {
            root: this.canwrite(rootPath),
            config: this.canwrite(path.join(rootPath, "air.json")),
            logs: this.canwrite(path.join(rootPath, "logs")),
            data: this.canwrite(path.join(rootPath, "radata")),
            service: this.canmanageservice(),
            cron: this.canmanagecron(),
            isRoot: this.isRoot,
            user: this.user
        }

        checks.canInstall = checks.root && (checks.service || !this.platform === "linux")
        checks.needsSudo = !checks.root && this.platform === "linux"

        return checks
    }
}

const permissions = new Permissions()
export default permissions
