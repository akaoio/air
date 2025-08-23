/**
 * Manager constructor - Initialize config manager instance
 */
export function constructor(options = {}) {
    this.options = options;
    this.config = null;
    this.configFile = options.configFile || options.path;
    this.configManager = null; // Will be initialized when needed
}
//# sourceMappingURL=constructor.js.map