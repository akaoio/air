#!/usr/bin/env bun
// Fallback: #!/usr/bin/env tsx
/**
 * Air Console Installer - No UI frameworks, pure console
 */

import readline from "readline"
import fs from "fs"
import path from "path"
import os from "os"
import { Installer } from "../src/Installer/index.js"

// ANSI colors
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m"
}

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

// Promisify readline question
function question(prompt: string): Promise<string> {
    return new Promise(resolve => {
        rl.question(prompt, resolve)
    })
}

// Clear screen
function clear() {
    console.clear()
}

// Show header
function showHeader() {
    clear()
    console.log(`${colors.cyan}
    ___     ____  ____  
   /   |   /  _/ / __ \\ 
  / /| |   / /  / /_/ / 
 / ___ | _/ /  / _, _/  
/_/  |_|/___/ /_/ |_|   
${colors.reset}`)
    console.log(`${colors.bright}Air Database Installer v2.0${colors.reset}`)
    console.log(`${colors.gray}Distributed P2P Database with GUN Protocol${colors.reset}\n`)
}

// Show menu
async function showMenu(): Promise<string> {
    console.log(`${colors.cyan}Select an option:${colors.reset}`)
    console.log(`  ${colors.green}1${colors.reset}) Quick Install (Development)`)
    console.log(`  ${colors.blue}2${colors.reset}) Custom Install`)
    console.log(`  ${colors.yellow}3${colors.reset}) Production Install`)
    console.log(`  ${colors.magenta}4${colors.reset}) Check Existing Config`)
    console.log(`  ${colors.red}5${colors.reset}) Exit\n`)

    const choice = await question(`${colors.cyan}Enter choice (1-5): ${colors.reset}`)
    return choice.trim()
}

// Parse command line arguments
function parseArgs(args: string[]): any {
    const parsed: any = {
        help: args.includes("--help") || args.includes("-h"),
        nonInteractive: args.includes("--non-interactive") || args.includes("-n") || process.env.CI === "true",
        configPath: "air.json"
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]

        if (arg === "--config" || arg === "-c") {
            parsed.configPath = args[i + 1] || "air.json"
            i++
        } else if (arg.startsWith("--")) {
            const [key, value] = arg.split("=")
            const cleanKey = key.replace("--", "").replace(/-/g, "_")

            if (value !== undefined) {
                if (cleanKey === "port") {
                    parsed[cleanKey] = parseInt(value)
                } else if (cleanKey === "ssl" || cleanKey === "systemd") {
                    parsed[cleanKey] = value === "true"
                } else {
                    parsed[cleanKey] = value
                }
            } else {
                parsed[cleanKey] = true
            }
        }
    }

    return parsed
}

// Expand ~ to home directory
function expandPath(filepath: string): string {
    if (filepath.startsWith("~/")) {
        return path.join(os.homedir(), filepath.slice(2))
    }
    return path.resolve(filepath)
}

// Quick install
async function quickInstall(configPath: string) {
    console.log(`\n${colors.green}🚀 Quick Install${colors.reset}`)

    const installer = new Installer()
    const config = installer.configure({
        name: "air",
        env: "development",
        port: 8765,
        nonInteractive: true
    })

    installer.save(config, configPath)

    console.log(`${colors.green}✅ Installation complete!${colors.reset}`)
    console.log(`📄 Config saved to: ${configPath}`)
    console.log(`\nNext steps:`)
    console.log(`  1. Start: ${colors.cyan}npm start${colors.reset}`)
    console.log(`  2. Status: ${colors.cyan}npm run status${colors.reset}`)
}

