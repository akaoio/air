/**
 * Global state for status reporter
 */
// Singleton state
export const state = {
    user: null,
    config: {},
    intervals: {
        alive: 60000, // 1 minute
        ip: 300000, // 5 minutes
        ddns: 300000 // 5 minutes
    },
    timers: {
        alive: null,
        ip: null,
        ddns: null
    },
    lastStatus: {
        ip: null,
        alive: null,
        ddns: null
    }
};
export default state;
//# sourceMappingURL=state.js.map