import os from 'os'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import readline from 'readline'

// ANSI color codes
export const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
}

// Detect terminal size and platform
export const isTermux = () => {
    return process.env.TERMUX_VERSION !== undefined || 
           process.env.PREFIX?.includes('com.termux')
}

export const isMobile = () => {
    return isTermux() || (process.stdout.columns && process.stdout.columns < 80)
}

export const isWindows = () => os.platform() === 'win32'
export const isMac = () => os.platform() === 'darwin'
export const isLinux = () => os.platform() === 'linux'

// Platform-specific helpers
export const hasSudo = () => {
    if (isWindows()) return false
    if (isTermux()) return false
    try {
        execSync('which sudo', { stdio: 'ignore' })
        return true
    } catch {
        return false
    }
}

export const hasSystemd = () => {
    if (!isLinux()) return false
    if (isTermux()) return false
    try {
        execSync('systemctl --version', { stdio: 'ignore' })
        return true
    } catch {
        return false
    }
}

// Responsive layout helper
export const getLayout = () => {
    const width = process.stdout.columns || 80
    const height = process.stdout.rows || 24
    const compact = isMobile() || width < 80
    
    return {
        width,
        height,
        compact,
        padding: compact ? 1 : 2,
        margin: compact ? 0 : 1
    }
}

// Simple UI components
export class AirUI {
    private title: string
    private version = '2.0.0'
    private rl: readline.Interface | null = null
    
    constructor(title: string) {
        this.title = title
    }
    
