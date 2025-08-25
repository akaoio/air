/**
 * Beautiful Console UI - Eye-candy TUI without raw terminal mode
 * ANSI escape codes and responsive design for all terminals including Termux
 */

import viewport from "./Viewport.js"

export interface ConsoleColors {
    reset: string
    bold: string
    dim: string
    italic: string
    underline: string

    // Text colors
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

    // RGB colors (24-bit)
    primary: string // Cyan
    secondary: string // Orange
    success: string // Green
    warning: string // Amber
    error: string // Red
    info: string // Purple
    muted: string // Gray
    accent: string // Pink
}

// Terminal capability detection
function getTerminalInfo() {
    const width = process.stdout.columns || 80
    const height = process.stdout.rows || 24
    const isTermux = process.env.TERMUX_VERSION !== undefined
    const isMobile = width < 60 || isTermux
    const supportsRGB = !isTermux && process.env.COLORTERM === "truecolor"
    const supportsUnicode = !isTermux && process.env.LANG?.includes("UTF-8")

    return { width, height, isTermux, isMobile, supportsRGB, supportsUnicode }
}

export const colors: ConsoleColors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    italic: "\x1b[3m",
    underline: "\x1b[4m",

    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",

    brightRed: "\x1b[91m",
    brightGreen: "\x1b[92m",
    brightYellow: "\x1b[93m",
    brightBlue: "\x1b[94m",
    brightMagenta: "\x1b[95m",
    brightCyan: "\x1b[96m",
    brightWhite: "\x1b[97m",

    bgBlack: "\x1b[40m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgWhite: "\x1b[47m",

    // Adaptive colors - use RGB for capable terminals, fallback for others
    get primary() {
        return getTerminalInfo().supportsRGB ? "\x1b[38;2;0;212;255m" : "\x1b[96m"
    }, // Cyan
    get secondary() {
        return getTerminalInfo().supportsRGB ? "\x1b[38;2;255;107;53m" : "\x1b[93m"
    }, // Orange/Yellow
    get success() {
        return getTerminalInfo().supportsRGB ? "\x1b[38;2;0;255;136m" : "\x1b[92m"
    }, // Green
    get warning() {
        return getTerminalInfo().supportsRGB ? "\x1b[38;2;255;170;0m" : "\x1b[93m"
    }, // Amber/Yellow
    get error() {
        return getTerminalInfo().supportsRGB ? "\x1b[38;2;255;71;87m" : "\x1b[91m"
    }, // Red
    get info() {
        return getTerminalInfo().supportsRGB ? "\x1b[38;2;124;77;255m" : "\x1b[94m"
    }, // Purple/Blue
    get muted() {
        return getTerminalInfo().supportsRGB ? "\x1b[38;2;108;117;125m" : "\x1b[37m"
    }, // Gray/White
    get accent() {
        return getTerminalInfo().supportsRGB ? "\x1b[38;2;255;159;243m" : "\x1b[95m"
    } // Pink/Magenta
}

// Box drawing characters - adaptive for terminal compatibility
export const box = {
    get horizontal() {
        return getTerminalInfo().isTermux ? "-" : "─"
    },
    get vertical() {
        return getTerminalInfo().isTermux ? "|" : "│"
    },
    get topLeft() {
        return getTerminalInfo().isTermux ? "+" : "┌"
    },
    get topRight() {
        return getTerminalInfo().isTermux ? "+" : "┐"
    },
    get bottomLeft() {
        return getTerminalInfo().isTermux ? "+" : "└"
    },
    get bottomRight() {
        return getTerminalInfo().isTermux ? "+" : "┘"
    },
    get cross() {
        return getTerminalInfo().isTermux ? "+" : "┼"
    },
    get teeUp() {
        return getTerminalInfo().isTermux ? "+" : "┴"
    },
    get teeDown() {
        return getTerminalInfo().isTermux ? "+" : "┬"
    },
    get teeLeft() {
        return getTerminalInfo().isTermux ? "+" : "┤"
    },
    get teeRight() {
        return getTerminalInfo().isTermux ? "+" : "├"
    },

    // Double line
    get doubleHorizontal() {
        return getTerminalInfo().isTermux ? "=" : "═"
    },
    get doubleVertical() {
        return getTerminalInfo().isTermux ? "|" : "║"
    },
    get doubleTopLeft() {
        return getTerminalInfo().isTermux ? "+" : "╔"
    },
    get doubleTopRight() {
        return getTerminalInfo().isTermux ? "+" : "╗"
    },
    get doubleBottomLeft() {
        return getTerminalInfo().isTermux ? "+" : "╚"
    },
    get doubleBottomRight() {
        return getTerminalInfo().isTermux ? "+" : "╝"
    },

    // Rounded
    get roundTopLeft() {
        return getTerminalInfo().isTermux ? "+" : "╭"
    },
    get roundTopRight() {
        return getTerminalInfo().isTermux ? "+" : "╮"
    },
    get roundBottomLeft() {
        return getTerminalInfo().isTermux ? "+" : "╰"
    },
    get roundBottomRight() {
        return getTerminalInfo().isTermux ? "+" : "╯"
    },

    // Thick
    get thickHorizontal() {
        return getTerminalInfo().isTermux ? "-" : "━"
    },
    get thickVertical() {
        return getTerminalInfo().isTermux ? "|" : "┃"
    }
}

