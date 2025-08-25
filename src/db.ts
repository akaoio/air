import { Peer } from "./Peer/index.js"
import { Manager } from "./Manager/index.js"

// Create database instance with default config
const manager = new Manager()
const config = manager.read()
const db = new Peer(config)

export { db }
export default db
