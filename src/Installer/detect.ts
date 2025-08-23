/**
 * Detect existing installation
 */

import fs from 'fs'
import path from 'path'
import type { AirConfig } from '../types/index.js'

export function detect(root: string): AirConfig | null {
    const configPath = path.join(root, 'air.json')
    
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'))
        } catch {
            return null
        }
    }
    
    return null
}

export default detect