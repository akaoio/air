/**
 * Check if IPv6 is available on the system
 */

import net from 'net'
import os from 'os'

export async function has(): Promise<boolean> {
    try {
        // Try to create an IPv6 socket
        const socket = net.createConnection({ port: 443, host: '::1', family: 6 })
        socket.on('error', () => {})
        socket.destroy()
        
        // Check for IPv6 interfaces
        const interfaces = os.networkInterfaces()
        for (const iface of Object.values(interfaces)) {
            for (const config of (iface as any)) {
                if (config.family === 'IPv6' && !config.internal) {
                    return true
                }
            }
        }
        return false
    } catch {
        return false
    }
}

export default has