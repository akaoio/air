export function debug(message, ...args) {
    if (!this.enabled)
        return;
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${this.name}] [DEBUG] ${message}`, ...args);
    }
}
//# sourceMappingURL=debug.js.map