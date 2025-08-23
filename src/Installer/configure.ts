/**
 * Configure installation
 */

import type { InstallOptions } from './types.js'
import type { AirConfig } from '../types/index.js'

export function configure(options: InstallOptions): AirConfig {
    const root = options.root || process.cwd()
    const bash = options.bash || process.env.SHELL || '/bin/bash'
    const env = options.env || 'development'
    
    const config: AirConfig = {
        root,
        bash,
        env,
        name: options.name || 'air',
        port: env === 'production' ? (options.port || 8765) : (options.port || 8765),
        domain: env === 'production' ? (options.domain || 'example.com') : (options.domain || 'localhost'),
        sync: options.sync || undefined,
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
            domain: env === 'development' ? (options.domain || 'localhost') : 'localhost',
            port: env === 'development' ? (options.port || 8765) : 8765,
            peers: []
        },
        production: {
            domain: env === 'production' ? (options.domain || 'example.com') : 'example.com',
            port: env === 'production' ? (options.port || 8765) : 8765,
            peers: []
        }
    }
    
    // Add GoDaddy config if provided
    if (options.godaddy && env === 'production' && config.production) {
        config.production.godaddy = options.godaddy
    }
    
    return config
}

export default configure