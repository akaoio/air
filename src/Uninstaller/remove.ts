/**
 * Remove Air service using Platform abstraction
 */

import { Platform } from "../Platform/index.js"
import type { AirConfig } from "../types/index.js"

export interface RemoveResult {
    success: boolean
    message: string
    type?: string
}

export async function remove(config: AirConfig): Promise<RemoveResult> {
    try {
        // Use Platform abstraction for all service removal
        const platform = Platform.getInstance()
        const serviceName = `air-${config.name}`

        const removed = await platform.removeService(serviceName)

        if (removed) {
            return {
                success: true,
                message: "Service removed via platform abstraction",
                type: platform.getName()
            }
        }

        return {
            success: false,
            message: "No service found",
            type: platform.getName()
        }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export default remove
