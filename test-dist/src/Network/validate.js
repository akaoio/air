/**
 * Validate IP address (IPv4 or IPv6)
 */
import net from 'net';
export function validate(ip) {
    if (!ip || typeof ip !== 'string')
        return false;
    // Check IPv4
    if (net.isIPv4(ip)) {
        // Exclude private and reserved ranges
        const parts = ip.split('.').map(Number);
        const first = parts[0] || 0;
        const second = parts[1] || 0;
        if (first === 10)
            return false; // 10.0.0.0/8
        if (first === 172 && second >= 16 && second <= 31)
            return false; // 172.16.0.0/12
        if (first === 192 && second === 168)
            return false; // 192.168.0.0/16
        if (first === 127)
            return false; // 127.0.0.0/8 (loopback)
        if (first === 0)
            return false; // 0.0.0.0/8
        if (first === 169 && second === 254)
            return false; // 169.254.0.0/16 (link-local)
        if (first >= 224)
            return false; // 224.0.0.0/4 (multicast) and 240.0.0.0/4 (reserved)
        return true;
    }
    // Check IPv6
    if (net.isIPv6(ip)) {
        // Exclude private and reserved ranges
        const lower = ip.toLowerCase();
        if (lower.startsWith('fe80:'))
            return false; // Link-local
        if (lower.startsWith('fc00:') || lower.startsWith('fd00:'))
            return false; // Unique local
        if (lower === '::1')
            return false; // Loopback
        if (lower === '::')
            return false; // Unspecified
        if (lower.startsWith('ff'))
            return false; // Multicast
        return true;
    }
    return false;
}
export default validate;
//# sourceMappingURL=validate.js.map