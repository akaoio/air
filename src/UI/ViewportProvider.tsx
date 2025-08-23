#!/usr/bin/env bun

/**
 * Viewport Provider - Event-driven responsive viewport for Ink
 * Provides real-time viewport dimensions without periodic polling
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useStdout } from 'ink'

export interface ViewportDimensions {
    width: number
    height: number
    isMobile: boolean
    isTermux: boolean
    supportsRGB: boolean
    supportsUnicode: boolean
    orientation: 'portrait' | 'landscape'
}

export interface ViewportContextType {
    dimensions: ViewportDimensions
    isSmall: boolean
    isMedium: boolean
    isLarge: boolean
    cols: number
    rows: number
}

const ViewportContext = createContext<ViewportContextType | null>(null)

function detectCapabilities(): Pick<ViewportDimensions, 'isMobile' | 'isTermux' | 'supportsRGB' | 'supportsUnicode'> {
    const term = process.env.TERM || ''
    const termProgram = process.env.TERM_PROGRAM || ''
    const colorTerm = process.env.COLORTERM || ''
    
    return {
        isMobile: process.platform === 'android' || term.includes('mobile'),
        isTermux: term.includes('termux') || !!process.env.TERMUX_VERSION,
        supportsRGB: colorTerm === 'truecolor' || colorTerm === '24bit' || termProgram === 'iTerm.app',
        supportsUnicode: !term.includes('linux') && process.env.LANG?.includes('UTF-8') !== false
    }
}

function calculateDimensions(width: number, height: number): ViewportDimensions {
    const capabilities = detectCapabilities()
    
    return {
        width,
        height,
        orientation: width > height ? 'landscape' : 'portrait',
        ...capabilities
    }
}

function classifySize(width: number): { isSmall: boolean; isMedium: boolean; isLarge: boolean } {
    return {
        isSmall: width < 60,
        isMedium: width >= 60 && width < 100,
        isLarge: width >= 100
    }
}

interface ViewportProviderProps {
    children: ReactNode
}

export function ViewportProvider({ children }: ViewportProviderProps) {
    const { stdout } = useStdout()
    
    // Initialize with current terminal size
    const [dimensions, setDimensions] = useState<ViewportDimensions>(() => {
        const width = stdout?.columns || process.stdout.columns || 80
        const height = stdout?.rows || process.stdout.rows || 24
        return calculateDimensions(width, height)
    })
    
    useEffect(() => {
        if (!stdout || !process.stdout.isTTY) return
        
        const handleResize = () => {
            const width = stdout.columns || process.stdout.columns || 80
            const height = stdout.rows || process.stdout.rows || 24
            setDimensions(calculateDimensions(width, height))
        }
        
        // Use process.stdout 'resize' event - the SMART way without polling
        process.stdout.on('resize', handleResize)
        
        return () => {
            process.stdout.off('resize', handleResize)
        }
    }, [stdout])
    
    const sizeClassification = classifySize(dimensions.width)
    
    const contextValue: ViewportContextType = {
        dimensions,
        ...sizeClassification,
        cols: dimensions.width,
        rows: dimensions.height
    }
    
    return (
        <ViewportContext.Provider value={contextValue}>
            {children}
        </ViewportContext.Provider>
    )
}

export function useViewport(): ViewportContextType {
    const context = useContext(ViewportContext)
    if (!context) {
        throw new Error('useViewport must be used within a ViewportProvider')
    }
    return context
}

// Convenience hook for responsive breakpoints
export function useResponsive() {
    const { isSmall, isMedium, isLarge, dimensions } = useViewport()
    
    return {
        isSmall,
        isMedium, 
        isLarge,
        mobile: dimensions.isMobile || dimensions.isTermux,
        desktop: !dimensions.isMobile && !dimensions.isTermux,
        supportsColor: dimensions.supportsRGB,
        supportsUnicode: dimensions.supportsUnicode,
        
        // Responsive values
        maxWidth: isSmall ? 40 : isMedium ? 70 : 90,
        padding: isSmall ? 1 : 2,
        columns: isSmall ? 1 : isMedium ? 2 : 3
    }
}