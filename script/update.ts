#!/usr/bin/env bun
// Fallback: #!/usr/bin/env tsx
/**
 * Air Update Command
 * Updates Air database to latest version
 */

import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

// ANSI colors
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
}

function log(message: string, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`)
}

function error(message: string) {
    console.error(`${colors.red}❌ ${message}${colors.reset}`)
}

function success(message: string) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`)
}

function info(message: string) {
    console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`)
}

async function update() {
    log("🔄 Air Update System", colors.cyan + colors.bright)
    log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", colors.cyan)

    // Check if git repo
    const gitDir = path.join(rootDir, ".git")
    if (fs.existsSync(gitDir)) {
        info("Git repository detected")

        try {
            // Fetch latest changes
            info("Fetching latest changes...")
            execSync("git fetch", { cwd: rootDir, stdio: "inherit" })

            // Check current branch
            const branch = execSync("git branch --show-current", { cwd: rootDir }).toString().trim()
            info(`Current branch: ${branch}`)

            // Check for updates
            const behind = execSync(`git rev-list HEAD..origin/${branch} --count`, { cwd: rootDir }).toString().trim()

            if (behind === "0") {
                success("Already up to date!")
                return
            }

            info(`${behind} update(s) available`)

            // Pull updates
            info("Pulling updates...")
            execSync(`git pull origin ${branch}`, { cwd: rootDir, stdio: "inherit" })

            success("Git repository updated!")
        } catch (err: any) {
            error(`Git update failed: ${err.message}`)
            return
        }
    } else if (fs.existsSync(path.join(rootDir, "node_modules"))) {
        // NPM package update
        info("NPM package detected")

        try {
            info("Checking for updates...")
            const result = execSync("npm outdated @akaoio/air --json || true", { cwd: rootDir }).toString().trim()

            if (!result || result === "{}") {
                success("Already up to date!")
                return
            }

            const outdated = JSON.parse(result)
            if (outdated["@akaoio/air"]) {
                const pkg = outdated["@akaoio/air"]
                info(`Update available: ${pkg.current} → ${pkg.latest}`)

                info("Updating package...")
                execSync("npm update @akaoio/air", { cwd: rootDir, stdio: "inherit" })

                success("Package updated!")
            } else {
                success("Already up to date!")
            }
        } catch (err: any) {
            error(`NPM update failed: ${err.message}`)
            return
        }
    } else {
        error("Cannot determine installation type (not a git repo or npm package)")
        return
    }

    // Rebuild if needed
    try {
        info("Rebuilding project...")
        execSync("npm run build:prod", { cwd: rootDir, stdio: "inherit" })
        success("Build completed!")
    } catch (err) {
        error("Build failed, but update was successful")
    }

    // Restart service if running
    try {
        const pidFile = path.join(rootDir, ".air.pid")
        if (fs.existsSync(pidFile)) {
            const pid = fs.readFileSync(pidFile, "utf8").trim()
            info(`Restarting Air service (PID: ${pid})...`)

            try {
                process.kill(parseInt(pid), "SIGTERM")
                // Wait a bit for graceful shutdown
                await new Promise(resolve => setTimeout(resolve, 2000))
            } catch {}

            // Start again
            execSync("npm start", { cwd: rootDir, stdio: "inherit", detached: true })
            success("Service restarted!")
        }
    } catch (err) {
        info("Service not running, skipping restart")
    }

    log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", colors.cyan)
    success("Update complete!")
}

// Parse arguments
const args = process.argv.slice(2)
if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Air Update Command

Usage:
  npm run update [options]

Options:
  -h, --help     Show this help
  --force        Force update even if up to date

Description:
  Updates Air database to the latest version.
  Works with both git repositories and npm packages.
  Automatically rebuilds and restarts the service if running.
`)
    process.exit(0)
}

// Run update
update().catch(err => {
    error(`Update failed: ${err.message}`)
    process.exit(1)
})