    private getReadline(): readline.Interface {
        if (!this.rl) {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })
        }
        return this.rl
    }
    
    close() {
        if (this.rl) {
            this.rl.close()
            this.rl = null
        }
    }
    
    // Create responsive header
    createHeader(): string {
        const layout = getLayout()
        const width = Math.min(layout.width - 2, 60)
        
        if (layout.compact) {
            // Mobile/compact layout
            const line = '═'.repeat(width)
            return `${colors.cyan}${colors.bright}${line}${colors.reset}\n` +
                   `${colors.cyan}${colors.bright}  ${this.title}${colors.reset}\n` +
                   `${colors.cyan}${colors.bright}${line}${colors.reset}`
        } else {
            // Desktop layout
            const line = '═'.repeat(width)
            const padding = Math.floor((width - this.title.length - 2) / 2)
            const titleLine = '║' + ' '.repeat(padding) + this.title + ' '.repeat(width - padding - this.title.length - 2) + '║'
            
            return `${colors.cyan}${colors.bright}${line}${colors.reset}\n` +
                   `${colors.cyan}${colors.bright}${titleLine}${colors.reset}\n` +
                   `${colors.cyan}${colors.bright}${line}${colors.reset}`
        }
    }
    
    // Create status section
    createStatusSection(title: string, items: Array<{label: string, value: string, status?: 'success' | 'warning' | 'error' | 'info'}>): string {
        const layout = getLayout()
        const lines: string[] = []
        
        lines.push(`\n${colors.magenta}${colors.bright}▶ ${title}${colors.reset}`)
        lines.push(`${colors.magenta}  ${'─'.repeat(title.length)}${colors.reset}\n`)
        
        items.forEach(item => {
            const statusColor = item.status ? {
                success: colors.green,
                warning: colors.yellow,
                error: colors.red,
                info: colors.cyan
            }[item.status] : ''
            
            const icon = item.status ? {
                success: '✓',
                warning: '⚠',
                error: '✗',
                info: 'ℹ'
            }[item.status] : ''
            
            const iconStr = icon ? `${statusColor}${colors.bright}${icon} ${colors.reset}` : ''
            
            if (layout.compact || item.label.length + item.value.length > 50) {
                // Compact layout for mobile or long content
                lines.push(`${iconStr}${statusColor}${item.label}: ${item.value}${colors.reset}`)
            } else {
                // Full layout for desktop
                const spacing = ' '.repeat(Math.max(1, 20 - item.label.length))
                lines.push(`${iconStr}${statusColor}${item.label}:${spacing}${item.value}${colors.reset}`)
            }
        })
        
        return lines.join('\n')
    }
    
    // Create input field
    async prompt(label: string, defaultValue = '', password = false): Promise<string> {
        return new Promise((resolve) => {
            const rl = this.getReadline()
            const question = defaultValue ? 
                `${label} (${colors.dim}${defaultValue}${colors.reset}): ` : 
                `${label}: `
            
            if (password && process.stdin.isTTY) {
                // Hide password input
                process.stdin.setRawMode(true)
                process.stdout.write(question)
                
                let value = ''
                const onData = (char: Buffer) => {
                    const ch = char.toString('utf8')
                    
                    if (ch === '\n' || ch === '\r') {
                        process.stdin.setRawMode(false)
                        process.stdin.removeListener('data', onData)
                        process.stdout.write('\n')
                        resolve(value || defaultValue)
                    } else if (ch === '\u0003') {
                        // Ctrl+C
                        process.exit(0)
                    } else if (ch === '\u007f' || ch === '\b') {
                        // Backspace
                        if (value.length > 0) {
                            value = value.slice(0, -1)
                            process.stdout.write('\b \b')
                        }
                    } else if (ch >= ' ') {
                        value += ch
                        process.stdout.write('*')
                    }
                }
                
                process.stdin.on('data', onData)
            } else {
                rl.question(question, (answer) => {
                    resolve(answer || defaultValue)
                })
            }
        })
    }
    
    // Create selection menu
    async select(label: string, options: string[], defaultIndex = 0): Promise<string> {
        const rl = this.getReadline()
        
        console.log(`\n${label}:`)
        options.forEach((option, index) => {
            const marker = index === defaultIndex ? '>' : ' '
            const color = index === defaultIndex ? colors.cyan : ''
            console.log(`${color}  ${marker} ${option}${colors.reset}`)
        })
        
        return new Promise((resolve) => {
            const question = `Select option [1-${options.length}] (${colors.dim}${defaultIndex + 1}${colors.reset}): `
            rl.question(question, (answer) => {
                const index = answer ? parseInt(answer) - 1 : defaultIndex
                resolve(options[Math.max(0, Math.min(index, options.length - 1))])
            })
        })
    }
    
    // Create checkbox
    async confirm(label: string, defaultValue = false): Promise<boolean> {
        const rl = this.getReadline()
        const defaultStr = defaultValue ? 'Y/n' : 'y/N'
        
        return new Promise((resolve) => {
            rl.question(`${label} (${colors.bright}${defaultStr}${colors.reset}): `, (answer) => {
                if (!answer) {
                    resolve(defaultValue)
                } else {
                    resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
                }
            })
        })
    }
    
    // Show error message
    showError(message: string, details?: string) {
        console.log(`\n${colors.red}${colors.bright}✗ Error:${colors.reset} ${message}`)
        if (details) {
            console.log(`  ${colors.dim}${details}${colors.reset}`)
        }
    }
    
    // Show success message
    showSuccess(message: string) {
        console.log(`\n${colors.green}${colors.bright}✓ Success:${colors.reset} ${message}`)
    }
    
    // Show warning message
    showWarning(message: string) {
        console.log(`\n${colors.yellow}${colors.bright}⚠ Warning:${colors.reset} ${message}`)
    }
    
    // Show info message
    showInfo(message: string) {
        console.log(`\n${colors.cyan}ℹ Info:${colors.reset} ${message}`)
    }
    
    // Show progress
    showProgress(label: string, current: number, total: number) {
        const layout = getLayout()
        const percentage = Math.round((current / total) * 100)
        const barWidth = Math.min(layout.compact ? 20 : 40, layout.width - 20)
        const filled = Math.round((percentage / 100) * barWidth)
        
        const progressBar = '█'.repeat(filled) + '░'.repeat(barWidth - filled)
        
        process.stdout.write(`\r${label}: ${colors.cyan}${progressBar}${colors.reset} ${percentage}%`)
        
        if (current >= total) {
            process.stdout.write('\n')
        }
    }
    
    // Clear screen
    clear() {
        if (!isMobile()) {
            console.clear()
        } else {
            // On mobile, just add some spacing
            console.log('\n'.repeat(3))
        }
    }
}

