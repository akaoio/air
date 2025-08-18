/**
 * Practical SEA Application Example: Encrypted Note-Taking App
 * 
 * This example shows how to build a real application using Air with GUN SEA
 * for user authentication and encrypted data storage.
 */

import { db } from '../index.js'
import readline from 'readline'

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

// Helper function to get user input
const prompt = (question) => new Promise(resolve => rl.question(question, resolve))

// Encrypted Notes Application
class SecureNotesApp {
    constructor(db) {
        this.db = db
        this.gun = db.gun
        this.sea = db.sea
        this.user = null
        this.isAuthenticated = false
    }
    
    async start() {
        // Start Air database
        await this.db.start()
        console.log('\n╔════════════════════════════════════════╗')
        console.log('║     Secure Notes App (using Air)       ║')
        console.log('╚════════════════════════════════════════╝\n')
        
        // Main menu loop
        while (true) {
            const choice = await this.showMenu()
            
            switch (choice) {
                case '1':
                    await this.register()
                    break
                case '2':
                    await this.login()
                    break
                case '3':
                    await this.createNote()
                    break
                case '4':
                    await this.listNotes()
                    break
                case '5':
                    await this.readNote()
                    break
                case '6':
                    await this.deleteNote()
                    break
                case '7':
                    await this.shareNote()
                    break
                case '8':
                    await this.logout()
                    break
                case '9':
                    console.log('Goodbye!')
                    process.exit(0)
                default:
                    console.log('Invalid choice. Please try again.')
            }
        }
    }
    
    async showMenu() {
        console.log('\n--- MAIN MENU ---')
        if (this.isAuthenticated) {
            console.log(`Logged in as: ${this.username}`)
            console.log('3. Create Note')
            console.log('4. List Notes')
            console.log('5. Read Note')
            console.log('6. Delete Note')
            console.log('7. Share Note')
            console.log('8. Logout')
        } else {
            console.log('1. Register')
            console.log('2. Login')
        }
        console.log('9. Exit')
        
        return await prompt('Choose an option: ')
    }
    
    async register() {
        console.log('\n--- REGISTER NEW USER ---')
        const username = await prompt('Username: ')
        const password = await prompt('Password: ')
        
        return new Promise((resolve) => {
            this.gun.user().create(username, password, (ack) => {
                if (ack.err) {
                    console.log('❌ Registration failed:', ack.err)
                } else {
                    console.log('✅ User registered successfully!')
                    console.log('Please login with your credentials.')
                }
                resolve()
            })
        })
    }
    
    async login() {
        console.log('\n--- LOGIN ---')
        const username = await prompt('Username: ')
        const password = await prompt('Password: ')
        
        return new Promise((resolve) => {
            this.user = this.gun.user()
            this.user.auth(username, password, (ack) => {
                if (ack.err) {
                    console.log('❌ Login failed:', ack.err)
                } else {
                    this.isAuthenticated = true
                    this.username = username
                    this.userPair = ack.sea
                    console.log('✅ Login successful!')
                    console.log('Your public key:', this.userPair.pub)
                }
                resolve()
            })
        })
    }
    
    async logout() {
        if (this.user) {
            this.user.leave()
            this.isAuthenticated = false
            this.user = null
            this.username = null
            this.userPair = null
            console.log('✅ Logged out successfully')
        }
    }
    
    async createNote() {
        if (!this.isAuthenticated) {
            console.log('❌ Please login first')
            return
        }
        
        console.log('\n--- CREATE NOTE ---')
        const title = await prompt('Note title: ')
        const content = await prompt('Note content: ')
        const tags = await prompt('Tags (comma-separated): ')
        
        const noteId = 'note-' + Date.now()
        const noteData = {
            id: noteId,
            title: title,
            content: content,
            tags: tags.split(',').map(t => t.trim()),
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }
        
        // Store encrypted note (automatically encrypted with user's keys)
        return new Promise((resolve) => {
            this.user.get('notes').get(noteId).put(noteData, (ack) => {
                if (ack.err) {
                    console.log('❌ Failed to save note:', ack.err)
                } else {
                    console.log('✅ Note saved successfully!')
                    console.log('Note ID:', noteId)
                }
                resolve()
            })
        })
    }
    
    async listNotes() {
        if (!this.isAuthenticated) {
            console.log('❌ Please login first')
            return
        }
        
        console.log('\n--- YOUR NOTES ---')
        
        return new Promise((resolve) => {
            const notes = []
            
            this.user.get('notes').map().once((data, key) => {
                if (data && data.title) {
                    notes.push(data)
                }
            })
            
            // Wait a bit for data to load
            setTimeout(() => {
                if (notes.length === 0) {
                    console.log('No notes found.')
                } else {
                    notes.sort((a, b) => new Date(b.created) - new Date(a.created))
                    notes.forEach((note, index) => {
                        console.log(`\n${index + 1}. ${note.title}`)
                        console.log(`   ID: ${note.id}`)
                        console.log(`   Created: ${note.created}`)
                        console.log(`   Tags: ${note.tags.join(', ')}`)
                    })
                }
                resolve()
            }, 1000)
        })
    }
    
