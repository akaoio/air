/**
 * Viewport Manager - Runtime terminal dimension detection
 * Zero hardcoded values, pure dynamic sizing
 */

import { EventEmitter } from 'events'

export interface ViewportDimensions {
    width: number
    height: number
    isMobile: boolean
    isTermux: boolean
    supportsRGB: boolean
    supportsUnicode: boolean
    orientation: 'portrait' | 'landscape'
}

export interface ViewportBreakpoints {
    xs: number  // Extra small (mobile portrait)
    sm: number  // Small (mobile landscape)
    md: number  // Medium (tablet/small desktop)
    lg: number  // Large (desktop)
    xl: number  // Extra large (wide desktop)
}

class ViewportManager extends EventEmitter {
    private dimensions: ViewportDimensions
    private resizeTimer: NodeJS.Timeout | null = null
    private readonly breakpoints: ViewportBreakpoints = {
        xs: 40,   // Mobile portrait
        sm: 60,   // Mobile landscape
        md: 80,   // Tablet
        lg: 120,  // Desktop
        xl: 160   // Wide desktop
    }
    
    constructor() {
        super()
        this.dimensions = this.detect()
        this.setupListeners()
    }
    
    /**
     * Detect current terminal dimensions and capabilities
     */
    private detect(): ViewportDimensions {
        const width = process.stdout.columns || 80
        const height = process.stdout.rows || 24
        const isTermux = process.env.TERMUX_VERSION !== undefined
        const isMobile = width < this.breakpoints.sm || isTermux
        const supportsRGB = !isTermux && process.env.COLORTERM === 'truecolor'
        const supportsUnicode = !isTermux && (process.env.LANG?.includes('UTF-8') || false)
        const orientation = width > height ? 'landscape' : 'portrait'
        
        return {
            width,
            height,
            isMobile,
            isTermux,
            supportsRGB,
            supportsUnicode,
            orientation
        }
    }
    
    /**
     * Setup terminal resize listeners
     */
    private setupListeners(): void {
        process.stdout.on('resize', () => {
            // Debounce resize events
            if (this.resizeTimer) {
                clearTimeout(this.resizeTimer)
            }
            
            this.resizeTimer = setTimeout(() => {
                const oldDimensions = { ...this.dimensions }
                this.dimensions = this.detect()
                
                // Emit change event if dimensions actually changed
                if (oldDimensions.width !== this.dimensions.width ||
                    oldDimensions.height !== this.dimensions.height) {
                    this.emit('resize', this.dimensions, oldDimensions)
                }
                
                // Emit orientation change if it changed
                if (oldDimensions.orientation !== this.dimensions.orientation) {
                    this.emit('orientationChange', this.dimensions.orientation)
                }
            }, 100)
        })
    }
    
    /**
     * Get current viewport dimensions
     */
    get(): ViewportDimensions {
        return { ...this.dimensions }
    }
    
    /**
     * Get current width
     */
    get width(): number {
        return process.stdout.columns || 80
    }
    
    /**
     * Get current height
     */
    get height(): number {
        return process.stdout.rows || 24
    }
    
    /**
     * Check if mobile device
     */
    get isMobile(): boolean {
        return this.width < this.breakpoints.sm || this.dimensions.isTermux
    }
    
    /**
     * Check if Termux
     */
    get isTermux(): boolean {
        return this.dimensions.isTermux
    }
    
