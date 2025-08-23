/**
 * Detect public IP addresses
 */
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export async function detect() {
    const result = {
        ipv4: null,
        ipv6: null
    };
    // Detect IPv4
    result.ipv4 = await detectIPv4();
    // Detect IPv6
    result.ipv6 = await detectIPv6();
    return result;
}
async function detectIPv4() {
    // Try DNS method first
    const dnsServers = [
        { hostname: 'myip.opendns.com', resolver: 'resolver1.opendns.com' },
        { hostname: 'myip.opendns.com', resolver: 'resolver2.opendns.com' }
    ];
    for (const server of dnsServers) {
        try {
            const { stdout } = await execAsync(`dig +short ${server.hostname} @${server.resolver}`);
            const ip = stdout.trim();
            if (ip && validateIPv4(ip)) {
                return ip;
            }
        }
        catch { }
    }
    // Try HTTP method
    const httpServices = [
        'https://checkip.amazonaws.com',
        'https://ipv4.icanhazip.com',
        'https://api.ipify.org'
    ];
    for (const url of httpServices) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (response.ok) {
                const ip = (await response.text()).trim();
                if (validateIPv4(ip)) {
                    return ip;
                }
            }
        }
        catch { }
    }
    return null;
}
async function detectIPv6() {
    // Try local detection first
    try {
        const { stdout } = await execAsync('ip -6 addr show scope global | grep inet6 | head -1');
        const match = stdout.match(/inet6\s+([0-9a-fA-F:]+)/);
        if (match && match[1] && validateIPv6(match[1])) {
            return match[1];
        }
    }
    catch { }
    // Try HTTP method
    const httpServices = [
        'https://ipv6.icanhazip.com',
        'https://api6.ipify.org',
        'https://v6.ident.me'
    ];
    for (const url of httpServices) {
        try {
            const { stdout } = await execAsync(`curl -6 -s --connect-timeout 5 ${url}`);
            const ip = stdout.trim();
            if (validateIPv6(ip)) {
                return ip;
            }
        }
        catch { }
    }
    return null;
}
function validateIPv4(ip) {
    if (!ip)
        return false;
    const parts = ip.split('.');
    if (parts.length !== 4)
        return false;
    for (const part of parts) {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 0 || num > 255)
            return false;
    }
    const first = parseInt(parts[0] || '0', 10);
    const second = parseInt(parts[1] || '0', 10);
    // Exclude private ranges
    if (first === 10)
        return false;
    if (first === 172 && second >= 16 && second <= 31)
        return false;
    if (first === 192 && second === 168)
        return false;
    if (first === 169 && second === 254)
        return false;
    if (first === 127)
        return false;
    if (first === 0)
        return false;
    if (first >= 224)
        return false;
    // CGNAT check
    if (first === 100 && second >= 64 && second <= 127)
        return false;
    return true;
}
function validateIPv6(ip) {
    if (!ip)
        return false;
    const segments = ip.split(':');
    if (segments.length < 3 || segments.length > 8)
        return false;
    for (const segment of segments) {
        if (segment && !/^[0-9a-fA-F]{0,4}$/.test(segment)) {
            return false;
        }
    }
    // Exclude non-public addresses
    if (ip.toLowerCase().startsWith('fe80:'))
        return false;
    if (ip === '::1')
        return false;
    if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd'))
        return false;
    return true;
}
export default detect;
//# sourceMappingURL=detect.js.map