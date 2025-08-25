/**
 * Initialize server
 */

import fs from "fs"
import { logger } from "../Logger/index.js"
import https from "https"
import http from "http"
import type { AirConfig, EnvironmentConfig } from "../types/index.js"

export interface InitResult {
    success: boolean
    server?: any
    error?: string
}

export async function init(config: AirConfig): Promise<InitResult> {
    return new Promise(resolve => {
        const env = config.env
        const envConfig = config[env] as EnvironmentConfig

        if (!envConfig) {
            resolve({
                success: false,
                error: `No configuration for environment: ${env}`
            })
            return
        }

        let server: any

        // Check for SSL
        if (env === "production" && envConfig.ssl?.key && envConfig.ssl?.cert) {
            const keyExists = fs.existsSync(envConfig.ssl.key)
            const certExists = fs.existsSync(envConfig.ssl.cert)

            if (keyExists && certExists) {
                const options = {
                    key: fs.readFileSync(envConfig.ssl.key),
                    cert: fs.readFileSync(envConfig.ssl.cert)
                }
                server = https.createServer(options)
                logger.info("HTTPS server created")
            } else {
                logger.warn("SSL files not found, falling back to HTTP")
                server = http.createServer()
            }
        } else {
            server = http.createServer()
            logger.info("HTTP server created")
        }

        const port = envConfig.port || 8765

        server.listen(port, () => {
            logger.info(`Server listening on port ${port}`)
            resolve({ success: true, server })
        })

        server.on("error", (error: any) => {
            if (error.code === "EADDRINUSE") {
                resolve({
                    success: false,
                    error: `Port ${port} is already in use`
                })
            } else {
                resolve({
                    success: false,
                    error: error.message
                })
            }
        })
    })
}

export default init
