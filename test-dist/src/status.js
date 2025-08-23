#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import network from './network.js';
/**
 * Status reporting for Air
 * Reports alive status, IP updates, and DDNS updates to GUN
 */
class StatusReporter {
    user;
    config;
    intervals;
    timers;
    lastStatus;
    constructor(options = {}) {
        this.user = options.user || null;
        this.config = options.config || {};
        this.intervals = {
            alive: options.aliveInterval || 60000, // 1 minute
            ip: options.ipInterval || 300000, // 5 minutes
            ddns: options.ddnsInterval || 300000 // 5 minutes
        };
        this.timers = {
            alive: null,
            ip: null,
            ddns: null
        };
        this.lastStatus = {
            ip: null,
            alive: null,
            ddns: null
        };
    }
    /**
     * Start all status reporting loops
     */
    start() {
        this.alive();
        this.ip();
        this.ddns();
    }
    /**
     * Stop all status reporting loops
     */
    stop() {
        Object.values(this.timers).forEach(timer => {
            if (timer)
                clearTimeout(timer);
        });
        this.timers = { alive: null, ip: null, ddns: null };
    }
    /**
     * Report alive status (heartbeat)
     */
    alive() {
        if (!this.user?.is)
            return;
        const status = {
            timestamp: Date.now(),
            alive: true,
            name: this.config.name,
            env: this.config.env,
            pid: process.pid,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: this.config.version || '1.0.0'
        };
        this.user.get('status').get('alive').put(status, (ack) => {
            if (ack.err) {
                console.error('Failed to report alive status:', ack.err);
            }
            else {
                this.lastStatus.alive = status;
            }
        });
        // Schedule next heartbeat
        this.timers.alive = setTimeout(() => this.alive(), this.intervals.alive);
    }
    /**
     * Report current IP address
     */
    async ip() {
        if (!this.user?.is)
            return;
        try {
            const ips = await network.get();
            const status = {
                timestamp: Date.now(),
                ipv4: ips.ipv4,
                ipv6: ips.ipv6,
                primary: ips.primary,
                hasIPv6: ips.hasIPv6,
                changed: false
            };
            // Check if IP changed
            if (this.lastStatus.ip) {
                status.changed = (status.ipv4 !== this.lastStatus.ip.ipv4 ||
                    status.ipv6 !== this.lastStatus.ip.ipv6);
                if (status.changed) {
                    console.log('IP address changed:');
                    if (status.ipv4 !== this.lastStatus.ip.ipv4) {
                        console.log(`  IPv4: ${this.lastStatus.ip.ipv4} → ${status.ipv4}`);
                    }
                    if (status.ipv6 !== this.lastStatus.ip.ipv6) {
                        console.log(`  IPv6: ${this.lastStatus.ip.ipv6} → ${status.ipv6}`);
                    }
                }
            }
            this.user.get('status').get('ip').put(status, (ack) => {
                if (ack.err) {
                    console.error('Failed to report IP status:', ack.err);
                }
                else {
                    this.lastStatus.ip = status;
                }
            });
            // If IP changed, trigger DDNS update immediately
            if (status.changed) {
                this.ddns();
            }
        }
        catch (error) {
            console.error('Failed to detect IP:', error.message);
        }
        // Schedule next check
        this.timers.ip = setTimeout(() => this.ip(), this.intervals.ip);
    }
    /**
     * Update DDNS records
     */
    async ddns() {
        if (!this.user?.is)
            return;
        if (!this.config.godaddy?.domain)
            return;
        try {
            // Get current IPs
            const ips = this.lastStatus.ip || await network.get();
            // Update DDNS
            const results = await network.update(this.config, ips);
            if (results && results.length > 0) {
                const status = {
                    timestamp: Date.now(),
                    domain: `${this.config.godaddy.host}.${this.config.godaddy.domain}`,
                    updates: results,
                    success: results.every(r => r.success)
                };
                // Save DDNS state to file for external scripts
                const ddnsFile = path.join(this.config.root, 'ddns.json');
                const ddnsState = {
                    timestamp: status.timestamp,
                    domain: status.domain,
                    ipv4: ips.ipv4,
                    ipv6: ips.ipv6,
                    lastUpdate: new Date().toISOString()
                };
                try {
                    fs.writeFileSync(ddnsFile, JSON.stringify(ddnsState, null, 2));
                }
                catch (error) {
                    console.error('Failed to save DDNS state:', error.message);
                }
                this.user.get('status').get('ddns').put(status, (ack) => {
                    if (ack.err) {
                        console.error('Failed to report DDNS status:', ack.err);
                    }
                    else {
                        this.lastStatus.ddns = status;
                        console.log(`DDNS updated: ${status.domain}`);
                        results.forEach(r => {
                            if (r.success) {
                                console.log(`  ${r.type} record: ${r.ip} ✓`);
                            }
                            else {
                                console.log(`  ${r.type} record: ${r.ip} ✗ (${r.error || `HTTP ${r.status}`})`);
                            }
                        });
                    }
                });
            }
        }
        catch (error) {
            console.error('DDNS update failed:', error.message);
        }
        // Schedule next update
        this.timers.ddns = setTimeout(() => this.ddns(), this.intervals.ddns);
    }
    /**
     * Report custom status
     */
    report(key, data) {
        if (!this.user?.is)
            return Promise.reject(new Error('User not authenticated'));
        return new Promise((resolve, reject) => {
            const status = {
                timestamp: Date.now(),
                ...data
            };
            this.user.get('status').get(key).put(status, (ack) => {
                if (ack.err) {
                    reject(ack.err);
                }
                else {
                    resolve(status);
                }
            });
        });
    }
    /**
     * Link peer to system hub
     */
    activate(hubKey) {
        if (!this.user?.is)
            return Promise.reject(new Error('User not authenticated'));
        return new Promise((resolve, reject) => {
            const activation = {
                timestamp: Date.now(),
                peer: this.user.is.pub,
                name: this.config.name,
                domain: this.config.domain,
                activated: true
            };
            this.user.get('hub').get(hubKey).put(activation, (ack) => {
                if (ack.err) {
                    reject(ack.err);
                }
                else {
                    console.log(`Activated peer with hub: ${hubKey}`);
                    resolve(activation);
                }
            });
        });
    }
    /**
     * Get current status
     */
    getStatus() {
        return {
            alive: this.lastStatus.alive,
            ip: this.lastStatus.ip,
            ddns: this.lastStatus.ddns,
            timers: {
                alive: this.timers.alive !== null,
                ip: this.timers.ip !== null,
                ddns: this.timers.ddns !== null
            }
        };
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = config;
    }
    /**
     * Update user
     */
    updateUser(user) {
        this.user = user;
    }
}
const statusReporter = new StatusReporter();
export default statusReporter;
export { StatusReporter };
//# sourceMappingURL=status.js.map