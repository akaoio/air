/**
 * Find process using a specific port
 */
import { find as findProcess } from '../Process/index.js';
export function find(port, _options) {
    // find doesn't need config, it just finds by port
    return findProcess(port);
}
export default find;
//# sourceMappingURL=find.js.map