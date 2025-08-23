export function error(message, ...args) {
    if (!this.enabled)
        return;
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${this.name}] [ERROR] ${message}`, ...args);
}