// Gradient effect using ANSI colors
export function createGradient(text: string, startColor: string, endColor: string): string {
    // Simple gradient effect - alternate colors per character
    let result = ""
    for (let i = 0; i < text.length; i++) {
        const color = i % 2 === 0 ? startColor : endColor
        result += color + text[i] + colors.reset
    }
    return result
}

export function createHeader(title: string, subtitle?: string, width?: number): string {
    const term = getTerminalInfo()
    const actualWidth = width || (term.isMobile ? Math.min(term.width, 39) : Math.min(term.width, 80))
    const lines: string[] = []

    // Mobile-optimized logo
    const logo = term.isMobile ? ["AIR DB"] : ["   █████╗  ██╗ ██████╗ ", "  ██╔══██╗ ██║ ██╔══██╗", "  ███████║ ██║ ██████╔╝", "  ██╔══██║ ██║ ██╔══██╗", "  ██║  ██║ ██║ ██║  ██║", "  ╚═╝  ╚═╝ ╚═╝ ╚═╝  ╚═╝"]

    // Add logo
    if (!viewport.isMobile) lines.push("")

    logo.forEach(line => {
        const padding = Math.max(0, Math.floor((actualWidth - line.length) / 2))
        const centeredLine = " ".repeat(padding) + line
        if (term.supportsRGB && !term.isMobile) {
            lines.push(createGradient(centeredLine, colors.primary, colors.brightCyan))
        } else {
            lines.push(colors.cyan + colors.bold + centeredLine + colors.reset)
        }
    })

    if (!viewport.isMobile) lines.push("")

    // Add title
    const maxTitleLength = actualWidth - 2
    const truncatedTitle = title.length > maxTitleLength ? title.slice(0, maxTitleLength - 2) + ".." : title
    const titlePadding = Math.max(0, Math.floor((actualWidth - truncatedTitle.length) / 2))
    const titleLine = " ".repeat(titlePadding) + truncatedTitle
    lines.push(colors.bold + colors.brightWhite + titleLine + colors.reset)

    // Add subtitle if provided
    if (subtitle && !term.isMobile) {
        const maxSubtitleLength = actualWidth - 2
        const truncatedSubtitle = subtitle.length > maxSubtitleLength ? subtitle.slice(0, maxSubtitleLength - 2) + ".." : subtitle
        const subtitlePadding = Math.max(0, Math.floor((actualWidth - truncatedSubtitle.length) / 2))
        const subtitleLine = " ".repeat(subtitlePadding) + truncatedSubtitle
        lines.push(colors.italic + colors.muted + subtitleLine + colors.reset)
    }

    // Add separator
    lines.push(colors.primary + box.horizontal.repeat(actualWidth) + colors.reset)

    return lines.join("\n")
}

export interface StatusItem {
    icon: string
    label: string
    value: string
    status: "success" | "warning" | "error" | "info" | "loading"
    details?: string[]
}

