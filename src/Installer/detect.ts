/**
 * Detect existing installation
 */

import fs from 'fs'
import path from 'path'
import { getConfigPath } from '../paths.js'
import type { AirConfig } from '../types/index.js'

export function detect(root: string): AirConfig | null {
    const configPath = getConfigPath(null, root)
    
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