// Export platform-specific paths
export const getPlatformPaths = () => {
    const home = os.homedir()
    const platform = os.platform()
    
    if (isWindows()) {
        return {
            config: process.env.APPDATA || path.join(home, 'AppData', 'Roaming', 'Air'),
            data: process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local', 'Air'),
            log: path.join(home, 'AppData', 'Local', 'Air', 'logs'),
            ssl: path.join(home, 'AppData', 'Local', 'Air', 'ssl'),
            service: null // Windows Service paths handled differently
        }
    } else if (isMac()) {
        return {
            config: path.join(home, 'Library', 'Application Support', 'Air'),
            data: path.join(home, 'Library', 'Application Support', 'Air', 'data'),
            log: path.join(home, 'Library', 'Logs', 'Air'),
            ssl: path.join(home, 'Library', 'Application Support', 'Air', 'ssl'),
            service: path.join(home, 'Library', 'LaunchAgents')
        }
    } else if (isTermux()) {
        const prefix = process.env.PREFIX || '/data/data/com.termux/files/usr'
        return {
            config: path.join(prefix, 'etc', 'air'),
            data: path.join(prefix, 'var', 'lib', 'air'),
            log: path.join(prefix, 'var', 'log', 'air'),
            ssl: path.join(prefix, 'etc', 'air', 'ssl'),
            service: null // Termux uses termux-services
        }
    } else {
        // Linux/Unix
        return {
            config: process.env.XDG_CONFIG_HOME || path.join(home, '.config', 'air'),
            data: process.env.XDG_DATA_HOME || path.join(home, '.local', 'share', 'air'),
            log: process.env.XDG_STATE_HOME || path.join(home, '.local', 'state', 'air'),
            ssl: path.join(home, '.local', 'share', 'air', 'ssl'),
            service: hasSystemd() ? '/etc/systemd/system' : path.join(home, '.config', 'systemd', 'user')
        }
    }
}

// SSL/Certificate management without sudo
export class LocalSSL {
    private sslPath: string
    
    constructor() {
        const paths = getPlatformPaths()
        this.sslPath = paths.ssl
        this.ensureDirectory()
    }
    
    private ensureDirectory() {
        if (!fs.existsSync(this.sslPath)) {
            fs.mkdirSync(this.sslPath, { recursive: true, mode: 0o700 })
        }
    }
    
    // Generate self-signed certificate (no sudo needed)
    async generateSelfSigned(domain: string) {
        const keyFile = path.join(this.sslPath, `${domain}.key`)
        const certFile = path.join(this.sslPath, `${domain}.crt`)
        
        try {
            // Generate private key
            execSync(`openssl genrsa -out "${keyFile}" 2048`, { stdio: 'ignore' })
            
            // Generate certificate
            execSync(`openssl req -new -x509 -key "${keyFile}" -out "${certFile}" -days 365 -subj "/CN=${domain}"`, { stdio: 'ignore' })
            
            // Set permissions
            fs.chmodSync(keyFile, 0o600)
            fs.chmodSync(certFile, 0o644)
            
            return { key: keyFile, cert: certFile }
        } catch (error: any) {
            throw new Error(`Failed to generate self-signed certificate: ${error.message}`)
        }
    }
    
    // Use acme.sh for Let's Encrypt (no sudo needed)
    async generateLetsEncrypt(domain: string, email: string) {
        const acmePath = path.join(os.homedir(), '.acme.sh')
        const acmeScript = path.join(acmePath, 'acme.sh')
        
        // Install acme.sh if not present
        if (!fs.existsSync(acmeScript)) {
            execSync('curl https://get.acme.sh | sh', { stdio: 'inherit' })
        }
        
        // Issue certificate using DNS mode or standalone mode
        const keyFile = path.join(this.sslPath, `${domain}.key`)
        const certFile = path.join(this.sslPath, `${domain}.crt`)
        
        try {
            // Try DNS mode first (no port needed)
            execSync(`"${acmeScript}" --issue -d ${domain} --dns --yes-I-know-dns-manual-mode-enough-go-ahead-please`, { stdio: 'inherit' })
            
            // Install certificate to our location
            execSync(`"${acmeScript}" --install-cert -d ${domain} --key-file "${keyFile}" --fullchain-file "${certFile}"`, { stdio: 'inherit' })
            
            return { key: keyFile, cert: certFile }
        } catch {
            // Fallback to standalone mode on port 8080 (no sudo needed)
            try {
                execSync(`"${acmeScript}" --issue -d ${domain} --standalone --httpport 8080`, { stdio: 'inherit' })
                execSync(`"${acmeScript}" --install-cert -d ${domain} --key-file "${keyFile}" --fullchain-file "${certFile}"`, { stdio: 'inherit' })
                return { key: keyFile, cert: certFile }
            } catch (error: any) {
                throw new Error(`Failed to generate Let's Encrypt certificate: ${error.message}`)
            }
        }
    }
}

// Service management without sudo
export class LocalService {
    private platform: string
    private serviceName: string
    
    constructor(serviceName: string) {
        this.platform = os.platform()
        this.serviceName = serviceName
    }
    
