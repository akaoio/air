/**
 * Activate peer with hub
 */

import { activate as activateHub } from "../Reporter/index.js"

export async function activate(hubKey: string): Promise<unknown> {
    return activateHub(hubKey)
}

export default activate
