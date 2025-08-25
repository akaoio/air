/**
 * Uninstaller constructor - Initialize uninstaller instance
 */

export interface UninstallerOptions {
    force?: boolean
    keepData?: boolean
    dryRun?: boolean
}

export function constructor(options: UninstallerOptions = {}) {
    this.options = options
    this.completed = []
    this.errors = []
}
