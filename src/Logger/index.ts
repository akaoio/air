/**
 * Logger Class - Centralized logging system
 * Each method is in separate file following "Một hàm một file" principle
 */

import { constructor } from "./constructor.js"
import { debug } from "./debug.js"
import { info } from "./info.js"
import { warn } from "./warn.js"
import { error } from "./error.js"
import { log } from "./log.js"
import { file } from "./file.js"

export class Logger {
    constructor(name: string) {
        constructor.call(this, name)
    }

    debug(message: string, ...args: any[]) {
        return debug.call(this, message, ...args)
    }

    info(message: string, ...args: any[]) {
        return info.call(this, message, ...args)
    }

    warn(message: string, ...args: any[]) {
        return warn.call(this, message, ...args)
    }

    error(message: string, ...args: any[]) {
        return error.call(this, message, ...args)
    }

    log(level: string, message: string, ...args: any[]) {
        return log.call(this, level, message, ...args)
    }

    file(filePath?: string) {
        return file.call(this, filePath)
    }
}

// Singleton instance for global logging
export const logger = new Logger("air")

export default Logger
