/**
 * Central constants for Air - All configurable values
 * Environment variables take precedence over defaults
 */

// Network & Timing Constants
export const DEFAULTS = {
    // Timeouts (milliseconds)
    IP_TIMEOUT: parseInt(process.env.AIR_IP_TIMEOUT || '5000'),
    DNS_TIMEOUT: parseInt(process.env.AIR_DNS_TIMEOUT || '3000'),
    FETCH_TIMEOUT: parseInt(process.env.AIR_FETCH_TIMEOUT || '10000'),
    
    // Ports
    DEVELOPMENT_PORT: parseInt(process.env.AIR_DEV_PORT || '8765'),
    PRODUCTION_PORT: parseInt(process.env.AIR_PROD_PORT || '443'),
    
    // Intervals (milliseconds)
    STATUS_ALIVE_INTERVAL: parseInt(process.env.AIR_STATUS_ALIVE || '60000'), // 1 minute
    STATUS_IP_INTERVAL: parseInt(process.env.AIR_STATUS_IP || '300000'), // 5 minutes
    STATUS_DDNS_INTERVAL: parseInt(process.env.AIR_STATUS_DDNS || '300000'), // 5 minutes
    SYNC_INTERVAL: parseInt(process.env.AIR_SYNC_INTERVAL || '3600000'), // 1 hour
    
    // Restart Logic
    RESTART_BASE_DELAY: parseInt(process.env.AIR_RESTART_BASE_DELAY || '5000'),
    RESTART_MAX_DELAY: parseInt(process.env.AIR_RESTART_MAX_DELAY || '60000'),
    RESTART_MAX_ATTEMPTS: parseInt(process.env.AIR_RESTART_MAX_ATTEMPTS || '5'),
    RESTART_JITTER_PERCENT: parseFloat(process.env.AIR_RESTART_JITTER || '0.2'),
    
    // Domains
    DEVELOPMENT_DOMAIN: process.env.AIR_DEV_DOMAIN || 'localhost',
    PRODUCTION_DOMAIN: process.env.AIR_PROD_DOMAIN || '',
    
    // User Agent
    USER_AGENT: process.env.AIR_USER_AGENT || 'Air-GUN-Peer/2.0'
} as const

// IP Detection Services
export const IP_SERVICES = {
    dns: (process.env.AIR_DNS_RESOLVERS || 'resolver1.opendns.com:myip.opendns.com,1.1.1.1:whoami.cloudflare')
        .split(',')
        .map(entry => {
            const [resolver, hostname] = entry.split(':')
            return { resolver: resolver!, hostname: hostname! }
        }),
    
    http: (process.env.AIR_HTTP_RESOLVERS || 'https://api.ipify.org:text,https://icanhazip.com:text')
        .split(',')
        .map(entry => {
            const [url, format] = entry.split(':')
            return { url: url!, format: (format || 'text') as 'text' | 'json' }
        })
}

// File Paths
export const PATHS = {
    LOG_FILE: process.env.AIR_LOG_FILE || '',
    PID_FILE: process.env.AIR_PID_FILE || '',
    SSL_KEY: process.env.SSL_KEY || '',
    SSL_CERT: process.env.SSL_CERT || ''
} as const

// API Endpoints
export const ENDPOINTS = {
    GODADDY_API: process.env.AIR_GODADDY_API || 'https://api.godaddy.com/v1/domains/',
    DDNS_PROVIDERS: (process.env.AIR_DDNS_PROVIDERS || 'godaddy').split(',')
} as const

// Validation Constants
export const VALIDATION = {
    PORT_MIN: 1,
    PORT_MAX: 65535,
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 255,
    SSL_CERT_VALIDITY_DAYS: parseInt(process.env.AIR_SSL_VALIDITY_DAYS || '365')
} as const

// Default Configuration Templates
export const CONFIG_TEMPLATES = {
    development: {
        port: DEFAULTS.DEVELOPMENT_PORT,
        domain: DEFAULTS.DEVELOPMENT_DOMAIN,
        peers: [] as string[]
    },
    
    production: {
        port: DEFAULTS.PRODUCTION_PORT,
        domain: DEFAULTS.PRODUCTION_DOMAIN,
        peers: [] as string[]
    }
}

// IP Detection Configuration
export const IP_CONFIG = {
    timeout: DEFAULTS.IP_TIMEOUT,
    dnsTimeout: DEFAULTS.DNS_TIMEOUT,
    userAgent: DEFAULTS.USER_AGENT,
    dns: IP_SERVICES.dns,
    http: IP_SERVICES.http
}