#!/usr/bin/env bun

/**
 * Air UI Components - Responsive Ink components for Air TUI
 * Single source of truth for all Air command styling
 */

import React, { ReactNode } from "react"
import { Box, Text, Spacer } from "ink"
import Gradient from "ink-gradient"
import BigText from "ink-big-text"
import Spinner from "ink-spinner"
import { useResponsive } from "./ViewportProvider.js"

// Color scheme based on terminal capabilities
interface AirTheme {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
    info: string
    accent: string
    muted: string
    bg: string
}

function useAirTheme(): AirTheme {
    const { supportsColor } = useResponsive()

    if (supportsColor) {
        return {
            primary: "#00D4FF", // Cyan
            secondary: "#FF6B35", // Orange
            success: "#00FF88", // Green
            warning: "#FFD700", // Gold
            error: "#FF4757", // Red
            info: "#70A1FF", // Blue
            accent: "#FF6B9D", // Pink
            muted: "#747D8C", // Gray
            bg: "#2F3542" // Dark
        }
    }

    // Fallback for terminals without RGB support
    return {
        primary: "cyan",
        secondary: "yellow",
        success: "green",
        warning: "yellow",
        error: "red",
        info: "blue",
        accent: "magenta",
        muted: "gray",
        bg: "black"
    }
}

// Header Component
interface HeaderProps {
    title: string
    subtitle?: string
    gradient?: boolean
}

export function Header({ title, subtitle, gradient = true }: HeaderProps) {
    const { isSmall, maxWidth, supportsUnicode } = useResponsive()
    const theme = useAirTheme()

    if (isSmall) {
        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text color={theme.primary} bold>
                    {supportsUnicode ? "🚀 " : ""}
                    {title}
                </Text>
                {subtitle && (
                    <Text color={theme.muted} dimColor>
                        {subtitle}
                    </Text>
                )}
            </Box>
        )
    }

    return (
        <Box flexDirection="column" marginBottom={2}>
            {gradient ? (
                <Gradient name="rainbow">
                    <BigText text={title} align="center" />
                </Gradient>
            ) : (
                <Text color={theme.primary} bold>
                    {title}
                </Text>
            )}
            {subtitle && (
                <Box justifyContent="center">
                    <Text color={theme.muted} dimColor>
                        {subtitle}
                    </Text>
                </Box>
            )}
            <Box marginTop={1}>
                <Text color={theme.accent}>{"═".repeat(Math.min(maxWidth, title.length + 10))}</Text>
            </Box>
        </Box>
    )
}

// Status Card Component
interface StatusItem {
    icon: string
    label: string
    value: string
    status: "success" | "warning" | "error" | "info"
}

interface StatusCardProps {
    title: string
    items: StatusItem[]
}

