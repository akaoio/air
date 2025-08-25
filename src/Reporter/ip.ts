/**
 * Report current IP address
 */

import network from "../Network/index.js"
import { logger } from "../Logger/index.js"
import { state } from "./state.js"
import { ddns } from "./ddns.js"

export async function ip(): Promise<void> {
    if (!state.user?.is) return

    try {
        const ips = await network.get()

        const status = {
            timestamp: Date.now(),
            ipv4: ips.ipv4,
            ipv6: ips.ipv6,
            primary: ips.primary,
            hasIPv6: ips.hasIPv6,
            changed: false
        }

        // Check if IP changed
        if (state.lastStatus.ip) {
            status.changed = status.ipv4 !== state.lastStatus.ip.ipv4 || status.ipv6 !== state.lastStatus.ip.ipv6

            if (status.changed) {
                logger.info("IP address changed:")
                if (status.ipv4 !== state.lastStatus.ip.ipv4) {
                    logger.info(`  IPv4: ${state.lastStatus.ip.ipv4} → ${status.ipv4}`)
                }
                if (status.ipv6 !== state.lastStatus.ip.ipv6) {
                    logger.info(`  IPv6: ${state.lastStatus.ip.ipv6} → ${status.ipv6}`)
                }
            }
        }

        state.user
            .get("status")
            .get("ip")
            .put(status, (ack: any) => {
                if (ack.err) {
                    logger.error("Failed to report IP status:", ack.err)
                } else {
                    state.lastStatus.ip = status
                }
            })

        // If IP changed, trigger DDNS update immediately
        if (status.changed) {
            ddns()
        }
    } catch (error: any) {
        logger.error("Failed to detect IP:", error.message)
    }

    // Schedule next check
    state.timers.ip = setTimeout(() => ip(), state.intervals.ip)
}

export default ip
