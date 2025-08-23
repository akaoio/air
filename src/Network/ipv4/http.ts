/**
 * Get IPv4 address via HTTP
 */

import fetch from 'node-fetch'
import { ipv4Services } from '../constants.js'
import { validate } from '../validate.js'

export async function http(): Promise<string | null> {
    for (const service of ipv4Services) {
        try {
            const response = await fetch(service, {
                headers: { 'User-Agent': 'Air-GUN-Peer/1.0' }
            } as any)
            const text = await response.text()
            
            // Handle JSON responses
            let ip = text.trim()
            try {
                const json = JSON.parse(text)
                ip = json.ip || json.address || ip
            } catch {}
            
            if (validate(ip)) {
                return ip
            }
        } catch {
            continue
        }
    }
    return null
}

export default http