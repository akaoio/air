/**
 * System service setup - Uses Platform abstraction
 */

import { Platform } from "../Platform/index.js"
import type { AirConfig } from "../types/index.js"
import type { ServiceResult } from "../Platform/types.js"

export async function service(this: any, config: AirConfig): Promise<ServiceResult> {
    // Use Platform abstraction - all platform-specific logic is encapsulated
    const platform = Platform.getInstance()
    return platform.createService(config)
}

export default service
