/**
 * Get current status
 */

import { state } from './state.js'

export interface StatusInfo {
    alive: any
    ip: any
    ddns: any
    timers: {
        alive: boolean
        ip: boolean
        ddns: boolean
    }
}

export function get(): StatusInfo {
    return {
        alive: state.lastStatus.alive,
        ip: state.lastStatus.ip,
        ddns: state.lastStatus.ddns,
        timers: {
            alive: state.timers.alive !== null,
            ip: state.timers.ip !== null,
            ddns: state.timers.ddns !== null
        }
    }
}

export default get