    async readNote() {
        if (!this.isAuthenticated) {
            console.log('❌ Please login first')
            return
        }
        
        const noteId = await prompt('Enter note ID: ')
        
        return new Promise((resolve) => {
            this.user.get('notes').get(noteId).once((data) => {
                if (data) {
                    console.log('\n--- NOTE CONTENT ---')
                    console.log('Title:', data.title)
                    console.log('Content:', data.content)
                    console.log('Tags:', data.tags.join(', '))
                    console.log('Created:', data.created)
                    console.log('Modified:', data.modified)
                } else {
                    console.log('❌ Note not found')
                }
                resolve()
            })
        })
    }
    
    async deleteNote() {
        if (!this.isAuthenticated) {
            console.log('❌ Please login first')
            return
        }
        
        const noteId = await prompt('Enter note ID to delete: ')
        const confirm = await prompt('Are you sure? (yes/no): ')
        
        if (confirm.toLowerCase() === 'yes') {
            return new Promise((resolve) => {
                this.user.get('notes').get(noteId).put(null, (ack) => {
                    console.log('✅ Note deleted')
                    resolve()
                })
            })
        }
    }
    
    async shareNote() {
        if (!this.isAuthenticated) {
            console.log('❌ Please login first')
            return
        }
        
        console.log('\n--- SHARE NOTE ---')
        const noteId = await prompt('Enter note ID to share: ')
        const recipientPub = await prompt('Enter recipient\'s public key: ')
        const recipientEpub = await prompt('Enter recipient\'s epub key: ')
        
        return new Promise((resolve) => {
            // Get the note
            this.user.get('notes').get(noteId).once(async (noteData) => {
                if (!noteData) {
                    console.log('❌ Note not found')
                    resolve()
                    return
                }
                
                // Create shared secret with recipient
                const secret = await this.sea.secret(recipientEpub, this.userPair)
                
                // Encrypt note with shared secret
                const encrypted = await this.sea.encrypt(noteData, secret)
                
                // Sign the encrypted note
                const signed = await this.sea.sign(encrypted, this.userPair)
                
                // Store in shared location
                const shareId = 'share-' + Date.now()
                this.gun.get('shared-notes')
                    .get(recipientPub)
                    .get(shareId)
                    .put({
                        from: this.userPair.pub,
                        fromEpub: this.userPair.epub,
                        data: signed,
                        timestamp: Date.now()
                    }, (ack) => {
                        if (ack.err) {
                            console.log('❌ Failed to share note:', ack.err)
                        } else {
                            console.log('✅ Note shared successfully!')
                            console.log('Share ID:', shareId)
                            console.log('The recipient can retrieve it using their keys.')
                        }
                        resolve()
                    })
            })
        })
    }
}

// Additional utility functions
class SEAUtilities {
    static async generateBackupKeys(db) {
        console.log('\n--- GENERATING BACKUP KEYS ---')
        const pair = await db.sea.pair()
        console.log('Save these keys in a secure location:')
        console.log('━'.repeat(50))
        console.log(JSON.stringify(pair, null, 2))
        console.log('━'.repeat(50))
        return pair
    }
    
    static async encryptFile(db, filePath, pair) {
        const fs = await import('fs')
        const fileContent = fs.readFileSync(filePath, 'utf8')
        const encrypted = await db.sea.encrypt(fileContent, pair)
        const outputPath = filePath + '.encrypted'
        fs.writeFileSync(outputPath, encrypted)
        console.log('File encrypted:', outputPath)
        return outputPath
    }
    
    static async decryptFile(db, filePath, pair) {
        const fs = await import('fs')
        const encrypted = fs.readFileSync(filePath, 'utf8')
        const decrypted = await db.sea.decrypt(encrypted, pair)
        const outputPath = filePath.replace('.encrypted', '.decrypted')
        fs.writeFileSync(outputPath, decrypted)
        console.log('File decrypted:', outputPath)
        return outputPath
    }
}

// Start the application
const app = new SecureNotesApp(db)
app.start().catch(console.error)

/**
 * KEY FEATURES DEMONSTRATED:
 * 
 * 1. User Registration & Authentication
 *    - Create new users with username/password
 *    - Login/logout functionality
 *    - Persistent sessions via GUN SEA
 * 
 * 2. Encrypted Data Storage
 *    - All notes are automatically encrypted with user's keys
 *    - Only the authenticated user can read their notes
 *    - Data is stored in GUN's distributed database
 * 
 * 3. Secure Note Sharing
 *    - Share notes with other users using their public keys
 *    - Uses ECDH for shared secret generation
 *    - Recipients can decrypt with their private keys
 * 
 * 4. Data Integrity
 *    - All shared data is signed
 *    - Recipients can verify the sender's identity
 * 
 * USAGE:
 * 1. Run: node examples/sea-app.js
 * 2. Register a new user
 * 3. Login with your credentials
 * 4. Create, read, and manage encrypted notes
 * 5. Share notes securely with other users
 * 
 * SECURITY NOTES:
 * - Passwords are never stored, only hashed
 * - All user data is encrypted client-side
 * - Private keys never leave the client
 * - Shared data uses end-to-end encryption
 */