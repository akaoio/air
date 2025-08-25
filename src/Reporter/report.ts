/**
 * Report custom status
 */

import { state } from "./state.js"

export function report(key: string, data: any): Promise<any> {
    if (!state.user?.is) return Promise.reject(new Error("User not authenticated"))

    return new Promise((resolve, reject) => {
        const status = {
            timestamp: Date.now(),
            ...data
        }

        state.user
            .get("status")
            .get(key)
            .put(status, (ack: any) => {
                if (ack.err) {
                    reject(ack.err)
                } else {
                    resolve(status)
                }
            })
    })
}

export default report
