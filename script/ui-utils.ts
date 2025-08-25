#!/usr/bin/env bun
// fallback: #!/usr/bin/env tsx

/**
 * Shared UI utilities for AIR scripts
 * Provides consistent UI patterns across all modules
 */

import { TUI, Color, bold, reset, color } from "@akaoio/tui"

export interface StatusItem {
    label: string
    value: string
    status?: "info" | "success" | "warning" | "error"
}

export class AirUI extends TUI {
    private version = "2.0.0"

    constructor(title: string) {
        const version = "2.0.0"
        super({ title: `Air ${title} v${version}` })
    }

    /**
     * Show standardized header with Air branding
     */
    showAirHeader(): void {
        this.clear()
        console.log(this.createHeader())
        console.log()
    }

    /**
     * Show operation result with appropriate styling
     */
    showResult(success: boolean, message: string, details?: string): void {
        if (success) {
            this.showSuccess(message)
        } else {
            this.showError(message, details)
        }
    }

    /**
     * Create a formatted task list with status indicators
     */
    createTaskList(title: string, tasks: StatusItem[]): string {
        return this.createStatusSection(title, tasks, false)
    }

    /**
     * Show configuration summary
     */
    showConfigSummary(config: any): void {
        const items: StatusItem[] = [
            { label: "Name", value: config.name, status: "info" },
            { label: "Environment", value: config.env, status: "info" },
            { label: "Root", value: config.root, status: "info" }
        ]

        if (config[config.env]) {
            const envConfig = config[config.env]
            if (envConfig.domain) {
                items.push({ label: "Domain", value: envConfig.domain, status: "info" })
            }
            if (envConfig.port) {
                items.push({ label: "Port", value: String(envConfig.port), status: "info" })
            }
            if (envConfig.ssl) {
                items.push({ label: "SSL", value: "Enabled", status: "success" })
            }
        }

        console.log(this.createStatusSection("Configuration", items))
    }

    /**
     * Standardized confirmation with warning styling
     */
    async confirmDangerous(message: string, defaultNo = true): Promise<boolean> {
        console.log(color(Color.Yellow) + bold("⚠ Warning") + reset())
        return await this.confirm(message, !defaultNo)
    }

    /**
     * Show progress with percentage
     */
    showProgressStep(current: number, total: number, message: string): void {
        const percentage = Math.round((current / total) * 100)
        console.log(`${color(Color.Cyan)}[${percentage}%]${reset()} ${message}`)
    }

    /**
     * Create a section divider
     */
    showDivider(width = 60): void {
        console.log(color(Color.BrightBlack) + "─".repeat(width) + reset())
    }

    /**
     * Show completion message with formatting
     */
    showComplete(title: string, instructions?: string[]): void {
        const lineWidth = Math.min(process.stdout.columns || 80, 60)
        console.log("\n" + color(Color.Green) + "═".repeat(lineWidth) + reset())
        console.log(color(Color.Green) + bold(`✓ ${title}`) + reset())
        console.log(color(Color.Green) + "═".repeat(lineWidth) + reset())

        if (instructions && instructions.length > 0) {
            console.log("\n" + bold("Next steps:") + reset())
            this.showDivider(40)
            instructions.forEach((instruction, index) => {
                console.log(`\n${color(Color.Cyan)}${index + 1}.${reset()} ${instruction}`)
            })
            console.log()
        }
    }

    /**
     * Handle errors gracefully
     */
    handleError(err: any, exitCode = 1): void {
        this.showError("Operation failed", err.message || String(err))
        if (exitCode >= 0) {
            this.close()
            process.exit(exitCode)
        }
    }

    /**
     * Create a formatted command display
     */
    formatCommand(command: string): string {
        return color(Color.White) + command + reset()
    }

    /**
     * Show system requirements check
     */
    async checkSystemRequirements(): Promise<StatusItem[]> {
        const items: StatusItem[] = []

        // Node.js version
        items.push({
            label: "Node.js",
            value: process.version,
            status: "info"
        })

        // Runtime detection
        const runtime = typeof Bun !== "undefined" ? "Bun" : "Node.js"
        items.push({
            label: "Runtime",
            value: runtime,
            status: runtime === "Bun" ? "success" : "info"
        })

        // Platform
        items.push({
            label: "Platform",
            value: process.platform,
            status: "info"
        })

        return items
    }
}

/**
 * Create a standardized AIR module base class
 */
export abstract class AirModule {
    protected ui: AirUI
    protected config: any

    constructor(moduleName: string) {
        this.ui = new AirUI(moduleName)
        this.config = {}
    }

    /**
     * Standard run pattern with error handling
     */
    async execute(): Promise<void> {
        try {
            this.ui.showAirHeader()
            await this.run()
        } catch (err: any) {
            this.ui.handleError(err)
        } finally {
            this.ui.close()
        }
    }

    /**
     * Abstract method to be implemented by each module
     */
    abstract run(): Promise<void>
}

/**
 * Export convenience functions
 */
export function createAirUI(title: string): AirUI {
    return new AirUI(title)
}

export function formatPath(path: string): string {
    return color(Color.Cyan) + path + reset()
}

export function formatUrl(url: string): string {
    return color(Color.Blue) + url + reset()
}

export function formatError(message: string): string {
    return color(Color.Red) + message + reset()
}

export function formatSuccess(message: string): string {
    return color(Color.Green) + message + reset()
}

export function formatWarning(message: string): string {
    return color(Color.Yellow) + message + reset()
}
