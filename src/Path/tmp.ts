/**
 * Get temporary directory (cross-platform)
 */

import path from 'path'
import { state } from './state.js'

export function tmp(filename: string | null = null): string {
    const base = state.tmpdir || '/tmp'
    // Include 'air' subdirectory for air-specific temp files
    const airTmpDir = path.join(base, 'air')
    return filename ? path.join(airTmpDir, filename) : airTmpDir
}

export default tmp