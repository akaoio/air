#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx
/**
 * Simple Air Installer without TUI
 * Plain console-based installer that works reliably
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { getPaths } from '../dist/paths.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Simple prompt function
function prompt(question, defaultValue = '') {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        const q = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
        rl.question(q, (answer) => {
            rl.close();
            resolve(answer || defaultValue);
        });
    });
}
// Simple confirm function
async function confirm(question, defaultValue = true) {
    const answer = await prompt(`${question} (y/n)`, defaultValue ? 'y' : 'n');
    return answer.toLowerCase().startsWith('y');
}
// Simple select function
async function select(question, options) {
    console.log(`\n${question}:`);
    options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
    const answer = await prompt('Select option', '1');
    const index = parseInt(answer) - 1;
    return options[index] || options[0];
}
class SimpleAirInstaller {
    constructor() {
        this.args = this.parseArgs();
        const paths = getPaths(this.args.root, this.args.bash);
        this.config = {
            name: this.args.name || 'air',
            env: this.args.env || 'development',
            root: paths.root,
            bash: paths.bash
        };
        this.platform = os.platform();
        this.hostname = os.hostname();
    }
    parseArgs() {
        const args = {
            nonInteractive: false,
            quick: false,
            check: false
        };
        const argv = process.argv.slice(2);
        for (let i = 0; i < argv.length; i++) {
            const arg = argv[i];
            const next = argv[i + 1];
            switch (arg) {
                case '--help':
                case '-h':
                    this.showHelp();
                    process.exit(0);
                    break;
                case '--check':
                    args.check = true;
                    break;
                case '--quick':
                case '-q':
                    args.quick = true;
                    args.nonInteractive = true;
                    break;
                case '--non-interactive':
                case '-n':
                    args.nonInteractive = true;
                    break;
                case '--root':
                case '-r':
                    args.root = next;
                    i++;
                    break;
                case '--env':
                case '-e':
                    args.env = next;
                    i++;
                    break;
                case '--name':
                    args.name = next;
                    i++;
                    break;
                case '--port':
                case '-p':
                    args.port = parseInt(next);
                    i++;
                    break;
                case '--domain':
                case '-d':
                    args.domain = next;
                    i++;
                    break;
            }
        }
        return args;
    }
    showHelp() {
        console.log(`
Air GUN Database Installer

Usage: air:install [options]

Options:
  -h, --help              Show this help message
  -q, --quick             Quick install with defaults
  -n, --non-interactive   Non-interactive mode
  --check                 Check installation only
  -r, --root <path>       Set root directory
  -e, --env <env>         Set environment (development/production)
  --name <name>           Set instance name
  -p, --port <port>       Set port number
  -d, --domain <domain>   Set domain name
  --no-tui, --simple      Use simple installer (no TUI)
`);
    }
    async run() {
        try {
            console.log('\n╔══════════════════════════════════════════════════════════╗');
            console.log('║              Air GUN Database Installer (Simple)          ║');
            console.log('╚══════════════════════════════════════════════════════════╝\n');
            if (this.args.check) {
                await this.checkInstallation();
                return;
            }
            await this.checkSystem();
            await this.configureInstance();
            await this.saveConfiguration();
            await this.setupSSL();
            await this.setupService();
            await this.finalReport();
        }
        catch (err) {
            console.error('\n❌ Installation failed:', err.message);
            process.exit(1);
        }
    }
    async checkSystem() {
        console.log('\n📋 System Check\n' + '─'.repeat(40));
        const checks = [];
        // Check Node.js
        try {
            const nodeVersion = process.version;
            checks.push(`✅ Node.js: ${nodeVersion}`);
        }
        catch {
            checks.push('❌ Node.js: Not found');
        }
        // Check Bun
        try {
            const bunVersion = execSync('bun --version', { encoding: 'utf8' }).trim();
            checks.push(`✅ Bun: v${bunVersion}`);
        }
        catch {
            checks.push('⚠️  Bun: Not installed (optional)');
        }
        // Check permissions
        let canWrite = false;
        try {
            if (fs.existsSync(this.config.root)) {
                fs.accessSync(this.config.root, fs.constants.W_OK);
                canWrite = true;
            }
            else {
                canWrite = true; // Directory doesn't exist, we can create it
            }
        }
        catch {
            canWrite = false;
        }
        checks.push(canWrite ? '✅ Write permissions: OK' : '❌ Write permissions: Failed');
        // Check existing config
        const configPath = path.join(this.config.root, 'air.json');
        if (fs.existsSync(configPath)) {
            checks.push('⚠️  Configuration: Exists');
            if (!this.args.nonInteractive) {
                const overwrite = await confirm('Overwrite existing configuration?', false);
                if (!overwrite) {
                    console.log('✅ Keeping existing configuration');
                    process.exit(0);
                }
            }
        }
        else {
            checks.push('✅ Configuration: Ready to create');
        }
        checks.forEach(check => console.log(check));
    }
    async configureInstance() {
        console.log('\n⚙️  Configuration\n' + '─'.repeat(40));
        if (!this.args.nonInteractive) {
            this.config.name = await prompt('Instance name', this.config.name);
            this.config.env = await select('Environment', ['development', 'production']);
            if (this.config.env === 'production') {
                this.config.domain = await prompt('Domain name', this.args.domain || '');
                this.config.port = parseInt(await prompt('Port', String(this.args.port || 8765)));
                const setupSSL = await confirm('Enable SSL?', true);
                if (setupSSL) {
                    this.config.ssl = {
                        cert: './ssl/cert.pem',
                        key: './ssl/key.pem'
                    };
                }
                const addPeers = await confirm('Add peer URLs?', false);
                if (addPeers) {
                    const peerList = await prompt('Peer URLs (comma-separated)', '');
                    this.config.peers = peerList.split(',').map(p => p.trim()).filter(p => p);
                }
                // GoDaddy DDNS
                const setupDDNS = await confirm('Configure GoDaddy DDNS?', false);
                if (setupDDNS) {
                    const godaddy = {
                        domain: '',
                        host: '',
                        key: '',
                        secret: ''
                    };
                    godaddy.domain = await prompt('GoDaddy domain (e.g., example.com)');
                    godaddy.host = await prompt('Subdomain/host (e.g., air)', '@');
                    godaddy.key = await prompt('GoDaddy API key');
                    godaddy.secret = await prompt('GoDaddy API secret');
                    this.config.godaddy = godaddy;
                }
            }
        }
        // Create full config structure following Air's expected format
        const fullConfig = {
            name: this.config.name,
            env: this.config.env,
            root: this.config.root,
            bash: this.config.bash,
            sync: '',
            ip: {
                timeout: 5000,
                dnsTimeout: 2000,
                userAgent: 'Air/2.0',
                dns: [],
                http: []
            },
            development: {},
            production: {}
        };
        // Add environment-specific config
        const envConfig = {
            port: this.config.port || 8765,
            domain: this.config.domain,
            ssl: this.config.ssl,
            peers: this.config.peers || [],
            godaddy: this.config.godaddy
        };
        // Set the environment config
        fullConfig[this.config.env] = envConfig;
        // Update internal config
        this.config = fullConfig;
        console.log('\nConfiguration summary:');
        console.log(`  Name: ${this.config.name}`);
        console.log(`  Environment: ${this.config.env}`);
        console.log(`  Root: ${this.config.root}`);
        console.log(`  Port: ${this.config[this.config.env].port}`);
        if (this.config[this.config.env].domain) {
            console.log(`  Domain: ${this.config[this.config.env].domain}`);
        }
    }
    async saveConfiguration() {
        const configPath = path.join(this.config.root, 'air.json');
        try {
            // Ensure directory exists
            if (!fs.existsSync(this.config.root)) {
                fs.mkdirSync(this.config.root, { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
            console.log(`\n✅ Configuration saved to ${configPath}`);
        }
        catch (err) {
            throw new Error(`Failed to save configuration: ${err.message}`);
        }
    }
    async setupSSL() {
        if (!this.config[this.config.env]?.ssl)
            return;
        console.log('\n🔒 SSL Setup\n' + '─'.repeat(40));
        // First check and install SSL tools if needed
        const { SSLToolsInstaller } = await import('../dist/Installer/ssl-tools.js');
        const sslTools = new SSLToolsInstaller();
        // Check current SSL tools status
        const toolsStatus = await sslTools.check();
        await sslTools.printStatus();
        const sslDir = path.join(this.config.root, 'ssl');
        if (!fs.existsSync(sslDir)) {
            fs.mkdirSync(sslDir, { recursive: true });
        }
        const certPath = path.join(sslDir, 'cert.pem');
        const keyPath = path.join(sslDir, 'key.pem');
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
            console.log('\n✅ SSL certificates already exist');
            return;
        }
        if (!this.args.nonInteractive) {
            const sslMethods = [
                'Self-signed (for testing)',
                'Let\'s Encrypt (production)',
                'Manual (I\'ll provide certificates)'
            ];
            const sslMethod = await select('SSL Certificate Method', sslMethods);
            if (sslMethod === 'Self-signed (for testing)') {
                // Check if OpenSSL is available
                if (!toolsStatus.openssl.installed) {
                    console.log('⚠️  OpenSSL not found. Please install it first.');
                    return;
                }
                try {
                    const domain = this.config[this.config.env].domain || 'localhost';
                    execSync(`openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/CN=${domain}"`, {
                        stdio: 'pipe'
                    });
                    console.log('✅ Self-signed certificate generated');
                }
                catch (err) {
                    console.log('⚠️  Failed to generate certificate:', err.message);
                }
            }
            else if (sslMethod === 'Let\'s Encrypt (production)') {
                const domain = this.config[this.config.env].domain;
                if (!domain) {
                    console.log('❌ Domain name required for Let\'s Encrypt');
                    return;
                }
                // Check if we need to install SSL tools
                if (!toolsStatus.certbot.installed && !toolsStatus.acmesh.installed) {
                    const install = await confirm('No SSL tools found. Install recommended tool?', true);
                    if (install) {
                        const email = await prompt('Email for SSL notifications (optional)', '');
                        const installed = await sslTools.installRecommended(email);
                        if (installed) {
                            console.log(`✅ Installed ${installed === 'acmesh' ? 'acme.sh' : 'Certbot'}`);
                        }
                        else {
                            console.log('❌ Failed to install SSL tools');
                            return;
                        }
                    }
                }
                // Setup certificate
                const hasGoDaddy = this.config[this.config.env].godaddy?.key && this.config[this.config.env].godaddy?.secret;
                if (hasGoDaddy) {
                    console.log('\n🔑 Using GoDaddy DNS challenge (no ports required)...');
                    const success = await sslTools.setupCertificate(domain, this.config[this.config.env]);
                    if (success) {
                        console.log('✅ SSL certificate configured successfully');
                        // Update paths for acme.sh certificates
                        if (toolsStatus.acmesh.installed || toolsStatus.recommended === 'acmesh') {
                            const acmeCertPath = path.join(os.homedir(), '.acme.sh', domain, 'fullchain.cer');
                            const acmeKeyPath = path.join(os.homedir(), '.acme.sh', domain, `${domain}.key`);
                            if (fs.existsSync(acmeCertPath) && fs.existsSync(acmeKeyPath)) {
                                // Create symlinks
                                fs.symlinkSync(acmeCertPath, certPath);
                                fs.symlinkSync(acmeKeyPath, keyPath);
                                console.log('✅ SSL certificates linked to Air directory');
                            }
                        }
                    }
                    else {
                        console.log('⚠️  Certificate setup failed. Please try manual setup.');
                    }
                }
                else {
                    console.log('\n📝 To use Let\'s Encrypt, you need to:');
                    console.log('1. Configure GoDaddy API credentials for DNS challenge');
                    console.log('2. Or run Air on port 80 (requires sudo)');
                    console.log('3. Or use a reverse proxy');
                    // Show instructions
                    const tool = toolsStatus.recommended || 'certbot';
                    const instructions = sslTools.getDNSChallengeInstructions(domain, tool);
                    console.log('\nManual setup instructions:');
                    console.log(instructions);
                }
            }
            else {
                console.log('📝 Please place your SSL certificates in:');
                console.log(`   Certificate: ${certPath}`);
                console.log(`   Private Key: ${keyPath}`);
            }
        }
        else {
            // Non-interactive mode: check and install SSL tools if needed
            if (!toolsStatus.certbot.installed && !toolsStatus.acmesh.installed) {
                console.log('📦 Installing recommended SSL tool...');
                const installed = await sslTools.installRecommended();
                if (installed) {
                    console.log(`✅ Installed ${installed === 'acmesh' ? 'acme.sh' : 'Certbot'}`);
                }
            }
        }
    }
    async setupService() {
        if (this.args.nonInteractive)
            return;
        console.log('\n🚀 Service Setup\n' + '─'.repeat(40));
        const setupService = await confirm('Set up auto-start service?', false);
        if (!setupService) {
            console.log('⏭️  Skipping service setup');
            return;
        }
        if (this.platform === 'linux' && fs.existsSync('/etc/systemd/system')) {
            // Create systemd service
            const serviceName = `${this.config.name}.service`;
            const serviceContent = `[Unit]
Description=Air GUN Database - ${this.config.name}
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${this.config.root}
ExecStart=/usr/bin/node ${this.config.root}/dist/main.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`;
            const servicePath = `/etc/systemd/system/${serviceName}`;
            console.log(`\n📝 To install as systemd service, run:`);
            console.log(`   sudo tee ${servicePath} << EOF`);
            console.log(serviceContent);
            console.log('EOF');
            console.log(`   sudo systemctl daemon-reload`);
            console.log(`   sudo systemctl enable ${serviceName}`);
            console.log(`   sudo systemctl start ${serviceName}`);
        }
        else {
            console.log('ℹ️  Manual service setup required for your platform');
        }
    }
    async checkInstallation() {
        console.log('\n🔍 Checking Installation\n' + '─'.repeat(40));
        const configPath = path.join(this.config.root, 'air.json');
        if (fs.existsSync(configPath)) {
            console.log('✅ Configuration file exists');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log(`   Name: ${config.name}`);
            console.log(`   Environment: ${config.env}`);
        }
        else {
            console.log('❌ Configuration file not found');
        }
        // Check if service is running
        try {
            execSync(`pgrep -f "${this.config.name}"`, { stdio: 'pipe' });
            console.log('✅ Service is running');
        }
        catch {
            console.log('⚠️  Service is not running');
        }
    }
    async finalReport() {
        console.log('\n' + '═'.repeat(60));
        console.log('✅ Installation complete!');
        console.log('\n📋 Next steps:');
        console.log('1. Start the server:');
        console.log(`   cd ${this.config.root}`);
        console.log('   npm start');
        console.log('');
        console.log('2. Test the installation:');
        console.log(`   curl http://localhost:${this.config[this.config.env].port}/gun`);
        if (this.config[this.config.env].domain) {
            console.log('');
            console.log('3. Access your instance:');
            console.log(`   https://${this.config[this.config.env].domain}:${this.config[this.config.env].port}/gun`);
        }
    }
}
// Run installer if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const installer = new SimpleAirInstaller();
    installer.run();
}
export default SimpleAirInstaller;
