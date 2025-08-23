/**
 * Get IPv4 address via DNS
 */
import { dnsServers } from '../constants.js';
import { dns as dnsquery } from '../dns.js';
import { validate } from '../validate.js';
export async function dns() {
    for (const { server, query } of dnsServers.ipv4) {
        try {
            const result = await dnsquery(query, server, 'A');
            if (result && validate(result)) {
                return result;
            }
        }
        catch {
            continue;
        }
    }
    return null;
}
export default dns;
//# sourceMappingURL=dns.js.map