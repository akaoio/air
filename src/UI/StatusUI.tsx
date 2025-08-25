/**
 * Beautiful Status UI for Air Database
 * Modern, eye-candy interface for system status
 */

import React, { useState, useEffect } from "react"
import { Box, Text, useInput, useApp } from "ink"
import { ModernHeader, StatusCard, InfoBox, LoadingSpinner, ModernFooter, Colors, ProgressBar } from "./ModernTUI.js"

interface StatusData {
    configured: boolean
    config: {
        name: string
        environment: string
        root: string
        domain: string
        port: number
    }
    process: {
        running: boolean
        pid: number | null
    }
    service: {
        installed: boolean
        running: boolean
        message: string
    }
    port: {
        number: number
        inUse: boolean
        process?: {
            pid: string
            name: string
        }
    }
    ssl: {
        configured: boolean
        valid: boolean
        expiry: string | null
    }
    ddns: {
        configured: boolean
        domain?: string
    }
    peers: any[]
    error?: string
}

interface Props {
    getStatus: () => Promise<StatusData>
    options?: {
        watch?: boolean
        interval?: number
    }
}

export const StatusUI: React.FC<Props> = ({ getStatus, options = {} }) => {
    const { exit } = useApp()
    const [status, setStatus] = useState<StatusData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdate, setLastUpdate] = useState(new Date())
    const [refreshProgress, setRefreshProgress] = useState(0)

    // Keyboard handling
    useInput((input, key) => {
        if (key.escape || (key.ctrl && input === "c")) {
            exit()
        }
        if (input === "r" && !loading) {
            refreshStatus()
        }
    })

    const refreshStatus = async () => {
        setLoading(true)
        setError(null)
        setRefreshProgress(0)

        try {
            // Simulate progress for visual appeal
            const progressInterval = setInterval(() => {
                setRefreshProgress(prev => Math.min(prev + 10, 90))
            }, 100)

            const statusData = await getStatus()
            clearInterval(progressInterval)
            setRefreshProgress(100)

            setTimeout(() => {
                setStatus(statusData)
                setLoading(false)
                setLastUpdate(new Date())
                setRefreshProgress(0)
            }, 200)
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
            setRefreshProgress(0)
        }
    }

    useEffect(() => {
        refreshStatus()

        if (options.watch) {
            const interval = setInterval(refreshStatus, (options.interval || 5) * 1000)
            return () => clearInterval(interval)
        }
    }, [options.watch, options.interval])

    if (loading && !status) {
        return (
            <Box flexDirection="column" alignItems="center" justifyContent="center" minHeight={10}>
                <ModernHeader title="System Status" subtitle="Distributed P2P Database Monitor" showLogo={true} />

                <Box marginY={2}>
                    <LoadingSpinner text="Scanning system status..." type="bouncingBall" color={Colors.primary} />
                </Box>

                {refreshProgress > 0 && <ProgressBar progress={refreshProgress} label="Loading components" animated={true} color={Colors.primary} />}
            </Box>
        )
    }

    if (error) {
        return (
            <Box flexDirection="column" alignItems="center">
                <ModernHeader title="Status Check Failed" subtitle="Unable to retrieve system information" gradient="fire" showLogo={false} />

                <StatusCard icon="🚨" title="Error" status="error" value={error} details={["Check if Air is properly configured", "Verify file system permissions", "Run 'air-install' to setup Air"]} />

                <ModernFooter commands={[{ key: "R", action: "Retry" }]} />
            </Box>
        )
    }

    if (!status) return null

    const overallStatus = status.process.running ? "success" : "warning"
    const healthScore = calculateHealthScore(status)

    return (
        <Box flexDirection="column">
            <ModernHeader
                title={`${status.config.name} • ${status.config.environment.toUpperCase()}`}
                subtitle={`Health Score: ${healthScore}% • Last Updated: ${lastUpdate.toLocaleTimeString()}`}
                gradient={overallStatus === "success" ? "matrix" : "sunset"}
            />

            {/* System Overview */}
            <Box justifyContent="space-between" marginY={1}>
                <StatusCard
                    icon="⚡"
                    title="Runtime"
                    status={status.process.running ? "success" : "warning"}
                    value={status.process.running ? `Running (PID: ${status.process.pid})` : "Stopped"}
                    details={status.process.running ? [`Service: ${status.service.message}`, `Uptime: Calculating...`] : ["Process not running", "Start with: npm start"]}
                />

                <StatusCard
                    icon="🌐"
                    title="Network"
                    status={status.port.inUse ? (status.process.running ? "success" : "warning") : "success"}
                    value={`${status.config.domain}:${status.config.port}`}
                    details={[`Port ${status.port.number}: ${status.port.inUse ? "In use" : "Available"}`, status.port.process ? `By: ${status.port.process.name}` : "Ready to bind"]}
                />
            </Box>

            {/* Configuration Details */}
            <InfoBox
                title="📝 Configuration"
                items={[
                    { label: "Name", value: status.config.name, icon: "🏷️" },
                    { label: "Environment", value: status.config.environment.toUpperCase(), icon: "🌍" },
                    { label: "Root Directory", value: status.config.root, icon: "📁" },
                    { label: "Domain", value: status.config.domain, icon: "🌐" },
                    { label: "Port", value: status.config.port.toString(), icon: "🔌" }
                ]}
                variant="detailed"
            />

            {/* Security & Features */}
            <Box justifyContent="space-between" marginY={1}>
                <StatusCard
                    icon="🔒"
                    title="Security"
                    status={status.ssl.configured ? (status.ssl.valid ? "success" : "warning") : "info"}
                    value={status.ssl.configured ? (status.ssl.valid ? `SSL Active` : "SSL Issues") : "SSL Not Configured"}
                    details={status.ssl.configured ? [status.ssl.expiry ? `Expires: ${status.ssl.expiry}` : "Checking expiry...", "HTTPS enabled"] : ["HTTP only", "Run installer to setup SSL"]}
                />

                <StatusCard
                    icon="🔄"
                    title="DDNS"
                    status={status.ddns.configured ? "success" : "info"}
                    value={status.ddns.configured ? `Active (${status.ddns.domain})` : "Not Configured"}
                    details={status.ddns.configured ? ["Automatic DNS updates", "GoDaddy integration"] : ["Static IP configuration", "Manual DNS management"]}
                />
            </Box>

            {/* Peers & Performance */}
            <Box justifyContent="space-between" marginY={1}>
                <StatusCard
                    icon="🔗"
                    title="P2P Network"
                    status={status.peers.length > 0 ? "success" : "info"}
                    value={`${status.peers.length} Peer${status.peers.length !== 1 ? "s" : ""}`}
                    details={status.peers.length > 0 ? ["Distributed network active", "Real-time synchronization"] : ["Standalone mode", "Add peers for clustering"]}
                />

                <InfoBox
                    title="⚡ Performance"
                    items={[
                        { label: "Health", value: `${healthScore}%`, status: healthScore > 80 ? "success" : healthScore > 60 ? "warning" : "error" },
                        { label: "Memory", value: "Calculating...", status: "normal" },
                        { label: "CPU", value: "Calculating...", status: "normal" },
                        { label: "Storage", value: "Available", status: "success" }
                    ]}
                    variant="compact"
                />
            </Box>

            {/* Health Score Bar */}
            <ProgressBar progress={healthScore} label={`🏥 System Health: ${getHealthStatus(healthScore)}`} color={healthScore > 80 ? Colors.success : healthScore > 60 ? Colors.warning : Colors.error} animated={true} />

            {/* Action Buttons */}
            <Box justifyContent="center" marginY={2}>
                {status.process.running ? (
                    <Text color={Colors.success} bold>
                        ✨ Air is running smoothly! Access at: {status.ssl.configured ? "https" : "http"}://{status.config.domain}:{status.config.port}
                    </Text>
                ) : (
                    <Text color={Colors.warning} bold>
                        🚀 Ready to launch! Run 'npm start' to begin serving
                    </Text>
                )}
            </Box>

            <ModernFooter commands={[{ key: "R", action: "Refresh" }, ...(options.watch ? [{ key: "W", action: `Watching (${options.interval}s)` }] : [])]} />
        </Box>
    )
}

function calculateHealthScore(status: StatusData): number {
    let score = 0
    let maxScore = 0

    // Process running (40 points)
    maxScore += 40
    if (status.process.running) score += 40

    // Port available (20 points)
    maxScore += 20
    if (!status.port.inUse || status.process.running) score += 20

    // SSL configured (15 points)
    maxScore += 15
    if (status.ssl.configured && status.ssl.valid) score += 15
    else if (status.ssl.configured) score += 7

    // DDNS configured (10 points)
    maxScore += 10
    if (status.ddns.configured) score += 10

    // Service installed (10 points)
    maxScore += 10
    if (status.service.installed) score += 10

    // Peers connected (5 points)
    maxScore += 5
    if (status.peers.length > 0) score += 5

    return Math.round((score / maxScore) * 100)
}

function getHealthStatus(score: number): string {
    if (score >= 90) return "Excellent"
    if (score >= 80) return "Good"
    if (score >= 70) return "Fair"
    if (score >= 60) return "Poor"
    return "Critical"
}

export default StatusUI