export function StatusCard({ title, items }: StatusCardProps) {
    const { isSmall, columns, padding, supportsUnicode } = useResponsive()
    const theme = useAirTheme()

    const getStatusColor = (status: StatusItem["status"]) => {
        switch (status) {
            case "success":
                return theme.success
            case "warning":
                return theme.warning
            case "error":
                return theme.error
            case "info":
                return theme.info
            default:
                return theme.muted
        }
    }

    return (
        <Box flexDirection="column" marginBottom={2} paddingX={padding}>
            <Text color={theme.primary} bold>
                {supportsUnicode ? "📊 " : ""}
                {title}
            </Text>

            <Box flexDirection="column" marginTop={1}>
                {items.map((item, index) => (
                    <Box key={index} marginBottom={isSmall ? 0 : 1}>
                        <Text color={theme.accent}>{supportsUnicode ? item.icon : "•"}</Text>
                        <Text color={theme.muted} dimColor>
                            {" "}
                            {item.label}:{" "}
                        </Text>
                        <Text color={getStatusColor(item.status)} bold>
                            {item.value}
                        </Text>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}

// Progress Bar Component
interface ProgressBarProps {
    percent: number
    label?: string
    showSpinner?: boolean
}

export function ProgressBar({ percent, label, showSpinner = false }: ProgressBarProps) {
    const { maxWidth, supportsUnicode } = useResponsive()
    const theme = useAirTheme()

    const width = Math.min(maxWidth - 20, 40)
    const filled = Math.round((percent / 100) * width)
    const empty = width - filled

    const fillChar = supportsUnicode ? "█" : "="
    const emptyChar = supportsUnicode ? "░" : "-"

    return (
        <Box flexDirection="column">
            {label && (
                <Box marginBottom={1}>
                    {showSpinner && <Spinner type="dots" />}
                    <Text color={theme.info}> {label}</Text>
                </Box>
            )}

            <Box>
                <Text color={theme.accent}>[</Text>
                <Text color={theme.success}>{fillChar.repeat(filled)}</Text>
                <Text color={theme.muted}>{emptyChar.repeat(empty)}</Text>
                <Text color={theme.accent}>] </Text>
                <Text color={theme.primary} bold>
                    {percent}%
                </Text>
            </Box>
        </Box>
    )
}

// Feature List Component
interface FeatureListProps {
    items: string[]
    title?: string
}

export function FeatureList({ items, title }: FeatureListProps) {
    const { padding, supportsUnicode } = useResponsive()
    const theme = useAirTheme()

    return (
        <Box flexDirection="column" marginBottom={2} paddingX={padding}>
            {title && (
                <Text color={theme.primary} bold marginBottom={1}>
                    {title}
                </Text>
            )}

            {items.map((item, index) => (
                <Box key={index}>
                    <Text color={theme.accent}>{supportsUnicode ? "  ✓ " : "  • "}</Text>
                    <Text color={theme.muted}>{item}</Text>
                </Box>
            ))}
        </Box>
    )
}

// Command List Component
interface Command {
    key: string
    action: string
}

interface CommandListProps {
    commands: Command[]
    title?: string
}

export function CommandList({ commands, title }: CommandListProps) {
    const { padding, isSmall } = useResponsive()
    const theme = useAirTheme()

    return (
        <Box flexDirection="column" marginBottom={2} paddingX={padding}>
            {title && (
                <Text color={theme.primary} bold marginBottom={1}>
                    {title}
                </Text>
            )}

            {commands.map((cmd, index) => (
                <Box key={index} marginBottom={isSmall ? 0 : 1}>
                    <Text color={theme.accent} bold>
                        {cmd.key}
                    </Text>
                    <Text color={theme.muted}> - {cmd.action}</Text>
                </Box>
            ))}
        </Box>
    )
}

// Footer Component
interface FooterProps {
    commands?: Command[]
    message?: string
}

export function Footer({ commands, message }: FooterProps) {
    const { maxWidth, padding } = useResponsive()
    const theme = useAirTheme()

    return (
        <Box flexDirection="column" marginTop={2} paddingX={padding}>
            <Box>
                <Text color={theme.accent}>{"─".repeat(maxWidth)}</Text>
            </Box>

            {message && (
                <Box marginTop={1}>
                    <Text color={theme.info}>{message}</Text>
                </Box>
            )}

            {commands && commands.length > 0 && <CommandList commands={commands} />}
        </Box>
    )
}

// Alert Components
interface AlertProps {
    children: ReactNode
    icon?: string
}

export function Success({ children, icon }: AlertProps) {
    const theme = useAirTheme()
    const { supportsUnicode } = useResponsive()

    return (
        <Text color={theme.success} bold>
            {icon || (supportsUnicode ? "✅ " : "[OK] ")}
            {children}
        </Text>
    )
}

export function Warning({ children, icon }: AlertProps) {
    const theme = useAirTheme()
    const { supportsUnicode } = useResponsive()

    return (
        <Text color={theme.warning} bold>
            {icon || (supportsUnicode ? "⚠️ " : "[WARN] ")}
            {children}
        </Text>
    )
}

export function Error({ children, icon }: AlertProps) {
    const theme = useAirTheme()
    const { supportsUnicode } = useResponsive()

    return (
        <Text color={theme.error} bold>
            {icon || (supportsUnicode ? "❌ " : "[ERROR] ")}
            {children}
        </Text>
    )
}

export function Info({ children, icon }: AlertProps) {
    const theme = useAirTheme()
    const { supportsUnicode } = useResponsive()

    return (
        <Text color={theme.info}>
            {icon || (supportsUnicode ? "ℹ️ " : "[INFO] ")}
            {children}
        </Text>
    )
}

// Layout Components
interface ResponsiveBoxProps {
    children: ReactNode
    margin?: number
    padding?: number
}

export function ResponsiveBox({ children, margin, padding: customPadding }: ResponsiveBoxProps) {
    const { padding: defaultPadding } = useResponsive()

    return (
        <Box flexDirection="column" marginX={margin} paddingX={customPadding ?? defaultPadding}>
            {children}
        </Box>
    )
}

export function Divider() {
    const { maxWidth } = useResponsive()
    const theme = useAirTheme()

    return (
        <Box marginY={1}>
            <Text color={theme.muted}>{"─".repeat(maxWidth)}</Text>
        </Box>
    )
}
