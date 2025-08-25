/**
 * Linux Systemd Platform Strategy
 * Handles Linux systems with systemd service manager
 */

import { execSync, spawn } from "child_process"
import * as fs from "fs"
import * as path from "path"
import type { AirConfig } from "../../types/index.js"
import type { PlatformStrategy, ServiceResult, StartResult, SSLResult, PlatformCapabilities, PlatformPaths, ProcessInfo } from "../types.js"

export class LinuxSystemdStrategy implements PlatformStrategy {
    private capabilities: PlatformCapabilities

    constructor() {
        this.capabilities = this.detectCapabilities()
    }

    private detectCapabilities(): PlatformCapabilities {
        return {
            platform: "linux",
            hasSystemd: this.checkSystemd(),
            hasLaunchd: false,
            hasWindowsService: false,
            hasPM2: this.checkCommand("pm2"),
            hasDocker: this.checkCommand("docker"),
            hasBun: typeof Bun !== "undefined",
            hasNode: this.checkCommand("node"),
            hasDeno: false, // typeof Deno !== 'undefined',
            isRoot: process.getuid ? process.getuid() === 0 : false,
            canSudo: this.checkCommand("sudo")
        }
    }

    private checkSystemd(): boolean {
        try {
            execSync("which systemctl", { stdio: "ignore" })
            return true
        } catch {
            return false
        }
    }

    private checkCommand(command: string): boolean {
        try {
            execSync(`which ${command}`, { stdio: "ignore" })
            return true
        } catch {
            return false
        }
    }

    async createService(config: AirConfig): Promise<ServiceResult> {
        if (!this.capabilities.hasSystemd) {
            return {
                success: false,
                error: "Systemd is not available on this system"
            }
        }

        // Determine if we should use user-level or system-level systemd
        // Use user-level if: not root AND (no sudo OR prefer user-level)
        const preferUserLevel = process.env.AIR_USER_SERVICE === "true" || process.env.NO_SUDO === "true"
        const useUserSystemd = !this.capabilities.isRoot && (!this.capabilities.canSudo || preferUserLevel)

        try {
            const serviceName = `air-${config.name}.service`
            let servicePath: string
            let systemctlCommand: string

            if (useUserSystemd) {
                // User-level systemd (no sudo required!)
                const userServiceDir = path.join(process.env.HOME || "~", ".config/systemd/user")

                // Create user service directory if it doesn't exist
                fs.mkdirSync(userServiceDir, { recursive: true })

                servicePath = path.join(userServiceDir, serviceName)
                systemctlCommand = "systemctl --user"

                console.log("📝 Creating user-level systemd service (no sudo required)")
            } else {
                // System-level systemd (requires sudo)
                servicePath = `/etc/systemd/system/${serviceName}`
                systemctlCommand = this.capabilities.isRoot ? "systemctl" : "sudo systemctl"

                console.log("📝 Creating system-level systemd service")
            }

            // Check if service already exists
            if (fs.existsSync(servicePath)) {
                return {
                    success: true,
                    type: useUserSystemd ? "systemd-user" : "systemd",
                    message: "Service already exists"
                }
            }

            // Generate systemd unit file
            const serviceContent = this.generateSystemdUnit(config, useUserSystemd)

            // Write service file
            if (useUserSystemd) {
                // User service - direct write, no sudo needed
                fs.writeFileSync(servicePath, serviceContent)
            } else {
                // System service - needs sudo
                const writeCommand = this.capabilities.isRoot ? `echo '${serviceContent}' > ${servicePath}` : `echo '${serviceContent}' | sudo tee ${servicePath}`

                execSync(writeCommand, { shell: "/bin/bash" })
            }

            // Reload systemd and enable service
            execSync(`${systemctlCommand} daemon-reload`)
            execSync(`${systemctlCommand} enable ${serviceName}`)

            const serviceType = useUserSystemd ? "user-level systemd" : "system-level systemd"
            console.log(`✅ Service created successfully using ${serviceType}`)

            if (useUserSystemd) {
                console.log(`💡 Start with: systemctl --user start ${serviceName}`)
                console.log(`💡 Check status: systemctl --user status ${serviceName}`)
                console.log(`💡 View logs: journalctl --user -u ${serviceName}`)
            }

            return {
                success: true,
                type: useUserSystemd ? "systemd-user" : "systemd",
                message: `Service ${serviceName} created and enabled (${serviceType})`
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            }
        }
    }

