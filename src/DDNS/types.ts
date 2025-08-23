/**
 * DDNS type definitions
 */

export interface IPResult {
    ipv4: string | null
    ipv6: string | null
}

export interface UpdateResult {
    domain: string
    success: boolean
    message?: string
    ip?: string
}

export interface DDNSState {
    lastUpdate: string
    ipv4?: string
    ipv6?: string
    domains?: string[]
}

export interface DDNSConfig {
    domains?: string[]
    godaddy?: {
        key: string
        secret: string
        domain?: string
    }
}

// Export types as namespace for test compatibility
export const types = {
    IPResult: {} as IPResult,
    UpdateResult: {} as UpdateResult,
    DDNSState: {} as DDNSState,
    DDNSConfig: {} as DDNSConfig
}