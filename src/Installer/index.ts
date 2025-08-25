/**
 * Installer Class - Installation management
 * Pattern: Class = Directory + Method-per-file
 */

import type { InstallOptions, InstallContext, SystemInfo, ServiceResult, StartResult } from "./types.js"
import type { AirConfig } from "../types/index.js"

import { constructor } from "./constructor.js"
import { check } from "./check.js"
import { detect } from "./detect.js"
import { configure } from "./configure.js"
import { save } from "./save.js"
import { ssl } from "./ssl.js"
import { service } from "./service.js"
import { start } from "./start.js"

export class Installer {
    // @ts-ignore - Used in method files
    private options!: InstallOptions
    // @ts-ignore - Used in method files
    private context!: InstallContext

    constructor(options?: InstallOptions) {
        constructor.call(this, options)
    }

    check(): SystemInfo {
        return check.call(this)
    }

    detect(root: string): AirConfig | null {
        return detect.call(this, root)
    }

    configure(options?: InstallOptions): AirConfig {
        return configure.call(this, options || {})
    }

    save(config: AirConfig): void {
        return save.call(this, config)
    }

    async ssl(config: AirConfig): Promise<boolean> {
        return ssl.call(this, config)
    }

    async service(config: AirConfig): Promise<ServiceResult> {
        return service.call(this, config)
    }

    async start(config: AirConfig): Promise<StartResult> {
        return start.call(this, config)
    }
}

export default Installer

// Re-export types
export type { InstallOptions, SystemInfo, ServiceResult, StartResult, InstallContext } from "./types.js"
