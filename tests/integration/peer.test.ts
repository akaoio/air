/**
 * @akaoio/air - Peer Integration Tests
 * Testing Peer class functionality with single data source
 */

import { Peer } from "../../src/peer.js"
import fs from "fs"
import path from "path"
import os from "os"

const TEST_DATA_DIR = path.join(os.tmpdir(), 'air-test-data')

export const tests = [
    {
        name: "Peer - single data source configuration",
        test: async () => {
            // Clean test data
            if (fs.existsSync(TEST_DATA_DIR)) {
                fs.rmSync(TEST_DATA_DIR, { recursive: true })
            }
            
            const peer = new Peer({
                env: 'test',
                test: {
                    port: 9001,
                    domain: 'localhost'
                }
            })
            
            // Should be able to create peer without errors
            return peer instanceof Peer && peer.env === 'test'
        }
    },
    
    {
        name: "Peer - development bypass works",
        test: () => {
            process.env.FORCE_AIR = 'true'
            
            const peer1 = new Peer({ env: 'development' })
            const peer2 = new Peer({ env: 'development' })
            
            // Both should be able to check singleton without conflicts
            const result1 = peer1.checkSingleton()
            const result2 = peer2.checkSingleton()
            
            delete process.env.FORCE_AIR
            
            return result1 === true && result2 === true
        }
    },
    
    {
        name: "Peer - config management",
        test: () => {
            const config = {
                env: 'test',
                test: {
                    port: 9002,
                    peers: ['http://localhost:9003']
                }
            }
            
            const peer = new Peer(config)
            
            return peer.config.test.port === 9002 && 
                   peer.config.test.peers.includes('http://localhost:9003')
        }
    }
]