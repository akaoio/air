/**
 * Default configuration
 */

import type { AirConfig } from '../types/index.js'

export function defaults(this: any, options?: Partial<AirConfig>): AirConfig {
    const defaultConfig = {
        root: process.cwd(),
        bash: process.env.SHELL || '/bin/bash',
        name: 'air',
        env: 'development',
        port: 8765,
        domain: 'localhost',
        sync: undefined,
        ip: {
            timeout: 5000,
            dnsTimeout: 2000,
            userAgent: 'Air/2.0',
            dns: [
                { hostname: 'resolver1.opendns.com', resolver: 'myip.opendns.com' },
                { hostname: '8.8.8.8', resolver: 'o-o.myaddr.l.google.com' }
            ],
            http: [
                { url: 'https://icanhazip.com', format: 'text' },
                { url: 'https://api.ipify.org', format: 'text' }
            ]
        },
        development: {
            domain: 'localhost',
            port: 8765,
            peers: []
        },
        production: {
            domain: 'localhost',
            port: 8765,
            peers: []
        }
    } as AirConfig
    
    // Merge with options if provided
    if (options) {
        return { ...defaultConfig, ...options }
    }
    
    return defaultConfig
}

export default defaults