export function createStatusCard(title: string, items: StatusItem[], width?: number): string {
    const term = getTerminalInfo()
    // Mobile-first: default to terminal width minus margin for safety
    const actualWidth = width || (term.isMobile ? Math.min(term.width - 2, 36) : Math.min(term.width - 2, 50))
    const lines: string[] = []

    // Status color mapping
    const statusColors = {
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
        loading: colors.primary
    }

    // Mobile-friendly icons (single char for Termux)
    const statusIcons = {
        success: term.isTermux ? "+" : "✓",
        warning: term.isTermux ? "!" : "⚠",
        error: term.isTermux ? "x" : "✗",
        info: term.isTermux ? "i" : "ℹ",
        loading: term.isTermux ? "~" : "⏳"
    }

    // Card border
    const topBorder = colors.primary + box.roundTopLeft + box.horizontal.repeat(Math.max(actualWidth - 2, 10)) + box.roundTopRight + colors.reset
    const bottomBorder = colors.primary + box.roundBottomLeft + box.horizontal.repeat(Math.max(actualWidth - 2, 10)) + box.roundBottomRight + colors.reset

    lines.push(topBorder)

    // Title - center and truncate if needed
    const innerWidth = actualWidth - 2 // Space inside borders
    const maxTitleLength = innerWidth - 2
    const truncatedTitle = title.length > maxTitleLength ? title.slice(0, maxTitleLength - 2) + ".." : title
    const titlePadding = Math.max(0, Math.floor((innerWidth - truncatedTitle.length) / 2))
    const titleContent = " ".repeat(titlePadding) + colors.bold + colors.brightWhite + truncatedTitle + colors.reset
    const titleLine = titleContent + " ".repeat(Math.max(0, innerWidth - titlePadding - truncatedTitle.length))
    lines.push(colors.primary + box.vertical + colors.reset + titleLine + colors.primary + box.vertical + colors.reset)

    // Separator under title
    const separatorWidth = Math.max(actualWidth - 2, 10)
    lines.push(colors.primary + box.teeRight + box.horizontal.repeat(separatorWidth) + box.teeLeft + colors.reset)

    // Items - mobile optimized layout
    items.forEach((item, index) => {
        const statusColor = statusColors[item.status]
        const statusIcon = statusIcons[item.status]
        const icon = item.icon || statusIcon

        if (viewport.isMobile) {
            // Mobile: Vertical layout
            // Line 1: Icon + Label
            const labelText = ` ${icon} ${item.label}`
            const labelLine = ` ${statusColor}${icon} ${colors.bold}${item.label}${colors.reset}`
            const labelPadding = " ".repeat(Math.max(0, innerWidth - labelText.length))
            const labelContent = labelLine + labelPadding
            lines.push(colors.primary + box.vertical + colors.reset + labelContent + colors.primary + box.vertical + colors.reset)

            // Line 2: Value (indented)
            const valueText = `   ${item.value}`
            const valueLine = `   ${statusColor}${item.value}${colors.reset}`
            const valuePadding = " ".repeat(Math.max(0, innerWidth - valueText.length))
            const valueContent = valueLine + valuePadding
            lines.push(colors.primary + box.vertical + colors.reset + valueContent + colors.primary + box.vertical + colors.reset)

            // Details (max 1 on mobile)
            if (item.details && item.details.length > 0) {
                const detail = item.details[0]
                const maxDetailLength = innerWidth - 5
                const truncatedDetail = detail && detail.length > maxDetailLength ? detail.slice(0, maxDetailLength - 2) + ".." : detail
                const detailText = `   • ${truncatedDetail}`
                const detailLine = `   ${colors.muted}• ${truncatedDetail}${colors.reset}`
                const detailPadding = " ".repeat(Math.max(0, innerWidth - detailText.length))
                const detailContent = detailLine + detailPadding
                lines.push(colors.primary + box.vertical + colors.reset + detailContent + colors.primary + box.vertical + colors.reset)

                if (item.details.length > 1) {
                    const moreText = `   (+${item.details.length - 1} more)`
                    const moreLine = `   ${colors.muted}(+${item.details.length - 1} more)${colors.reset}`
                    const morePadding = " ".repeat(Math.max(0, innerWidth - moreText.length))
                    const moreContent = moreLine + morePadding
                    lines.push(colors.primary + box.vertical + colors.reset + moreContent + colors.primary + box.vertical + colors.reset)
                }
            }
        } else {
            // Desktop: Horizontal layout
            const maxLabelLength = 12
            const truncatedLabel = item.label.length > maxLabelLength ? item.label.slice(0, maxLabelLength - 1) + "." : item.label.padEnd(maxLabelLength)
            const maxValueLength = innerWidth - maxLabelLength - 4
            const truncatedValue = item.value.length > maxValueLength ? item.value.slice(0, maxValueLength - 2) + ".." : item.value

            const itemContent = ` ${statusColor}${icon} ${colors.bold}${truncatedLabel}${colors.reset} ${statusColor}${truncatedValue}${colors.reset}`
            const itemLine = itemContent + " ".repeat(Math.max(0, innerWidth - truncatedLabel.length - truncatedValue.length - 3))
            lines.push(colors.primary + box.vertical + colors.reset + itemLine.slice(0, innerWidth) + colors.primary + box.vertical + colors.reset)

            // Details
            if (item.details && item.details.length > 0) {
                item.details.forEach(detail => {
                    const maxDetailLength = innerWidth - 5
                    const truncatedDetail = detail && detail.length > maxDetailLength ? detail.slice(0, maxDetailLength - 2) + ".." : detail
                    const detailLine = `   ${colors.muted}• ${truncatedDetail}${colors.reset}`
                    const detailContent = detailLine + " ".repeat(Math.max(0, innerWidth - truncatedDetail.length - 5))
                    lines.push(colors.primary + box.vertical + colors.reset + detailContent.slice(0, innerWidth) + colors.primary + box.vertical + colors.reset)
                })
            }
        }

        // Add separator between items (except last)
        if (index < items.length - 1) {
            if (viewport.isMobile && items.length > 2) {
                // Simple line separator on mobile
                const dotWidth = Math.min(innerWidth - 2, 10)
                lines.push(colors.primary + box.vertical + colors.muted + " " + "·".repeat(dotWidth) + " " + colors.reset + colors.primary + box.vertical + colors.reset)
            } else if (!viewport.isMobile) {
                // Empty line on desktop
                lines.push(colors.primary + box.vertical + colors.reset + " ".repeat(innerWidth) + colors.primary + box.vertical + colors.reset)
            }
        }
    })

    lines.push(bottomBorder)

    return lines.join("\n")
}

