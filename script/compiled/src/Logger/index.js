/**
 * Logger Class - Centralized logging system
 * Each method is in separate file following "Một hàm một file" principle
 */
import { constructor } from './constructor.js';
import { debug } from './debug.js';
import { info } from './info.js';
import { warn } from './warn.js';
import { error } from './error.js';
import { log } from './log.js';
import { file } from './file.js';
export class Logger {
    constructor(name) {
        constructor.call(this, name);
    }
    debug(message, ...args) {
        return debug.call(this, message, ...args);
    }
    info(message, ...args) {
        return info.call(this, message, ...args);
    }
    warn(message, ...args) {
        return warn.call(this, message, ...args);
    }
    error(message, ...args) {
        return error.call(this, message, ...args);
    }
    log(level, message, ...args) {
        return log.call(this, level, message, ...args);
    }
    file(filePath) {
        return file.call(this, filePath);
    }
}
// Singleton instance for global logging
export const logger = new Logger('air');
export default Logger;
