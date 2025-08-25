export function error(this: any, message: string, ...args: any[]) {
    if (!this.enabled) return

    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] [${this.name}] [ERROR] ${message}`, ...args)
}
