/**
 * Global state for permissions
 */

import os from 'os'

export interface PermissionState {
    isRoot: boolean
    user: string
    platform: NodeJS.Platform
}

// Singleton state
export const state: PermissionState = {
    isRoot: process.getuid ? process.getuid() === 0 : false,
    user: os.userInfo().username,
    platform: os.platform()
}

export default state