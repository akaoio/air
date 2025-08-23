/**
 * Get network interfaces info
 */
import os from 'os';
export function interfaces() {
    const interfaces = os.networkInterfaces();
    const result = [];
    for (const [name, configs] of Object.entries(interfaces)) {
        for (const config of configs) {
            if (!config.internal) {
                result.push({
                    name,
                    address: config.address,
                    family: config.family,
                    mac: config.mac,
                    netmask: config.netmask,
                    cidr: config.cidr
                });
            }
        }
    }
    return result;
}
export default interfaces;
//# sourceMappingURL=interfaces.js.map