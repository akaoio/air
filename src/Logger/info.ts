export function info(this: any, message: string, ...args: any[]) {
    if (!this.enabled) return
    
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [${this.name}] [INFO] ${message}`, ...args)
}