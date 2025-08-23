#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { getPaths } from '../../dist/paths.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Simple console colors
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};
const colorize = (text, color) => {
    return `${colors[color]}${text}${colors.reset}`;
};
class AirStatus {
    config;
    paths;
    constructor() {
        this.paths = getPaths();
        this.config = this.loadConfig();
    }
    loadConfig() {
        const configPath = path.join(this.paths.root, 'air.json');
        if (fs.existsSync(configPath)) {
            try {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
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
        const pidFile = path.join(this.paths.root, `.${name}.pid`);
        if (fs.existsSync(pidFile)) {
            try {
                const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
                try {
                    process.kill(pid, 0);
                    return { running: true, pid, message: `Process running (PID: ${pid})` };
                }
                catch {
                    return { running: false, message: `Stale PID file found (PID: ${pid})` };
                }
            }
            catch {
                return { running: false, message: 'Invalid PID file' };
            }
        }
        return { running: false, message: 'No PID file found' };
    }
    checkPort() {
        if (!this.config) {
            return { port: 8765, inUse: false };
        }
        const env = this.config.env || 'development';
        const port = this.config[env]?.port || 8765;
        try {
            if (process.platform === 'win32') {
                const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
                const lines = output.trim().split('\n');
                if (lines.length > 0 && lines[0]) {
                    const parts = lines[0].trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    return { port, inUse: true, processInfo: `PID ${pid}` };
                }
            }
            else {
                const output = execSync(`lsof -i:${port} 2>/dev/null`, { encoding: 'utf8' });
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
    run() {
        // Clear console
        console.clear();
        // ASCII Art Header
        console.log(colorize('    ___     ____  ____  ', 'cyan'));
        console.log(colorize('   /   |   /  _/ / __ \\ ', 'cyan'));
        console.log(colorize('  / /| |   / /  / /_/ / ', 'cyan'));
        console.log(colorize(' / ___ | _/ /  / _, _/  ', 'cyan'));
        console.log(colorize('/_/  |_|/___/ /_/ |_|   ', 'cyan'));
        console.log();
        // Get runtime info
        const runtime = typeof Bun !== 'undefined' ? 'BUN' :
            typeof Deno !== 'undefined' ? 'DENO' : 'NODE';
        const version = this.config?.version || '2.0.0';
        console.log(colorize(`air v${version} (${runtime})`, 'bold'));
        console.log();
        if (!this.config) {
            console.log(colorize('Air is not configured.', 'red'));
            console.log('Run install script to set up Air.');
            process.exit(1);
        }
        // Configuration
        console.log(colorize('═══ Configuration ═══', 'magenta'));
        const env = this.config.env || 'development';
        console.log(`  ${colorize('Name:', 'gray')} ${this.config.name || 'air'}`);
        console.log(`  ${colorize('Environment:', 'gray')} ${env}`);
        console.log(`  ${colorize('Root:', 'gray')} ${this.config.root || this.paths.root}`);
        console.log();
        // Runtime Status
        console.log(colorize('═══ Runtime Status ═══', 'magenta'));
        const processStatus = this.checkProcess();
        const statusIcon = processStatus.running ? colorize('●', 'green') : colorize('○', 'yellow');
        console.log(`  ${colorize('Process:', 'gray')} ${statusIcon} ${processStatus.message}`);
        const portStatus = this.checkPort();
        const portColor = portStatus.inUse ?
            (processStatus.running ? 'green' : 'yellow') : 'gray';
        const portInfo = portStatus.inUse ?
            `In use${portStatus.processInfo ? ' by ' + portStatus.processInfo : ''}` :
            'Available';
        console.log(`  ${colorize(`Port ${portStatus.port}:`, 'gray')} ${colorize(portInfo, portColor)}`);
        console.log();
        // Network Configuration
        console.log(colorize('═══ Network Configuration ═══', 'magenta'));
        const domain = this.config[env]?.domain || 'localhost';
        const port = this.config[env]?.port || 8765;
        console.log(`  ${colorize('Domain:', 'gray')} ${domain}`);
        console.log(`  ${colorize('Port:', 'gray')} ${port}`);
        const ssl = this.config[env]?.ssl;
        if (ssl && ssl.cert && ssl.key) {
            const sslExists = fs.existsSync(ssl.cert) && fs.existsSync(ssl.key);
            const sslStatus = sslExists ? colorize('Configured', 'green') : colorize('Files missing', 'red');
            console.log(`  ${colorize('SSL:', 'gray')} ${sslStatus}`);
        }
        else {
            console.log(`  ${colorize('SSL:', 'gray')} Not configured`);
        }
        const ddns = this.config[env]?.godaddy;
        if (ddns) {
            console.log(`  ${colorize('DDNS:', 'gray')} GoDaddy (${ddns.host}.${ddns.domain})`);
        }
        else {
            console.log(`  ${colorize('DDNS:', 'gray')} Not configured`);
        }
        const peers = this.config[env]?.peers || [];
        console.log(`  ${colorize('Peers:', 'gray')} ${peers.length > 0 ? `${peers.length} configured` : 'None'}`);
        console.log();
        // Final Status
        const finalStatus = processStatus.running ?
            colorize('● RUNNING', 'green') :
            colorize('○ STOPPED', 'yellow');
        console.log(`Status: ${finalStatus}`);
    }
}
// Run
const status = new AirStatus();
status.run();
//# sourceMappingURL=status.js.map