#!/usr/bin/env bun
"use strict";
// fallback: #!/usr/bin/env tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const url_1 = require("url");
const paths_js_1 = require("../src/paths.js");
const tui_1 = require("@akaoio/tui");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
class AirStatus {
    constructor() {
        this.paths = (0, paths_js_1.getPaths)();
        this.ui = new tui_1.TUI({ title: 'Air System Status' });
        this.config = this.loadConfig();
    }
    loadConfig() {
        const configPath = path_1.default.join(this.paths.root, 'air.json');
        if (fs_1.default.existsSync(configPath)) {
            try {
                return JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
            }
            catch {
                return null;
            }
        }
        return null;
    }
    checkProcess() {
        if (!this.config) {
            return { running: false, message: 'Configuration not found' };
        }
        const name = this.config.name || 'air';
        // Check PID file
        const pidFile = path_1.default.join(this.paths.root, `.${name}.pid`);
        if (fs_1.default.existsSync(pidFile)) {
            try {
                const pid = parseInt(fs_1.default.readFileSync(pidFile, 'utf8').trim());
                // Verify process is actually running
                try {
                    process.kill(pid, 0); // Signal 0 tests if process exists
                    return { running: true, pid, message: `Process running (PID: ${pid})` };
                }
                catch {
                    // PID file exists but process is not running - stale PID
                    return { running: false, message: `Stale PID file found (PID: ${pid})` };
                }
            }
            catch {
                return { running: false, message: 'Invalid PID file' };
            }
        }
        // No PID file found
        return { running: false, message: 'No PID file found' };
    }
    checkService() {
        if (!this.config) {
            return { installed: false, running: false, message: 'Not configured' };
        }
        const name = this.config.name || 'air';
        const serviceName = `air-${name}`;
        // Check platform-specific services
        if ((0, tui_1.isWindows)()) {
            // Check Windows startup folder
            const startupPath = path_1.default.join(process.env.APPDATA || '', '..', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
            const batchFile = path_1.default.join(startupPath, `${serviceName}.bat`);
            if (fs_1.default.existsSync(batchFile)) {
                return { installed: true, running: false, message: 'Windows startup configured' };
            }
        }
        else if ((0, tui_1.isMac)()) {
            // Check launchd
            const plistFile = path_1.default.join(process.env.HOME || '', 'Library', 'LaunchAgents', `com.air.${name}.plist`);
            if (fs_1.default.existsSync(plistFile)) {
                try {
                    const status = (0, child_process_1.execSync)(`launchctl list | grep "com.air.${name}"`, { encoding: 'utf8' });
                    return { installed: true, running: true, message: 'launchd service active' };
                }
                catch {
                    return { installed: true, running: false, message: 'launchd service installed' };
                }
            }
        }
        else if ((0, tui_1.isTermux)()) {
            // Check Termux services
            const serviceDir = path_1.default.join(process.env.PREFIX || '/data/data/com.termux/files/usr', 'var', 'service', serviceName);
            if (fs_1.default.existsSync(serviceDir)) {
                try {
                    (0, child_process_1.execSync)(`sv status ${serviceName}`, { stdio: 'ignore' });
                    return { installed: true, running: true, message: 'Termux service running' };
                }
                catch {
                    return { installed: true, running: false, message: 'Termux service stopped' };
                }
            }
        }
        else if ((0, tui_1.hasSystemd)()) {
            // Check systemd (user service first)
            try {
                const status = (0, child_process_1.execSync)(`systemctl --user is-active ${serviceName}`, { encoding: 'utf8' }).trim();
                if (status === 'active') {
                    return { installed: true, running: true, message: 'User systemd service active' };
                }
                else {
                    return { installed: true, running: false, message: `User systemd service ${status}` };
                }
            }
            catch {
                // Try system service
                try {
                    const status = (0, child_process_1.execSync)(`systemctl is-active ${serviceName} 2>/dev/null`, { encoding: 'utf8' }).trim();
                    if (status === 'active') {
                        return { installed: true, running: true, message: 'System service active' };
                    }
                    else {
                        return { installed: true, running: false, message: `System service ${status}` };
                    }
                }
                catch {
                    // No systemd service found
                }
            }
        }
        // Check cron
        try {
            const crontab = (0, child_process_1.execSync)('crontab -l 2>/dev/null', { encoding: 'utf8' });
            if (crontab.includes(this.paths.root) || crontab.includes(name)) {
                return { installed: true, running: false, message: 'Cron job configured' };
            }
        }
        catch {
            // No crontab
        }
        return { installed: false, running: false, message: 'No service installed' };
    }
    checkPort() {
        if (!this.config) {
            return { port: 8765, inUse: false };
        }
        const env = this.config.env || 'development';
        const port = this.config[env]?.port || 8765;
        try {
            if ((0, tui_1.isWindows)()) {
                // Windows: use netstat
                const output = (0, child_process_1.execSync)(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
                const lines = output.trim().split('\n');
                if (lines.length > 0 && lines[0]) {
                    const parts = lines[0].trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    return { port, inUse: true, processInfo: `PID ${pid}` };
                }
            }
            else {
                // Unix-like: use lsof
                const output = (0, child_process_1.execSync)(`lsof -i:${port} 2>/dev/null`, { encoding: 'utf8' });
                const lines = output.trim().split('\n');
                if (lines.length > 1) {
                    const parts = lines[1].trim().split(/\s+/);
                    return { port, inUse: true, processInfo: `${parts[0]} (PID ${parts[1]})` };
                }
            }
        }
        catch {
            // Port is not in use
        }
        return { port, inUse: false };
    }
    getSSLStatus() {
        if (!this.config) {
            return { configured: false };
        }
        const env = this.config.env || 'development';
        const ssl = this.config[env]?.ssl;
        if (!ssl || !ssl.cert || !ssl.key) {
            return { configured: false };
        }
        // Check if certificate files exist
        if (!fs_1.default.existsSync(ssl.cert) || !fs_1.default.existsSync(ssl.key)) {
            return { configured: true, valid: false };
        }
        // Check certificate validity and expiry
        try {
            const certInfo = (0, child_process_1.execSync)(`openssl x509 -enddate -noout -in "${ssl.cert}"`, { encoding: 'utf8' });
            const expiryMatch = certInfo.match(/notAfter=(.+)/);
            if (expiryMatch) {
                const expiryDate = new Date(expiryMatch[1]);
                const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return {
                    configured: true,
                    valid: daysUntilExpiry > 0,
                    expiry: `${daysUntilExpiry} days`
                };
            }
        }
        catch {
            // Could not check certificate
        }
        return { configured: true, valid: true };
    }
    async run() {
        this.ui.clear();
        console.log(this.ui.createHeader());
        if (!this.config) {
            this.ui.showError('Air is not configured', 'Run install.ts to set up Air');
            this.ui.close();
            return;
        }
        const items = [];
        // Configuration info
        const env = this.config.env || 'development';
        items.push({ label: 'Name', value: this.config.name || 'air', status: 'info' });
        items.push({ label: 'Environment', value: env, status: 'info' });
        items.push({ label: 'Root', value: this.config.root || this.paths.root, status: 'info' });
        const configSection = this.ui.createStatusSection('Configuration', items);
        console.log(configSection);
        // Process status
        const processItems = [];
        const processStatus = this.checkProcess();
        processItems.push({
            label: 'Process',
            value: processStatus.message,
            status: processStatus.running ? 'success' : 'warning'
        });
        // Service status
        const serviceStatus = this.checkService();
        processItems.push({
            label: 'Service',
            value: serviceStatus.message,
            status: serviceStatus.installed ?
                (serviceStatus.running ? 'success' : 'warning') : 'info'
        });
        // Port status
        const portStatus = this.checkPort();
        processItems.push({
            label: `Port ${portStatus.port}`,
            value: portStatus.inUse ?
                `In use${portStatus.processInfo ? ' by ' + portStatus.processInfo : ''}` :
                'Available',
            status: portStatus.inUse ?
                (processStatus.running ? 'success' : 'warning') : 'info'
        });
        const processSection = this.ui.createStatusSection('Runtime Status', processItems);
        console.log(processSection);
        // Network configuration
        const networkItems = [];
        const domain = this.config[env]?.domain || 'localhost';
        const port = this.config[env]?.port || 8765;
        networkItems.push({ label: 'Domain', value: domain, status: 'info' });
        networkItems.push({ label: 'Port', value: String(port), status: 'info' });
        // SSL status
        const sslStatus = this.getSSLStatus();
        if (sslStatus.configured) {
            let sslValue = 'Configured';
            if (sslStatus.valid !== undefined) {
                sslValue = sslStatus.valid ?
                    `Valid (expires in ${sslStatus.expiry})` :
                    'Invalid or missing';
            }
            networkItems.push({
                label: 'SSL',
                value: sslValue,
                status: sslStatus.valid === false ? 'error' : 'success'
            });
        }
        else {
            networkItems.push({ label: 'SSL', value: 'Not configured', status: 'info' });
        }
        // DDNS status
        const ddns = this.config[env]?.godaddy;
        if (ddns) {
            networkItems.push({
                label: 'DDNS',
                value: `GoDaddy (${ddns.host}.${ddns.domain})`,
                status: 'success'
            });
        }
        else {
            networkItems.push({ label: 'DDNS', value: 'Not configured', status: 'info' });
        }
        // Peers
        const peers = this.config[env]?.peers || [];
        networkItems.push({
            label: 'Peers',
            value: peers.length > 0 ? `${peers.length} configured` : 'None',
            status: 'info'
        });
        const networkSection = this.ui.createStatusSection('Network Configuration', networkItems);
        console.log(networkSection);
        // Overall status
        console.log('\n' + '═'.repeat(60));
        if (processStatus.running) {
            this.ui.showSuccess(`Air is running (PID: ${processStatus.pid})`);
            console.log(`\nAccess URL: ${sslStatus.configured ? 'https' : 'http'}://${domain}:${port}`);
        }
        else if (serviceStatus.installed) {
            this.ui.showWarning('Air is not running but service is installed');
            console.log('\nTo start Air:');
            if ((0, tui_1.isWindows)()) {
                console.log('  Restart your computer or run the startup batch file');
            }
            else if ((0, tui_1.isMac)()) {
                console.log(`  launchctl start com.air.${this.config.name}`);
            }
            else if ((0, tui_1.isTermux)()) {
                console.log(`  sv start air-${this.config.name}`);
            }
            else if ((0, tui_1.hasSystemd)()) {
                console.log(`  systemctl --user start air-${this.config.name}`);
            }
            else {
                console.log(`  ${typeof Bun !== 'undefined' ? 'bun' : 'node'} ${this.paths.root}/src/main.ts`);
            }
        }
        else {
            this.ui.showInfo('Air is not running');
            console.log('\nTo start Air:');
            console.log(`  ${typeof Bun !== 'undefined' ? 'bun' : 'node'} ${this.paths.root}/src/main.ts`);
        }
        console.log('\n' + '═'.repeat(60));
        this.ui.close();
    }
}
// Run status check
const status = new AirStatus();
status.run().catch(err => {
    console.error('Status check failed:', err);
    process.exit(1);
});
