export function warn(message, ...args) {
    if (!this.enabled)
        return;
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${this.name}] [WARN] ${message}`, ...args);
}
