/**
 * Clean Air files and directories
 */
import fs from 'fs';
import path from 'path';
export function clean(config, options) {
    const opts = options || {};
    let cleaned = 0;
    try {
        // Clean PID files
        const pidFiles = [
            path.join(config.root, `.${config.name}.pid`),
            ...fs.readdirSync(config.root)
                .filter(file => file.startsWith('.air') && file.endsWith('.pid'))
                .map(file => path.join(config.root, file))
        ];
        for (const pidFile of pidFiles) {
            if (fs.existsSync(pidFile)) {
                fs.unlinkSync(pidFile);
                cleaned++;
            }
        }
        // Clean config (optional)
        if (!opts.keepConfig) {
            const configFile = path.join(config.root, 'air.json');
            if (fs.existsSync(configFile)) {
                // Backup first
                const backupFile = configFile + '.backup';
                fs.copyFileSync(configFile, backupFile);
                fs.unlinkSync(configFile);
                cleaned++;
            }
        }
        // Clean DDNS state
        const ddnsFile = path.join(config.root, 'ddns.json');
        if (fs.existsSync(ddnsFile)) {
            fs.unlinkSync(ddnsFile);
            cleaned++;
        }
        // Clean logs (optional)
        if (!opts.keepLogs) {
            const logFiles = fs.readdirSync(config.root)
                .filter(file => file.endsWith('.log'))
                .map(file => path.join(config.root, file));
            for (const logFile of logFiles) {
                fs.unlinkSync(logFile);
                cleaned++;
            }
        }
        // Clean SSL (optional)
        if (!opts.keepSSL) {
            const sslDir = path.join(config.root, 'ssl');
            if (fs.existsSync(sslDir)) {
                fs.rmSync(sslDir, { recursive: true });
                cleaned++;
            }
        }
        // Clean node_modules (optional - very destructive)
        // Not doing this by default
        return {
            success: true,
            message: `${cleaned} items cleaned`,
            cleaned
        };
    }
    catch (error) {
        return {
            success: false,
            message: error.message,
            cleaned
        };
    }
}
export default clean;
//# sourceMappingURL=clean.js.map