/**
 * Merge configurations
 */

import type { AirConfig } from "../types/index.js"

export function merge(...configs: Partial<AirConfig>[]): AirConfig {
    const result: any = {}

    for (const config of configs) {
        if (!config) continue

        for (const key in config) {
            const value = config[key as keyof AirConfig]

            if (value === null) {
                result[key] = null
                continue
            }

            if (value === undefined) {
                result[key] = undefined
                continue
            }

            if (typeof value === "object" && !Array.isArray(value)) {
                result[key] = merge(result[key] || {}, value as any)
            } else {
                result[key] = value
            }
        }
    }

    return result as AirConfig
}

export default merge
