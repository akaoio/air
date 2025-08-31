# CLAUDE.md - 

This file provides guidance to Claude Code (claude.ai/code) when working with the  codebase.

## Project Overview

**** - 

**Version**:   
**License**:   
**Author**:   
**Repository**:   
**Philosophy**: ""

## Core Development Principles



## Architecture Overview

### System Design

Air is built as a distributed P2P graph database using GUN. It serves as the foundational communication layer for the entire living agent ecosystem, enabling real-time coordination without central servers.

### Core Components



## Features



## Development Guidelines

### TypeScript Standards

- **Strict Mode**: All TypeScript compiled with strict mode
- **Type Safety**: No `any` types allowed in production
- **Interface First**: Define interfaces before implementation
- **Error Handling**: Always handle Promise rejections
- **Testing**: Every class and method must have tests

### File Structure

```
air/
├── src/
│   ├── Air/              # Main Air class
│   ├── Network/          # Network layer
│   ├── Storage/          # Data persistence
│   ├── Security/         # Encryption and auth
│   └── types/            # TypeScript definitions
├── dist/                 # Compiled output
├── test/                 # Test suites
└── docs/                 # Documentation
```

### Class = Directory Pattern

Following AKAO.IO standards:

```
Air/
├── index.ts              # Class exports
├── constructor.ts        # Constructor logic
├── connect.ts            # connect() method
├── disconnect.ts         # disconnect() method
├── put.ts               # put() method
├── get.ts               # get() method
└── on.ts                # on() method
```

### P2P Network Development

When working with P2P functionality:

1. **Peer Discovery**: Implement robust peer discovery
2. **Connection Management**: Handle connection lifecycle
3. **Data Synchronization**: Ensure consistency across peers
4. **Conflict Resolution**: Implement CRDT-based resolution
5. **Network Partitioning**: Handle network splits gracefully

### Security Requirements

- **Encryption**: All sensitive data must be encrypted
- **Authentication**: Verify peer identities
- **Authorization**: Control access to data
- **Integrity**: Ensure data hasn't been tampered with
- **Privacy**: Protect user data and metadata

## Testing Requirements

### Unit Tests

```typescript
// Air/put.test.ts
import { Air } from './index.js'

export default async function test() {
  const air = new Air({ peers: [] })
  
  const result = await air.put('test-key', { value: 'test' })
  
  if (!result) {
    throw new Error('Put operation should return success')
  }
}
```

### Integration Tests

```typescript
// test/integration/network.test.ts
export default async function test() {
  const peer1 = new Air({ port: 8765 })
  const peer2 = new Air({ peers: ['http://localhost:8765/gun'] })
  
  await peer1.start()
  await peer2.connect()
  
  // Test real-time synchronization
  peer1.put('sync-test', { timestamp: Date.now() })
  
  const synced = await peer2.waitForData('sync-test')
  if (!synced) {
    throw new Error('Data should sync between peers')
  }
}
```

## Performance Guidelines

- **Lazy Loading**: Load data only when needed
- **Connection Pooling**: Reuse connections efficiently
- **Delta Sync**: Synchronize only changed data
- **Compression**: Compress data for network transfer
- **Caching**: Cache frequently accessed data

## Real-Time Communication

### Event Handling

```typescript
// Listen for real-time updates
air.get('agents').map().on((agent, key) => {
  console.log(`Agent ${key} updated:`, agent)
})

// Handle connection events
air.on('peer.connect', (peer) => {
  console.log('New peer connected:', peer.id)
})

air.on('peer.disconnect', (peer) => {
  console.log('Peer disconnected:', peer.id)
})
```

### Data Patterns

```typescript
// Agent registration
air.get('agents').get(agentId).put({
  name: 'Agent Name',
  status: 'online',
  lastSeen: Date.now(),
  capabilities: ['task1', 'task2']
})

// Message broadcasting
air.get('broadcast').get(Date.now()).put({
  from: agentId,
  message: 'Hello, network!',
  timestamp: Date.now()
})

// Direct messaging
air.get('messages').get(targetId).get(Date.now()).put({
  from: agentId,
  to: targetId,
  content: 'Direct message',
  timestamp: Date.now()
})
```

## Common Commands

```bash
# Start Air server
npm run start

# Build project
npm run build

# Run tests
npm test

# Type check
npm run type-check

# Lint code
npm run lint

# Start in development mode
npm run dev

# Monitor network
npm run monitor
```

## Environment Variables



## Anti-Patterns to Avoid

❌ **DON'T**:
- Block the event loop with synchronous operations
- Store sensitive data without encryption
- Ignore peer connection failures
- Use global state for peer-specific data
- Skip error handling for network operations

✅ **DO**:
- Use async/await for all network operations
- Implement proper encryption for sensitive data
- Handle network partitions gracefully
- Use immutable data structures
- Add comprehensive error handling

## Notes for AI Assistants

When working on this codebase:

1. **P2P First**: Consider distributed nature in all decisions
2. **Real-Time**: Optimize for real-time performance
3. **Security**: Always consider security implications
4. **Reliability**: Handle network failures gracefully
5. **Scalability**: Design for thousands of peers
6. **Testing**: Test network scenarios thoroughly

## Key Implementation Rules

- **Async Operations**: All network operations must be asynchronous
- **Error Recovery**: Implement exponential backoff for failed operations
- **Data Validation**: Validate all incoming data from peers
- **Resource Management**: Clean up connections and listeners
- **Monitoring**: Add metrics for all critical operations

---

*This documentation is generated using @akaoio/composer*

* - The living network that connects everything*

*Generated with ❤️ by @akaoio/composer v*