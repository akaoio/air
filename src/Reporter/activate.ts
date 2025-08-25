/**
 * Link peer to system hub
 */

import { state } from "./state.js"
import { logger } from "../Logger/index.js"

export function activate(hubKey: string): Promise<any> {
    if (!state.user?.is) return Promise.reject(new Error("User not authenticated"))

    return new Promise((resolve, reject) => {
        const activation = {
            timestamp: Date.now(),
            peer: state.user.is.pub,
            name: state.config.name,
            domain: state.config.domain,
            activated: true
        }

        state.user
            .get("hub")
            .get(hubKey)
            .put(activation, (ack: any) => {
                if (ack.err) {
                    reject(ack.err)
                } else {
                    logger.info(`Activated peer with hub: ${hubKey}`)
                    resolve(activation)
                }
            })
    })
}

export default activate
