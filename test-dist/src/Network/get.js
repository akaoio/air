/**
 * Get both IPv4 and IPv6 addresses
 */
import { has } from './has.js';
import { dns as ipv4dns } from './ipv4/dns.js';
import { http as ipv4http } from './ipv4/http.js';
import { dns as ipv6dns } from './ipv6/dns.js';
import { http as ipv6http } from './ipv6/http.js';
export async function get() {
    const result = {
        ipv4: null,
        ipv6: null,
        primary: null,
        hasIPv6: await has()
    };
    // Get IPv4
    result.ipv4 = await ipv4dns() || await ipv4http();
    // Get IPv6 if available
    if (result.hasIPv6) {
        result.ipv6 = await ipv6dns() || await ipv6http();
    }
    // Determine primary IP (prefer IPv4 for compatibility)
    result.primary = result.ipv4 || result.ipv6;
    return result;
}
export default get;
//# sourceMappingURL=get.js.map