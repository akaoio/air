/**
 * Modern Eye-Candy TUI Components for Air
 * Beautiful, gradient-rich, animated interface components
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import Gradient from 'ink-gradient'
import BigText from 'ink-big-text'
import Spinner from 'ink-spinner'
import { viewport } from './Viewport.js'

// Color palette for modern design
export const Colors = {
    primary: '#00d4ff',      // Cyan
    secondary: '#ff6b35',    // Orange
    success: '#00ff88',      // Green
    warning: '#ffaa00',      // Amber
    error: '#ff4757',        // Red
    info: '#7c4dff',         // Purple
    muted: '#6c757d',        // Gray
    background: '#1a1a1a',   // Dark
    text: '#ffffff',         // White
    accent: '#ff9ff3'        // Pink
}

// Gradient configurations
export const Gradients = {
    primary: ['#00d4ff', '#0066cc'],
    fire: ['#ff6b35', '#f7931e'],
    ocean: ['#00d4ff', '#7c4dff'],
    sunset: ['#ff6b35', '#ff9ff3'],
    matrix: ['#00ff88', '#00d4ff'],
    neon: ['#7c4dff', '#ff9ff3']
}

interface HeaderProps {
    title: string
    subtitle?: string
    gradient?: keyof typeof Gradients
    showLogo?: boolean
}

export const ModernHeader: React.FC<HeaderProps> = ({ 
    title, 
    subtitle, 
    gradient = 'ocean',
    showLogo = true 
}) => {
    return (
        <Box flexDirection="column" alignItems="center" marginBottom={1}>
            {showLogo && (
                <Box marginBottom={1}>
                    <Gradient colors={Gradients.primary}>
                        <BigText text="AIR" font="block" />
                    </Gradient>
                </Box>
            )}
            
            <Box marginBottom={subtitle ? 0 : 1}>
                <Gradient colors={Gradients[gradient]}>
                    <Text bold fontSize={16}>{title}</Text>
                </Gradient>
            </Box>
            
            {subtitle && (
                <Box marginBottom={1}>
                    <Text color={Colors.muted} italic>{subtitle}</Text>
                </Box>
            )}
            
            <Box width={viewport.width - 2}>
                <Text color={Colors.primary}>{viewport.getSeparator('─', 2)}</Text>
            </Box>
        </Box>
    )
}

interface StatusCardProps {
    icon: string
    title: string
    status: 'success' | 'warning' | 'error' | 'info' | 'loading'
    value?: string
    details?: string[]
    animated?: boolean
}

export const StatusCard: React.FC<StatusCardProps> = ({ 
    icon, 
    title, 
    status, 
    value, 
    details = [],
    animated = false 
}) => {
    const [dots, setDots] = useState('')
    
    useEffect(() => {
        if (animated && status === 'loading') {
            const interval = setInterval(() => {
                setDots(prev => prev.length >= 3 ? '' : prev + '.')
            }, 500)
            return () => clearInterval(interval)
        }
    }, [animated, status])
    
    const statusColors = {
        success: Colors.success,
        warning: Colors.warning,
        error: Colors.error,
        info: Colors.info,
        loading: Colors.primary
    }
    
    const statusIcons = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️',
        loading: '⏳'
    }
    
    return (
        <Box 
            flexDirection="column" 
            borderStyle="round" 
            borderColor={statusColors[status]}
            paddingX={2}
            paddingY={1}
            marginY={1}
            width={Math.min(process.stdout.columns - 4, 50)}
        >
            <Box marginBottom={details.length > 0 ? 1 : 0}>
                <Text color={statusColors[status]} bold>
                    {statusIcons[status]} {icon} {title}
                    {status === 'loading' && animated && dots}
                </Text>
                {value && (
                    <Text color={Colors.text} marginLeft={2}>
                        {value}
                    </Text>
                )}
            </Box>
            
            {details.map((detail, index) => (
                <Box key={index} marginLeft={4}>
                    <Text color={Colors.muted}>• {detail}</Text>
                </Box>
            ))}
        </Box>
    )
}

interface ActionButtonProps {
    label: string
    hotkey?: string
    variant?: 'primary' | 'secondary' | 'danger'
    selected?: boolean
    disabled?: boolean
    icon?: string
}

export const ActionButton: React.FC<ActionButtonProps> = ({ 
    label, 
    hotkey, 
    variant = 'primary', 
    selected = false,
    disabled = false,
    icon 
}) => {
    const variants = {
        primary: {
            bg: selected ? Colors.primary : 'transparent',
            text: selected ? Colors.background : Colors.primary,
            border: Colors.primary
        },
        secondary: {
            bg: selected ? Colors.secondary : 'transparent',
            text: selected ? Colors.background : Colors.secondary,
            border: Colors.secondary
        },
        danger: {
            bg: selected ? Colors.error : 'transparent',
            text: selected ? Colors.background : Colors.error,
            border: Colors.error
        }
    }
    
    const style = variants[variant]
    
    return (
        <Box
            borderStyle="round"
            borderColor={disabled ? Colors.muted : style.border}
            backgroundColor={disabled ? undefined : style.bg}
            paddingX={3}
            paddingY={1}
            marginX={1}
        >
            <Text 
                color={disabled ? Colors.muted : style.text}
                bold={selected}
            >
                {icon && `${icon} `}{label}
                {hotkey && ` [${hotkey}]`}
            </Text>
        </Box>
    )
}

interface ProgressBarProps {
    progress: number // 0-100
    label?: string
    color?: string
    animated?: boolean
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
    progress, 
    label, 
    color = Colors.primary,
    animated = false 
}) => {
    const [animatedProgress, setAnimatedProgress] = useState(0)
    
    useEffect(() => {
        if (animated) {
            const interval = setInterval(() => {
                setAnimatedProgress(prev => {
                    if (prev >= progress) return progress
                    return Math.min(prev + 2, progress)
                })
            }, 50)
            return () => clearInterval(interval)
        } else {
            setAnimatedProgress(progress)
        }
    }, [progress, animated])
    
    const barWidth = 40
    const filled = Math.floor((animatedProgress / 100) * barWidth)
    const empty = barWidth - filled
    
    return (
        <Box flexDirection="column" marginY={1}>
            {label && (
                <Box marginBottom={1}>
                    <Text color={color} bold>{label}</Text>
                    <Text color={Colors.muted} marginLeft={2}>
                        {Math.round(animatedProgress)}%
                    </Text>
                </Box>
            )}
            <Box>
                <Text color={color}>
                    {'█'.repeat(filled)}
                </Text>
                <Text color={Colors.muted}>
                    {'░'.repeat(empty)}
                </Text>
            </Box>
        </Box>
    )
}

interface LoadingSpinnerProps {
    text?: string
    type?: 'dots' | 'line' | 'bouncingBar' | 'bouncingBall'
    color?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
    text = 'Loading...', 
    type = 'dots',
    color = Colors.primary 
}) => {
    return (
        <Box alignItems="center">
            <Text color={color}>
                <Spinner type={type} />
            </Text>
            <Text color={Colors.text} marginLeft={2}>
                {text}
            </Text>
        </Box>
    )
}

interface InfoBoxProps {
    title: string
    items: Array<{
        label: string
        value: string
        status?: 'normal' | 'success' | 'warning' | 'error'
        icon?: string
    }>
    variant?: 'default' | 'compact' | 'detailed'
}

export const InfoBox: React.FC<InfoBoxProps> = ({ 
    title, 
    items, 
    variant = 'default' 
}) => {
    const statusColors = {
        normal: Colors.text,
        success: Colors.success,
        warning: Colors.warning,
        error: Colors.error
    }
    
    return (
        <Box 
            flexDirection="column" 
            borderStyle="round"
            borderColor={Colors.primary}
            paddingX={2}
            paddingY={1}
            marginY={1}
            width={variant === 'compact' ? 'auto' : (process.stdout.columns < 50 ? process.stdout.columns - 4 : 50)}
        >
            <Box marginBottom={1}>
                <Gradient colors={Gradients.ocean}>
                    <Text bold>{title}</Text>
                </Gradient>
            </Box>
            
            {items.map((item, index) => (
                <Box key={index} marginBottom={variant === 'detailed' ? 1 : 0}>
                    <Box width={Math.min(20, Math.floor(process.stdout.columns / 3))}>
                        <Text color={Colors.muted}>
                            {item.icon && `${item.icon} `}{item.label}:
                        </Text>
                    </Box>
                    <Text 
                        color={statusColors[item.status || 'normal']}
                        bold={item.status !== 'normal'}
                    >
                        {item.value}
                    </Text>
                </Box>
            ))}
        </Box>
    )
}

interface GlowTextProps {
    text: string
    color?: string
    size?: 'small' | 'medium' | 'large'
}

export const GlowText: React.FC<GlowTextProps> = ({ 
    text, 
    color = Colors.primary, 
    size = 'medium' 
}) => {
    const sizes = {
        small: 1,
        medium: 2, 
        large: 3
    }
    
    return (
        <Box>
            <Text color={color} bold>
                {text}
            </Text>
        </Box>
    )
}

export const ModernFooter: React.FC<{ 
    commands?: Array<{ key: string, action: string }>
}> = ({ commands = [] }) => {
    const defaultCommands = [
        { key: 'ESC', action: 'Exit' },
        { key: 'Ctrl+C', action: 'Force Exit' }
    ]
    
    const allCommands = [...commands, ...defaultCommands]
    
    return (
        <Box flexDirection="column" marginTop={2}>
            <Box width={viewport.width - 2}>
                <Text color={Colors.primary}>{viewport.getSeparator('─', 2)}</Text>
            </Box>
            <Box justifyContent="space-between" marginTop={1}>
                {allCommands.map((cmd, index) => (
                    <Box key={index}>
                        <Text color={Colors.accent} bold>[{cmd.key}]</Text>
                        <Text color={Colors.muted} marginLeft={1}>{cmd.action}</Text>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}

export default {
    ModernHeader,
    StatusCard,
    ActionButton,
    ProgressBar,
    LoadingSpinner,
    InfoBox,
    GlowText,
    ModernFooter,
    Colors,
    Gradients
}