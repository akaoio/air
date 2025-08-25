/**
 * GUN SEA (Security, Encryption, Authorization) Usage Examples with Air
 *
 * Air provides full access to GUN's SEA cryptographic features through
 * the exposed GUN, sea, gun, and user objects.
 */

import { db } from "../index.js"

// Main example function
async function demonstrateSEA() {
    // Start the Air database
    await db.start()

    // Access GUN and SEA from the Air instance
    const { GUN, gun, sea, user } = db

    console.log("\n═══════════════════════════════════════════")
    console.log("    GUN SEA Examples with Air")
    console.log("═══════════════════════════════════════════\n")

    // ═══════════════════════════════════════════
    // 1. KEY PAIR GENERATION
    // ═══════════════════════════════════════════

    console.log("1. GENERATING KEY PAIRS")
    console.log("------------------------")

    // Generate a new key pair
    const pair = await sea.pair()
    console.log("Generated new key pair:")
    console.log("  Public key:", pair.pub)
    console.log("  Private key:", pair.priv.substring(0, 20) + "...")
    console.log("  Epub:", pair.epub)
    console.log("  Epriv:", pair.epriv.substring(0, 20) + "...\n")

    // ═══════════════════════════════════════════
    // 2. USER AUTHENTICATION
    // ═══════════════════════════════════════════

    console.log("2. USER AUTHENTICATION")
    console.log("----------------------")

    // Create a new user
    const username = "alice" + Date.now() // Unique username
    const password = "supersecret123"

    await new Promise((resolve, reject) => {
        gun.user().create(username, password, ack => {
            if (ack.err) {
                console.log("User creation error:", ack.err)
                reject(ack.err)
            } else {
                console.log("User created successfully:", username)
                resolve(ack)
            }
        })
    })

    // Authenticate the user
    await new Promise((resolve, reject) => {
        gun.user().auth(username, password, ack => {
            if (ack.err) {
                console.log("Authentication error:", ack.err)
                reject(ack.err)
            } else {
                console.log("User authenticated successfully")
                console.log("  Public key:", ack.sea.pub)
                resolve(ack)
            }
        })
    })

    const authenticatedUser = gun.user()
    console.log("User is authenticated:", authenticatedUser.is ? "Yes" : "No\n")

    // ═══════════════════════════════════════════
    // 3. ENCRYPTED DATA STORAGE
    // ═══════════════════════════════════════════

    console.log("3. ENCRYPTED DATA STORAGE")
    console.log("-------------------------")

    // Store encrypted data (automatically encrypted with user's keys)
    const secretData = {
        message: "This is encrypted data",
        timestamp: Date.now(),
        sensitive: "Only the user can read this"
    }

    await new Promise(resolve => {
        authenticatedUser.get("secrets").put(secretData, ack => {
            console.log("Encrypted data stored")
            resolve(ack)
        })
    })

    // Read encrypted data (automatically decrypted)
    await new Promise(resolve => {
        authenticatedUser.get("secrets").once(data => {
            console.log("Retrieved encrypted data:", data)
            resolve(data)
        })
    })

    console.log()

    // ═══════════════════════════════════════════
    // 4. MANUAL ENCRYPTION/DECRYPTION
    // ═══════════════════════════════════════════

    console.log("4. MANUAL ENCRYPTION/DECRYPTION")
    console.log("--------------------------------")

    const plaintext = "Secret message for manual encryption"

    // Encrypt data manually
    const encrypted = await sea.encrypt(plaintext, pair)
    console.log("Manually encrypted:", encrypted.substring(0, 50) + "...")

    // Decrypt data manually
    const decrypted = await sea.decrypt(encrypted, pair)
    console.log("Manually decrypted:", decrypted)
    console.log()

    // ═══════════════════════════════════════════
    // 5. SIGNING AND VERIFICATION
    // ═══════════════════════════════════════════

    console.log("5. SIGNING AND VERIFICATION")
    console.log("----------------------------")

    const dataToSign = {
        action: "transfer",
        amount: 100,
        to: "bob"
    }

    // Sign data
    const signature = await sea.sign(dataToSign, pair)
    console.log("Signed data:", signature.substring(0, 100) + "...")

    // Verify signature
    const verification = await sea.verify(signature, pair.pub)
    console.log("Verification result:", verification)
    console.log("Signature is valid:", JSON.stringify(verification) === JSON.stringify(dataToSign))
    console.log()

    // ═══════════════════════════════════════════
    // 6. SHARED ENCRYPTION (Between Users)
    // ═══════════════════════════════════════════

    console.log("6. SHARED ENCRYPTION")
    console.log("--------------------")

    // Generate another key pair for Bob
    const bobPair = await sea.pair()
    console.log("Generated Bob's key pair")

    // Create shared secret using ECDH
    const aliceSecret = await sea.secret(bobPair.epub, pair)
    const bobSecret = await sea.secret(pair.epub, bobPair)

    console.log("Shared secrets match:", aliceSecret === bobSecret)

    // Encrypt with shared secret
    const sharedMessage = "Message encrypted with shared secret"
    const sharedEncrypted = await sea.encrypt(sharedMessage, aliceSecret)
    console.log("Encrypted with shared secret:", sharedEncrypted.substring(0, 50) + "...")

    // Bob can decrypt with his shared secret
    const bobDecrypted = await sea.decrypt(sharedEncrypted, bobSecret)
    console.log("Bob decrypted:", bobDecrypted)
    console.log()

    // ═══════════════════════════════════════════
    // 7. CERTIFICATES (Access Control)
    // ═══════════════════════════════════════════

    console.log("7. CERTIFICATES (Access Control)")
    console.log("---------------------------------")

    // Create a certificate allowing Bob to write to Alice's data
    const certificate = await sea.certify(
        [bobPair.pub], // Bob's public key
        [{ "*": "inbox" }], // Paths Bob can access
        pair, // Alice's pair
        null, // No expiration
        cert => {
            console.log("Certificate created")
            return cert
        }
    )

    console.log("Certificate:", certificate ? "Created successfully" : "Failed")
    console.log()

    // ═══════════════════════════════════════════
    // 8. HASHING
    // ═══════════════════════════════════════════

    console.log("8. HASHING")
    console.log("----------")

    const dataToHash = "Hash this data"
    const hash = await sea.work(dataToHash, "SHA-256")
    console.log("SHA-256 hash:", hash)

    // Password hashing (with salt and iterations)
    const passwordHash = await sea.work(password, "alice-salt", {
        name: "SHA-256",
        iterations: 100000
    })
    console.log("Password hash:", passwordHash.substring(0, 50) + "...")
    console.log()

    // ═══════════════════════════════════════════
    // 9. USING AIR'S BUILT-IN USER
    // ═══════════════════════════════════════════

    console.log("9. AIR'S BUILT-IN USER")
    console.log("----------------------")

    // Air automatically creates and authenticates a user on start
    // This user's keys are stored in air.json
    console.log("Air's user public key:", db.user.is?.pub || "Not authenticated")
    console.log("Air's user pair stored in: air.json -> [env].pair")
    console.log()

    // Store data with Air's user
    if (db.user.is) {
        await new Promise(resolve => {
            db.user.get("air-data").put(
                {
                    type: "peer-info",
                    timestamp: Date.now(),
                    status: "online"
                },
                resolve
            )
        })
        console.log("Data stored with Air's built-in user")
    }

    // ═══════════════════════════════════════════
    // 10. PRACTICAL EXAMPLE: Secure Messaging
    // ═══════════════════════════════════════════

    console.log("10. SECURE MESSAGING EXAMPLE")
    console.log("-----------------------------")

    class SecureMessaging {
        constructor(gun, sea, userPair) {
            this.gun = gun
            this.sea = sea
            this.pair = userPair
        }

        async sendMessage(recipientPub, recipientEpub, message) {
            // Create shared secret with recipient
            const secret = await this.sea.secret(recipientEpub, this.pair)

            // Encrypt message
            const encrypted = await this.sea.encrypt(message, secret)

            // Sign the encrypted message
            const signed = await this.sea.sign(encrypted, this.pair)

            // Store in GUN
            const messageId = "msg-" + Date.now()
            this.gun.get("messages").get(recipientPub).get(messageId).put({
                from: this.pair.pub,
                data: signed,
                timestamp: Date.now()
            })

            return messageId
        }

        async receiveMessage(senderPub, senderEpub, signedData) {
            // Verify signature
            const encrypted = await this.sea.verify(signedData, senderPub)
            if (!encrypted) {
                throw new Error("Invalid signature")
            }

            // Create shared secret with sender
            const secret = await this.sea.secret(senderEpub, this.pair)

            // Decrypt message
            const message = await this.sea.decrypt(encrypted, secret)

            return message
        }
    }

    // Create messaging instances for Alice and Bob
    const aliceMessaging = new SecureMessaging(gun, sea, pair)
    const bobMessaging = new SecureMessaging(gun, sea, bobPair)

    // Alice sends message to Bob
    const messageId = await aliceMessaging.sendMessage(bobPair.pub, bobPair.epub, "Hello Bob, this is a secure message!")
    console.log("Alice sent message:", messageId)

    // Bob receives and decrypts the message
    // (In real app, Bob would fetch from GUN)
    const aliceMessage = "Hello Bob, this is a secure message!"
    const encryptedMsg = await sea.encrypt(aliceMessage, await sea.secret(bobPair.epub, pair))
    const signedMsg = await sea.sign(encryptedMsg, pair)

    const receivedMessage = await bobMessaging.receiveMessage(pair.pub, pair.epub, signedMsg)
    console.log("Bob received:", receivedMessage)

    console.log("\n═══════════════════════════════════════════")
    console.log("    SEA Examples Complete!")
    console.log("═══════════════════════════════════════════\n")
}

// Run the examples
demonstrateSEA().catch(console.error)

/**
 * IMPORTANT NOTES:
 *
 * 1. Air exposes the full GUN API, so all GUN SEA features are available
 * 2. Air's built-in user (db.user) is automatically authenticated on start
 * 3. The user's keys are persisted in air.json under [env].pair
 * 4. You can create additional users or use the built-in one
 * 5. All encrypted data is automatically synced across peers
 *
 * COMMON USE CASES:
 * - User authentication and authorization
 * - End-to-end encrypted messaging
 * - Secure document storage
 * - Digital signatures for data integrity
 * - Access control with certificates
 * - Password-less authentication
 * - Distributed encrypted backups
 */