// Custom install
async function customInstall(configPath: string) {
    console.log(`\n${colors.blue}⚙️ Custom Install${colors.reset}\n`)

    const name = (await question(`Instance name (default: air): `)) || "air"
    const envChoice = (await question(`Environment (1=development, 2=production) [1]: `)) || "1"
    const env = envChoice === "2" ? "production" : "development"
    const port = (await question(`Port (default: ${env === "production" ? "443" : "8765"}): `)) || (env === "production" ? "443" : "8765")

    let domain = "localhost"
    let enableSSL = false
    let enableDDNS = false
    let godaddyConfig: any = null

    if (env === "production") {
        domain = (await question(`Domain name: `)) || "example.com"

        const sslChoice = await question(`Enable SSL? (y/n) [n]: `)
        enableSSL = sslChoice.toLowerCase() === "y"

        const ddnsChoice = await question(`Enable GoDaddy DDNS? (y/n) [n]: `)
        if (ddnsChoice.toLowerCase() === "y") {
            enableDDNS = true
            godaddyConfig = {
                domain: await question(`GoDaddy domain (e.g., example.com): `),
                host: (await question(`Subdomain (@ for root): `)) || "@",
                key: await question(`GoDaddy API key: `),
                secret: await question(`GoDaddy API secret: `)
            }
        }
    }

    const installer = new Installer()
    const config: any = {
        name,
        env,
        port: parseInt(port.toString()),
        domain,
        nonInteractive: true
    }

    if (enableSSL) config.ssl = true
    if (godaddyConfig) config.godaddy = godaddyConfig

    const finalConfig = installer.configure(config)
    installer.save(finalConfig, configPath)

    if (enableSSL) {
        console.log(`\n${colors.yellow}🔒 Setting up SSL...${colors.reset}`)
        await installer.ssl(finalConfig)
    }

    console.log(`\n${colors.green}✅ Installation complete!${colors.reset}`)
    console.log(`📄 Config saved to: ${configPath}`)
}

// Production install
async function productionInstall(configPath: string) {
    console.log(`\n${colors.yellow}🌐 Production Install${colors.reset}\n`)

    const domain = await question(`Domain name (required): `)
    if (!domain) {
        console.error(`${colors.red}❌ Domain is required for production${colors.reset}`)
        return
    }

    const port = (await question(`Port (default: 443): `)) || "443"

    const installer = new Installer()
    const config = installer.configure({
        name: "air",
        env: "production",
        port: parseInt(port),
        domain,
        ssl: true,
        nonInteractive: true
    })

    installer.save(config, configPath)

    console.log(`\n${colors.yellow}🔒 Setting up SSL...${colors.reset}`)
    await installer.ssl(config)

    console.log(`\n${colors.yellow}⚙️ Creating systemd service...${colors.reset}`)
    await installer.service(config)

    console.log(`\n${colors.green}✅ Production installation complete!${colors.reset}`)
    console.log(`📄 Config saved to: ${configPath}`)
    console.log(`\nNext steps:`)
    console.log(`  1. Start service: ${colors.cyan}sudo systemctl start air-air${colors.reset}`)
    console.log(`  2. Enable on boot: ${colors.cyan}sudo systemctl enable air-air${colors.reset}`)
    console.log(`  3. Check status: ${colors.cyan}npm run status${colors.reset}`)
}

// Check existing config
async function checkConfig() {
    console.log(`\n${colors.magenta}📖 Checking Configuration${colors.reset}\n`)

    const configPath = path.join(process.cwd(), "air.json")

    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
            console.log(`${colors.green}✅ Configuration found${colors.reset}`)
            console.log(`\nCurrent settings:`)
            console.log(`  Name: ${colors.cyan}${config.name}${colors.reset}`)
            console.log(`  Environment: ${colors.cyan}${config.env}${colors.reset}`)
            console.log(`  Port: ${colors.cyan}${config.port}${colors.reset}`)
            console.log(`  Domain: ${colors.cyan}${config.domain}${colors.reset}`)

            if (config[config.env]?.ssl) {
                console.log(`  SSL: ${colors.green}Enabled${colors.reset}`)
            }

            if (config[config.env]?.godaddy) {
                console.log(`  DDNS: ${colors.green}GoDaddy configured${colors.reset}`)
            }
        } catch (err) {
            console.error(`${colors.red}❌ Error reading config: ${err}${colors.reset}`)
        }
    } else {
        console.log(`${colors.yellow}⚠️ No configuration found${colors.reset}`)
        console.log(`Run installer to create one`)
    }
}

