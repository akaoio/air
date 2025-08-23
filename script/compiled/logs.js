#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { getPaths } from '../../dist/paths.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const paths = getPaths();
// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    dim: '\x1b[2m'
};
// Parse command line arguments
const args = process.argv.slice(2);
const follow = args.includes('-f') || args.includes('--follow');
const lines = (() => {
    const lineArg = args.find(a => a.startsWith('-n=') || a.startsWith('--lines='));
    if (lineArg) {
        return parseInt(lineArg.split('=')[1]) || 50;
    }
    const nIndex = args.indexOf('-n');
    if (nIndex !== -1 && args[nIndex + 1]) {
        return parseInt(args[nIndex + 1]) || 50;
    }
    return 50;
})();
function showHelp() {
    console.log(`
${colors.cyan}${colors.bright}Air Logs Viewer${colors.reset}

${colors.yellow}Usage:${colors.reset}
  npm run logs [options]

${colors.yellow}Options:${colors.reset}
  -f, --follow       Follow log output (like tail -f)
  -n, --lines <num>  Number of lines to show (default: 50)
  -h, --help         Show this help message

${colors.yellow}Examples:${colors.reset}
  npm run logs              # Show last 50 lines
  npm run logs -n 100       # Show last 100 lines
  npm run logs -f           # Follow log output
  npm run logs -f -n 20     # Follow and show last 20 lines
`);
}
if (args.includes('-h') || args.includes('--help')) {
    showHelp();
    process.exit(0);
}
async function getServiceName() {
    try {
        const configPath = paths.config;
        if (!fs.existsSync(configPath)) {
            return 'air';
        }
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.name || 'air';
    }
    catch (e) {
        return 'air';
    }
}
async function showSystemdLogs(serviceName) {
    const service = `air-${serviceName}`;
    console.log(`${colors.cyan}● Showing logs for systemd service: ${service}${colors.reset}`);
    console.log(`${colors.dim}(Press Ctrl+C to exit)${colors.reset}\n`);
    const args = ['-u', service, '--no-pager'];
    if (!follow) {
        args.push('-n', String(lines));
    }
    else {
        args.push('-f', '-n', String(lines));
    }
    const journalctl = spawn('journalctl', args, {
        stdio: 'inherit'
    });
    journalctl.on('error', (err) => {
        if (err.code === 'ENOENT') {
            console.error(`${colors.red}Error: journalctl not found. Systemd may not be available on this system.${colors.reset}`);
        }
        else {
            console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
        }
        showFileLogs();
    });
    journalctl.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`${colors.yellow}Warning: Unable to read systemd logs. Falling back to file logs...${colors.reset}\n`);
            showFileLogs();
        }
    });
}
function showFileLogs() {
    // Look for log files in common locations
    const logLocations = [
        path.join(paths.root, 'air.log'),
        path.join(paths.root, 'logs', 'air.log'),
        path.join('/var/log', 'air.log'),
        path.join('/tmp', 'air.log')
    ];
    let logFile = null;
    for (const location of logLocations) {
        if (fs.existsSync(location)) {
            logFile = location;
            break;
        }
    }
    if (!logFile) {
        console.log(`${colors.yellow}No log files found.${colors.reset}`);
        console.log(`\n${colors.cyan}Tip:${colors.reset} If Air is running, you can see its output using:`);
        console.log(`  ${colors.bright}npm start${colors.reset}`);
        console.log(`\nOr check systemd status with:`);
        console.log(`  ${colors.bright}systemctl status air-<name>${colors.reset}`);
        return;
    }
    console.log(`${colors.cyan}● Showing logs from: ${logFile}${colors.reset}\n`);
    if (follow) {
        const tail = spawn('tail', ['-f', '-n', String(lines), logFile], {
            stdio: 'inherit'
        });
        tail.on('error', (err) => {
            console.error(`${colors.red}Error reading log file: ${err.message}${colors.reset}`);
        });
    }
    else {
        try {
            const content = fs.readFileSync(logFile, 'utf8');
            const allLines = content.split('\n');
            const lastLines = allLines.slice(-lines).join('\n');
            console.log(lastLines);
        }
        catch (err) {
            console.error(`${colors.red}Error reading log file: ${err.message}${colors.reset}`);
        }
    }
}
// Main execution
async function main() {
    const serviceName = await getServiceName();
    // Try systemd logs first
    try {
        await showSystemdLogs(serviceName);
    }
    catch (e) {
        // Fallback to file logs
        showFileLogs();
    }
}
// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log(`\n${colors.cyan}Stopped.${colors.reset}`);
    process.exit(0);
});
main().catch(err => {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
    process.exit(1);
});
//# sourceMappingURL=logs.js.map