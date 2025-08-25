/**
 * Update user
 */

import { state } from "./state.js"

export function user(newUser: any): void {
    state.user = newUser
}

export default user
