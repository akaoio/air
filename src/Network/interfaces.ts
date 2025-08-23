/**
 * Get network interfaces info
 */

import os from 'os'

export interface InterfaceInfo {
    name: string
    address: string
    family: string
    mac: string
    netmask: string
    cidr: string
}

export function interfaces(): InterfaceInfo[] {
    const interfaces = os.networkInterfaces()
    const result: InterfaceInfo[] = []
    
    for (const [name, configs] of Object.entries(interfaces)) {
        for (const config of (configs as any)) {
            if (!config.internal) {
                result.push({
                    name,
                    address: config.address,
                    family: config.family,
                    mac: config.mac,
                    netmask: config.netmask,
                    cidr: config.cidr
                })
            }
        }
    }
    
    return result
}

export default interfaces