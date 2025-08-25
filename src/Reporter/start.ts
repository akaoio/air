/**
 * Start all status reporting loops
 */

import { alive } from "./alive.js"
import { ip } from "./ip.js"
import { ddns } from "./ddns.js"

export function start(): void {
    alive()
    ip()
    ddns()
}

export default start