    // Create user-level systemd service (no sudo)
    createSystemdUserService(config: any) {
        const userServicePath = path.join(os.homedir(), '.config', 'systemd', 'user')
        if (!fs.existsSync(userServicePath)) {
            fs.mkdirSync(userServicePath, { recursive: true })
        }
        
        const serviceFile = path.join(userServicePath, `${this.serviceName}.service`)
        const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node'
        const mainFile = runtime === 'bun' ? 'src/main.ts' : 'dist/main.js'
        
        const serviceContent = `[Unit]
Description=Air GUN Database - ${config.name}
After=network.target

[Service]
Type=simple
ExecStart=${process.execPath} ${path.join(config.root, mainFile)}
WorkingDirectory=${config.root}
Restart=always
RestartSec=10
StandardOutput=append:${path.join(os.homedir(), '.local', 'share', 'air', 'logs', `${config.name}.log`)}
StandardError=append:${path.join(os.homedir(), '.local', 'share', 'air', 'logs', `${config.name}.error.log`)}

[Install]
WantedBy=default.target`
        
        fs.writeFileSync(serviceFile, serviceContent)
        
        // Enable and start user service
        execSync('systemctl --user daemon-reload', { stdio: 'ignore' })
        execSync(`systemctl --user enable ${this.serviceName}`, { stdio: 'ignore' })
        execSync(`systemctl --user start ${this.serviceName}`, { stdio: 'ignore' })
    }
    
