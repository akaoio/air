/**
 * Get current status
 */
import { state } from './state.js';
export function get() {
    return {
        alive: state.lastStatus.alive,
        ip: state.lastStatus.ip,
        ddns: state.lastStatus.ddns,
        timers: {
            alive: state.timers.alive !== null,
            ip: state.timers.ip !== null,
            ddns: state.timers.ddns !== null
        }
    };
}
export default get;
//# sourceMappingURL=get.js.map