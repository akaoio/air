import * as fs from 'fs'
import * as path from 'path'

export function file(this: any, filePath?: string, content?: string) {
    if (!filePath) {
        // Disable file logging
        this.fileHandle = null
        this.filePath = null
        return
    }
    
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        
        this.filePath = filePath
        
        // Write header if new file
        if (!fs.existsSync(filePath)) {
            const header = [
                '='.repeat(80),
                `AIR Log - ${this.name}`,
                `Started: ${new Date().toISOString()}`,
                `Process: ${process.pid}`,
                '='.repeat(80),
                ''
            ].join('\n')
            
            fs.writeFileSync(filePath, header)
        }
        
        // If content provided, append it
        if (content) {
            const timestamp = new Date().toISOString()
            const entry = `[${timestamp}] ${content}\n`
            fs.appendFileSync(filePath, entry)
        }
        
        this.debug(`File logging enabled: ${filePath}`)
    } catch (error: any) {
        // Handle permission errors gracefully
        if (this.error) {
            this.error(`Failed to write to log file ${filePath}:`, error.message)
        }
    }
}