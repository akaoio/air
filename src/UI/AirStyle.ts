/**
 * Air Database - Single Source of Truth for All TUI Styling
 *
 * This module provides consistent styling across all Air commands:
 * - install, update, config, ddns, status, uninstall
 * - Beautiful ANSI colors with terminal capability detection
 * - Responsive layouts for mobile/desktop terminals
 * - Consistent components (headers, cards, footers, prompts)
 */

import { viewport } from "./Viewport.js"

// ==================== COLOR SYSTEM ====================

export interface AirColors {
    // Reset and modifiers
    reset: string
    bold: string
    dim: string
    italic: string
    underline: string

    // Basic colors
    black: string
    red: string
    green: string
    yellow: string
    blue: string
    magenta: string
    cyan: string
    white: string

    // Bright colors
    brightRed: string
    brightGreen: string
    brightYellow: string
    brightBlue: string
    brightMagenta: string
    brightCyan: string
    brightWhite: string

    // Background colors
    bgBlack: string
    bgRed: string
    bgGreen: string
    bgYellow: string
    bgBlue: string
    bgMagenta: string
    bgCyan: string
    bgWhite: string

    // Semantic colors (Air brand)
    primary: string // Air cyan
    secondary: string // Orange accent
    success: string // Success green
    warning: string // Warning amber
    error: string // Error red
    info: string // Info blue
    muted: string // Muted gray
    accent: string // Accent pink
    text: string // Default text
}

// Terminal capability detection
function detectTerminal() {
    const width = process.stdout.columns || 80
    const height = process.stdout.rows || 24
    const isTermux = process.env.TERMUX_VERSION !== undefined
    const isTTY = process.stdout.isTTY
    const supportsColor = !process.env.NO_COLOR && (process.env.FORCE_COLOR || isTTY)
    const supportsRGB = supportsColor && !isTermux && process.env.COLORTERM === "truecolor"
    const supportsUnicode = !isTermux && process.env.LANG?.includes("UTF-8")

    return {
        width,
        height,
        isTermux,
        isTTY,
        isMobile: width < 70,
        supportsColor,
        supportsRGB,
        supportsUnicode
    }
}

const terminal = detectTerminal()

// Color definitions with fallbacks
export const colors: AirColors = {
    // Modifiers
    reset: terminal.supportsColor ? "\x1b[0m" : "",
    bold: terminal.supportsColor ? "\x1b[1m" : "",
    dim: terminal.supportsColor ? "\x1b[2m" : "",
    italic: terminal.supportsColor ? "\x1b[3m" : "",
    underline: terminal.supportsColor ? "\x1b[4m" : "",

    // Basic colors
    black: terminal.supportsColor ? "\x1b[30m" : "",
    red: terminal.supportsColor ? "\x1b[31m" : "",
    green: terminal.supportsColor ? "\x1b[32m" : "",
    yellow: terminal.supportsColor ? "\x1b[33m" : "",
    blue: terminal.supportsColor ? "\x1b[34m" : "",
    magenta: terminal.supportsColor ? "\x1b[35m" : "",
    cyan: terminal.supportsColor ? "\x1b[36m" : "",
    white: terminal.supportsColor ? "\x1b[37m" : "",

    // Bright colors
    brightRed: terminal.supportsColor ? "\x1b[91m" : "",
    brightGreen: terminal.supportsColor ? "\x1b[92m" : "",
    brightYellow: terminal.supportsColor ? "\x1b[93m" : "",
    brightBlue: terminal.supportsColor ? "\x1b[94m" : "",
    brightMagenta: terminal.supportsColor ? "\x1b[95m" : "",
    brightCyan: terminal.supportsColor ? "\x1b[96m" : "",
    brightWhite: terminal.supportsColor ? "\x1b[97m" : "",

    // Background colors
    bgBlack: terminal.supportsColor ? "\x1b[40m" : "",
    bgRed: terminal.supportsColor ? "\x1b[41m" : "",
    bgGreen: terminal.supportsColor ? "\x1b[42m" : "",
    bgYellow: terminal.supportsColor ? "\x1b[43m" : "",
    bgBlue: terminal.supportsColor ? "\x1b[44m" : "",
    bgMagenta: terminal.supportsColor ? "\x1b[45m" : "",
    bgCyan: terminal.supportsColor ? "\x1b[46m" : "",
    bgWhite: terminal.supportsColor ? "\x1b[47m" : "",

    // Semantic colors (Air brand)
    primary: terminal.supportsRGB ? "\x1b[38;2;0;212;255m" : "\x1b[96m", // Cyan
    secondary: terminal.supportsRGB ? "\x1b[38;2;255;107;53m" : "\x1b[91m", // Orange
    success: terminal.supportsRGB ? "\x1b[38;2;0;255;136m" : "\x1b[92m", // Green
    warning: terminal.supportsRGB ? "\x1b[38;2;255;170;0m" : "\x1b[93m", // Amber
    error: terminal.supportsRGB ? "\x1b[38;2;255;71;87m" : "\x1b[91m", // Red
    info: terminal.supportsRGB ? "\x1b[38;2;124;77;255m" : "\x1b[94m", // Purple
    muted: terminal.supportsRGB ? "\x1b[38;2;108;117;125m" : "\x1b[90m", // Gray
    accent: terminal.supportsRGB ? "\x1b[38;2;255;159;243m" : "\x1b[95m", // Pink
    text: terminal.supportsColor ? "\x1b[97m" : "" // White
}