export function createProgressBar(label: string, progress: number, width?: number, color?: string): string {
    const actualWidth = width || viewport.getResponsiveWidth({ margin: label.length + 10, preferredRatio: viewport.isMobile ? 0.5 : 0.6 })
    const actualColor = color || colors.primary

    const filled = Math.floor((progress / 100) * actualWidth)
    const empty = actualWidth - filled

    // Use simple characters for Termux
    const fillChar = viewport.isTermux ? "#" : "█"
    const emptyChar = viewport.isTermux ? "-" : "░"

    const bar = actualColor + fillChar.repeat(filled) + colors.reset + colors.muted + emptyChar.repeat(empty) + colors.reset
    const percentage = ` ${progress}%`

    return `${colors.bold}${label}${colors.reset} ${bar} ${colors.bold}${percentage}${colors.reset}`
}

export function createInfoBox(title: string, items: Array<{ label: string; value: string; status?: string }>, width?: number): string {
    const actualWidth = width || viewport.getResponsiveWidth({ margin: 2, preferredRatio: viewport.isMobile ? 1.0 : 0.75 })
    const lines: string[] = []
    const innerWidth = actualWidth - 2

    // Border - dynamic width
    const borderWidth = Math.max(actualWidth - 2, 10)
    const topBorder = colors.info + box.doubleTopLeft + box.doubleHorizontal.repeat(borderWidth) + box.doubleTopRight + colors.reset
    const bottomBorder = colors.info + box.doubleBottomLeft + box.doubleHorizontal.repeat(borderWidth) + box.doubleBottomRight + colors.reset

    lines.push(topBorder)

    // Title
    const maxTitleLength = innerWidth - 2
    const truncatedTitle = title.length > maxTitleLength ? title.slice(0, maxTitleLength - 2) + ".." : title
    const titlePadding = Math.max(0, Math.floor((innerWidth - truncatedTitle.length) / 2))
    const titleContent = " ".repeat(titlePadding) + colors.bold + colors.brightWhite + truncatedTitle + colors.reset
    const titleLine = titleContent + " ".repeat(Math.max(0, innerWidth - titlePadding - truncatedTitle.length))
    lines.push(colors.info + box.doubleVertical + colors.reset + titleLine + colors.info + box.doubleVertical + colors.reset)

    // Separator
    lines.push(colors.info + box.teeRight + box.doubleHorizontal.repeat(borderWidth) + box.teeLeft + colors.reset)

    // Items - mobile optimized
    items.forEach(item => {
        if (viewport.isMobile) {
            // Mobile: vertical layout
            // Label line
            const labelText = ` ${item.label}`
            const labelLine = ` ${colors.muted}${item.label}${colors.reset}`
            const labelPadding = " ".repeat(Math.max(0, innerWidth - labelText.length))
            const labelContent = labelLine + labelPadding
            lines.push(colors.info + box.doubleVertical + colors.reset + labelContent + colors.info + box.doubleVertical + colors.reset)

            // Value line (indented)
            const valueText = `  → ${item.value}`
            const valueLine = `  ${colors.brightWhite}→ ${item.value}${colors.reset}`
            const valuePadding = " ".repeat(Math.max(0, innerWidth - valueText.length))
            const valueContent = valueLine + valuePadding
            lines.push(colors.info + box.doubleVertical + colors.reset + valueContent + colors.info + box.doubleVertical + colors.reset)
        } else {
            // Desktop: horizontal layout
            const labelWidth = 15
            const truncatedLabel = item.label.length > labelWidth ? item.label.slice(0, labelWidth - 2) + ".." : item.label.padEnd(labelWidth)
            const maxValueWidth = innerWidth - labelWidth - 4
            const truncatedValue = item.value.length > maxValueWidth ? item.value.slice(0, maxValueWidth - 2) + ".." : item.value

            const line = ` ${colors.muted}${truncatedLabel}${colors.reset}: ${colors.brightWhite}${truncatedValue}${colors.reset}`
            const content = line + " ".repeat(Math.max(0, innerWidth - truncatedLabel.length - truncatedValue.length - 4))
            lines.push(colors.info + box.doubleVertical + colors.reset + content.slice(0, innerWidth) + colors.info + box.doubleVertical + colors.reset)
        }
    })

    lines.push(bottomBorder)

    return lines.join("\n")
}

