/**
 * Simple test to verify coverage works
 */
import { describe, it, expect } from '@jest/globals';
import { Config } from '../src/Config/index.js';
import { Manager } from '../src/Manager/index.js';
import { DDNS } from '../src/DDNS/index.js';
describe('Simple Coverage Test', () => {
    it('should create Config instance', () => {
        const config = new Config();
        expect(config).toBeDefined();
    });
    it('should create Manager instance', () => {
        const manager = new Manager();
        expect(manager).toBeDefined();
    });
    it('should create DDNS instance', () => {
        const ddns = new DDNS();
        expect(ddns).toBeDefined();
    });
});
//# sourceMappingURL=simple-coverage.test.js.map