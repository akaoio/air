#!/usr/bin/env bun
// @bun

// script/install-simple.ts
import { execSync } from "child_process";
import fs2 from "fs";
import path2 from "path";
import os from "os";
import { fileURLToPath } from "url";
import readline from "readline";

// src/paths.ts
import fs from "fs";
import path from "path";
var __dirname2 = process.cwd();
var detectPaths = () => {
  const paths = {
    script: path.resolve(__dirname2, ".."),
    root: null,
    bash: null,
    config: null,
    isPackage: false,
    isDevelopment: false
  };
  const scriptPath = paths.script;
  if (scriptPath.includes("node_modules")) {
    paths.isPackage = true;
    const parts = scriptPath.split(path.sep);
    const nodeModulesIndex = parts.lastIndexOf("node_modules");
    paths.root = parts.slice(0, nodeModulesIndex).join(path.sep);
  } else {
    const cwdConfig = path.join(process.cwd(), "air.json");
    const scriptConfig = path.join(scriptPath, "air.json");
    if (fs.existsSync(cwdConfig)) {
      paths.root = process.cwd();
    } else if (fs.existsSync(scriptConfig)) {
      paths.root = scriptPath;
      paths.isDevelopment = true;
    } else {
      paths.root = process.cwd();
    }
  }
  paths.bash = path.join(paths.script, "script");
  paths.config = path.join(paths.root, "air.json");
  return paths;
};
var getRootPath = (cliArg = null) => {
  if (cliArg)
    return path.resolve(cliArg);
  if (process.env.AIR_ROOT)
    return path.resolve(process.env.AIR_ROOT);
  if (process.env.ROOT)
    return path.resolve(process.env.ROOT);
  const detected = detectPaths();
  return detected.root;
};
var getBashPath = (cliArg = null) => {
  if (cliArg)
    return path.resolve(cliArg);
  if (process.env.AIR_BASH)
    return path.resolve(process.env.AIR_BASH);
  if (process.env.BASH)
    return path.resolve(process.env.BASH);
  const detected = detectPaths();
  return detected.bash;
};
var getPaths = (rootArg = null, bashArg = null) => {
  const detected = detectPaths();
  return {
    root: getRootPath(rootArg),
    bash: getBashPath(bashArg),
    config: path.join(getRootPath(rootArg), "air.json"),
    logs: path.join(getRootPath(rootArg), "logs"),
    script: detected.script,
    isPackage: detected.isPackage,
    isDevelopment: detected.isDevelopment
  };
};

// script/install-simple.ts
var __dirname3 = path2.dirname(fileURLToPath(import.meta.url));
function prompt(question, defaultValue = "") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    const q = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(q, (answer) => {
      rl.close();
      resolve(answer || defaultValue);
    });
  });
}
async function confirm(question, defaultValue = true) {
  const answer = await prompt(`${question} (y/n)`, defaultValue ? "y" : "n");
  return answer.toLowerCase().startsWith("y");
}
async function select(question, options) {
  console.log(`
${question}:`);
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
  const answer = await prompt("Select option", "1");
  const index = parseInt(answer) - 1;
  return options[index] || options[0];
}

