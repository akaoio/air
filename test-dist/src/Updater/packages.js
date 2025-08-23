/**
 * Update packages (npm/bun)
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
export function packages(root) {
    try {
        const isBun = typeof global.Bun !== 'undefined';
        if (isBun) {
            // Update with Bun
            execSync('bun update', { stdio: 'pipe', cwd: root });
            // Check if lockfile was modified
            const lockfile = path.join(root, 'bun.lockb');
            if (fs.existsSync(lockfile)) {
                const stats = fs.statSync(lockfile);
                const recentlyModified = Date.now() - stats.mtime.getTime() < 10000;
                if (recentlyModified) {
                    return { success: true, message: 'Packages updated (Bun)' };
                }
            }
            return { success: true, message: 'All packages up to date (Bun)' };
        }
        else {
            // Update with npm
            const output = execSync('npm update', { encoding: 'utf8', cwd: root });
            // Try audit fix
            try {
                const auditOutput = execSync('npm audit fix', { encoding: 'utf8', cwd: root });
                if (auditOutput.includes('fixed')) {
                    return {
                        success: true,
                        message: 'Packages updated & vulnerabilities fixed'
                    };
                }
            }
            catch {
                // Audit fix failed, not critical
            }
            if (output.includes('updated')) {
                const match = output.match(/(\d+) packages?/);
                if (match) {
                    return {
                        success: true,
                        message: `${match[0]} updated`
                    };
                }
                return { success: true, message: 'Packages updated' };
            }
            return { success: true, message: 'All packages up to date' };
        }
    }
    catch (error) {
        return {
            success: false,
            message: 'Package update failed',
            details: error.message
        };
    }
}
export default packages;
//# sourceMappingURL=packages.js.map