// ==================== COMPONENT SYSTEM ====================

// Clear screen utility
export function clearScreen(): void {
    if (terminal.isTTY) {
        console.clear()
    }
}

// Air logo - consistent across all commands
export function createLogo(): string {
    if (terminal.isMobile) {
        return `${colors.primary}${colors.bold}AIR${colors.reset}`
    }

    const logoLines = [
        "                              █████╗  ██╗ ██████╗ ",
        "                             ██╔══██╗ ██║ ██╔══██╗",
        "                             ███████║ ██║ ██████╔╝",
        "                             ██╔══██║ ██║ ██╔══██╗",
        "                             ██║  ██║ ██║ ██║  ██║",
        "                             ╚═╝  ╚═╝ ╚═╝ ╚═╝  ╚═╝"
    ]

    return logoLines.map(line => `${colors.primary}${colors.bold}${line}${colors.reset}`).join("\n")
}

// Header component - consistent across all commands
export function createHeader(title: string, subtitle?: string, width?: number): string {
    const w = width || viewport.getResponsiveWidth({ margin: 4, maxWidth: 80 })
    const separator = viewport.getSeparator("─", w)

    let header = ""

    // Logo (only if not mobile)
    if (!terminal.isMobile) {
        header += createLogo() + "\n\n"
    }

    // Title
    header += `${colors.bold}${colors.text}${title.padStart((w + title.length) / 2)}${colors.reset}\n`

    // Subtitle
    if (subtitle) {
        header += `${colors.italic}${colors.muted}${subtitle.padStart((w + subtitle.length) / 2)}${colors.reset}\n`
    }

    // Separator
    header += `${colors.primary}${separator}${colors.reset}`

    return header
}

// Status item interface
export interface StatusItem {
    icon: string
    label: string
    value: string
    status?: "success" | "warning" | "error" | "info" | "normal"
}

// Status card component
export function createStatusCard(title: string, items: StatusItem[], width?: number): string {
    const w = width || viewport.getResponsiveWidth({ margin: 4, maxWidth: 50 })
    const cardWidth = Math.min(w, terminal.width - 4)

    let card = `${colors.primary}╭${"─".repeat(cardWidth - 2)}╮${colors.reset}\n`

    // Title
    const titlePadding = Math.max(0, Math.floor((cardWidth - title.length - 2) / 2))
    card += `${colors.primary}│${colors.reset}${" ".repeat(titlePadding)}${colors.bold}${colors.text}${title}${colors.reset}${" ".repeat(cardWidth - titlePadding - title.length - 2)}${colors.primary}│${colors.reset}\n`

    // Separator
    card += `${colors.primary}├${"─".repeat(cardWidth - 2)}┤${colors.reset}\n`

    // Items
    items.forEach(item => {
        const statusColor = item.status === "success" ? colors.success : item.status === "warning" ? colors.warning : item.status === "error" ? colors.error : item.status === "info" ? colors.info : colors.text

        const leftSide = `${item.icon} ${colors.bold}${item.label}${colors.reset}`
        const rightSide = `${statusColor}${item.value}${colors.reset}`
        const leftLength = item.label.length + 3 // icon + space + label
        const rightLength = item.value.length
        const spaces = Math.max(1, cardWidth - leftLength - rightLength - 4)

        card += `${colors.primary}│${colors.reset} ${leftSide}${" ".repeat(spaces)}${rightSide} ${colors.primary}│${colors.reset}\n`

        // Add empty line between items (except last)
        if (items.indexOf(item) < items.length - 1) {
            card += `${colors.primary}│${" ".repeat(cardWidth - 2)}│${colors.reset}\n`
        }
    })

    // Footer
    card += `${colors.primary}╰${"─".repeat(cardWidth - 2)}╯${colors.reset}`

    return card
}

