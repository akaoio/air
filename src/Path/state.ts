/**
 * Global state for system paths
 */

import os from 'os'
import fs from 'fs'
import path from 'path'

export interface PathState {
    platform: NodeJS.Platform
    homedir: string
    tmpdir: string
    cache: Record<string, any>
    airConfig: any | null
}

// Singleton state
export const state: PathState = {
    platform: os.platform(),
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
    cache: {},
    airConfig: null
}

// Load air.json configuration on init
function loadAirConfig() {
    try {
        const locations = [
            path.join(process.cwd(), 'air.json'),
            process.env.AIR_CONFIG
        ].filter(Boolean)
        
        for (const loc of locations) {
            if (loc && fs.existsSync(loc)) {
                state.airConfig = JSON.parse(fs.readFileSync(loc, 'utf8'))
                break
            }
        }
    } catch {
        // air.json not found or invalid - use auto-detection
    }
}

loadAirConfig()

export default state