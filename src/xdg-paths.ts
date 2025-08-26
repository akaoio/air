/**
 * XDG Base Directory Specification Paths for Air
 * Simple. Clean. No bullshit.
 * 
 * Following Access's philosophy: Pick sensible defaults and stick to them.
 */

import os from "os"
import path from "path"
import fs from "fs"

// XDG Base Directory Specification
const HOME = os.homedir()
const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME || path.join(HOME, ".config")
const XDG_DATA_HOME = process.env.XDG_DATA_HOME || path.join(HOME, ".local", "share")
const XDG_STATE_HOME = process.env.XDG_STATE_HOME || path.join(HOME, ".local", "state")
const XDG_CACHE_HOME = process.env.XDG_CACHE_HOME || path.join(HOME, ".cache")

// Air directories - THESE ARE THE ONLY PATHS WE USE
export const AIR_CONFIG_DIR = path.join(XDG_CONFIG_HOME, "air")
export const AIR_DATA_DIR = path.join(XDG_DATA_HOME, "air")
export const AIR_STATE_DIR = path.join(XDG_STATE_HOME, "air")
export const AIR_CACHE_DIR = path.join(XDG_CACHE_HOME, "air")

// Specific files - SINGLE SOURCE OF TRUTH
export const CONFIG_FILE = path.join(AIR_CONFIG_DIR, "config.json")
export const LOCK_FILE = path.join(AIR_STATE_DIR, "air.lock")
export const PID_FILE = path.join(AIR_STATE_DIR, "air.pid")
export const LOG_FILE = path.join(AIR_DATA_DIR, "air.log")

// Ensure directories exist
export function ensureDirectories(): void {
    [AIR_CONFIG_DIR, AIR_DATA_DIR, AIR_STATE_DIR, AIR_CACHE_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o755 })
        }
    })
}

// Migration from old paths (one-time, then done)
export function migrateFromLegacy(): void {
    const legacyPaths = [
        { old: path.join(HOME, ".air"), new: AIR_CONFIG_DIR, type: "config" },
        { old: "/var/run/air.pid", new: PID_FILE, type: "file" },
        { old: path.join(process.cwd(), "air.json"), new: CONFIG_FILE, type: "file" },
        { old: path.join(process.cwd(), ".air.pid"), new: PID_FILE, type: "file" }
    ]

    for (const migration of legacyPaths) {
        try {
            if (fs.existsSync(migration.old) && !fs.existsSync(migration.new)) {
                if (migration.type === "file") {
                    fs.copyFileSync(migration.old, migration.new)
                    console.log(`✓ Migrated ${migration.old} → ${migration.new}`)
                } else {
                    // Directory migration would go here if needed
                }
            }
        } catch (e) {
            // Silent fail - not critical
        }
    }
}

// Get all paths (for debugging/info)
export function getPaths() {
    return {
        config: AIR_CONFIG_DIR,
        data: AIR_DATA_DIR,
        state: AIR_STATE_DIR,
        cache: AIR_CACHE_DIR,
        configFile: CONFIG_FILE,
        lockFile: LOCK_FILE,
        pidFile: PID_FILE,
        logFile: LOG_FILE
    }
}

// Initialize on module load
ensureDirectories()
migrateFromLegacy()