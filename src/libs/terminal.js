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
     * @returns {Promise<*>} Selected choice
     */
    async select(prompt, choices, defaultChoice = null) {
        const choiceList = choices.map((c, i) => `  ${i + 1}. ${c}`).join('\n')
        console.log(prompt)
        console.log(choiceList)
        
        const defaultIndex = defaultChoice ? choices.indexOf(defaultChoice) + 1 : 1
        const answer = await this.question('Select option:', String(defaultIndex))
        
        const index = parseInt(answer) - 1
        if (index >= 0 && index < choices.length) {
            return choices[index]
        }
        return defaultChoice || choices[0]
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
     * Ask for a password (hidden input)
     * @param {string} prompt - The question to ask
     * @returns {Promise<string>} Password
     */
    async password(prompt) {
        this.init()
        
        return new Promise(resolve => {
            // Save current settings
            const stdin = process.stdin
            const wasRaw = stdin.isRaw
            
            // Hide input
            stdin.setRawMode(true)
            process.stdout.write(prompt + ' ')
            
            let password = ''
            stdin.on('data', function onData(char) {
                char = char.toString('utf8')
                
                switch (char) {
                    case '\n':
                    case '\r':
                    case '\u0004':
                        // Enter or Ctrl+D
                        stdin.setRawMode(wasRaw)
                        stdin.removeListener('data', onData)
                        process.stdout.write('\n')
                        resolve(password)
                        break
                    case '\u0003':
                        // Ctrl+C
                        process.exit()
                        break
                    case '\u007f':
                    case '\b':
                        // Backspace
                        if (password.length > 0) {
                            password = password.slice(0, -1)
                            process.stdout.write('\b \b')
                        }
                        break
                    default:
                        // Add character
                        password += char
                        process.stdout.write('*')
                        break
                }
            })
        })
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
}

// Export colors and Terminal class
export { Terminal, colors, red, green, yellow, blue, cyan, gray, white, bold }
export default Terminal