export function warn(this: any, message: string, ...args: any[]) {
    if (!this.enabled) return
    
    const timestamp = new Date().toISOString()
    console.warn(`[${timestamp}] [${this.name}] [WARN] ${message}`, ...args)
}