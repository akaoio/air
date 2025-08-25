/**
 * Merge environment variables into config
 */

import type { AirConfig } from "../types/index.js"

export function mergeenv(this: any, config: AirConfig): AirConfig {
    // Root-level environment variables - support both AIR_ prefix and no prefix
    const rootVal = process.env.AIR_ROOT || process.env.ROOT
    if (rootVal) config.root = rootVal

    const bashVal = process.env.AIR_BASH || process.env.BASH
    if (bashVal) config.bash = bashVal

    const envVal = process.env.AIR_ENV || process.env.ENV
    if (envVal) config.env = envVal as any

    const nameVal = process.env.AIR_NAME || process.env.NAME
    if (nameVal) config.name = nameVal

    const syncVal = process.env.AIR_SYNC || process.env.SYNC
    if (syncVal) config.sync = syncVal

    // Port and domain can be at root level or environment-specific
    if (process.env.AIR_PORT || process.env.PORT) {
        const port = parseInt(process.env.AIR_PORT || process.env.PORT || "")
        // Update root-level port if it exists
        if ("port" in config) config.port = port
        // Also update environment-specific port
        const env = config.env
        const envConfig: any = config[env] || {}
        envConfig.port = port
        config[env] = envConfig
    }

    if (process.env.AIR_DOMAIN || process.env.DOMAIN) {
        const domain = process.env.AIR_DOMAIN || process.env.DOMAIN
        // Update root-level domain if it exists
        if ("domain" in config) config.domain = domain
        // Also update environment-specific domain
        const env = config.env
        const envConfig: any = config[env] || {}
        envConfig.domain = domain
        config[env] = envConfig
    }

    // Environment-specific variables
    const env = config.env
    const envConfig: any = config[env] || {}

    // SSL configuration
    if (process.env.SSL_KEY || process.env.SSL_CERT) {
        envConfig.ssl = {
            key: process.env.SSL_KEY || "",
            cert: process.env.SSL_CERT || ""
        }
    }

    // SEA pair
    if (process.env.PUB && process.env.PRIV) {
        envConfig.pair = {
            pub: process.env.PUB,
            priv: process.env.PRIV,
            epub: process.env.EPUB || "",
            epriv: process.env.EPRIV || ""
        }
    }

    // Peers
    if (process.env.PEERS) {
        envConfig.peers = process.env.PEERS.split(",").map(s => s.trim())
    }

    config[env] = envConfig
    return config
}

export default mergeenv
