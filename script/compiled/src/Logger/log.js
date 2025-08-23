import * as fs from 'fs';
export function log(level, message, ...args) {
    if (!this.enabled)
        return;
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();
    const prefix = `[${timestamp}] [${this.name}] [${levelUpper}]`;
    const fullMessage = `${prefix} ${message}`;
    const argsString = args.length > 0 ? ' ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') : '';
    // File output first (if enabled)
    if (this.filePath) {
        try {
            fs.appendFileSync(this.filePath, fullMessage + argsString + '\n');
        }
        catch (err) {
            console.error(`[${this.name}] Failed to write to log file: ${err}`);
        }
    }
    // Console output
    switch (levelUpper) {
        case 'DEBUG':
            if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
                console.log(fullMessage, ...args);
            }
            break;
        case 'INFO':
            console.log(fullMessage, ...args);
            break;
        case 'WARN':
            console.warn(fullMessage, ...args);
            break;
        case 'ERROR':
            console.error(fullMessage, ...args);
            break;
        default:
            console.log(fullMessage, ...args);
    }
}