    private generateSystemdUnit(config: AirConfig, useUserSystemd: boolean = false): string {
        const runtime = this.capabilities.hasBun ? "bun" : "node"
        const execPath = path.join(config.root, "src/main.ts")

        // Get the full path to runtime for user services
        let runtimePath = runtime
        if (useUserSystemd) {
            try {
                runtimePath = execSync(`which ${runtime}`, { encoding: "utf8" }).trim()
            } catch {
                // Fallback to common paths
                if (runtime === "bun") {
                    runtimePath = path.join(process.env.HOME || "~", ".bun/bin/bun")
                }
            }
        }

        const unitContent = `[Unit]
Description=Air P2P Database - ${config.name}
After=network.target

[Service]
Type=simple${
            useUserSystemd
                ? ""
                : `
User=${process.env.USER || "air"}`
        }
WorkingDirectory=${config.root}
ExecStart=${runtimePath} ${execPath}
Restart=always
RestartSec=5
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=${useUserSystemd ? "default.target" : "multi-user.target"}`

        return unitContent
    }

    async startService(name: string): Promise<StartResult> {
        if (!this.capabilities.hasSystemd) {
            // Fallback to direct spawn
            return this.startDirect(name)
        }

        const serviceName = `air-${name}.service`

        // Try user-level systemd first if not root
        if (!this.capabilities.isRoot) {
            try {
                // Check if user service exists
                const userServicePath = path.join(process.env.HOME || "~", ".config/systemd/user", serviceName)

                if (fs.existsSync(userServicePath)) {
                    // Start user service
                    execSync(`systemctl --user start ${serviceName}`, { stdio: "ignore" })

                    // Get PID
                    const pidOutput = execSync(`systemctl --user show --property MainPID ${serviceName}`, { encoding: "utf8" })
                    const pid = parseInt(pidOutput.split("=")[1]?.trim() || "0")

                    return {
                        started: true,
                        pid: pid > 0 ? pid : undefined,
                        method: "systemd-user"
                    }
                }
            } catch {
                // Fall through to system service attempt
            }
        }

        // Try system-level systemd
        try {
            const systemctlPrefix = this.capabilities.isRoot ? "" : "sudo "

            // Start service
            execSync(`${systemctlPrefix}systemctl start ${serviceName}`, { stdio: "ignore" })

            // Get PID
            const pidOutput = execSync(`${systemctlPrefix}systemctl show --property MainPID ${serviceName}`, { encoding: "utf8" })
            const pid = parseInt(pidOutput.split("=")[1]?.trim() || "0")

            return {
                started: true,
                pid: pid > 0 ? pid : undefined,
                method: "systemd"
            }
        } catch (error) {
            // Fallback to direct start
            return this.startDirect(name)
        }
    }

    private async startDirect(_name: string): Promise<StartResult> {
        try {
            const runtime = this.capabilities.hasBun ? "bun" : "node"
            const { getConfigPath } = await import("../../paths.js")
            const configPath = getConfigPath()

            // Read config to get root path
            const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
            const execPath = path.join(config.root || process.cwd(), "src/main.ts")

            const child = spawn(runtime, [execPath], {
                cwd: config.root || process.cwd(),
                detached: true,
                stdio: "ignore"
            })

            child.unref()

            return {
                started: true,
                pid: child.pid,
                method: "spawn"
            }
        } catch (error) {
            return {
                started: false,
                error: error instanceof Error ? error.message : "Failed to start"
            }
        }
    }

    async stopService(name: string): Promise<boolean> {
        const serviceName = `air-${name}.service`

        // Try user-level systemd first
        if (!this.capabilities.isRoot) {
            try {
                const userServicePath = path.join(process.env.HOME || "~", ".config/systemd/user", serviceName)

                if (fs.existsSync(userServicePath)) {
                    execSync(`systemctl --user stop ${serviceName}`, { stdio: "ignore" })
                    return true
                }
            } catch {
                // Fall through to system service
            }
        }

        // Try system-level systemd
        try {
            const systemctlPrefix = this.capabilities.isRoot ? "" : "sudo "
            execSync(`${systemctlPrefix}systemctl stop ${serviceName}`, { stdio: "ignore" })
            return true
        } catch {
            return false
        }
    }

    async removeService(name: string): Promise<boolean> {
        const serviceName = `air-${name}.service`

        // Try user-level systemd first
        if (!this.capabilities.isRoot) {
            try {
                const userServicePath = path.join(process.env.HOME || "~", ".config/systemd/user", serviceName)

                if (fs.existsSync(userServicePath)) {
                    // Stop and disable user service
                    execSync(`systemctl --user stop ${serviceName}`, { stdio: "ignore" })
                    execSync(`systemctl --user disable ${serviceName}`, { stdio: "ignore" })

                    // Remove user service file
                    fs.unlinkSync(userServicePath)

                    // Reload user systemd
                    execSync(`systemctl --user daemon-reload`)

                    return true
                }
            } catch {
                // Fall through to system service
            }
        }

        // Try system-level systemd
        try {
            const servicePath = `/etc/systemd/system/${serviceName}`
            const systemctlPrefix = this.capabilities.isRoot ? "" : "sudo "

            // Stop and disable service
            execSync(`${systemctlPrefix}systemctl stop ${serviceName}`, { stdio: "ignore" })
            execSync(`${systemctlPrefix}systemctl disable ${serviceName}`, { stdio: "ignore" })

            // Remove service file
            if (this.capabilities.isRoot) {
                fs.unlinkSync(servicePath)
            } else {
                execSync(`sudo rm ${servicePath}`)
            }

            // Reload systemd
            execSync(`${systemctlPrefix}systemctl daemon-reload`)

            return true
        } catch {
            return false
        }
    }

