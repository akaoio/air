/**
 * Get default configuration
 */

import { getpaths } from '../Path/index.js'
import type { AirConfig } from '../types/index.js'

export interface DefaultOptions {
    rootArg?: string
    bashArg?: string
}

export function defaults(options: DefaultOptions = {}): AirConfig {
    const paths = getpaths(options.rootArg, options.bashArg)
    
    const config: AirConfig = {
        root: paths.root || process.cwd(),
        bash: paths.bash || process.cwd() + '/script',
        name: process.env.NAME || 'air',
        env: 'development',
        sync: undefined,
        ip: {
            timeout: 5000,
            dnsTimeout: 3000,
            userAgent: 'Air-GUN-Peer/2.0',
            dns: [
                { resolver: 'resolver1.opendns.com', hostname: 'myip.opendns.com' },
                { resolver: '1.1.1.1', hostname: 'whoami.cloudflare' }
            ],
            http: [
                { url: 'https://api.ipify.org', format: 'text' },
                { url: 'https://icanhazip.com', format: 'text' }
            ]
        },
        development: {
            port: 8765,
            domain: 'localhost',
            peers: []
        },
        production: {
            port: 8765,
            domain: 'localhost',
            peers: []
        }
    }
    return config
}

export default defaults