    // Create launchd service for macOS (no sudo)
    createLaunchdService(config: any) {
        const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents')
        if (!fs.existsSync(plistPath)) {
            fs.mkdirSync(plistPath, { recursive: true })
        }
        
        const plistFile = path.join(plistPath, `com.air.${config.name}.plist`)
        const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node'
        const mainFile = runtime === 'bun' ? 'src/main.ts' : 'dist/main.js'
        
        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.air.${config.name}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${process.execPath}</string>
        <string>${path.join(config.root, mainFile)}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${config.root}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${path.join(os.homedir(), 'Library', 'Logs', 'Air', `${config.name}.log`)}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(os.homedir(), 'Library', 'Logs', 'Air', `${config.name}.error.log`)}</string>
</dict>
</plist>`
        
        fs.writeFileSync(plistFile, plistContent)
        
        // Load the service
        execSync(`launchctl load "${plistFile}"`, { stdio: 'ignore' })
    }
    
    // Create Windows service (requires node-windows package)
    createWindowsService(config: any) {
        // This would use node-windows or similar package
        // For now, we'll create a batch file that can be added to startup
        const startupPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
        const batchFile = path.join(startupPath, `air-${config.name}.bat`)
        const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node'
        const mainFile = runtime === 'bun' ? 'src\\main.ts' : 'dist\\main.js'
        
        const batchContent = `@echo off
cd /d "${config.root}"
start "" "${process.execPath}" "${path.join(config.root, mainFile)}"
exit`
        
        fs.writeFileSync(batchFile, batchContent)
    }
    
    // Create Termux service
    createTermuxService(config: any) {
        const servicePath = path.join(process.env.PREFIX || '/data/data/com.termux/files/usr', 'var', 'service')
        if (!fs.existsSync(servicePath)) {
            fs.mkdirSync(servicePath, { recursive: true })
        }
        
        const serviceDir = path.join(servicePath, `air-${config.name}`)
        const runFile = path.join(serviceDir, 'run')
        
        fs.mkdirSync(serviceDir, { recursive: true })
        
        const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node'
        const mainFile = runtime === 'bun' ? 'src/main.ts' : 'dist/main.js'
        
        const runContent = `#!/data/data/com.termux/files/usr/bin/sh
exec ${process.execPath} ${path.join(config.root, mainFile)} 2>&1`
        
        fs.writeFileSync(runFile, runContent)
        fs.chmodSync(runFile, 0o755)
        
        // Enable with termux-services
        try {
            execSync(`sv-enable air-${config.name}`, { stdio: 'ignore' })
        } catch {
            // termux-services might not be installed
        }
    }
    
    // Install service based on platform
    install(config: any) {
        if (isWindows()) {
            this.createWindowsService(config)
        } else if (isMac()) {
            this.createLaunchdService(config)
        } else if (isTermux()) {
            this.createTermuxService(config)
        } else if (hasSystemd()) {
            this.createSystemdUserService(config)
        } else {
            // Fallback: create a simple cron job
            this.createCronJob(config)
        }
    }
    
    // Create cron job (no sudo)
    createCronJob(config: any) {
        const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node'
        const mainFile = runtime === 'bun' ? 'src/main.ts' : 'dist/main.js'
        const cronCommand = `@reboot ${process.execPath} ${path.join(config.root, mainFile)} >> ${path.join(os.homedir(), '.air', 'logs', `${config.name}.log`)} 2>&1`
        
        try {
            // Get current crontab
            let currentCron = ''
            try {
                currentCron = execSync('crontab -l', { encoding: 'utf8' })
            } catch {
                // No existing crontab
            }
            
            // Add our job if not already present
            if (!currentCron.includes(config.root)) {
                const newCron = currentCron + '\n' + cronCommand + '\n'
                const tmpFile = path.join(os.tmpdir(), `cron-${Date.now()}`)
                fs.writeFileSync(tmpFile, newCron)
                execSync(`crontab "${tmpFile}"`, { stdio: 'ignore' })
                fs.unlinkSync(tmpFile)
            }
        } catch (error: any) {
            throw new Error(`Failed to install cron job: ${error.message}`)
        }
    }
    
    // Remove cron job
    removeCronJob(config: any) {
        try {
            const currentCron = execSync('crontab -l', { encoding: 'utf8' })
            const lines = currentCron.split('\n').filter(line => !line.includes(config.root))
            const newCron = lines.join('\n')
            const tmpFile = path.join(os.tmpdir(), `cron-${Date.now()}`)
            fs.writeFileSync(tmpFile, newCron)
            execSync(`crontab "${tmpFile}"`, { stdio: 'ignore' })
            fs.unlinkSync(tmpFile)
        } catch {
            // No crontab or error removing
        }
    }
    
    // Stop service
    stop(config: any) {
        if (isWindows()) {
            // Windows: kill process
            try {
                execSync(`taskkill /F /IM node.exe /FI "WINDOWTITLE eq Air - ${config.name}"`, { stdio: 'ignore' })
            } catch {}
        } else if (isMac()) {
            try {
                execSync(`launchctl stop com.air.${config.name}`, { stdio: 'ignore' })
            } catch {}
        } else if (isTermux()) {
            try {
                execSync(`sv stop air-${config.name}`, { stdio: 'ignore' })
            } catch {}
        } else if (hasSystemd()) {
            try {
                execSync(`systemctl --user stop ${this.serviceName}`, { stdio: 'ignore' })
            } catch {}
        }
        
        // Also check for PID file
        const pidFile = path.join(config.root, `.${config.name}.pid`)
        if (fs.existsSync(pidFile)) {
            try {
                const pid = parseInt(fs.readFileSync(pidFile, 'utf8'))
                process.kill(pid, 'SIGTERM')
            } catch {}
            fs.unlinkSync(pidFile)
        }
    }
    
    // Uninstall service
    uninstall(config: any) {
        // Stop the service first
        this.stop(config)
        
        if (isWindows()) {
            const startupPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
            const batchFile = path.join(startupPath, `air-${config.name}.bat`)
            if (fs.existsSync(batchFile)) {
                fs.unlinkSync(batchFile)
            }
        } else if (isMac()) {
            const plistFile = path.join(os.homedir(), 'Library', 'LaunchAgents', `com.air.${config.name}.plist`)
            if (fs.existsSync(plistFile)) {
                try {
                    execSync(`launchctl unload "${plistFile}"`, { stdio: 'ignore' })
                } catch {}
                fs.unlinkSync(plistFile)
            }
        } else if (isTermux()) {
            try {
                execSync(`sv-disable air-${config.name}`, { stdio: 'ignore' })
            } catch {}
            const serviceDir = path.join(process.env.PREFIX || '/data/data/com.termux/files/usr', 'var', 'service', `air-${config.name}`)
            if (fs.existsSync(serviceDir)) {
                fs.rmSync(serviceDir, { recursive: true })
            }
        } else if (hasSystemd()) {
            try {
                execSync(`systemctl --user stop ${this.serviceName}`, { stdio: 'ignore' })
                execSync(`systemctl --user disable ${this.serviceName}`, { stdio: 'ignore' })
            } catch {}
            const serviceFile = path.join(os.homedir(), '.config', 'systemd', 'user', `${this.serviceName}.service`)
            if (fs.existsSync(serviceFile)) {
                fs.unlinkSync(serviceFile)
                execSync('systemctl --user daemon-reload', { stdio: 'ignore' })
            }
        }
        
        // Also remove any cron jobs
        this.removeCronJob(config)
    }
}

export default AirUI