// Non-interactive mode
async function nonInteractive(options: any) {
    console.log(`${colors.cyan}🚀 Air Non-Interactive Install${colors.reset}`)

    const configPath = expandPath(options.configPath)
    const installer = new Installer()

    const config: any = {
        name: options.name || "air",
        env: options.env || "development",
        port: options.port || (options.env === "production" ? 443 : 8765),
        root: process.cwd(),
        bash: process.env.SHELL || "/bin/bash"
    }

    if (options.env === "production" && !options.domain) {
        console.error(`${colors.red}❌ Domain required for production environment${colors.reset}`)
        process.exit(1)
    }

    if (options.domain) config.domain = options.domain
    if (options.ssl) config.ssl = true

    if (options.godaddy_key && options.godaddy_secret) {
        config.godaddy = {
            key: options.godaddy_key,
            secret: options.godaddy_secret,
            domain: options.godaddy_domain || options.domain,
            host: options.godaddy_host || "@"
        }
    }

    const finalConfig = installer.configure(config)
    installer.save(finalConfig, configPath)

    if (options.ssl) {
        console.log(`${colors.yellow}🔒 Setting up SSL...${colors.reset}`)
        await installer.ssl(finalConfig)
    }

    if (options.systemd) {
        console.log(`${colors.yellow}⚙️ Creating systemd service...${colors.reset}`)
        await installer.service(finalConfig)
    }

    console.log(`${colors.green}✅ Installation complete!${colors.reset}`)
    console.log(`📄 Config saved to: ${configPath}`)
    process.exit(0)
}

// Show help
function showHelp() {
    console.log(`
Air Database Installer v2.0

Usage:
  air-install [options]

Options:
  -h, --help              Show this help
  -n, --non-interactive   Run without prompts (CLI mode)
  -c, --config PATH       Config file path (default: air.json)
  
  --name NAME            Instance name (default: air)
  --env ENV              Environment: development|production
  --port PORT            Port number (default: 8765 for dev, 443 for prod)
  --domain DOMAIN        Domain name (required for production)
  --ssl                  Enable SSL with Let's Encrypt
  --systemd              Create systemd service
  
  --godaddy-key KEY      GoDaddy API key for DDNS
  --godaddy-secret SEC   GoDaddy API secret
  --godaddy-domain DOM   GoDaddy domain
  --godaddy-host HOST    Subdomain (@ for root)

Examples:
  # Interactive install
  air-install
  
  # Quick development install
  air-install --non-interactive
  
  # Production with custom config path
  air-install -n --env=production --domain=air.example.com --config=~/.config/air/config.json
`)
}

// Main
async function main() {
    const args = process.argv.slice(2)
    const options = parseArgs(args)

    if (options.help) {
        showHelp()
        process.exit(0)
    }

    const configPath = expandPath(options.configPath)

    // Non-interactive mode
    if (options.nonInteractive) {
        await nonInteractive(options)
        return
    }

    // Interactive mode
    showHeader()

    let running = true
    while (running) {
        const choice = await showMenu()

        switch (choice) {
            case "1":
                await quickInstall(configPath)
                running = false
                break

            case "2":
                await customInstall(configPath)
                running = false
                break

            case "3":
                await productionInstall(configPath)
                running = false
                break

            case "4":
                await checkConfig()
                console.log("")
                await question("Press Enter to continue...")
                showHeader()
                break

            case "5":
                console.log(`\n${colors.gray}Goodbye!${colors.reset}`)
                running = false
                break

            default:
                console.log(`${colors.red}Invalid choice. Please try again.${colors.reset}\n`)
        }
    }

    rl.close()
}

// Handle errors
process.on("SIGINT", () => {
    console.log(`\n${colors.gray}Installation cancelled${colors.reset}`)
    process.exit(0)
})

// Run
main().catch(err => {
    console.error(`${colors.red}❌ Installation failed: ${err.message}${colors.reset}`)
    process.exit(1)
})
