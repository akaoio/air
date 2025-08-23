/**
 * Monitor IP changes
 */

import { get } from './get.js'
import type { IPResult } from './get.js'

export async function monitor(
    callback: (current: IPResult, last?: IPResult) => void,
    interval: number = 300000 // 5 minutes default
): Promise<NodeJS.Timer> {
    let lastIPs = await get()
    callback(lastIPs)
    
    return setInterval(async () => {
        const currentIPs = await get()
        
        // Check for changes
        if (currentIPs.ipv4 !== lastIPs.ipv4 || currentIPs.ipv6 !== lastIPs.ipv6) {
            callback(currentIPs, lastIPs)
            lastIPs = currentIPs
        }
    }, interval)
}

export default monitor