/**
 * Constructor for Installer class
 */

import type { InstallOptions } from "./types.js"

export function constructor(this: any, options?: InstallOptions): void {
    this.options = options || {}
    this.context = {
        rootDir: process.cwd(),
        isRoot: process.getuid?.() === 0 || false,
        platform: process.platform,
        hasSystemd: false,
        hasBun: typeof Bun !== "undefined",
        hasNode: true
    }

    // Check for systemd
    if (this.context.platform === "linux") {
        try {
            const { execSync } = require("child_process")
            execSync("which systemctl", { stdio: "ignore" })
            this.context.hasSystemd = true
        } catch {
            // No systemd
        }
    }
}
