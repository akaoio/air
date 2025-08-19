#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { getPaths } from '../src/paths'
import type { AirConfig } from '../src/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const paths = getPaths()

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
}

interface ServiceStatus {
    status: string
    message: string
}

function checkService(): ServiceStatus {
    try {
        // Check if air.json exists
        const configPath = paths.config
        if (!fs.existsSync(configPath)) {
            return { status: 'not configured', message: 'air.json not found' }
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        const name = config.name || 'air'

        // Check for PID file
        const pidFiles = fs.readdirSync(paths.root).filter(f => f.startsWith('.air') && f.endsWith('.pid'))
        
        if (pidFiles.length > 0) {
            const pidFile = path.join(paths.root, pidFiles[0])
            const pid = fs.readFileSync(pidFile, 'utf8').trim()
            
            try {
                // Check if process is running
                process.kill(parseInt(pid), 0)
                return { status: 'running', message: `Process running with PID ${pid}` }
            } catch (e) {
                return { status: 'stale', message: `Stale PID file found (PID: ${pid})` }
            }
        }

        // Check systemd service if available
        try {
            const serviceName = `air-${name}`
            const status = execSync(`systemctl is-active ${serviceName} 2>/dev/null`, { encoding: 'utf8' }).trim()
            
            if (status === 'active') {
                return { status: 'running', message: `Systemd service ${serviceName} is active` }
            } else {
                return { status: 'stopped', message: `Systemd service ${serviceName} is ${status}` }
            }
        } catch (e) {
            // Systemd not available or service not installed
        }

        return { status: 'stopped', message: 'Air is not running' }
    } catch (error) {
        return { status: 'error', message: error.message }
    }
}

function getPortStatus() {
    try {
        const configPath = paths.config
        if (!fs.existsSync(configPath)) {
            return null
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        const env = config.env || 'development'
        const port = config[env]?.port || 8765

        try {
            // Check if port is in use
            execSync(`lsof -i:${port} 2>/dev/null`, { encoding: 'utf8' })
            return { port, status: 'in use' }
        } catch (e) {
            return { port, status: 'available' }
        }
    } catch (error) {
        return null
    }
}

function getConfigInfo() {
    try {
        const configPath = paths.config
        if (!fs.existsSync(configPath)) {
            return null
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        const env = config.env || 'development'
        
        return {
            name: config.name || 'air',
            env: env,
            domain: config[env]?.domain || 'localhost',
            port: config[env]?.port || 8765,
            peers: config[env]?.peers?.length || 0,
            ssl: config[env]?.ssl ? 'configured' : 'not configured',
            ddns: config[env]?.godaddy ? 'configured' : 'not configured'
        }
    } catch (error) {
        return null
    }
}

// Main execution
console.log('\n' + colors.cyan + colors.bright + '=== Air Status ===' + colors.reset + '\n')

// Service status
const serviceStatus = checkService()
const statusColor = serviceStatus.status === 'running' ? colors.green : 
                    serviceStatus.status === 'error' ? colors.red : colors.yellow

console.log(statusColor + '● Service Status: ' + serviceStatus.status + colors.reset)
console.log('  ' + serviceStatus.message)

// Port status
const portStatus = getPortStatus()
if (portStatus) {
    const portColor = portStatus.status === 'available' ? colors.green : colors.yellow
    console.log('\n' + portColor + '● Port ' + portStatus.port + ': ' + portStatus.status + colors.reset)
}

// Configuration info
const configInfo = getConfigInfo()
if (configInfo) {
    console.log('\n' + colors.blue + '● Configuration:' + colors.reset)
    console.log('  Name: ' + configInfo.name)
    console.log('  Environment: ' + configInfo.env)
    console.log('  Domain: ' + configInfo.domain)
    console.log('  Port: ' + configInfo.port)
    console.log('  Peers: ' + configInfo.peers)
    console.log('  SSL: ' + configInfo.ssl)
    console.log('  DDNS: ' + configInfo.ddns)
}

// File paths
console.log('\n' + colors.magenta + '● Paths:' + colors.reset)
console.log('  Root: ' + paths.root)
console.log('  Config: ' + paths.config)
console.log('  Data: ' + path.join(paths.root, 'radata'))

console.log('')