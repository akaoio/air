#!/usr/bin/env bun
// @bun

// script/ddns.ts
import fs2 from "fs";
import path2 from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

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

// script/ddns.ts
var execAsync = promisify(exec);
var __filename2 = fileURLToPath(import.meta.url);
var __dirname3 = path2.dirname(__filename2);

class DDNS {
  constructor() {
    const paths = getPaths();
    this.config = {
      root: paths.root,
      env: null,
      domain: null,
      host: null,
      key: null,
      secret: null,
      enableIPv6: true
    };
    this.configFile = "air.json";
    this.ddnsFile = "ddns.json";
    this.ipConfig = null;
    this.parseargs();
    this.loadconfig();
  }
  parseargs() {
    const args = process.argv.slice(2);
    for (let i = 0;i < args.length; i++) {
      const arg = args[i];
      const next = args[i + 1];
      switch (arg) {
        case "--root":
        case "-r":
          this.config.root = next;
          i++;
          break;
        case "--env":
        case "-e":
          this.config.env = next;
          i++;
          break;
        case "--domain":
        case "-d":
          this.config.domain = next;
          i++;
          break;
        case "--host":
        case "-h":
          this.config.host = next;
          i++;
          break;
        case "--key":
        case "-k":
          this.config.key = next;
          i++;
          break;
        case "--secret":
        case "-s":
          this.config.secret = next;
          i++;
          break;
        case "--no-ipv6":
          this.config.enableIPv6 = false;
          break;
      }
    }
  }
  loadconfig() {
    const configPath = path2.join(this.config.root, this.configFile);
    if (fs2.existsSync(configPath)) {
      try {
        const airConfig = JSON.parse(fs2.readFileSync(configPath, "utf8"));
        if (!this.config.env && airConfig.env) {
          this.config.env = airConfig.env;
        }
        if (airConfig.ip) {
          this.ipConfig = airConfig.ip;
        }
        if (this.config.env && airConfig[this.config.env]) {
          const envConfig = airConfig[this.config.env];
          if (envConfig.godaddy) {
            if (!this.config.domain)
              this.config.domain = envConfig.godaddy.domain;
            if (!this.config.host)
              this.config.host = envConfig.godaddy.host;
            if (!this.config.key)
              this.config.key = envConfig.godaddy.key;
            if (!this.config.secret)
              this.config.secret = envConfig.godaddy.secret;
          }
          if (envConfig.enableIPv6 !== undefined) {
            this.config.enableIPv6 = envConfig.enableIPv6;
          }
        }
      } catch (e) {
        console.error("Failed to parse config file:", e.message);
      }
    }
  }
  validate() {
    return this.config.domain && this.config.host && this.config.key && this.config.secret;
  }
  async run() {
    if (!this.validate()) {
      console.error("Missing required configuration. Check air.json or provide parameters.");
      process.exit(1);
    }
    try {
      const ddnsPath = path2.join(this.config.root, this.ddnsFile);
      let state = {};
      if (fs2.existsSync(ddnsPath)) {
        try {
          state = JSON.parse(fs2.readFileSync(ddnsPath, "utf8"));
        } catch (e) {}
      }
      const { ipv4, ipv6 } = await this.getpublicips();
      let updated = false;
      if (ipv4) {
        const godaddyIPv4 = await this.getcurrentip("A");
        if (godaddyIPv4 !== ipv4) {
          console.log(`Updating GoDaddy DNS A record: ${godaddyIPv4} -> ${ipv4}`);
          await this.updateip(ipv4, "A");
          console.log("\u2713 GoDaddy DNS A record updated successfully");
          state.lastIPv4 = state.currentIPv4 || godaddyIPv4;
          state.currentIPv4 = ipv4;
          updated = true;
        } else {
          console.log("IPv4 address not changed. No need to update A record.");
        }
      } else {
        console.log("\u26A0 No public IPv4 detected (might be behind CGNAT)");
      }
      if (ipv6 && this.config.enableIPv6) {
        const godaddyIPv6 = await this.getcurrentip("AAAA");
        if (godaddyIPv6 !== ipv6) {
          console.log(`Updating GoDaddy DNS AAAA record: ${godaddyIPv6} -> ${ipv6}`);
          await this.updateip(ipv6, "AAAA");
          console.log("\u2713 GoDaddy DNS AAAA record updated successfully");
          state.lastIPv6 = state.currentIPv6 || godaddyIPv6;
          state.currentIPv6 = ipv6;
          updated = true;
        } else {
          console.log("IPv6 address not changed. No need to update AAAA record.");
        }
      } else if (!ipv6) {
        console.log("\u2139 No public IPv6 detected");
      }
      state.ipv4 = ipv4;
      state.ipv6 = ipv6;
      state.datetime = new Date().toISOString();
      state.timestamp = Date.now();
      state.updated = updated;
      fs2.writeFileSync(ddnsPath, JSON.stringify(state, null, 2));
      if (!ipv4 && !ipv6) {
        console.error("\u2717 No public IP addresses could be detected");
        process.exit(1);
      }
    } catch (error) {
      console.error("DDNS update failed:", error.message);
      process.exit(1);
    }
  }
  async getpublicips() {
    console.log("Attempting to detect public IP addresses (IPv4 and IPv6)...");
    const result = { ipv4: null, ipv6: null };
    let dnsServices = [
      { hostname: "myip.opendns.com", resolver: "resolver1.opendns.com" },
      { hostname: "myip.opendns.com", resolver: "resolver2.opendns.com" },
      { hostname: "myip.opendns.com", resolver: "resolver3.opendns.com" },
      { hostname: "myip.opendns.com", resolver: "resolver4.opendns.com" }
    ];
    let httpServices = [
      { url: "https://checkip.amazonaws.com" },
      { url: "https://ipv4.icanhazip.com" },
      { url: "https://api.ipify.org" }
    ];
    let httpServicesV6 = [
      { url: "https://ipv6.icanhazip.com" },
      { url: "https://api6.ipify.org" },
      { url: "https://v6.ident.me" }
    ];
    let timeout = 5000;
    let dnsTimeout = 3000;
    if (this.ipConfig) {
      if (this.ipConfig.dns)
        dnsServices = this.ipConfig.dns;
      if (this.ipConfig.http)
        httpServices = this.ipConfig.http;
      if (this.ipConfig.httpv6)
        httpServicesV6 = this.ipConfig.httpv6;
      if (this.ipConfig.timeout)
        timeout = this.ipConfig.timeout;
      if (this.ipConfig.dnstimeout)
        dnsTimeout = this.ipConfig.dnstimeout;
    }
    for (const service of dnsServices) {
      try {
        const ip = await this.getipviadns(service.hostname, service.resolver, dnsTimeout);
        if (ip && this.validateipv4(ip)) {
          console.log(`\u2713 IPv4 detected via DNS: ${ip}`);
          result.ipv4 = ip;
          break;
        }
      } catch (e) {}
    }
    if (!result.ipv4) {
      for (const service of httpServices) {
        try {
          const ip = await this.getipviahttp(service.url, timeout);
          if (ip && this.validateipv4(ip)) {
            console.log(`\u2713 IPv4 detected via HTTP: ${ip}`);
            result.ipv4 = ip;
            break;
          }
        } catch (e) {}
      }
    }
    if (this.config.enableIPv6) {
      try {
        const { stdout } = await execAsync("ip -6 addr show scope global | grep inet6 | head -1");
        const match = stdout.match(/inet6\s+([0-9a-fA-F:]+)/);
        if (match && this.validateipv6(match[1])) {
          console.log(`\u2713 IPv6 detected locally: ${match[1]}`);
          result.ipv6 = match[1];
        }
      } catch (e) {}
      if (!result.ipv6) {
        for (const service of httpServicesV6) {
          try {
            const ip = await this.getipviahttp(service.url, timeout, true);
            if (ip && this.validateipv6(ip)) {
              console.log(`\u2713 IPv6 detected via HTTP: ${ip}`);
              result.ipv6 = ip;
              break;
            }
          } catch (e) {}
        }
      }
    }
    return result;
  }
  async getipviadns(hostname, resolver, timeout) {
    const timeoutSec = Math.ceil(timeout / 1000);
    try {
      const { stdout } = await execAsync(`timeout ${timeoutSec} dig +short ${hostname} @${resolver}`);
      const ip = stdout.trim().split(`
`)[0];
      if (ip)
        return ip;
    } catch (e) {
      try {
        const { stdout } = await execAsync(`timeout ${timeoutSec} nslookup ${hostname} ${resolver}`);
        const match = stdout.match(/Address: ([0-9.]+)/);
        if (match)
          return match[1];
      } catch (e2) {}
    }
    return null;
  }
  async getipviahttp(url, timeout, ipv6 = false) {
    try {
      if (ipv6 && url.includes("ipv6")) {
        try {
          const { stdout } = await execAsync(`curl -6 -s --connect-timeout ${Math.ceil(timeout / 1000)} ${url}`);
          return stdout.trim().split(`
`)[0];
        } catch (e) {}
      }
      if (!ipv6 && url.includes("ipv4")) {
        try {
          const { stdout } = await execAsync(`curl -4 -s --connect-timeout ${Math.ceil(timeout / 1000)} ${url}`);
          return stdout.trim().split(`
`)[0];
        } catch (e) {}
      }
      const response = await fetch(url, {
        timeout,
        headers: {
          "User-Agent": "Air-DDNS/1.0"
        }
      });
      if (response.ok) {
        const text = await response.text();
        return text.trim().split(`
`)[0];
      }
    } catch (e) {}
    return null;
  }
  validateipv4(ip) {
    if (!ip || typeof ip !== "string")
      return false;
    const parts = ip.split(".");
    if (parts.length !== 4)
      return false;
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255)
        return false;
    }
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);
    if (first === 10)
      return false;
    if (first === 172 && second >= 16 && second <= 31)
      return false;
    if (first === 192 && second === 168)
      return false;
    if (first === 169 && second === 254)
      return false;
    if (first === 127)
      return false;
    if (first === 0)
      return false;
    if (first >= 224)
      return false;
    if (first === 100 && second >= 64 && second <= 127) {
      console.log("\u26A0 Warning: Detected CGNAT IP address (100.64.0.0/10). Port forwarding will not work.");
      return false;
    }
    return true;
  }
  validateipv6(ip) {
    if (!ip || typeof ip !== "string")
      return false;
    ip = ip.trim();
    const segments = ip.split(":");
    if (segments.length < 3 || segments.length > 8)
      return false;
    for (const segment of segments) {
      if (segment && !/^[0-9a-fA-F]{0,4}$/.test(segment)) {
        return false;
      }
    }
    if (ip.toLowerCase().startsWith("fe80:"))
      return false;
    if (ip === "::1")
      return false;
    if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd"))
      return false;
    return true;
  }
  async getcurrentip(type = "A") {
    const url = `https://api.godaddy.com/v1/domains/${this.config.domain}/records/${type}/${this.config.host}`;
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `sso-key ${this.config.key}:${this.config.secret}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data[0].data;
        }
      } else if (response.status === 404 && type === "AAAA") {
        return null;
      }
    } catch (e) {
      if (type === "AAAA") {
        return null;
      }
      console.error(`Failed to get current ${type} record from GoDaddy:`, e.message);
    }
    return null;
  }
  async updateip(newIP, type = "A") {
    const url = `https://api.godaddy.com/v1/domains/${this.config.domain}/records/${type}/${this.config.host}`;
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `sso-key ${this.config.key}:${this.config.secret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([{
          data: newIP,
          ttl: 600
        }])
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GoDaddy API returned ${response.status}: ${error}`);
      }
    } catch (e) {
      console.error(`Failed to update ${type} record with GoDaddy:`, e.message);
      throw e;
    }
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const ddns = new DDNS;
  ddns.run();
}
var ddns_default = DDNS;
export {
  ddns_default as default
};