export function createFooter(commands: Array<{ key: string; action: string }>, width?: number): string {
    const actualWidth = width || viewport.getResponsiveWidth({ preferredRatio: 1.0 })
    const lines: string[] = []

    // Separator
    lines.push(colors.primary + viewport.getSeparator(box.horizontal) + colors.reset)

    // Commands - responsive layout
    if (viewport.isMobile) {
        // Vertical layout for mobile
        commands.forEach(cmd => {
            const keyText = colors.accent + colors.bold + `[${cmd.key}]` + colors.reset
            const actionText = colors.muted + cmd.action + colors.reset
            lines.push(`${keyText} ${actionText}`)
        })
    } else {
        // Horizontal layout for desktop
        const commandPairs: string[] = []
        commands.forEach(cmd => {
            const keyText = colors.accent + colors.bold + `[${cmd.key}]` + colors.reset
            const actionText = colors.muted + cmd.action + colors.reset
            commandPairs.push(`${keyText} ${actionText}`)
        })

        const commandLine = commandPairs.join("   ")
        const centeredLine = commandLine.padStart((actualWidth + commandLine.length) / 2)
        lines.push(centeredLine)
    }

    return lines.join("\n")
}

export function clearScreen(): void {
    console.clear()
}

export function moveCursor(line: number, col: number): void {
    process.stdout.write(`\x1b[${line};${col}H`)
}

export function hideCursor(): void {
    process.stdout.write("\x1b[?25l")
}

export function showCursor(): void {
    process.stdout.write("\x1b[?25h")
}

export default {
    colors,
    box,
    createGradient,
    createHeader,
    createStatusCard,
    createProgressBar,
    createInfoBox,
    createFooter,
    clearScreen,
    moveCursor,
    hideCursor,
    showCursor
}
