/**
 * Updater constructor - Initialize updater instance
 */

export interface UpdaterOptions {
    autoRestart?: boolean
    backupBeforeUpdate?: boolean
    timeout?: number
}

export function constructor(options: UpdaterOptions = {}) {
    this.options = options
    this.updateStatus = {
        git: false,
        packages: false,
        restarted: false
    }
}