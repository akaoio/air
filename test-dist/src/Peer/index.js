/**
 * Peer Class - Main class for managing distributed database instance
 * Each method is in separate file following "Một hàm một file" principle
 */
import { constructor } from './constructor.js';
import { start } from './start.js';
import { restart } from './restart.js';
import { init } from './init.js';
import { run } from './run.js';
import { online } from './online.js';
import { sync } from './sync.js';
import { stop } from './stop.js';
import { activate } from './activate.js';
import { read } from './read.js';
import { write } from './write.js';
import { check } from './check.js';
import { clean } from './clean.js';
import { find } from './find.js';
export class Peer {
    config;
    gun;
    server;
    user;
    GUN;
    sea;
    ip;
    constructor(config) {
        constructor.call(this, config);
    }
    // Core methods (single-word naming)
    async start() {
        return start.call(this);
    }
    async restart(opts) {
        return restart.call(this, opts);
    }
    async init() {
        return init.call(this, this.config);
    }
    async run() {
        return run.call(this, this.config, this.server);
    }
    async online() {
        return online.call(this, this.config, this.gun);
    }
    async sync() {
        return sync.call(this, this.config);
    }
    async stop() {
        return stop.call(this);
    }
    async activate() {
        return activate.call(this);
    }
    read() {
        return read.call(this);
    }
    async write(data) {
        return write.call(this, data);
    }
    check() {
        return check.call(this);
    }
    clean() {
        return clean.call(this);
    }
    find(port) {
        return find.call(this, port);
    }
    cleanup() {
        return clean.call(this);
    }
}
export default Peer;
//# sourceMappingURL=index.js.map