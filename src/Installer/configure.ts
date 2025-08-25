/**
 * Configure installation
 */

import fs from "fs"
import path from "path"
import type { InstallOptions } from "./types.js"
import type { AirConfig } from "../types/index.js"

export function configure(options: InstallOptions): AirConfig {
    const root = options.root || process.cwd()
    const bash = options.bash || process.env.SHELL || "/bin/bash"
    const env = options.env || "development"

    // Try to load existing config first
    let existingConfig: Partial<AirConfig> = {}
    const configPath = path.join(root, "air.json")

    if (fs.existsSync(configPath)) {
        try {
            existingConfig = JSON.parse(fs.readFileSync(configPath, "utf8"))
            console.log("📄 Found existing config, will merge with new settings")
        } catch (e) {
            console.warn("⚠️ Could not parse existing config, using defaults")
        }
    }

    const config: AirConfig = {
        root: options.root || existingConfig.root || root,
        bash: options.bash || existingConfig.bash || bash,
        env: options.env || existingConfig.env || env,
        name: options.name || existingConfig.name || "air",
        port: options.port || existingConfig.port || (env === "production" ? 443 : 8765),
        domain: options.domain || existingConfig.domain || (env === "production" ? "example.com" : "localhost"),
        sync: options.sync || existingConfig.sync || undefined,
        ip: existingConfig.ip || {
            timeout: 5000,
            dnsTimeout: 2000,
            userAgent: "Air/2.0",
            dns: [
                { hostname: "resolver1.opendns.com", resolver: "myip.opendns.com" },
                { hostname: "8.8.8.8", resolver: "o-o.myaddr.l.google.com" }
            ],
            http: [
                { url: "https://icanhazip.com", format: "text" },
                { url: "https://api.ipify.org", format: "text" }
            ]
        },
        development: {
            ...(existingConfig.development || {}),
            domain: env === "development" && options.domain ? options.domain : existingConfig.development?.domain || "localhost",
            port: env === "development" && options.port ? options.port : existingConfig.development?.port || 8765,
            peers: existingConfig.development?.peers || []
        },
        production: {
            ...(existingConfig.production || {}),
            domain: env === "production" && options.domain ? options.domain : existingConfig.production?.domain || "example.com",
            port: env === "production" && options.port ? options.port : existingConfig.production?.port || 8765,
            peers: existingConfig.production?.peers || []
        }
    }

    // Add or preserve GoDaddy config
    if (options.godaddy && env === "production" && config.production) {
        config.production.godaddy = options.godaddy
    } else if (!options.godaddy && existingConfig.production?.godaddy) {
        // Preserve existing GoDaddy config if not updating
        config.production.godaddy = existingConfig.production.godaddy
    }

    // Add or preserve SSL config
    if (options.ssl) {
        const sslConfig = {
            enabled: true,
            cert: `${root}/ssl/cert.pem`,
            key: `${root}/ssl/key.pem`
        }

        if (env === "production" && config.production) {
            config.production.ssl = sslConfig
        } else if (env === "development" && config.development) {
            config.development.ssl = sslConfig
        }
    } else {
        // Preserve existing SSL config if not updating
        if (existingConfig.production?.ssl && config.production) {
            config.production.ssl = existingConfig.production.ssl
        }
        if (existingConfig.development?.ssl && config.development) {
            config.development.ssl = existingConfig.development.ssl
        }
    }

    return config
}

export default configure
