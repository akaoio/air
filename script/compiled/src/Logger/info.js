export function info(message, ...args) {
    if (!this.enabled)
        return;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.name}] [INFO] ${message}`, ...args);
}