    async getServiceStatus(name: string): Promise<"running" | "stopped" | "unknown"> {
        const serviceName = `air-${name}.service`

        // Try user-level systemd first
        if (!this.capabilities.isRoot) {
            try {
                const userServicePath = path.join(process.env.HOME || "~", ".config/systemd/user", serviceName)

                if (fs.existsSync(userServicePath)) {
                    const output = execSync(`systemctl --user is-active ${serviceName}`, { encoding: "utf8" })

                    if (output.trim() === "active") return "running"
                    if (output.trim() === "inactive") return "stopped"
                    return "unknown"
                }
            } catch {
                // Fall through to system service
            }
        }

        // Try system-level systemd
        try {
            const output = execSync(`systemctl is-active ${serviceName}`, { encoding: "utf8" })

            if (output.trim() === "active") return "running"
            if (output.trim() === "inactive") return "stopped"
            return "unknown"
        } catch {
            return "unknown"
        }
    }

    async setupSSL(config: AirConfig): Promise<SSLResult> {
        const keyPath = path.join(config.root, "ssl", "key.pem")
        const certPath = path.join(config.root, "ssl", "cert.pem")

        // Check if certificates already exist
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            return {
                success: true,
                keyPath,
                certPath
            }
        }

        try {
            // Create SSL directory
            const sslDir = path.dirname(keyPath)
            fs.mkdirSync(sslDir, { recursive: true })

            // Generate self-signed certificate using openssl
            const command = `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=${config.domain || "localhost"}"`

            execSync(command, { stdio: "ignore" })

            // Set permissions
            fs.chmodSync(keyPath, 0o600)
            fs.chmodSync(certPath, 0o644)

            return {
                success: true,
                keyPath,
                certPath
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to generate SSL certificates"
            }
        }
    }

    getPaths(): PlatformPaths {
        return {
            serviceDir: "/etc/systemd/system",
            configDir: "/etc/air",
            logDir: "/var/log/air",
            dataDir: "/var/lib/air",
            tempDir: "/tmp/air"
        }
    }

    getCapabilities(): PlatformCapabilities {
        return this.capabilities
    }

    getName(): string {
        return "Linux with Systemd"
    }

    // Service restart
    async restartService(name: string): Promise<boolean> {
        try {
            // Try user service first
            try {
                execSync(`systemctl --user restart ${name}`, { stdio: "ignore" })
                return true
            } catch {
                // Try system service
                execSync(`sudo systemctl restart ${name}`, { stdio: "ignore" })
                return true
            }
        } catch (error) {
            console.error(`Failed to restart service ${name}:`, error)
            return false
        }
    }

    // Process management (synchronous)
    findProcessByPort(port: number): ProcessInfo | null {
        try {
            const output = execSync(`lsof -ti:${port} || netstat -tlnp 2>/dev/null | grep :${port} | awk '{print $7}' | cut -d'/' -f1`, { encoding: "utf8" })
            const pid = output.trim().split("\n")[0]
            if (pid) {
                const name = execSync(`ps -p ${pid} -o comm=`, { encoding: "utf8" }).trim()
                return { pid, name, port }
            }
        } catch {
            // Process not found
        }
        return null
    }

    findProcessByName(name: string): ProcessInfo | null {
        try {
            const output = execSync(`pgrep -f "${name}" | head -1`, { encoding: "utf8" })
            const pid = output.trim()
            if (pid) {
                return { pid, name }
            }
        } catch {
            // Process not found
        }
        return null
    }

    killProcess(pid: string | number): boolean {
        try {
            execSync(`kill -TERM ${pid}`, { stdio: "ignore" })
            return true
        } catch {
            try {
                execSync(`kill -9 ${pid}`, { stdio: "ignore" })
                return true
            } catch {
                return false
            }
        }
    }

    killProcessByPort(port: number): boolean {
        const process = this.findProcessByPort(port)
        if (process) {
            return this.killProcess(process.pid)
        }
        return false
    }

    killProcessByName(name: string): boolean {
        try {
            execSync(`pkill -f "${name}"`, { stdio: "ignore" })
            return true
        } catch {
            return false
        }
    }
}

export default LinuxSystemdStrategy