// Menu option interface
export interface MenuOption {
    key: string
    icon: string
    label: string
    description?: string
    status?: "normal" | "modified" | "disabled"
}

// Menu component
export function createMenu(options: MenuOption[]): string {
    let menu = `\n${colors.bold}${colors.text}Menu Options:${colors.reset}\n\n`

    options.forEach(option => {
        const statusIndicator = option.status === "modified" ? ` ${colors.warning}●${colors.reset}` : option.status === "disabled" ? ` ${colors.muted}(disabled)${colors.reset}` : ""

        const keyColor = option.status === "disabled" ? colors.muted : colors.accent
        const labelColor = option.status === "disabled" ? colors.muted : colors.text

        menu += `   ${keyColor}[${option.key}]${colors.reset} ${option.icon} ${labelColor}${option.label}${colors.reset}${statusIndicator}\n`
    })

    return menu
}

// Footer component
export interface FooterCommand {
    key: string
    action: string
}

export function createFooter(commands: FooterCommand[], width?: number): string {
    const w = width || viewport.getResponsiveWidth({ margin: 4 })
    const separator = viewport.getSeparator("─", w)

    let footer = `${colors.primary}${separator}${colors.reset}\n`

    if (terminal.isMobile) {
        // Stack commands vertically on mobile
        commands.forEach(cmd => {
            footer += ` ${colors.accent}${colors.bold}[${cmd.key}]${colors.reset} ${colors.muted}${cmd.action}${colors.reset}\n`
        })
    } else {
        // Show commands horizontally on desktop
        const commandStrings = commands.map(cmd => `${colors.accent}${colors.bold}[${cmd.key}]${colors.reset} ${colors.muted}${cmd.action}${colors.reset}`)
        footer += " " + commandStrings.join("   ") + "\n"
    }

    return footer
}

// Prompt function with consistent styling
export function createPrompt(question: string, defaultValue?: string): string {
    const defaultText = defaultValue ? ` ${colors.muted}(${defaultValue})${colors.reset}` : ""
    return `${colors.primary}${question}${defaultText}: ${colors.reset}`
}

// Progress bar component
export function createProgressBar(progress: number, label?: string, width?: number): string {
    const barWidth = width || Math.min(40, terminal.width - 20)
    const filled = Math.floor((progress / 100) * barWidth)
    const empty = barWidth - filled

    let bar = ""
    if (label) {
        bar += `${colors.bold}${colors.text}${label}${colors.reset} ${colors.muted}${progress}%${colors.reset}\n`
    }

    bar += `${colors.success}${"█".repeat(filled)}${colors.reset}${colors.muted}${"░".repeat(empty)}${colors.reset}`

    return bar
}

// Message functions with consistent styling
export function success(message: string): string {
    return `${colors.success}✅ ${message}${colors.reset}`
}

export function warning(message: string): string {
    return `${colors.warning}⚠️  ${message}${colors.reset}`
}

export function error(message: string): string {
    return `${colors.error}❌ ${message}${colors.reset}`
}

export function info(message: string): string {
    return `${colors.info}ℹ️  ${message}${colors.reset}`
}

// Export everything for single import
export default {
    colors,
    clearScreen,
    createLogo,
    createHeader,
    createStatusCard,
    createMenu,
    createFooter,
    createPrompt,
    createProgressBar,
    success,
    warning,
    error,
    info,
    terminal
}

// Types are already exported above
