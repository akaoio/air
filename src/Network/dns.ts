/**
 * DNS query helper
 */

import dnsModule from 'dns'

export async function dns(hostname: string, server: string, type: 'A' | 'AAAA' = 'A'): Promise<string> {
    return new Promise((resolve, reject) => {
        const resolver = new dnsModule.Resolver()
        resolver.setServers([server])
        
        const method = type === 'AAAA' ? 'resolve6' : 'resolve4'
        resolver[method](hostname, (err, addresses) => {
            if (err) reject(err)
            else if (addresses && addresses.length > 0) resolve(addresses[0] || '')
            else reject(new Error('No addresses found'))
        })
    })
}

export default dns