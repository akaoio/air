/**
 * DDNS update functionality - Update DNS records
 */
export async function update(config, ips) {
    const results = [];
    try {
        // Check if we have GoDaddy configuration
        if (!config.godaddy || !this.config?.domains?.length) {
            return results;
        }
        const { key, secret } = config.godaddy;
        // Update each domain
        for (const domain of this.config.domains) {
            try {
                // Update A record (IPv4)
                if (ips.ipv4) {
                    const result = await updateDNSRecord(domain, 'A', ips.ipv4, key, secret);
                    results.push({
                        domain,
                        success: result.success,
                        message: result.message,
                        ip: ips.ipv4
                    });
                }
                // Update AAAA record (IPv6)  
                if (ips.ipv6) {
                    const result = await updateDNSRecord(domain, 'AAAA', ips.ipv6, key, secret);
                    results.push({
                        domain,
                        success: result.success,
                        message: result.message,
                        ip: ips.ipv6
                    });
                }
            }
            catch (error) {
                results.push({
                    domain,
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return results;
    }
    catch (error) {
        throw error;
    }
}
async function updateDNSRecord(domain, type, ip, key, secret) {
    try {
        const response = await fetch(`https://api.godaddy.com/v1/domains/${domain}/records/${type}/@`, {
            method: 'PUT',
            headers: {
                'Authorization': `sso-key ${key}:${secret}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([
                {
                    data: ip,
                    ttl: 600
                }
            ])
        });
        if (response.ok) {
            return {
                success: true,
                message: `${type} record updated successfully`
            };
        }
        else {
            return {
                success: false,
                message: `API error: ${response.status} ${response.statusText}`
            };
        }
    }
    catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Network error'
        };
    }
}
//# sourceMappingURL=update.js.map