/**
 * Check if we have read permission to a path
 */

import fs from "fs"

export function canread(filepath: string): boolean {
    try {
        fs.accessSync(filepath, fs.constants.R_OK)
        return true
    } catch {
        return false
    }
}

export default canread