class SimpleAirInstaller {
  args;
  config;
  platform;
  hostname;
  constructor() {
    this.args = this.parseArgs();
    const paths = getPaths(this.args.root, this.args.bash);
    this.config = {
      name: this.args.name || "air",
      env: this.args.env || "development",
      root: paths.root,
      bash: paths.bash
    };
    this.platform = os.platform();
    this.hostname = os.hostname();
  }
  parseArgs() {
    const args = {
      nonInteractive: false,
      quick: false,
      check: false
    };
    const argv = process.argv.slice(2);
    for (let i = 0;i < argv.length; i++) {
      const arg = argv[i];
      const next = argv[i + 1];
      switch (arg) {
        case "--help":
        case "-h":
          this.showHelp();
          process.exit(0);
          break;
        case "--check":
          args.check = true;
          break;
        case "--quick":
        case "-q":
          args.quick = true;
          args.nonInteractive = true;
          break;
        case "--non-interactive":
        case "-n":
          args.nonInteractive = true;
          break;
        case "--root":
        case "-r":
          args.root = next;
          i++;
          break;
        case "--env":
        case "-e":
          args.env = next;
          i++;
          break;
        case "--name":
          args.name = next;
          i++;
          break;
        case "--port":
        case "-p":
          args.port = parseInt(next);
          i++;
          break;
        case "--domain":
        case "-d":
          args.domain = next;
          i++;
          break;
      }
    }
    return args;
  }
  showHelp() {
    console.log(`
Air GUN Database Installer

Usage: air:install [options]

Options:
  -h, --help              Show this help message
  -q, --quick             Quick install with defaults
  -n, --non-interactive   Non-interactive mode
  --check                 Check installation only
  -r, --root <path>       Set root directory
  -e, --env <env>         Set environment (development/production)
  --name <name>           Set instance name
  -p, --port <port>       Set port number
  -d, --domain <domain>   Set domain name
  --no-tui, --simple      Use simple installer (no TUI)
`);
  }
  async run() {
    try {
      console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557`);
      console.log("\u2551              Air GUN Database Installer (Simple)          \u2551");
      console.log(`\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
      if (this.args.check) {
        await this.checkInstallation();
        return;
      }
      await this.checkSystem();
      await this.configureInstance();
      await this.saveConfiguration();
      await this.setupSSL();
      await this.setupService();
      await this.finalReport();
    } catch (err) {
      console.error(`
\u274C Installation failed:`, err.message);
      process.exit(1);
    }
  }
  async checkSystem() {
    console.log(`
\uD83D\uDCCB System Check
` + "\u2500".repeat(40));
    const checks = [];
    try {
      const nodeVersion = process.version;
      checks.push(`\u2705 Node.js: ${nodeVersion}`);
    } catch {
      checks.push("\u274C Node.js: Not found");
    }
    try {
      const bunVersion = execSync("bun --version", { encoding: "utf8" }).trim();
      checks.push(`\u2705 Bun: v${bunVersion}`);
    } catch {
      checks.push("\u26A0\uFE0F  Bun: Not installed (optional)");
    }
    let canWrite = false;
    try {
      if (fs2.existsSync(this.config.root)) {
        fs2.accessSync(this.config.root, fs2.constants.W_OK);
        canWrite = true;
      } else {
        canWrite = true;
      }
    } catch {
      canWrite = false;
    }
    checks.push(canWrite ? "\u2705 Write permissions: OK" : "\u274C Write permissions: Failed");
    const configPath = path2.join(this.config.root, "air.json");
    if (fs2.existsSync(configPath)) {
      checks.push("\u26A0\uFE0F  Configuration: Exists");
      if (!this.args.nonInteractive) {
        const overwrite = await confirm("Overwrite existing configuration?", false);
        if (!overwrite) {
          console.log("\u2705 Keeping existing configuration");
          process.exit(0);
        }
      }
    } else {
      checks.push("\u2705 Configuration: Ready to create");
    }
    checks.forEach((check) => console.log(check));
  }
  async configureInstance() {
    console.log(`
\u2699\uFE0F  Configuration
` + "\u2500".repeat(40));
    if (!this.args.nonInteractive) {
      this.config.name = await prompt("Instance name", this.config.name);
      this.config.env = await select("Environment", ["development", "production"]);
      if (this.config.env === "production") {
        this.config.domain = await prompt("Domain name", this.args.domain || "");
        this.config.port = parseInt(await prompt("Port", String(this.args.port || 8765)));
        const setupSSL = await confirm("Enable SSL?", true);
        if (setupSSL) {
          this.config.ssl = {
            cert: "./ssl/cert.pem",
            key: "./ssl/key.pem"
          };
        }
        const addPeers = await confirm("Add peer URLs?", false);
        if (addPeers) {
          const peerList = await prompt("Peer URLs (comma-separated)", "");
          this.config.peers = peerList.split(",").map((p) => p.trim()).filter((p) => p);
        }
        const setupDDNS = await confirm("Configure GoDaddy DDNS?", false);
        if (setupDDNS) {
          const godaddy = {
            domain: "",
            host: "",
            key: "",
            secret: ""
          };
          godaddy.domain = await prompt("GoDaddy domain (e.g., example.com)");
          godaddy.host = await prompt("Subdomain/host (e.g., air)", "@");
          godaddy.key = await prompt("GoDaddy API key");
          godaddy.secret = await prompt("GoDaddy API secret");
          this.config.godaddy = godaddy;
        }
      }
    }
    const fullConfig = {
      name: this.config.name,
      env: this.config.env,
      root: this.config.root,
      bash: this.config.bash,
      sync: ""
    };
    const envConfig = {
      port: this.config.port || 8765,
      domain: this.config.domain,
      ssl: this.config.ssl,
      peers: this.config.peers || [],
      godaddy: this.config.godaddy
    };
    fullConfig[this.config.env] = envConfig;
    this.config = fullConfig;
    console.log(`
Configuration summary:`);
    console.log(`  Name: ${this.config.name}`);
    console.log(`  Environment: ${this.config.env}`);
    console.log(`  Root: ${this.config.root}`);
    console.log(`  Port: ${this.config[this.config.env].port}`);
    if (this.config[this.config.env].domain) {
      console.log(`  Domain: ${this.config[this.config.env].domain}`);
    }
  }
  async saveConfiguration() {
    const configPath = path2.join(this.config.root, "air.json");
    try {
      if (!fs2.existsSync(this.config.root)) {
        fs2.mkdirSync(this.config.root, { recursive: true });
      }
      fs2.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      console.log(`
\u2705 Configuration saved to ${configPath}`);
    } catch (err) {
      throw new Error(`Failed to save configuration: ${err.message}`);
    }
  }
  async setupSSL() {
    if (!this.config[this.config.env]?.ssl)
      return;
    console.log(`
\uD83D\uDD12 SSL Setup
` + "\u2500".repeat(40));
    const sslDir = path2.join(this.config.root, "ssl");
    if (!fs2.existsSync(sslDir)) {
      fs2.mkdirSync(sslDir, { recursive: true });
    }
    const certPath = path2.join(sslDir, "cert.pem");
    const keyPath = path2.join(sslDir, "key.pem");
    if (fs2.existsSync(certPath) && fs2.existsSync(keyPath)) {
      console.log("\u2705 SSL certificates already exist");
      return;
    }
    if (!this.args.nonInteractive) {
      const sslMethod = await select("SSL Certificate Method", [
        "Self-signed (for testing)",
        "Manual (I'll provide certificates)"
      ]);
      if (sslMethod === "Self-signed (for testing)") {
        try {
          const domain = this.config[this.config.env].domain || "localhost";
          execSync(`openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/CN=${domain}"`, {
            stdio: "pipe"
          });
          console.log("\u2705 Self-signed certificate generated");
        } catch (err) {
          console.log("\u26A0\uFE0F  Failed to generate certificate:", err.message);
        }
      } else {
        console.log("\uD83D\uDCDD Please place your SSL certificates in:");
        console.log(`   Certificate: ${certPath}`);
        console.log(`   Private Key: ${keyPath}`);
      }
    }
  }
  async setupService() {
    if (this.args.nonInteractive)
      return;
    console.log(`
\uD83D\uDE80 Service Setup
` + "\u2500".repeat(40));
    const setupService = await confirm("Set up auto-start service?", false);
    if (!setupService) {
      console.log("\u23ED\uFE0F  Skipping service setup");
      return;
    }
    if (this.platform === "linux" && fs2.existsSync("/etc/systemd/system")) {
      const serviceName = `${this.config.name}.service`;
      const serviceContent = `[Unit]
Description=Air GUN Database - ${this.config.name}
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${this.config.root}
ExecStart=/usr/bin/node ${this.config.root}/dist/main.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`;
      const servicePath = `/etc/systemd/system/${serviceName}`;
      console.log(`
\uD83D\uDCDD To install as systemd service, run:`);
      console.log(`   sudo tee ${servicePath} << EOF`);
      console.log(serviceContent);
      console.log("EOF");
      console.log(`   sudo systemctl daemon-reload`);
      console.log(`   sudo systemctl enable ${serviceName}`);
      console.log(`   sudo systemctl start ${serviceName}`);
    } else {
      console.log("\u2139\uFE0F  Manual service setup required for your platform");
    }
  }
  async checkInstallation() {
    console.log(`
\uD83D\uDD0D Checking Installation
` + "\u2500".repeat(40));
    const configPath = path2.join(this.config.root, "air.json");
    if (fs2.existsSync(configPath)) {
      console.log("\u2705 Configuration file exists");
      const config = JSON.parse(fs2.readFileSync(configPath, "utf8"));
      console.log(`   Name: ${config.name}`);
      console.log(`   Environment: ${config.env}`);
    } else {
      console.log("\u274C Configuration file not found");
    }
    try {
      execSync(`pgrep -f "${this.config.name}"`, { stdio: "pipe" });
      console.log("\u2705 Service is running");
    } catch {
      console.log("\u26A0\uFE0F  Service is not running");
    }
  }
  async finalReport() {
    console.log(`
` + "\u2550".repeat(60));
    console.log("\u2705 Installation complete!");
    console.log(`
\uD83D\uDCCB Next steps:`);
    console.log("1. Start the server:");
    console.log(`   cd ${this.config.root}`);
    console.log("   npm start");
    console.log("");
    console.log("2. Test the installation:");
    console.log(`   curl http://localhost:${this.config[this.config.env].port}/gun`);
    if (this.config[this.config.env].domain) {
      console.log("");
      console.log("3. Access your instance:");
      console.log(`   https://${this.config[this.config.env].domain}:${this.config[this.config.env].port}/gun`);
    }
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const installer = new SimpleAirInstaller;
  installer.run();
}
var install_simple_default = SimpleAirInstaller;
export {
  install_simple_default as default
};
