/**
 * Get IPv6 address via DNS
 */

import { dnsServers } from "../constants.js"
import { dns as dnsquery } from "../dns.js"
import { validate } from "../validate.js"

export async function dns(): Promise<string | null> {
    for (const { server, query } of dnsServers.ipv6) {
        try {
            const result = await dnsquery(query, server, "AAAA")
            if (result && validate(result)) {
                return result
            }
        } catch {
            continue
        }
    }
    return null
}

export default dns
