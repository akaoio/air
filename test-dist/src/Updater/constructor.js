/**
 * Updater constructor - Initialize updater instance
 */
export function constructor(options = {}) {
    this.options = options;
    this.updateStatus = {
        git: false,
        packages: false,
        restarted: false
    };
}
//# sourceMappingURL=constructor.js.map