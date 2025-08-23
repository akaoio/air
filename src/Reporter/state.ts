/**
 * Global state for status reporter
 */

export interface StatusState {
    user: any
    config: any
    intervals: {
        alive: number
        ip: number
        ddns: number
    }
    timers: {
        alive: NodeJS.Timeout | null
        ip: NodeJS.Timeout | null
        ddns: NodeJS.Timeout | null
    }
    lastStatus: {
        ip: any | null
        alive: any | null
        ddns: any | null
    }
}

// Singleton state
export const state: StatusState = {
    user: null,
    config: {},
    intervals: {
        alive: 60000,      // 1 minute
        ip: 300000,        // 5 minutes
        ddns: 300000       // 5 minutes
    },
    timers: {
        alive: null,
        ip: null,
        ddns: null
    },
    lastStatus: {
        ip: null,
        alive: null,
        ddns: null
    }
}

export default state