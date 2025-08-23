/**
 * Linux Systemd Platform Strategy
 * Handles Linux systems with systemd service manager
 */

import { execSync, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type { AirConfig } from '../../types/index.js'
import type { 
    PlatformStrategy, 
    ServiceResult, 
    StartResult, 
    SSLResult,
    PlatformCapabilities,
    PlatformPaths 
} from '../types.js'

export class LinuxSystemdStrategy implements PlatformStrategy {
    private capabilities: PlatformCapabilities
    
    constructor() {
        this.capabilities = this.detectCapabilities()
    }
    
    private detectCapabilities(): PlatformCapabilities {
        return {
            platform: 'linux',
            hasSystemd: this.checkSystemd(),
            hasLaunchd: false,
            hasWindowsService: false,
            hasPM2: this.checkCommand('pm2'),
            hasDocker: this.checkCommand('docker'),
            hasBun: typeof Bun !== 'undefined',
            hasNode: this.checkCommand('node'),
            hasDeno: false, // typeof Deno !== 'undefined',
            isRoot: process.getuid ? process.getuid() === 0 : false,
            canSudo: this.checkCommand('sudo')
        }
    }
    
    private checkSystemd(): boolean {
        try {
            execSync('which systemctl', { stdio: 'ignore' })
            return true
        } catch {
            return false
        }
    }
    
    private checkCommand(command: string): boolean {
        try {
            execSync(`which ${command}`, { stdio: 'ignore' })
            return true
        } catch {
            return false
        }
    }
    
    async createService(config: AirConfig): Promise<ServiceResult> {
        if (!this.capabilities.hasSystemd) {
            return {
                success: false,
                error: 'Systemd is not available on this system'
            }
        }
        
        if (!this.capabilities.isRoot && !this.capabilities.canSudo) {
            return {
                success: false,
                error: 'Root privileges required to create systemd service'
            }
        }
        
        try {
            const serviceName = `air-${config.name}.service`
            const servicePath = `/etc/systemd/system/${serviceName}`
            
            // Check if service already exists
            if (fs.existsSync(servicePath)) {
                return {
                    success: true,
                    type: 'systemd',
                    message: 'Service already exists'
                }
            }
            
            // Generate systemd unit file
            const serviceContent = this.generateSystemdUnit(config)
            
            // Write service file
            const writeCommand = this.capabilities.isRoot
                ? `echo '${serviceContent}' > ${servicePath}`
                : `echo '${serviceContent}' | sudo tee ${servicePath}`
                
            execSync(writeCommand, { shell: '/bin/bash' })
            
            // Reload systemd and enable service
            const systemctlPrefix = this.capabilities.isRoot ? '' : 'sudo '
            execSync(`${systemctlPrefix}systemctl daemon-reload`)
            execSync(`${systemctlPrefix}systemctl enable ${serviceName}`)
            
            return {
                success: true,
                type: 'systemd',
                message: `Service ${serviceName} created and enabled`
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }
    
    private generateSystemdUnit(config: AirConfig): string {
        const runtime = this.capabilities.hasBun ? 'bun' : 'node'
        const execPath = path.join(config.root, 'src/main.ts')
        
        return `[Unit]
Description=Air P2P Database - ${config.name}
After=network.target

[Service]
Type=simple
User=${process.env.USER || 'air'}
WorkingDirectory=${config.root}
ExecStart=${runtime} ${execPath}
Restart=always
RestartSec=5
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target`
    }
    
    async startService(name: string): Promise<StartResult> {
        if (!this.capabilities.hasSystemd) {
            // Fallback to direct spawn
            return this.startDirect(name)
        }
        
        try {
            const serviceName = `air-${name}.service`
            const systemctlPrefix = this.capabilities.isRoot ? '' : 'sudo '
            
            // Start service
            execSync(`${systemctlPrefix}systemctl start ${serviceName}`, { stdio: 'ignore' })
            
            // Get PID
            const pidOutput = execSync(
                `${systemctlPrefix}systemctl show --property MainPID ${serviceName}`,
                { encoding: 'utf8' }
            )
            const pid = parseInt(pidOutput.split('=')[1]?.trim() || '0')
            
            return {
                started: true,
                pid: pid > 0 ? pid : undefined,
                method: 'systemd'
            }
        } catch (error) {
            // Fallback to direct start
            return this.startDirect(name)
        }
    }
    
    private async startDirect(_name: string): Promise<StartResult> {
        try {
            const runtime = this.capabilities.hasBun ? 'bun' : 'node'
            const configPath = path.join(process.cwd(), 'air.json')
            
            // Read config to get root path
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
            const execPath = path.join(config.root || process.cwd(), 'src/main.ts')
            
            const child = spawn(runtime, [execPath], {
                cwd: config.root || process.cwd(),
                detached: true,
                stdio: 'ignore'
            })
            
            child.unref()
            
            return {
                started: true,
                pid: child.pid,
                method: 'spawn'
            }
        } catch (error) {
            return {
                started: false,
                error: error instanceof Error ? error.message : 'Failed to start'
            }
        }
    }
    
    async stopService(name: string): Promise<boolean> {
        try {
            const serviceName = `air-${name}.service`
            const systemctlPrefix = this.capabilities.isRoot ? '' : 'sudo '
            
            execSync(`${systemctlPrefix}systemctl stop ${serviceName}`, { stdio: 'ignore' })
            return true
        } catch {
            return false
        }
    }
    
    async removeService(name: string): Promise<boolean> {
        try {
            const serviceName = `air-${name}.service`
            const servicePath = `/etc/systemd/system/${serviceName}`
            const systemctlPrefix = this.capabilities.isRoot ? '' : 'sudo '
            
            // Stop and disable service
            execSync(`${systemctlPrefix}systemctl stop ${serviceName}`, { stdio: 'ignore' })
            execSync(`${systemctlPrefix}systemctl disable ${serviceName}`, { stdio: 'ignore' })
            
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
    
    async getServiceStatus(name: string): Promise<'running' | 'stopped' | 'unknown'> {
        try {
            const serviceName = `air-${name}.service`
            const output = execSync(`systemctl is-active ${serviceName}`, { encoding: 'utf8' })
            
            if (output.trim() === 'active') return 'running'
            if (output.trim() === 'inactive') return 'stopped'
            return 'unknown'
        } catch {
            return 'unknown'
        }
    }
    
    async setupSSL(config: AirConfig): Promise<SSLResult> {
        const keyPath = path.join(config.root, 'ssl', 'key.pem')
        const certPath = path.join(config.root, 'ssl', 'cert.pem')
        
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
            const command = `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=${config.domain || 'localhost'}"`
            
            execSync(command, { stdio: 'ignore' })
            
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
                error: error instanceof Error ? error.message : 'Failed to generate SSL certificates'
            }
        }
    }
    
    getPaths(): PlatformPaths {
        return {
            serviceDir: '/etc/systemd/system',
            configDir: '/etc/air',
            logDir: '/var/log/air',
            dataDir: '/var/lib/air',
            tempDir: '/tmp/air'
        }
    }
    
    getCapabilities(): PlatformCapabilities {
        return this.capabilities
    }
    
    getName(): string {
        return 'Linux with Systemd'
    }
}

export default LinuxSystemdStrategy