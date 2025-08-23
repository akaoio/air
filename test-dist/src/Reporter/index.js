/**
 * Reporter Class - Status reporting
 * Pattern: Class = Directory + Method-per-file
 */
import { constructor } from './constructor.js';
import { start } from './start.js';
import { stop } from './stop.js';
import { alive } from './alive.js';
import { ip } from './ip.js';
import { ddns } from './ddns.js';
import { report } from './report.js';
import { activate } from './activate.js';
import { get } from './get.js';
import { config } from './config.js';
import { user } from './user.js';
import { state } from './state.js';
export class Reporter {
    // @ts-ignore - Used in method files
    options = {};
    // @ts-ignore - Used in method files  
    state = null;
    // @ts-ignore - Used in method files
    active = false;
    constructor(options = {}) {
        constructor.call(this, options);
    }
    start() {
        return start.call(this);
    }
    stop() {
        return stop.call(this);
    }
    alive() {
        return alive.call(this);
    }
    async ip() {
        return ip.call(this);
    }
    async ddns() {
        return ddns.call(this);
    }
    report(key, data) {
        return report.call(this, key, data);
    }
    activate(hubKey) {
        return activate.call(this, hubKey);
    }
    get() {
        return get.call(this);
    }
    config(configData) {
        return config.call(this, configData);
    }
    user(userData) {
        return user.call(this, userData);
    }
    getState() {
        return state;
    }
}
export default Reporter;
// Re-export individual functions for backward compatibility
export { activate } from './activate.js';
export { start } from './start.js';
export { stop } from './stop.js';
export { alive } from './alive.js';
export { ip } from './ip.js';
export { ddns } from './ddns.js';
//# sourceMappingURL=index.js.map