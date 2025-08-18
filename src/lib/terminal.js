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
    bold: '\x1b[1m'
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

/**
 * Terminal interaction utility class
 * Provides consistent interface for user input/output in CLI
 */
class Terminal {
    constructor() {
        this.rl = null
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
     * Ask for a choice from a list
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
     * Menu selection with sections
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
     * Multi-select from list
     * @param {string} prompt - The question to ask
     * @param {Array} choices - Array of choices
     * @param {Array} selected - Pre-selected choices
     * @returns {Promise<Array>} Selected choices
     */
    async multiselect(prompt, choices, selected = []) {
        console.log('\n' + prompt)
        console.log(gray('(Space to select, Enter to confirm)'))
        
        // For simplicity without additional dependencies, 
        // we'll use comma-separated input
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
        const line = '═'.repeat(text.length + 4)
        console.log(cyan(line))
        console.log(cyan(bold('  ' + text + '  ')))
        console.log(cyan(line))
    }
    
    section(text) {
        console.log(blue('\n' + text))
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
     * Display a table
     * @param {Array} data - Array of objects
     * @param {Array} columns - Column definitions [{key, label, width}]
     */
    table(data, columns) {
        if (!data || data.length === 0) {
            console.log(gray('No data'))
            return
        }
        
        // Header
        const header = columns.map(col => {
            const label = col.label || col.key
            const width = col.width || label.length + 2
            return label.padEnd(width)
        }).join(' ')
        
        console.log(bold(header))
        console.log(gray('─'.repeat(header.length)))
        
        // Rows
        data.forEach(row => {
            const line = columns.map(col => {
                const value = String(row[col.key] || '')
                const width = col.width || col.label?.length || col.key.length + 2
                return value.padEnd(width)
            }).join(' ')
            console.log(line)
        })
    }

    /**
     * Display a progress bar
     * @param {number} current - Current value
     * @param {number} total - Total value
     * @param {string} label - Optional label
     */
    progressBar(current, total, label = '') {
        const width = 30
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
}

// Export colors and Terminal class
export { Terminal, colors, red, green, yellow, blue, cyan, gray, white, bold }
export default Terminal