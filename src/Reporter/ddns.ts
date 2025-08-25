/**
 * Update DDNS records
 */

import fs from "fs"
import { logger } from "../Logger/index.js"
import path from "path"
import network from "../Network/index.js"
import { state } from "./state.js"

export async function ddns(): Promise<void> {
    if (!state.user?.is) return
    if (!state.config.godaddy?.domain) return

    try {
        // Get current IPs
        const ips = state.lastStatus.ip || (await network.get())

        // Update DDNS
        const results = await network.update(state.config, ips)

        if (results && results.length > 0) {
            const status = {
                timestamp: Date.now(),
                domain: `${state.config.godaddy.host}.${state.config.godaddy.domain}`,
                updates: results,
                success: results.every((r: any) => r.success)
            }

            // Save DDNS state to file for external scripts
            const ddnsFile = path.join(state.config.root, "ddns.json")
            const ddnsState = {
                timestamp: status.timestamp,
                domain: status.domain,
                ipv4: ips.ipv4,
                ipv6: ips.ipv6,
                lastUpdate: new Date().toISOString()
            }

            try {
                fs.writeFileSync(ddnsFile, JSON.stringify(ddnsState, null, 2))
            } catch (error: any) {
                logger.error("Failed to save DDNS state:", error.message)
            }

            state.user
                .get("status")
                .get("ddns")
                .put(status, (ack: any) => {
                    if (ack.err) {
                        logger.error("Failed to report DDNS status:", ack.err)
                    } else {
                        state.lastStatus.ddns = status
                        logger.info(`DDNS updated: ${status.domain}`)
                        results.forEach((r: any) => {
                            if (r.success) {
                                logger.info(`  ${r.type} record: ${r.ip} ✓`)
                            } else {
                                logger.info(`  ${r.type} record: ${r.ip} ✗ (${r.error || `HTTP ${r.status}`})`)
                            }
                        })
                    }
                })
        }
    } catch (error: any) {
        logger.error("DDNS update failed:", error.message)
    }

    // Schedule next update
    state.timers.ddns = setTimeout(() => ddns(), state.intervals.ddns)
}

export default ddns
