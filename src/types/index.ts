/**
 * Type definitions for Air - TypeScript/Bun edition
 * Strict typing to prevent JavaScript's bullshit
 */

import type { Server as HTTPServer } from "http"
import type { Server as HTTPSServer } from "https"

// Runtime detector
export type Runtime = "bun" | "node" | "deno"

// Environment types
export type Environment = "development" | "production" | "test"

// Configuration types
export interface SSLConfig {
    key: string
    cert: string
}

export interface GoDaddyConfig {
    domain: string
    host: string
    key: string
    secret: string
}

export interface IPServiceDNS {
    hostname: string
    resolver: string
}

export interface IPServiceHTTP {
    url: string
    format: "text" | "json"
    field?: string
}

export interface IPConfig {
    timeout: number
    dnsTimeout: number
    userAgent: string
    dns: IPServiceDNS[]
    http: IPServiceHTTP[]
}

export interface SEAPair {
    pub: string
    priv: string
    epub?: string
    epriv?: string
}

export interface EnvironmentConfig {
    port: number
    domain: string
    ssl?: SSLConfig
    godaddy?: GoDaddyConfig
    peers: string[]
    pair?: SEAPair
    file?: string
}

export interface AirConfig {
    root: string
    bash: string
    env: Environment
    name: string
    sync?: string
    hub?: string
    ip: IPConfig
    development: Partial<EnvironmentConfig>
    production: Partial<EnvironmentConfig>
    [key: string]: unknown // Allow environment-specific configs
}

// Manager interfaces
export interface IProcessManager {
    check(): boolean
    clean(): void
    find(port: number): { pid: string; name: string } | null
    kill(pid: string | number): boolean
    isRunning(pid: string | number): boolean
}

export interface IConfigManager {
    read(): AirConfig
    write(config: AirConfig): boolean
    sync(url?: string): Promise<AirConfig | null>
    defaults(): AirConfig
    get(env?: Environment): AirConfig
    update(path: string, value: unknown): boolean
    validate(config?: AirConfig): { valid: boolean; errors: string[] }
    exists(): boolean
    getPath(): string
    reset(): boolean
}

export interface IStatusReporter {
    start(): void
    stop(): void
    alive(): void
    ip(): Promise<void>
    ddns(): Promise<void>
    activate(hubKey: string): Promise<unknown>
    report(key: string, data: Record<string, unknown>): Promise<unknown>
    getStatus(): StatusInfo
    updateConfig(config: AirConfig): void
    updateUser(user: any): void
}

export interface StatusInfo {
    alive: unknown
    ip: IPStatus | null
    ddns: unknown
    timers: {
        alive: boolean
        ip: boolean
        ddns: boolean
    }
}

export interface IPStatus {
    timestamp: number
    ipv4: string | null
    ipv6: string | null
    primary: string | null
    hasIPv6: boolean
    changed: boolean
}

export interface IPResult {
    ipv4: string | null
    ipv6: string | null
    primary: string | null
    hasIPv6: boolean
}

export interface DDNSResult {
    type: "A" | "AAAA"
    ip: string
    success: boolean
    status?: number
    error?: string
}

// Network interface
export interface INetwork {
    has(): Promise<boolean>
    validate(ip: string): boolean
    get(): Promise<IPResult>
    update(config: AirConfig, ips: IPResult): Promise<DDNSResult[] | null>
    monitor(callback: (ips: IPResult, lastIPs?: IPResult) => void, interval?: number): NodeJS.Timeout
}

// Peer options
export interface PeerOptions {
    rootArg?: string
    bashArg?: string
    env?: Environment
    name?: string
    domain?: string
    port?: number
    sslKey?: string
    sslCert?: string
    pub?: string
    priv?: string
    epub?: string
    epriv?: string
    maxRestarts?: number
    restartDelay?: number
    maxRestartDelay?: number
    testMode?: boolean
    skipPidCheck?: boolean
}

// Peer interface
export interface IPeer {
    // Properties
    server: HTTPServer | HTTPSServer | null
    gun: any | null
    user: any | null
    GUN: any
    sea: any
    config: AirConfig

    // Core methods
    start(): Promise<IPeer>
    init(): Promise<void>
    run(): Promise<IPeer>
    online(): Promise<IPeer>
    sync(): Promise<IPeer>
    restart(): Promise<void>
    stop(): Promise<void>

    // Config methods
    read(): AirConfig
    write(config: AirConfig): boolean

    // Delegated methods
    check(): boolean
    clean(): void
    cleanup(): void
    find(port: number): { pid: string; name: string } | null
    activate(hubKey: string): Promise<unknown>

    // Grouped interfaces
    ip: {
        get(): Promise<IPResult>
        validate(ip: string): boolean
    }
    status: {
        ddns(): Promise<void>
        ip(): Promise<void>
        alive(): void
    }
}

// Runtime detection
export function getRuntime(): Runtime {
    // @ts-ignore - Bun global
    if (typeof Bun !== "undefined") return "bun"
    // @ts-ignore - Deno global
    if (typeof Deno !== "undefined") return "deno"
    return "node"
}

// Performance timer based on runtime
export function getPerfTimer(): () => number {
    const runtime = getRuntime()

    if (runtime === "bun") {
        // Bun has native performance.now()
        return () => performance.now()
    } else if (runtime === "node") {
        // Node.js high-resolution time
        const { performance } = require("perf_hooks")
        return () => performance.now()
    } else {
        // Fallback to Date
        return () => Date.now()
    }
}
