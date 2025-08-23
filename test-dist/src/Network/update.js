/**
 * Update DDNS with IPv4/IPv6 support
 */
import fetch from 'node-fetch';
export async function update(config, ips) {
    if (!config.godaddy || !config.godaddy.domain)
        return null;
    const { domain, host, key, secret } = config.godaddy;
    const headers = {
        'Authorization': `sso-key ${key}:${secret}`,
        'Content-Type': 'application/json'
    };
    const results = [];
    // Update A record (IPv4)
    if (ips.ipv4) {
        try {
            const url = `https://api.godaddy.com/v1/domains/${domain}/records/A/${host}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers,
                body: JSON.stringify([{ data: ips.ipv4, ttl: 600 }])
            });
            results.push({
                type: 'A',
                ip: ips.ipv4,
                success: response.ok,
                status: response.status
            });
        }
        catch (error) {
            results.push({
                type: 'A',
                ip: ips.ipv4,
                success: false,
                error: error.message
            });
        }
    }
    // Update AAAA record (IPv6)
    if (ips.ipv6) {
        try {
            const url = `https://api.godaddy.com/v1/domains/${domain}/records/AAAA/${host}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers,
                body: JSON.stringify([{ data: ips.ipv6, ttl: 600 }])
            });
            results.push({
                type: 'AAAA',
                ip: ips.ipv6,
                success: response.ok,
                status: response.status
            });
        }
        catch (error) {
            results.push({
                type: 'AAAA',
                ip: ips.ipv6,
                success: false,
                error: error.message
            });
        }
    }
    return results;
}
export default update;
//# sourceMappingURL=update.js.map