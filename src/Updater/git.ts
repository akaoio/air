/**
 * Update from Git repository
 */

import { execSync } from 'child_process'

export interface GitResult {
    success: boolean
    message: string
    details?: string
}

export function git(root: string): GitResult {
    try {
        // Check if it's a git repository
        try {
            execSync('git status', { stdio: 'ignore', cwd: root })
        } catch {
            return { success: false, message: 'Not a git repository' }
        }
        
        // Check for uncommitted changes
        const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: root })
        if (status.trim()) {
            // Stash local changes
            execSync('git stash', { stdio: 'ignore', cwd: root })
        }
        
        // Pull latest changes
        const output = execSync('git pull', { encoding: 'utf8', cwd: root })
        
        if (output.includes('Already up to date')) {
            return { success: true, message: 'Already up to date' }
        }
        
        // Count changed files
        const match = output.match(/(\d+) files? changed/)
        if (match) {
            return {
                success: true,
                message: 'Updated from repository',
                details: `${match[0]}`
            }
        }
        
        return { success: true, message: 'Updated from repository' }
        
    } catch (error: any) {
        return {
            success: false,
            message: 'Git update failed',
            details: error.message
        }
    }
}

export default git