/**
 * SSL certificate setup - Refactored with Platform abstraction
 */

import { Platform } from "../Platform/index.js"
import type { AirConfig } from "../types/index.js"

export async function ssl(this: any, config: AirConfig): Promise<boolean> {
    // Use Platform abstraction for SSL setup
    const platform = Platform.getInstance()

    // Platform handles all OS-specific logic internally
    const result = await platform.setupSSL(config)

    // Update config with SSL paths if successful
    if (result.success && result.keyPath && result.certPath) {
        config.ssl = {
            key: result.keyPath,
            cert: result.certPath
        }
    }

    return result.success
}

export default ssl
