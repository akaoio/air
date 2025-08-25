/**
 * Sync configuration from remote URL
 */

import { merge } from "../lib/utils.js"
import { logger } from "../Logger/index.js"
import { read } from "./read.js"
import { write } from "./write.js"
import type { AirConfig } from "../types/index.js"

export interface SyncOptions {
    rootArg?: string
    bashArg?: string
    configFile?: string
}

let lastSync: number | null = null

export async function sync(url: string, options: SyncOptions = {}): Promise<AirConfig | null> {
    // Rate limit: only sync once per hour
    if (lastSync && Date.now() - lastSync < 3600000) {
        return read(options)
    }

    try {
        logger.info(`Syncing configuration from ${url}...`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Air-GUN-Peer/2.0"
            }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const remoteConfig = (await response.json()) as AirConfig

        // Merge remote config with local (local takes precedence for certain fields)
        const localConfig = read(options)
        const merged = merge(remoteConfig, {
            name: localConfig.name,
            root: localConfig.root,
            bash: localConfig.bash
        }) as AirConfig

        // Save merged config
        write(merged, options)
        lastSync = Date.now()

        logger.info("Configuration synced successfully")
        return merged
    } catch (error: any) {
        logger.error("Configuration sync failed:", error.message)
        return null
    }
}

export default sync
