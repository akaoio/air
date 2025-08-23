/**
 * Find process using a specific port
 */
import { execSync } from 'child_process';
export function find(port) {
    try {
        let command;
        if (process.platform === 'darwin' || process.platform === 'linux') {
            command = `lsof -i:${port} -P -n | grep LISTEN | awk '{print $2}' | head -1`;
        }
        else if (process.platform === 'win32') {
            command = `netstat -ano | findstr :${port} | findstr LISTENING`;
            const output = execSync(command, { encoding: 'utf8' }).trim();
            const match = output.match(/\s+(\d+)\s*$/);
            if (match && match[1]) {
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
export default find;
//# sourceMappingURL=find.js.map