/**
 * Stop all status reporting loops
 */
import { state } from './state.js';
export function stop() {
    Object.values(state.timers).forEach(timer => {
        if (timer)
            clearTimeout(timer);
    });
    state.timers = { alive: null, ip: null, ddns: null };
}
export default stop;
//# sourceMappingURL=stop.js.map