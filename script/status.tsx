#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths.js'
import type { AirConfig } from '../src/types/index.js'
import { isWindows, isMac, isTermux, hasSystemd } from './platform-utils.js'
import React from 'react'
import { render, Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import BigText from 'ink-big-text'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Status colors
const StatusColor = ({ status, children }: { status: string, children: React.ReactNode }) => {
    const colors: Record<string, string> = {
        success: 'green',
        warning: 'yellow',
        error: 'red',
        info: 'cyan'
    }
    
    return <Text color={colors[status] || 'white'}>{children}</Text>
}

// Status section component
const StatusSection = ({ title, items }: { title: string, items: Array<{ label: string, value: string, status?: string }> }) => {
    return (
        <Box flexDirection="column" marginY={1}>
            <Text bold color="magenta">═══ {title} ═══</Text>
            {items.map((item, i) => (
                <Box key={i} marginLeft={2}>
                    <Text color="gray">{item.label}: </Text>
                    <StatusColor status={item.status || 'info'}>{item.value}</StatusColor>
                </Box>
            ))}
        </Box>
    )
}

// Main status component
const AirStatusDisplay = ({ config, paths }: { config: any, paths: any }) => {
    const checkProcess = (): { running: boolean, pid?: number, message: string } => {
        if (!config) {
            return { running: false, message: 'Configuration not found' }
        }
        
        const name = config.name || 'air'
        const pidFile = path.join(paths.root, `.${name}.pid`)
        
        if (fs.existsSync(pidFile)) {
            try {
                const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim())
                try {
                    process.kill(pid, 0)
                    return { running: true, pid, message: `Process running (PID: ${pid})` }
                } catch {
                    return { running: false, message: `Stale PID file found (PID: ${pid})` }
                }
            } catch {
                return { running: false, message: 'Invalid PID file' }
            }
        }
        
        return { running: false, message: 'No PID file found' }
    }
    
    const checkService = (): { installed: boolean, running: boolean, message: string } => {
        if (!config) {
            return { installed: false, running: false, message: 'Not configured' }
        }
        
        const name = config.name || 'air'
        const serviceName = `air-${name}`
        
        if (isWindows()) {
            const startupPath = path.join(
                process.env.APPDATA || '',
                '..',
                'Roaming',
                'Microsoft',
                'Windows',
                'Start Menu',
                'Programs',
                'Startup'
            )
            const batchFile = path.join(startupPath, `${serviceName}.bat`)
            if (fs.existsSync(batchFile)) {
                return { installed: true, running: false, message: 'Windows startup configured' }
            }
        } else if (isMac()) {
            const plistFile = path.join(
                process.env.HOME || '',
                'Library',
                'LaunchAgents',
                `com.air.${name}.plist`
            )
            if (fs.existsSync(plistFile)) {
                try {
                    execSync(`launchctl list | grep "com.air.${name}"`, { encoding: 'utf8' })
                    return { installed: true, running: true, message: 'launchd service active' }
                } catch {
                    return { installed: true, running: false, message: 'launchd service installed' }
                }
            }
        } else if (isTermux()) {
            const serviceDir = path.join(
                process.env.PREFIX || '/data/data/com.termux/files/usr',
                'var',
                'service',
                serviceName
            )
            if (fs.existsSync(serviceDir)) {
                try {
                    execSync(`sv status ${serviceName}`, { stdio: 'ignore' })
                    return { installed: true, running: true, message: 'Termux service running' }
                } catch {
                    return { installed: true, running: false, message: 'Termux service stopped' }
                }
            }
        } else if (hasSystemd()) {
            try {
                const status = execSync(`systemctl --user is-active ${serviceName}`, { encoding: 'utf8' }).trim()
                if (status === 'active') {
                    return { installed: true, running: true, message: 'User systemd service active' }
                } else {
                    return { installed: true, running: false, message: `User systemd service ${status}` }
                }
            } catch {
                try {
                    const status = execSync(`systemctl is-active ${serviceName} 2>/dev/null`, { encoding: 'utf8' }).trim()
                    if (status === 'active') {
                        return { installed: true, running: true, message: 'System service active' }
                    } else {
                        return { installed: true, running: false, message: `System service ${status}` }
                    }
                } catch {
                    // No systemd service found
                }
            }
        }
        
        try {
            execSync(`crontab -l | grep "${name}"`, { encoding: 'utf8' })
            return { installed: true, running: false, message: 'Cron job configured' }
        } catch {
            // No cron job
        }
        
        return { installed: false, running: false, message: 'Not installed' }
    }
    
    const checkPort = (): { port: number, inUse: boolean, processInfo?: string } => {
        const port = config?.development?.port || config?.production?.port || 8765
        
        try {
            if (isWindows()) {
                const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' })
                const lines = output.trim().split('\n')
                if (lines.length > 0 && lines[0]) {
                    const parts = lines[0].trim().split(/\s+/)
                    const pid = parts[parts.length - 1]
                    return { port, inUse: true, processInfo: `PID ${pid}` }
                }
            } else {
                const output = execSync(`lsof -i:${port} 2>/dev/null`, { encoding: 'utf8' })
                const lines = output.trim().split('\n')
                if (lines.length > 1) {
                    const parts = lines[1].trim().split(/\s+/)
                    return { port, inUse: true, processInfo: `${parts[0]} (PID ${parts[1]})` }
                }
            }
        } catch {
            // Port is not in use
        }
        
        return { port, inUse: false }
    }
    
    const getSSLStatus = (): { configured: boolean, valid?: boolean, expiry?: string } => {
        if (!config) return { configured: false }
        
        const env = config.env || 'development'
        const ssl = config[env]?.ssl
        
        if (!ssl || !ssl.cert || !ssl.key) {
            return { configured: false }
        }
        
        if (!fs.existsSync(ssl.cert) || !fs.existsSync(ssl.key)) {
            return { configured: true, valid: false }
        }
        
        try {
            const certInfo = execSync(`openssl x509 -enddate -noout -in "${ssl.cert}"`, { encoding: 'utf8' })
            const expiryMatch = certInfo.match(/notAfter=(.+)/)
            
            if (expiryMatch) {
                const expiryDate = new Date(expiryMatch[1])
                const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                
                return {
                    configured: true,
                    valid: daysUntilExpiry > 0,
                    expiry: `${daysUntilExpiry} days`
                }
            }
        } catch {
            // Could not check certificate
        }
        
        return { configured: true, valid: true }
    }
    
    if (!config) {
        return (
            <Box flexDirection="column">
                <Gradient name="retro">
                    <BigText text="AIR" />
                </Gradient>
                <Text color="red">Air is not configured. Run install script to set up Air.</Text>
            </Box>
        )
    }
    
    const env = config.env || 'development'
    const processStatus = checkProcess()
    const serviceStatus = checkService()
    const portStatus = checkPort()
    const sslStatus = getSSLStatus()
    const domain = config[env]?.domain || 'localhost'
    const port = config[env]?.port || 8765
    const ddns = config[env]?.godaddy
    const peers = config[env]?.peers || []
    
    // Get runtime info
    const runtime = typeof Bun !== 'undefined' ? 'BUN' : 
                    typeof Deno !== 'undefined' ? 'DENO' : 'NODE'
    const version = config.version || '2.0.0'
    
    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Gradient name="retro">
                    <BigText text="AIR" />
                </Gradient>
            </Box>
            
            <Box marginBottom={1}>
                <Text bold>air v{version} ({runtime})</Text>
            </Box>
            
            <StatusSection 
                title="Configuration"
                items={[
                    { label: 'Name', value: config.name || 'air', status: 'info' },
                    { label: 'Environment', value: env, status: 'info' },
                    { label: 'Root', value: config.root || paths.root, status: 'info' }
                ]}
            />
            
            <StatusSection
                title="Runtime Status"
                items={[
                    {
                        label: 'Process',
                        value: processStatus.message,
                        status: processStatus.running ? 'success' : 'warning'
                    },
                    {
                        label: 'Service',
                        value: serviceStatus.message,
                        status: serviceStatus.installed ? 
                            (serviceStatus.running ? 'success' : 'warning') : 'info'
                    },
                    {
                        label: `Port ${portStatus.port}`,
                        value: portStatus.inUse ? 
                            `In use${portStatus.processInfo ? ' by ' + portStatus.processInfo : ''}` : 
                            'Available',
                        status: portStatus.inUse ? 
                            (processStatus.running ? 'success' : 'warning') : 'info'
                    }
                ]}
            />
            
            <StatusSection
                title="Network Configuration"
                items={[
                    { label: 'Domain', value: domain, status: 'info' },
                    { label: 'Port', value: String(port), status: 'info' },
                    {
                        label: 'SSL',
                        value: sslStatus.configured ? 
                            (sslStatus.valid !== undefined ? 
                                (sslStatus.valid ? `Valid (expires in ${sslStatus.expiry})` : 'Invalid or missing') : 
                                'Configured') :
                            'Not configured',
                        status: sslStatus.configured ? 
                            (sslStatus.valid === false ? 'error' : 'success') : 
                            'info'
                    },
                    {
                        label: 'DDNS',
                        value: ddns ? `GoDaddy (${ddns.host}.${ddns.domain})` : 'Not configured',
                        status: ddns ? 'success' : 'info'
                    },
                    {
                        label: 'Peers',
                        value: peers.length > 0 ? `${peers.length} configured` : 'None',
                        status: 'info'
                    }
                ]}
            />
            
            <Box marginTop={1}>
                <Text dimColor>
                    Status: {processStatus.running ? 
                        <Text color="green">● RUNNING</Text> : 
                        <Text color="yellow">○ STOPPED</Text>}
                </Text>
            </Box>
        </Box>
    )
}

// Main execution
const main = () => {
    const paths = getPaths()
    const configPath = path.join(paths.root, 'air.json')
    
    let config = null
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        } catch {
            // Invalid config
        }
    }
    
    const { unmount } = render(<AirStatusDisplay config={config} paths={paths} />)
    
    // Auto-exit after display
    setTimeout(() => {
        unmount()
        process.exit(0)
    }, 100)
}

main()