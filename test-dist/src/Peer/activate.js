/**
 * Activate peer with hub
 */
import { activate as activateHub } from '../Reporter/index.js';
export async function activate(hubKey) {
    return activateHub(hubKey);
}
export default activate;
//# sourceMappingURL=activate.js.map