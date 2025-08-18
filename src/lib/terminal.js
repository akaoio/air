import readline from 'readline'

// Native ANSI color codes
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    white: '\x1b[37m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgCyan: '\x1b[46m'
}

// Color helper functions
const color = (text, ...codes) => codes.join('') + text + colors.reset
const red = text => color(text, colors.red)
const green = text => color(text, colors.green)
const yellow = text => color(text, colors.yellow)
const blue = text => color(text, colors.blue)
const cyan = text => color(text, colors.cyan)
const gray = text => color(text, colors.gray)
const white = text => color(text, colors.white)
const bold = text => color(text, colors.bold)
const dim = text => color(text, colors.dim)

/**
 * Terminal interaction utility class
 * Provides consistent interface for user input/output in CLI
 */
class Terminal {
    constructor() {
        this.rl = null
        this.width = process.stdout.columns || 80
        this.height = process.stdout.rows || 24
        
        // Update dimensions on resize
        if (process.stdout.isTTY) {
            process.stdout.on('resize', () => {
                this.width = process.stdout.columns || 80
                this.height = process.stdout.rows || 24
            })
        }
    }

    /**
     * Initialize readline interface
     */
    init() {
        if (!this.rl) {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })
        }
    }

    /**
     * Close readline interface
     */
    close() {
        if (this.rl) {
            this.rl.close()
            this.rl = null
        }
    }

    /**
     * Enable raw mode for keyboard input
     */
    enableRawMode() {
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true)
            process.stdin.resume()
            process.stdin.setEncoding('utf8')
        }
    }

    /**
     * Disable raw mode
     */
    disableRawMode() {
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false)
        }
    }

    /**
     * Read a single keypress
     * @returns {Promise<Object>} Key information {name, ctrl, meta, shift}
     */
    async keypress() {
        return new Promise((resolve) => {
            let escapeTimeout = null
            
            const onData = (key) => {
                process.stdin.removeListener('data', onData)
                
                // Clear any pending escape timeout
                if (escapeTimeout) {
                    clearTimeout(escapeTimeout)
                    escapeTimeout = null
                }
                
                // Parse key
                const result = {
                    sequence: key,
                    name: null,
                    ctrl: false,
                    meta: false,
                    shift: false
                }
                
                // Handle ESC key - it might come alone or as part of a sequence
                if (key === '\x1b') {
                    // ESC pressed alone - wait a bit to see if more follows
                    escapeTimeout = setTimeout(() => {
                        result.name = 'escape'
                        resolve(result)
                    }, 50) // 50ms timeout for ESC key
                    
                    // Listen for more data
                    process.stdin.once('data', (nextKey) => {
                        clearTimeout(escapeTimeout)
                        // Combine with next key
                        const combined = key + nextKey
                        
                        if (combined === '\x1b[A') {
                            result.name = 'up'
                        } else if (combined === '\x1b[B') {
                            result.name = 'down'
                        } else if (combined === '\x1b[C') {
                            result.name = 'right'
                        } else if (combined === '\x1b[D') {
                            result.name = 'left'
                        } else if (combined === '\x1b[H') {
                            result.name = 'home'
                        } else if (combined === '\x1b[F') {
                            result.name = 'end'
                        } else if (combined === '\x1b[5~') {
                            result.name = 'pageup'
                        } else if (combined === '\x1b[6~') {
                            result.name = 'pagedown'
                        } else {
                            // Unknown escape sequence, treat as ESC
                            result.name = 'escape'
                        }
                        resolve(result)
                    })
                    return // Don't resolve yet, wait for timeout or next key
                }
                
                // Arrow keys and other escape sequences
                if (key === '\x1b[A') {
                    result.name = 'up'
                } else if (key === '\x1b[B') {
                    result.name = 'down'
                } else if (key === '\x1b[C') {
                    result.name = 'right'
                } else if (key === '\x1b[D') {
                    result.name = 'left'
                } else if (key === '\x1b[H') {
                    result.name = 'home'
                } else if (key === '\x1b[F') {
                    result.name = 'end'
                } else if (key === '\x1b[5~') {
                    result.name = 'pageup'
                } else if (key === '\x1b[6~') {
                    result.name = 'pagedown'
                } else if (key.startsWith('\x1b')) {
                    // Any other escape sequence, treat as ESC
                    result.name = 'escape'
                } else if (key === '\r' || key === '\n') {
                    result.name = 'enter'
                } else if (key === ' ') {
                    result.name = 'space'
                } else if (key === '\x7f' || key === '\b') {
                    result.name = 'backspace'
                } else if (key === '\x03') {
                    result.name = 'ctrl-c'
                    result.ctrl = true
                } else if (key === '\x04') {
                    result.name = 'ctrl-d'
                    result.ctrl = true
                } else if (key === '\x1a') {
                    result.name = 'ctrl-z'
                    result.ctrl = true
                } else if (key.length === 1) {
                    result.name = key
                }
                
                resolve(result)
            }
            
            process.stdin.once('data', onData)
        })
    }

    /**
     * Interactive select with arrow key navigation (simplified version)
     * @param {string} prompt - The question to ask
     * @param {Array} choices - Array of choices
     * @param {*} defaultChoice - Default choice
     * @returns {Promise<*>} Selected choice
     */
    async interactiveSelect(prompt, choices, defaultChoice = null) {
        if (prompt) {
            console.log('\n' + bold(prompt))
        }
        console.log(gray('↑↓ Navigate  ⏎ Select  ⎋ Back  ^C Exit'))
        
        let selectedIndex = defaultChoice ? choices.indexOf(defaultChoice) : 0
        if (selectedIndex < 0) selectedIndex = 0
        
        // Initial render
        const render = () => {
            // Move up to start of menu
            this.moveUp(choices.length)
            
            // Render all choices
            choices.forEach((choice, i) => {
                this.clearLine()
                if (i === selectedIndex) {
                    console.log(green('▶ ') + bold(choice))
                } else {
                    console.log('  ' + choice)
                }
            })
        }
        
        // Initial display
        choices.forEach((choice, i) => {
            if (i === selectedIndex) {
                console.log(green('▶ ') + bold(choice))
            } else {
                console.log('  ' + choice)
            }
        })
        
        // Enable raw mode for arrow key input
        this.enableRawMode()
        
        let result = null
        while (result === null) {
            const key = await this.keypress()
            
            if (key.name === 'up') {
                selectedIndex = (selectedIndex - 1 + choices.length) % choices.length
                render()
            } else if (key.name === 'down') {
                selectedIndex = (selectedIndex + 1) % choices.length
                render()
            } else if (key.name === 'enter') {
                result = choices[selectedIndex]
            } else if (key.name === 'escape') {
                // ESC means go back/cancel, return null to indicate cancellation
                result = null
                break
            } else if (key.name === 'ctrl-c') {
                // Ctrl+C exits completely
                process.exit(0)
            } else if (key.name >= '1' && key.name <= '9') {
                // Number key shortcut
                const num = parseInt(key.name) - 1
                if (num < choices.length) {
                    selectedIndex = num
                    render()
                    result = choices[selectedIndex]
                }
            }
        }
        
        this.disableRawMode()
        console.log() // New line after selection
        
        return result
    }

    /**
     * Ask a question and get user input
     * @param {string} prompt - The question to ask
     * @param {string} defaultValue - Default value if user just presses enter
     * @returns {Promise<string>} User's answer or default value
     */
    async question(prompt, defaultValue = '') {
        this.init()
        
        return new Promise(resolve => {
            const displayPrompt = defaultValue 
                ? `${prompt} ${gray(`(${defaultValue})`)} ` 
                : `${prompt} `
            
            this.rl.question(displayPrompt, answer => {
                resolve(answer || defaultValue)
            })
        })
    }

    /**
     * Ask a yes/no confirmation question
     * @param {string} prompt - The question to ask
     * @param {boolean} defaultValue - Default value (true for yes, false for no)
     * @returns {Promise<boolean>} True if confirmed, false otherwise
     */
    async confirm(prompt, defaultValue = true) {
        const answer = await this.question(
            prompt + (defaultValue ? ' (Y/n)' : ' (y/N)'),
            defaultValue ? 'y' : 'n'
        )
        const normalized = answer.toLowerCase().trim()
        if (defaultValue) {
            // Default is yes, so only return false if explicitly 'n' or 'no'
            return normalized !== 'n' && normalized !== 'no'
        } else {
            // Default is no, so only return true if explicitly 'y' or 'yes'
            return normalized === 'y' || normalized === 'yes'
        }
    }

    /**
     * Ask for a choice from a list (simple version without arrow keys)
     * @param {string} prompt - The question to ask
     * @param {Array} choices - Array of choices
     * @param {*} defaultChoice - Default choice
     * @param {boolean} showMarker - Show arrow marker for current selection
     * @returns {Promise<*>} Selected choice
     */
    async select(prompt, choices, defaultChoice = null, showMarker = true) {
        console.log('\n' + prompt)
        
        const choiceList = choices.map((c, i) => {
            const num = `${i + 1}.`
            if (showMarker && c === defaultChoice) {
                return ` ${green('▶')} ${num} ${c}`
            }
            return `   ${num} ${c}`
        }).join('\n')
        
        console.log(choiceList)
        
        const defaultIndex = defaultChoice ? choices.indexOf(defaultChoice) + 1 : 1
        const answer = await this.question('Choose option', String(defaultIndex))
        
        const index = parseInt(answer) - 1
        if (index >= 0 && index < choices.length) {
            return choices[index]
        }
        return defaultChoice || choices[0]
    }

    /**
     * Interactive menu with arrow navigation
     * @param {string} title - Menu title
     * @param {Array} items - Menu items
     * @param {Object} options - Options {fullscreen, loop}
     * @returns {Promise<*>} Selected item value
     */
    async interactiveMenu(title, items, options = {}) {
        const { fullscreen = false, loop = true, showHelp = true } = options
        
        if (fullscreen) {
            this.clear()
        }
        
        this.header(title)
        
        // Show keyboard help if enabled
        if (showHelp) {
            console.log(gray('↑↓ Navigate  ⏎ Select  ⎋ Back  ^C Exit'))
        }
        
        // Filter out sections and build choice array
        const choices = []
        const mapping = {}
        
        items.forEach(item => {
            if (!item.section) {
                const label = item.label || item
                choices.push(label)
                mapping[label] = item.value || item
            }
        })
        
        // Show sections above menu
        let hasSection = false
        items.forEach(item => {
            if (item.section && !hasSection) {
                console.log(cyan(`\n${item.section}`))
                hasSection = true
            }
        })
        
        const selected = await this.interactiveSelect('', choices)
        
        // Return null if ESC was pressed to indicate go back
        if (selected === null) {
            return null
        }
        
        return mapping[selected]
    }

    /**
     * Menu selection with sections (non-interactive)
     * @param {string} title - Menu title
     * @param {Array} items - Menu items with optional sections
     * @returns {Promise<*>} Selected item
     */
    async menu(title, items) {
        this.header(title)
        
        const choices = []
        const mapping = {}
        let index = 1
        
        for (const item of items) {
            if (item.section) {
                console.log(cyan(`\n${item.section}`))
            } else {
                choices.push(`${index}. ${item.label || item}`)
                mapping[index] = item.value || item
                index++
            }
        }
        
        console.log(choices.join('\n'))
        const answer = await this.question('Select', '1')
        
        const selected = parseInt(answer)
        return mapping[selected] || mapping[1]
    }

    /**
     * Interactive multi-select with arrow keys and space to toggle
     * @param {string} prompt - The question to ask
     * @param {Array} choices - Array of choices
     * @param {Array} preSelected - Pre-selected choices
     * @returns {Promise<Array>} Selected choices
     */
    async interactiveMultiselect(prompt, choices, preSelected = []) {
        console.log('\n' + bold(prompt))
        console.log(gray('↑↓ Navigate  ␣ Toggle  ⏎ Confirm  ⎋ Cancel  ^A Select All'))
        
        let selectedIndex = 0
        const selected = new Set(preSelected)
        
        // Render function
        const render = () => {
            this.moveUp(choices.length)
            
            choices.forEach((choice, i) => {
                this.clearLine()
                const marker = selected.has(choice) ? green('[✓]') : '[ ]'
                if (i === selectedIndex) {
                    console.log(cyan('▶ ') + marker + ' ' + bold(choice))
                } else {
                    console.log('  ' + marker + ' ' + choice)
                }
            })
        }
        
        // Initial render
        choices.forEach((choice, i) => {
            const marker = selected.has(choice) ? green('[✓]') : '[ ]'
            if (i === selectedIndex) {
                console.log(cyan('▶ ') + marker + ' ' + bold(choice))
            } else {
                console.log('  ' + marker + ' ' + choice)
            }
        })
        
        // Enable raw mode
        this.enableRawMode()
        
        let done = false
        while (!done) {
            const key = await this.keypress()
            
            if (key.name === 'up') {
                selectedIndex = (selectedIndex - 1 + choices.length) % choices.length
                render()
            } else if (key.name === 'down') {
                selectedIndex = (selectedIndex + 1) % choices.length
                render()
            } else if (key.name === 'space') {
                const choice = choices[selectedIndex]
                if (selected.has(choice)) {
                    selected.delete(choice)
                } else {
                    selected.add(choice)
                }
                render()
            } else if (key.name === 'enter') {
                done = true
            } else if (key.name === 'escape') {
                // ESC means go back/cancel
                this.disableRawMode()
                return null
            } else if (key.name === 'ctrl-c') {
                // Ctrl+C exits completely
                process.exit(0)
            } else if (key.name === 'a' && key.ctrl) {
                // Ctrl+A to select all
                choices.forEach(c => selected.add(c))
                render()
            }
        }
        
        this.disableRawMode()
        console.log() // New line after selection
        
        return Array.from(selected)
    }

    /**
     * Multi-select from list (simple version)
     * @param {string} prompt - The question to ask
     * @param {Array} choices - Array of choices
     * @param {Array} selected - Pre-selected choices
     * @returns {Promise<Array>} Selected choices
     */
    async multiselect(prompt, choices, selected = []) {
        console.log('\n' + prompt)
        console.log(gray('(Enter numbers separated by commas)'))
        
        const choiceList = choices.map((c, i) => {
            const marker = selected.includes(c) ? green('[✓]') : '[ ]'
            return `  ${marker} ${i + 1}. ${c}`
        }).join('\n')
        
        console.log(choiceList)
        
        const answer = await this.question('Select numbers (comma-separated)', '')
        if (!answer) return selected
        
        const indices = answer.split(',').map(s => parseInt(s.trim()) - 1)
        return indices
            .filter(i => i >= 0 && i < choices.length)
            .map(i => choices[i])
    }

    /**
     * Ask for a number input
     * @param {string} prompt - The question to ask
     * @param {number} defaultValue - Default value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {Promise<number>} Valid number
     */
    async number(prompt, defaultValue = 0, min = null, max = null) {
        while (true) {
            const answer = await this.question(prompt, String(defaultValue))
            const num = parseInt(answer)
            
            if (isNaN(num)) {
                console.log(red('Please enter a valid number'))
                continue
            }
            
            if (min !== null && num < min) {
                console.log(red(`Number must be at least ${min}`))
                continue
            }
            
            if (max !== null && num > max) {
                console.log(red(`Number must be at most ${max}`))
                continue
            }
            
            return num
        }
    }

    /**
     * Ask for a password (uses normal input for simplicity and reliability)
     * Note: Password will be visible while typing. For production use,
     * consider using a more sophisticated approach or external package.
     * @param {string} prompt - The question to ask
     * @returns {Promise<string>} Password
     */
    async password(prompt) {
        this.init()
        
        // For now, use regular question but warn user
        console.log(yellow('⚠ Note: Password will be visible while typing'))
        const password = await this.question(prompt)
        
        // Clear the line after password entry for security
        process.stdout.write('\x1b[1A\x1b[2K') // Move up and clear line
        console.log(`${prompt} ${'*'.repeat(password.length || 8)}`)
        
        return password
    }

    // Output methods
    log(...args) { console.log(...args) }
    error(msg) { console.log(red('✗ ' + msg)) }
    success(msg) { console.log(green('✓ ' + msg)) }
    warning(msg) { console.log(yellow('⚠ ' + msg)) }
    info(msg) { console.log(blue('ℹ ' + msg)) }
    
    // Formatting methods
    header(text) {
        const width = Math.min(this.width - 4, text.length + 10)
        const padding = Math.floor((width - text.length) / 2)
        const line = '═'.repeat(width)
        console.log(cyan(line))
        console.log(cyan(bold(' '.repeat(padding) + text + ' '.repeat(padding))))
        console.log(cyan(line))
    }
    
    section(text) {
        console.log(blue('\n' + text))
    }

    /**
     * Display a box with text
     * @param {string} text - Text to display
     * @param {Object} options - Options {color, padding}
     */
    box(text, options = {}) {
        const { borderColor = 'cyan', padding = 1 } = options
        const lines = text.split('\n')
        const maxLength = Math.max(...lines.map(l => l.length))
        const width = Math.min(this.width - 4, maxLength + padding * 2 + 2)
        
        const colorFn = colors[borderColor] ? (t) => color(t, colors[borderColor]) : cyan
        
        // Top border
        console.log(colorFn('┌' + '─'.repeat(width - 2) + '┐'))
        
        // Content with padding
        lines.forEach(line => {
            const paddedLine = ' '.repeat(padding) + line + ' '.repeat(width - line.length - padding * 2 - 2)
            console.log(colorFn('│') + paddedLine + colorFn('│'))
        })
        
        // Bottom border
        console.log(colorFn('└' + '─'.repeat(width - 2) + '┘'))
    }
    
    // Progress methods
    startSpinner(text) {
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        let i = 0
        
        this.spinner = setInterval(() => {
            process.stdout.write(`\r${cyan(frames[i])} ${text}`)
            i = (i + 1) % frames.length
        }, 80)
    }
    
    stopSpinner(success = true, message = '') {
        if (this.spinner) {
            clearInterval(this.spinner)
            this.spinner = null
            process.stdout.write('\r' + ' '.repeat(80) + '\r')
            if (message) {
                if (success) {
                    this.success(message)
                } else {
                    this.error(message)
                }
            }
        }
    }

    /**
     * Clear screen
     */
    clear() {
        process.stdout.write('\x1b[2J\x1b[0f')
    }

    /**
     * Move cursor up n lines
     * @param {number} lines - Number of lines to move up
     */
    moveUp(lines = 1) {
        process.stdout.write(`\x1b[${lines}A`)
    }

    /**
     * Clear current line
     */
    clearLine() {
        process.stdout.write('\x1b[2K\r')
    }

    /**
     * Display a responsive table
     * @param {Array} data - Array of objects
     * @param {Array} columns - Column definitions [{key, label, width}]
     */
    table(data, columns) {
        if (!data || data.length === 0) {
            console.log(gray('No data'))
            return
        }
        
        // Calculate responsive widths
        const availableWidth = this.width - 4
        let totalWidth = columns.reduce((sum, col) => sum + (col.width || 10), 0)
        
        // Adjust if needed
        if (totalWidth > availableWidth) {
            const scale = availableWidth / totalWidth
            columns.forEach(col => {
                col.width = Math.floor((col.width || 10) * scale)
            })
        }
        
        // Header
        const header = columns.map(col => {
            const label = col.label || col.key
            const width = col.width || label.length + 2
            return label.substring(0, width).padEnd(width)
        }).join(' ')
        
        console.log(bold(header))
        console.log(gray('─'.repeat(Math.min(header.length, this.width))))
        
        // Rows
        data.forEach(row => {
            const line = columns.map(col => {
                const value = String(row[col.key] || '')
                const width = col.width || col.label?.length || col.key.length + 2
                return value.substring(0, width).padEnd(width)
            }).join(' ')
            console.log(line)
        })
    }

    /**
     * Display a responsive progress bar
     * @param {number} current - Current value
     * @param {number} total - Total value
     * @param {string} label - Optional label
     */
    progressBar(current, total, label = '') {
        const availableWidth = this.width - label.length - 10 // Reserve space for label and percentage
        const width = Math.min(30, Math.max(10, availableWidth))
        const percent = Math.min(current / total, 1)
        const filled = Math.floor(width * percent)
        const empty = width - filled
        
        const bar = green('█'.repeat(filled)) + gray('░'.repeat(empty))
        const percentage = Math.floor(percent * 100)
        
        this.clearLine()
        process.stdout.write(`${label} ${bar} ${percentage}%`)
        
        if (current >= total) {
            console.log() // New line when complete
        }
    }

    /**
     * Truncate text to fit terminal width
     * @param {string} text - Text to truncate
     * @param {number} maxWidth - Maximum width (defaults to terminal width - 4)
     * @returns {string} Truncated text
     */
    truncate(text, maxWidth = null) {
        const max = maxWidth || this.width - 4
        if (text.length <= max) return text
        return text.substring(0, max - 3) + '...'
    }

    /**
     * Wrap text to fit terminal width
     * @param {string} text - Text to wrap
     * @param {number} maxWidth - Maximum width (defaults to terminal width - 4)
     * @returns {Array<string>} Array of wrapped lines
     */
    wrap(text, maxWidth = null) {
        const max = maxWidth || this.width - 4
        const words = text.split(' ')
        const lines = []
        let currentLine = ''
        
        words.forEach(word => {
            if (currentLine.length + word.length + 1 <= max) {
                currentLine += (currentLine ? ' ' : '') + word
            } else {
                if (currentLine) lines.push(currentLine)
                currentLine = word
            }
        })
        
        if (currentLine) lines.push(currentLine)
        return lines
    }
}

// Export colors and Terminal class
export { Terminal, colors, red, green, yellow, blue, cyan, gray, white, bold, dim }
export default Terminal