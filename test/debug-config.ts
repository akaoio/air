import { Peer } from "../src/Peer"
import path from "path"

const testDir = "/tmp/test-config"
const peer = new Peer({
    root: testDir,
    skipPidCheck: true
})

const config = peer.read()
console.log("Config from peer.read():", config)
console.log("Has port?", config.port)
console.log("Type of port:", typeof config.port)