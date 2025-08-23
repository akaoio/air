/**
 * Ink TUI for Air Installer
 * Uses existing Installer class with beautiful React UI
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import SelectInput from 'ink-select-input'
import TextInput from 'ink-text-input'
import Spinner from 'ink-spinner'
import Gradient from 'ink-gradient'
import BigText from 'ink-big-text'
import { Installer } from '../Installer/index.js'
import type { InstallOptions, AirConfig } from '../types/index.js'

interface Step {
    id: string
    title: string
    status: 'pending' | 'active' | 'completed' | 'error'
}

interface Props {
    options?: InstallOptions
}

export const InstallUI: React.FC<Props> = ({ options = {} }) => {
    const { exit } = useApp()
    const [step, setStep] = useState('welcome')
    const [config, setConfig] = useState<Partial<AirConfig>>({})
    const [error, setError] = useState<string | null>(null)
    const [installing, setInstalling] = useState(false)
    
    // Form states
    const [name, setName] = useState('air')
    const [env, setEnv] = useState<'development' | 'production'>('development')
    const [port, setPort] = useState('8765')
    const [domain, setDomain] = useState('')
    const [enableSSL, setEnableSSL] = useState(false)
    const [enableDDNS, setEnableDDNS] = useState(false)
    const [godaddyKey, setGodaddyKey] = useState('')
    const [godaddySecret, setGodaddySecret] = useState('')
    const [godaddyDomain, setGodaddyDomain] = useState('')
    const [godaddyHost, setGodaddyHost] = useState('@')
    
    // Handle keyboard input
    useInput((input, key) => {
        if (key.escape || (key.ctrl && input === 'c')) {
            exit()
        }
    })
    
    // Welcome screen
    if (step === 'welcome') {
        return (
            <Box flexDirection="column" padding={1}>
                <Box marginBottom={1}>
                    <Gradient name="rainbow">
                        <BigText text="AIR" font="block" />
                    </Gradient>
                </Box>
                
                <Text color="cyan" bold>
                    Distributed P2P Database Installer v2.0
                </Text>
                <Text color="gray">
                    Built with GUN protocol for real-time synchronization
                </Text>
                
                <Box marginTop={2}>
                    <SelectInput
                        items={[
                            { label: '🚀 Quick Install (Development)', value: 'quick' },
                            { label: '⚙️  Custom Install', value: 'custom' },
                            { label: '📖 Check Existing Installation', value: 'check' },
                            { label: '❌ Exit', value: 'exit' }
                        ]}
                        onSelect={(item) => {
                            if (item.value === 'exit') {
                                exit()
                            } else if (item.value === 'quick') {
                                setStep('installing')
                                runQuickInstall()
                            } else if (item.value === 'custom') {
                                setStep('name')
                            } else if (item.value === 'check') {
                                setStep('checking')
                            }
                        }}
                    />
                </Box>
            </Box>
        )
    }
    
    // Name input
    if (step === 'name') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>Configuration</Text>
                <Box marginTop={1}>
                    <Text>Instance name: </Text>
                    <TextInput
                        value={name}
                        onChange={setName}
                        onSubmit={() => setStep('environment')}
                    />
                </Box>
                <Text color="gray" dimColor>
                    Press Enter to continue, ESC to exit
                </Text>
            </Box>
        )
    }
    
    // Environment selection
    if (step === 'environment') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>Select Environment</Text>
                <Box marginTop={1}>
                    <SelectInput
                        items={[
                            { label: '🔧 Development (localhost)', value: 'development' },
                            { label: '🌐 Production (with domain)', value: 'production' }
                        ]}
                        onSelect={(item) => {
                            setEnv(item.value as any)
                            setStep('port')
                        }}
                    />
                </Box>
            </Box>
        )
    }
    
    // Port input
    if (step === 'port') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>Network Configuration</Text>
                <Box marginTop={1}>
                    <Text>Port number: </Text>
                    <TextInput
                        value={port}
                        onChange={setPort}
                        onSubmit={() => {
                            if (env === 'production') {
                                setStep('domain')
                            } else {
                                setStep('confirm')
                            }
                        }}
                    />
                </Box>
            </Box>
        )
    }
    
    // Domain input (production only)
    if (step === 'domain') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>Domain Configuration</Text>
                <Box marginTop={1}>
                    <Text>Domain name: </Text>
                    <TextInput
                        value={domain}
                        onChange={setDomain}
                        placeholder="example.com or subdomain.example.com"
                        onSubmit={() => setStep('ssl')}
                    />
                </Box>
            </Box>
        )
    }
    
    // SSL configuration
    if (step === 'ssl') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>SSL Configuration</Text>
                <Box marginTop={1}>
                    <SelectInput
                        items={[
                            { label: '🔒 Enable SSL (Let\'s Encrypt)', value: 'yes' },
                            { label: '⏭️  Skip SSL', value: 'no' }
                        ]}
                        onSelect={(item) => {
                            setEnableSSL(item.value === 'yes')
                            setStep('ddns')
                        }}
                    />
                </Box>
            </Box>
        )
    }
    
    // DDNS configuration
    if (step === 'ddns') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>Dynamic DNS Configuration</Text>
                <Box marginTop={1}>
                    <SelectInput
                        items={[
                            { label: '🌐 Configure GoDaddy DDNS', value: 'yes' },
                            { label: '⏭️  Skip DDNS', value: 'no' }
                        ]}
                        onSelect={(item) => {
                            if (item.value === 'yes') {
                                setEnableDDNS(true)
                                setStep('godaddy-domain')
                            } else {
                                setStep('confirm')
                            }
                        }}
                    />
                </Box>
            </Box>
        )
    }
    
    // GoDaddy configuration
    if (step === 'godaddy-domain') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>GoDaddy Domain</Text>
                <Box marginTop={1}>
                    <Text>Domain (e.g., example.com): </Text>
                    <TextInput
                        value={godaddyDomain}
                        onChange={setGodaddyDomain}
                        onSubmit={() => setStep('godaddy-host')}
                    />
                </Box>
            </Box>
        )
    }
    
    if (step === 'godaddy-host') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>GoDaddy Subdomain</Text>
                <Box marginTop={1}>
                    <Text>Subdomain/Host (@ for root): </Text>
                    <TextInput
                        value={godaddyHost}
                        onChange={setGodaddyHost}
                        onSubmit={() => setStep('godaddy-key')}
                    />
                </Box>
            </Box>
        )
    }
    
    if (step === 'godaddy-key') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>GoDaddy API Key</Text>
                <Box marginTop={1}>
                    <Text>API Key: </Text>
                    <TextInput
                        value={godaddyKey}
                        onChange={setGodaddyKey}
                        onSubmit={() => setStep('godaddy-secret')}
                    />
                </Box>
            </Box>
        )
    }
    
    if (step === 'godaddy-secret') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>GoDaddy API Secret</Text>
                <Box marginTop={1}>
                    <Text>API Secret: </Text>
                    <TextInput
                        value={godaddySecret}
                        onChange={setGodaddySecret}
                        mask="*"
                        onSubmit={() => setStep('confirm')}
                    />
                </Box>
            </Box>
        )
    }
    
    // Confirmation
    if (step === 'confirm') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>Review Configuration</Text>
                <Box flexDirection="column" marginTop={1}>
                    <Text>• Name: {name}</Text>
                    <Text>• Environment: {env}</Text>
                    <Text>• Port: {port}</Text>
                    {domain && <Text>• Domain: {domain}</Text>}
                    {enableSSL && <Text>• SSL: Enabled</Text>}
                    {enableDDNS && <Text>• DDNS: GoDaddy configured</Text>}
                </Box>
                
                <Box marginTop={2}>
                    <SelectInput
                        items={[
                            { label: '✅ Install', value: 'install' },
                            { label: '🔙 Back', value: 'back' },
                            { label: '❌ Cancel', value: 'cancel' }
                        ]}
                        onSelect={(item) => {
                            if (item.value === 'install') {
                                setStep('installing')
                                runInstall()
                            } else if (item.value === 'back') {
                                setStep('name')
                            } else {
                                exit()
                            }
                        }}
                    />
                </Box>
            </Box>
        )
    }
    
    // Installing
    if (step === 'installing') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan" bold>Installing Air Database</Text>
                <Box marginTop={2}>
                    <Text color="green">
                        <Spinner type="dots" /> {installing ? 'Installing...' : 'Preparing...'}
                    </Text>
                </Box>
                {error && (
                    <Box marginTop={1}>
                        <Text color="red">❌ {error}</Text>
                    </Box>
                )}
            </Box>
        )
    }
    
    // Success
    if (step === 'success') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="green" bold>✅ Installation Complete!</Text>
                
                <Box flexDirection="column" marginTop={2}>
                    <Text color="cyan" bold>Next Steps:</Text>
                    <Text>1. Start the server: npm start</Text>
                    <Text>2. Test the API: curl http://localhost:{port}/gun</Text>
                    {domain && <Text>3. Access: https://{domain}:{port}/gun</Text>}
                </Box>
                
                <Box marginTop={2}>
                    <Text color="gray">Press any key to exit</Text>
                </Box>
            </Box>
        )
    }
    
    // Quick install
    async function runQuickInstall() {
        setInstalling(true)
        try {
            const installer = new Installer()
            const config = installer.configure({
                name: 'air',
                env: 'development',
                port: 8765,
                nonInteractive: true
            })
            installer.save(config)
            setStep('success')
        } catch (err: any) {
            setError(err.message)
        }
    }
    
    // Full install
    async function runInstall() {
        setInstalling(true)
        try {
            const installer = new Installer()
            
            // Build config
            const installConfig: any = {
                name,
                env,
                port: parseInt(port),
                nonInteractive: true
            }
            
            if (domain) installConfig.domain = domain
            if (enableSSL) installConfig.ssl = true
            
            if (enableDDNS) {
                installConfig.godaddy = {
                    domain: godaddyDomain,
                    host: godaddyHost,
                    key: godaddyKey,
                    secret: godaddySecret
                }
            }
            
            // Configure and save
            const config = installer.configure(installConfig)
            installer.save(config)
            
            // Setup SSL if needed
            if (enableSSL) {
                await installer.ssl(config)
            }
            
            // Setup service
            await installer.service(config)
            
            setStep('success')
        } catch (err: any) {
            setError(err.message)
        }
    }
    
    return null
}

export default InstallUI