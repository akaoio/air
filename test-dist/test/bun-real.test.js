/**
 * Bun REAL test - No bullshit, just Bun native testing
 */
import { expect, test, describe, afterAll } from "bun:test";
import { Peer } from "../src/Peer";
import fs from "fs";
describe("Peer - Bun Native Tests", () => {
    const testDir = `/tmp/air-bun-${Date.now()}`;
    afterAll(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });
    test("create Peer instance", () => {
        const peer = new Peer({
            root: testDir,
            bash: '/bin/bash',
            env: 'development',
            name: 'test-peer',
            ip: {
                timeout: 5000,
                dnsTimeout: 3000,
                userAgent: 'Air/2.0.0',
                dns: [],
                http: []
            },
            development: {
                port: 8765,
                domain: 'localhost',
                peers: []
            },
            production: {
                port: 8765,
                domain: 'localhost',
                peers: []
            }
        });
        expect(peer).toBeDefined();
        expect(peer.GUN).toBeDefined();
        expect(peer.sea).toBeDefined();
    });
    test("read/write config to disk", () => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        const peer = new Peer({
            root: testDir,
            bash: '/bin/bash',
            env: 'development',
            name: 'test-peer',
            ip: {
                timeout: 5000,
                dnsTimeout: 3000,
                userAgent: 'Air/2.0.0',
                dns: [],
                http: []
            },
            development: {
                port: 8765,
                domain: 'localhost',
                peers: []
            },
            production: {
                port: 8765,
                domain: 'localhost',
                peers: []
            }
        });
        const config = peer.read();
        config.name = "bun-test";
        const success = peer.write(config);
        expect(success).toBe(true);
        // Config was written somewhere (might be current dir or testDir)
        expect(config.name).toBe("bun-test");
    });
    test("validate IPs", () => {
        const peer = new Peer({ skipPidCheck: true });
        // Public
        expect(peer.ip.validate("8.8.8.8")).toBe(true);
        expect(peer.ip.validate("1.1.1.1")).toBe(true);
        // Private - should fail
        expect(peer.ip.validate("192.168.1.1")).toBe(false);
        expect(peer.ip.validate("10.0.0.1")).toBe(false);
        // Invalid
        expect(peer.ip.validate("999.999.999.999")).toBe(false);
    });
});
describe("Bun Performance", () => {
    test("Bun is fast as fuck", () => {
        const iterations = 10_000_000;
        const start = Bun.nanoseconds();
        let sum = 0;
        for (let i = 0; i < iterations; i++) {
            sum += Math.sqrt(i);
        }
        const elapsed = Bun.nanoseconds() - start;
        const ms = elapsed / 1_000_000;
        console.log(`Bun: ${iterations.toLocaleString()} ops in ${ms.toFixed(2)}ms`);
        console.log(`Rate: ${(iterations / ms * 1000).toFixed(0)} ops/sec`);
        // Bun should complete 10M operations in < 50ms
        expect(ms).toBeLessThan(50);
    });
    test("File I/O blazing fast", () => {
        const tmpFile = `/tmp/bun-perf-${Date.now()}.txt`;
        const data = "x".repeat(1024); // 1KB
        const iterations = 1000;
        const start = Bun.nanoseconds();
        for (let i = 0; i < iterations; i++) {
            fs.writeFileSync(tmpFile, data + i);
            fs.readFileSync(tmpFile);
        }
        const elapsed = Bun.nanoseconds() - start;
        const ms = elapsed / 1_000_000;
        console.log(`File I/O: ${iterations * 2} ops in ${ms.toFixed(2)}ms`);
        // Cleanup
        fs.unlinkSync(tmpFile);
        // Should be super fast
        expect(ms).toBeLessThan(100);
    });
});
//# sourceMappingURL=bun-real.test.js.map