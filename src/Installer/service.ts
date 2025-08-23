/**
 * System service setup - Refactored with Platform abstraction
 */

import { Platform } from '../Platform/index.js'
import type { AirConfig } from '../types/index.js'
import type { ServiceResult } from './types.js'

export async function service(this: any, config: AirConfig): Promise<ServiceResult> {
    // Use Platform abstraction instead of checking platform manually
    const platform = Platform.getInstance()
    
    // Platform handles all OS-specific logic internally
    const result = await platform.createService(config)
    
    // Convert Platform ServiceResult to Installer ServiceResult
    return {
        created: result.success,
        enabled: result.success,
        error: result.error
    }
}

export default service