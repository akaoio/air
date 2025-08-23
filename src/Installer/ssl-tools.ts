/**
 * SSL Tools Installer
 * Automatically installs and configures SSL certificate tools (certbot, acme.sh)
 */

import { execSync, exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

export interface SSLTool {
    name: string
    command: string
    installed: boolean
    version?: string
    installCommand?: string
    checkCommand?: string
}

export interface SSLToolsResult {
    certbot: SSLTool
    acmesh: SSLTool
    openssl: SSLTool
    recommended?: string
}

export class SSLToolsInstaller {
    private platform: NodeJS.Platform
    private homedir: string
    private isRoot: boolean
    private canSudo: boolean
    
    constructor() {
        this.platform = os.platform()
        this.homedir = os.homedir()
        this.isRoot = process.getuid ? process.getuid() === 0 : false
        this.canSudo = this.checkSudo()
    }
    
    /**
     * Check if sudo is available AND works without password
     */
    private checkSudo(): boolean {
        try {
            // First check if sudo exists
            execSync('which sudo', { stdio: 'ignore' })
            
            // Then check if it works without password
            // Using -n flag to prevent password prompt
            execSync('sudo -n true', { stdio: 'ignore' })
            return true
        } catch {
            // Either sudo doesn't exist or requires password
            return false
        }
    }
    
    /**
     * Check which SSL tools are available
     */
    async check(): Promise<SSLToolsResult> {
        const result: SSLToolsResult = {
            certbot: await this.checkCertbot(),
            acmesh: await this.checkAcmesh(),
            openssl: await this.checkOpenssl()
        }
        
        // Determine recommended tool
        if (result.acmesh.installed) {
            result.recommended = 'acmesh'
        } else if (result.certbot.installed) {
            result.recommended = 'certbot'
        } else {
            // For new installations, prefer acme.sh unless we have passwordless sudo
            // acme.sh works for everyone, certbot only works with sudo
            if (this.isRoot || this.canSudo) {
                result.recommended = 'certbot' // Can use certbot with sudo
            } else {
                result.recommended = 'acmesh' // Must use acme.sh without sudo
            }
        }
        
        return result
    }
    
    /**
     * Check if certbot is installed
     */
    private async checkCertbot(): Promise<SSLTool> {
        const tool: SSLTool = {
            name: 'Certbot',
            command: 'certbot',
            installed: false
        }
        
        try {
            const { stdout } = await execAsync('certbot --version')
            const match = stdout.match(/certbot (\d+\.\d+\.\d+)/)
            if (match) {
                tool.installed = true
                tool.version = match[1]
            }
        } catch {
            // Certbot not installed
        }
        
        // Set install command based on platform
        if (!tool.installed) {
            tool.installCommand = this.getCertbotInstallCommand()
        }
        
        return tool
    }
    
    /**
     * Check if acme.sh is installed
     */
    private async checkAcmesh(): Promise<SSLTool> {
        const tool: SSLTool = {
            name: 'acme.sh',
            command: 'acme.sh',
            installed: false
        }
        
        // Check common locations
        const locations = [
            path.join(this.homedir, '.acme.sh', 'acme.sh'),
            '/usr/local/bin/acme.sh',
            '/opt/acme.sh/acme.sh'
        ]
        
        for (const loc of locations) {
            if (fs.existsSync(loc)) {
                try {
                    const { stdout } = await execAsync(`${loc} --version`)
                    const match = stdout.match(/v(\d+\.\d+\.\d+)/)
                    if (match) {
                        tool.installed = true
                        tool.version = match[1]
                        tool.command = loc
                        break
                    }
                } catch {
                    // Continue checking other locations
                }
            }
        }
        
        // Set install command if not found
        if (!tool.installed) {
            tool.installCommand = this.getAcmeshInstallCommand()
        }
        
        return tool
    }
    
    /**
     * Check if OpenSSL is installed
     */
    private async checkOpenssl(): Promise<SSLTool> {
        const tool: SSLTool = {
            name: 'OpenSSL',
            command: 'openssl',
            installed: false
        }
        
        try {
            const { stdout } = await execAsync('openssl version')
            const match = stdout.match(/OpenSSL (\d+\.\d+\.\d+\w*)/)
            if (match) {
                tool.installed = true
                tool.version = match[1]
            }
        } catch {
            // OpenSSL not installed
        }
        
        // OpenSSL is usually pre-installed, but provide install command if needed
        if (!tool.installed) {
            tool.installCommand = this.getOpensslInstallCommand()
        }
        
        return tool
    }
    
    /**
     * Get certbot install command for current platform
     */
    private getCertbotInstallCommand(): string {
        switch (this.platform) {
            case 'linux':
                // Check for package manager
                if (fs.existsSync('/usr/bin/apt-get')) {
                    return 'sudo apt-get update && sudo apt-get install -y certbot'
                } else if (fs.existsSync('/usr/bin/yum')) {
                    return 'sudo yum install -y certbot'
                } else if (fs.existsSync('/usr/bin/dnf')) {
                    return 'sudo dnf install -y certbot'
                } else if (fs.existsSync('/usr/bin/pacman')) {
                    return 'sudo pacman -S certbot'
                } else if (fs.existsSync('/usr/bin/snap')) {
                    return 'sudo snap install --classic certbot'
                }
                return 'sudo snap install --classic certbot'
                
            case 'darwin':
                if (fs.existsSync('/usr/local/bin/brew') || fs.existsSync('/opt/homebrew/bin/brew')) {
                    return 'brew install certbot'
                }
                return 'Install Homebrew first: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" && brew install certbot'
                
            case 'freebsd':
                return 'sudo pkg install py39-certbot'
                
            default:
                return 'Please install certbot manually from https://certbot.eff.org'
        }
    }
    
    /**
     * Get acme.sh install command
     */
    private getAcmeshInstallCommand(): string {
        // acme.sh works the same way on all platforms
        return 'curl https://get.acme.sh | sh -s email=my@example.com'
    }
    
    /**
     * Get OpenSSL install command for current platform
     */
    private getOpensslInstallCommand(): string {
        switch (this.platform) {
            case 'linux':
                if (fs.existsSync('/usr/bin/apt-get')) {
                    return 'sudo apt-get update && sudo apt-get install -y openssl'
                } else if (fs.existsSync('/usr/bin/yum')) {
                    return 'sudo yum install -y openssl'
                } else if (fs.existsSync('/usr/bin/dnf')) {
                    return 'sudo dnf install -y openssl'
                } else if (fs.existsSync('/usr/bin/pacman')) {
                    return 'sudo pacman -S openssl'
                }
                return 'sudo apt-get install -y openssl'
                
            case 'darwin':
                return 'OpenSSL is pre-installed on macOS'
                
            case 'freebsd':
                return 'sudo pkg install openssl'
                
            default:
                return 'Please install OpenSSL manually'
        }
    }
    
    /**
     * Install certbot
     */
    async installCertbot(): Promise<boolean> {
        // Check if we can actually use sudo
        if (!this.isRoot && !this.canSudo) {
            console.log('⚠️  Certbot installation requires sudo access')
            console.log('   Please install manually or use acme.sh instead')
            return false
        }
        
        const command = this.getCertbotInstallCommand()
        
        console.log('📦 Installing Certbot...')
        console.log(`   Command: ${command}`)
        
        try {
            execSync(command, { stdio: 'inherit' })
            
            // Verify installation
            const check = await this.checkCertbot()
            if (check.installed) {
                console.log(`✅ Certbot ${check.version} installed successfully`)
                return true
            }
        } catch (error: any) {
            if (error.message?.includes('sudo') || error.code === 1) {
                console.log('❌ Sudo password required. Cannot install certbot automatically.')
                console.log('   Please run: ' + command)
                console.log('   Or use acme.sh which doesn\'t require sudo')
            } else {
                console.error('❌ Failed to install Certbot:', error.message)
            }
        }
        
        return false
    }
    
    /**
     * Install acme.sh
     */
    async installAcmesh(email?: string): Promise<boolean> {
        const installEmail = email || 'noreply@example.com'
        const command = `curl https://get.acme.sh | sh -s email=${installEmail}`
        
        console.log('📦 Installing acme.sh...')
        console.log('   This tool works without sudo and supports DNS challenges')
        
        try {
            execSync(command, { stdio: 'inherit' })
            
            // Source the environment
            const acmePath = path.join(this.homedir, '.acme.sh', 'acme.sh')
            if (fs.existsSync(acmePath)) {
                console.log('✅ acme.sh installed successfully')
                console.log(`   Location: ${acmePath}`)
                return true
            }
        } catch (error) {
            console.error('❌ Failed to install acme.sh:', error)
        }
        
        return false
    }
    
    /**
     * Install recommended SSL tool based on system
     */
    async installRecommended(email?: string): Promise<string | null> {
        const tools = await this.check()
        
        // If recommended tool is already installed, return it
        if (tools.recommended) {
            const tool = tools[tools.recommended as keyof SSLToolsResult] as SSLTool
            if (tool.installed) {
                console.log(`✅ ${tool.name} is already installed (v${tool.version})`)
                return tools.recommended
            }
        }
        
        // Install based on permissions
        if (!this.isRoot && !this.canSudo) {
            // Install acme.sh (works without sudo)
            console.log('🔒 No sudo access detected. Installing acme.sh (works without sudo)...')
            const success = await this.installAcmesh(email)
            return success ? 'acmesh' : null
        }
        
        // Try certbot first (standard tool)
        if (tools.recommended === 'certbot') {
            const success = await this.installCertbot()
            if (success) return 'certbot'
        }
        
        // Fallback to acme.sh
        const success = await this.installAcmesh(email)
        return success ? 'acmesh' : null
    }
    
    /**
     * Get DNS challenge instructions for a domain
     */
    getDNSChallengeInstructions(domain: string, tool: string): string {
        const instructions: string[] = []
        
        if (tool === 'certbot') {
            instructions.push('# Certbot DNS Challenge (no sudo required):')
            instructions.push(`certbot certonly --manual --preferred-challenges dns -d ${domain}`)
            instructions.push('')
            instructions.push('# With GoDaddy DNS plugin:')
            instructions.push('pip install certbot-dns-godaddy')
            instructions.push(`certbot certonly --authenticator dns-godaddy -d ${domain}`)
        } else if (tool === 'acmesh') {
            instructions.push('# acme.sh DNS Challenge (no sudo required):')
            instructions.push(`~/.acme.sh/acme.sh --issue -d ${domain} --dns dns_gd`)
            instructions.push('')
            instructions.push('# First set GoDaddy API credentials:')
            instructions.push('export GD_Key="your_godaddy_api_key"')
            instructions.push('export GD_Secret="your_godaddy_api_secret"')
        }
        
        return instructions.join('\n')
    }
    
    /**
     * Setup SSL certificate using installed tools
     */
    async setupCertificate(domain: string, config: any): Promise<boolean> {
        const tools = await this.check()
        
        // Check if we have GoDaddy credentials for DNS challenge
        const hasGoDaddy = config.godaddy?.key && config.godaddy?.secret
        
        if (hasGoDaddy && tools.acmesh.installed) {
            console.log('🔐 Using acme.sh with GoDaddy DNS challenge...')
            return await this.setupAcmeshGoDaddy(domain, config.godaddy)
        }
        
        if (tools.certbot.installed && this.canSudo) {
            console.log('🔐 Using Certbot with standalone mode...')
            return await this.setupCertbotStandalone(domain, config.port || 80)
        }
        
        if (tools.acmesh.installed) {
            console.log('🔐 Using acme.sh with webroot mode...')
            return await this.setupAcmeshWebroot(domain, config.root)
        }
        
        console.log('⚠️  No SSL tools available. Please install certbot or acme.sh')
        return false
    }
    
    /**
     * Setup certificate using acme.sh with GoDaddy DNS
     */
    private async setupAcmeshGoDaddy(domain: string, godaddy: any): Promise<boolean> {
        const acmePath = path.join(this.homedir, '.acme.sh', 'acme.sh')
        
        try {
            // Set environment variables
            process.env.GD_Key = godaddy.key
            process.env.GD_Secret = godaddy.secret
            
            // Issue certificate
            const command = `${acmePath} --issue -d ${domain} --dns dns_gd`
            console.log(`Running: ${command}`)
            
            execSync(command, { stdio: 'inherit' })
            
            console.log('✅ SSL certificate issued successfully')
            return true
        } catch (error) {
            console.error('❌ Failed to issue certificate:', error)
            return false
        }
    }
    
    /**
     * Setup certificate using Certbot standalone
     */
    private async setupCertbotStandalone(domain: string, port: number): Promise<boolean> {
        try {
            const command = `sudo certbot certonly --standalone -d ${domain} --non-interactive --agree-tos --register-unsafely-without-email ${port !== 80 ? `--http-01-port ${port}` : ''}`
            
            console.log(`Running: ${command}`)
            execSync(command, { stdio: 'inherit' })
            
            console.log('✅ SSL certificate issued successfully')
            return true
        } catch (error) {
            console.error('❌ Failed to issue certificate:', error)
            return false
        }
    }
    
    /**
     * Setup certificate using acme.sh webroot
     */
    private async setupAcmeshWebroot(domain: string, webroot: string): Promise<boolean> {
        const acmePath = path.join(this.homedir, '.acme.sh', 'acme.sh')
        
        try {
            // Create webroot directory if needed
            const webrootPath = path.join(webroot, '.well-known', 'acme-challenge')
            fs.mkdirSync(webrootPath, { recursive: true })
            
            const command = `${acmePath} --issue -d ${domain} -w ${webroot}`
            console.log(`Running: ${command}`)
            
            execSync(command, { stdio: 'inherit' })
            
            console.log('✅ SSL certificate issued successfully')
            return true
        } catch (error) {
            console.error('❌ Failed to issue certificate:', error)
            return false
        }
    }
    
    /**
     * Print status report
     */
    async printStatus(): Promise<void> {
        const tools = await this.check()
        
        console.log('\n🔒 SSL Tools Status\n' + '─'.repeat(40))
        
        // Certbot
        if (tools.certbot.installed) {
            console.log(`✅ Certbot: v${tools.certbot.version}`)
        } else {
            console.log(`❌ Certbot: Not installed`)
            if (tools.certbot.installCommand) {
                console.log(`   Install: ${tools.certbot.installCommand}`)
            }
        }
        
        // acme.sh
        if (tools.acmesh.installed) {
            console.log(`✅ acme.sh: v${tools.acmesh.version}`)
            console.log(`   Location: ${tools.acmesh.command}`)
        } else {
            console.log(`❌ acme.sh: Not installed`)
            if (tools.acmesh.installCommand) {
                console.log(`   Install: ${tools.acmesh.installCommand}`)
            }
        }
        
        // OpenSSL
        if (tools.openssl.installed) {
            console.log(`✅ OpenSSL: v${tools.openssl.version}`)
        } else {
            console.log(`❌ OpenSSL: Not installed`)
            if (tools.openssl.installCommand) {
                console.log(`   Install: ${tools.openssl.installCommand}`)
            }
        }
        
        // Recommendations
        console.log('\n📝 Recommendations:')
        if (!this.isRoot && !this.canSudo) {
            console.log('• No sudo access: Use acme.sh with DNS challenge')
            console.log('• Alternative: Run Air on port 8080+ with reverse proxy')
        } else {
            console.log(`• Recommended tool: ${tools.recommended === 'acmesh' ? 'acme.sh' : 'Certbot'}`)
            console.log('• For automation: Use DNS challenge with API credentials')
        }
    }
}

/**
 * Export convenience functions
 */
export async function checkSSLTools(): Promise<SSLToolsResult> {
    const installer = new SSLToolsInstaller()
    return installer.check()
}

export async function installSSLTools(email?: string): Promise<string | null> {
    const installer = new SSLToolsInstaller()
    return installer.installRecommended(email)
}

export async function setupSSLCertificate(domain: string, config: any): Promise<boolean> {
    const installer = new SSLToolsInstaller()
    return installer.setupCertificate(domain, config)
}

export default SSLToolsInstaller