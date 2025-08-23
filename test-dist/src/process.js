#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
/**
 * Process management for Air
 * Handles PID files and process discovery
 */
class ProcessManager {
    config;
    pidFile;
    constructor(config = {}) {
        this.config = {
            name: config.name || 'air',
            root: config.root || process.cwd(),
            prefix: config.prefix || '.',
            suffix: config.suffix || '.pid'
        };
        this.pidFile = path.join(this.config.root, `${this.config.prefix}${this.config.name}${this.config.suffix}`);
    }
    /**
     * Check if another instance is running via PID file
     */
    check() {
        try {
            if (fs.existsSync(this.pidFile)) {
                const oldPid = parseInt(fs.readFileSync(this.pidFile, 'utf8'));
                // Check if process is actually running
                try {
                    process.kill(oldPid, 0);
                    console.error(`Another instance is already running (PID: ${oldPid})`);
                    console.error(`PID file: ${this.pidFile}`);
                    console.error('To stop it: kill ' + oldPid);
                    console.error('Or remove PID file if process is dead: rm ' + this.pidFile);
                    return true;
                }
                catch {
                    // Process is dead, clean up stale PID file
                    console.log('Found stale PID file, cleaning up...');
                    fs.unlinkSync(this.pidFile);
                }
            }
            // Write new PID file
            fs.writeFileSync(this.pidFile, process.pid.toString());
            // Register cleanup on exit
            process.on('exit', () => {
                this.clean();
            });
            process.on('SIGINT', () => {
                this.clean();
                process.exit(0);
            });
            process.on('SIGTERM', () => {
                this.clean();
                process.exit(0);
            });
            return false;
        }
        catch (error) {
            console.error('Error checking PID:', error.message);
            return false;
        }
    }
    /**
     * Clean up PID file
     */
    clean() {
        try {
            if (fs.existsSync(this.pidFile)) {
                const currentPid = parseInt(fs.readFileSync(this.pidFile, 'utf8'));
                if (currentPid === process.pid) {
                    fs.unlinkSync(this.pidFile);
                    console.log('PID file cleaned up');
                }
            }
        }
        catch (error) {
            console.error('Error cleaning PID file:', error.message);
        }
    }
    /**
     * Find process using a specific port
     */
    find(port) {
        try {
            let command;
            if (process.platform === 'darwin' || process.platform === 'linux') {
                command = `lsof -i:${port} -P -n | grep LISTEN | awk '{print $2}' | head -1`;
            }
            else if (process.platform === 'win32') {
                command = `netstat -ano | findstr :${port} | findstr LISTENING`;
                const output = execSync(command, { encoding: 'utf8' }).trim();
                const match = output.match(/\s+(\d+)\s*$/);
                if (match) {
                    return { pid: match[1], name: 'unknown' };
                }
                return null;
            }
            else {
                return null;
            }
            const pid = execSync(command, { encoding: 'utf8' }).trim();
            if (pid) {
                // Get process details
                const psCommand = process.platform === 'win32'
                    ? `tasklist /FI "PID eq ${pid}" /FO CSV`
                    : `ps -p ${pid} -o comm=`;
                try {
                    const processName = execSync(psCommand, { encoding: 'utf8' }).trim();
                    return { pid, name: processName };
                }
                catch {
                    return { pid, name: 'unknown' };
                }
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * Kill process by PID
     */
    kill(pid) {
        try {
            const numPid = typeof pid === 'string' ? parseInt(pid) : pid;
            process.kill(numPid, 'SIGTERM');
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Check if a process is running
     */
    isRunning(pid) {
        try {
            const numPid = typeof pid === 'string' ? parseInt(pid) : pid;
            process.kill(numPid, 0);
            return true;
        }
        catch {
            return false;
        }
    }
}
export { ProcessManager };
export default ProcessManager;
//# sourceMappingURL=process.js.map