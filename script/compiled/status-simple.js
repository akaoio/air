#!/usr/bin/env node
/**
 * Simple Status Output - TypeScript
 * Fast, minimal status check without TUI overhead
 */
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);
function getSimpleStatus() {
    // Read config
    const configPath = join(projectRoot, 'air.json');
    const config = existsSync(configPath)
        ? JSON.parse(readFileSync(configPath, 'utf8'))
        : { name: 'air', env: 'DEVELOPMENT', port: 8765 };
    // Check if process is running
    let running = false;
    let pid;
    let uptime;
    try {
        const pidFiles = [
            join(process.env.HOME || '/tmp', '.local/state/air', `${config.name}.pid`),
            join(projectRoot, `.${config.name}.pid`)
        ];
        for (const pidFile of pidFiles) {
            if (existsSync(pidFile)) {
                const pidStr = readFileSync(pidFile, 'utf8').trim();
                const processPid = parseInt(pidStr);
                try {
                    process.kill(processPid, 0); // Check if process exists
                    running = true;
                    pid = processPid;
                    // Get uptime if possible
                    try {
                        const stat = execSync(`ps -o etime= -p ${processPid}`, { encoding: 'utf8' });
                        uptime = stat.trim();
                    }
                    catch { }
                    break;
                }
                catch { }
            }
        }
    }
    catch { }
    // Get version
    const packagePath = join(projectRoot, 'package.json');
    const pkg = existsSync(packagePath)
        ? JSON.parse(readFileSync(packagePath, 'utf8'))
        : { version: '2.0.0' };
    return {
        name: config.name,
        env: config.env || 'DEVELOPMENT',
        port: config.port || 8765,
        running,
        pid,
        uptime,
        version: pkg.version
    };
}
function printSimpleStatus() {
    try {
        const status = getSimpleStatus();
        const runtime = 'NODE';
        console.log(`air v${status.version} (${runtime})`);
        console.log(`Environment: ${status.env}`);
        console.log(`Port: ${status.port}`);
        if (status.running) {
            console.log(`Status: ✅ RUNNING (PID: ${status.pid})`);
            if (status.uptime) {
                console.log(`Uptime: ${status.uptime}`);
            }
        }
        else {
            console.log(`Status: ⭕ STOPPED`);
            console.log(`Start: npm start`);
        }
    }
    catch (error) {
        console.error('Error getting status:', error.message);
        console.log('air v2.0.0 (NODE)');
        console.log('Status: ⭕ UNKNOWN');
    }
}
// Run if called directly
if (import.meta.main) {
    printSimpleStatus();
}
//# sourceMappingURL=status-simple.js.map