    /**
     * Get current breakpoint
     */
    get breakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
        const w = this.width
        if (w < this.breakpoints.xs) return 'xs'
        if (w < this.breakpoints.sm) return 'sm'
        if (w < this.breakpoints.md) return 'md'
        if (w < this.breakpoints.lg) return 'lg'
        return 'xl'
    }
    
    /**
     * Get responsive width for a component
     * @param options - Sizing options
     */
    getResponsiveWidth(options: {
        margin?: number
        maxWidth?: number
        minWidth?: number
        preferredRatio?: number
    } = {}): number {
        const {
            margin = 2,
            maxWidth,
            minWidth = 10,
            preferredRatio = 1.0
        } = options
        
        // Start with terminal width minus margin
        let width = Math.floor((this.width - margin) * preferredRatio)
        
        // Apply max width if specified (but never hardcode)
        if (maxWidth) {
            width = Math.min(width, maxWidth)
        }
        
        // Apply min width
        width = Math.max(width, minWidth)
        
        // Ensure it fits in terminal
        width = Math.min(width, this.width - margin)
        
        return width
    }
    
    /**
     * Get separator line of appropriate length
     */
    getSeparator(char: string = '─', margin: number = 0): string {
        return char.repeat(Math.max(this.width - margin, 1))
    }
    
    /**
     * Get centered text with appropriate padding
     */
    centerText(text: string, margin: number = 0): string {
        const availableWidth = this.width - margin
        if (text.length >= availableWidth) {
            return text.slice(0, availableWidth)
        }
        
        const padding = Math.floor((availableWidth - text.length) / 2)
        const rightPadding = availableWidth - text.length - padding
        
        return ' '.repeat(padding) + text + ' '.repeat(rightPadding)
    }
    
    /**
     * Truncate text to fit width
     */
    truncate(text: string, maxWidth?: number, suffix: string = '..'): string {
        const width = maxWidth || this.width - 2
        
        if (text.length <= width) {
            return text
        }
        
        if (width <= suffix.length) {
            return text.slice(0, width)
        }
        
        return text.slice(0, width - suffix.length) + suffix
    }
    
    /**
     * Get layout mode based on viewport
     */
    getLayout(): 'mobile' | 'tablet' | 'desktop' {
        const bp = this.breakpoint
        if (bp === 'xs' || bp === 'sm') return 'mobile'
        if (bp === 'md') return 'tablet'
        return 'desktop'
    }
    
    /**
     * Check if viewport supports feature
     */
    supports(feature: 'rgb' | 'unicode' | 'emoji'): boolean {
        switch (feature) {
            case 'rgb':
                return this.dimensions.supportsRGB
            case 'unicode':
                return this.dimensions.supportsUnicode
            case 'emoji':
                return !this.dimensions.isTermux && this.dimensions.supportsUnicode
            default:
                return false
        }
    }
    
    /**
     * Get responsive columns for grid layout
     */
    getColumns(itemWidth: number, gap: number = 2): number {
        const availableWidth = this.width - gap
        return Math.max(1, Math.floor(availableWidth / (itemWidth + gap)))
    }
    
    /**
     * Watch for viewport changes
     */
    watch(callback: (dimensions: ViewportDimensions) => void): () => void {
        this.on('resize', callback)
        
        // Return unsubscribe function
        return () => {
            this.off('resize', callback)
        }
    }
    
    /**
     * Refresh dimensions (force re-detection)
     */
    refresh(): ViewportDimensions {
        this.dimensions = this.detect()
        return this.get()
    }
}

// Export singleton instance
export const viewport = new ViewportManager()

// Export convenience functions
export function getViewport(): ViewportDimensions {
    return viewport.get()
}

export function getResponsiveWidth(options?: Parameters<ViewportManager['getResponsiveWidth']>[0]): number {
    return viewport.getResponsiveWidth(options)
}

export function getSeparator(char?: string, margin?: number): string {
    return viewport.getSeparator(char, margin)
}

export function centerText(text: string, margin?: number): string {
    return viewport.centerText(text, margin)
}

export function truncate(text: string, maxWidth?: number, suffix?: string): string {
    return viewport.truncate(text, maxWidth, suffix)
}

export function isMobile(): boolean {
    return viewport.isMobile
}

export function isTermux(): boolean {
    return viewport.isTermux
}

export function getLayout(): 'mobile' | 'tablet' | 'desktop' {
    return viewport.getLayout()
}

export function supports(feature: 'rgb' | 'unicode' | 'emoji'): boolean {
    return viewport.supports(feature)
}

export default viewport