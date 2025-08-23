/**
 * Stop peer gracefully
 */

import type { AirConfig } from '../types/index.js'
import { logger } from '../Logger/index.js'
import { clean as cleanProcess } from '../Process/clean.js'

export interface StopResult {
    success: boolean
    error?: string
}

export async function stop(config: AirConfig, server?: any): Promise<StopResult> {
    logger.info('Stopping Air...')
    
    try {
        // Stop server if provided
        if (server) {
            await new Promise<void>((resolve) => {
                server.close(() => {
                    logger.info('Server stopped')
                    resolve()
                })
                
                // Force close after 5 seconds
                setTimeout(() => {
                    if (server) {
                        server.closeAllConnections?.()
                    }
                    resolve()
                }, 5000)
            })
        }
        
        // Clean PID file
        cleanProcess(config)
        
        logger.info('Air stopped')
        
        return { success: true }
        
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        }
    }
}

export default stop