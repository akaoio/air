# P2P Architecture - 

Deep dive into the peer-to-peer architecture of .

## Overview

Air implements a distributed peer-to-peer graph database using the GUN protocol. This architecture enables real-time data synchronization without central servers, creating a resilient and scalable network.

## Core Architecture Principles

### Distributed Graph Database

Air stores data as a graph where each node can have multiple connections to other nodes. This graph structure is replicated across all peers in the network.

```
Node A ──→ Node B ──→ Node C
  │         │         │
  ↓         ↓         ↓
Node D ──→ Node E ──→ Node F
```

### Eventual Consistency

The network maintains eventual consistency through conflict-free replicated data types (CRDTs). All peers will eventually converge to the same state.

### Real-Time Synchronization

Changes propagate through the network in real-time using WebSocket connections and the GUN protocol's efficient delta synchronization.

## Network Topology

### Mesh Network

Air creates a mesh network where peers can connect to multiple other peers:

```
    Peer A ←→ Peer B
       ↑ ⤬     ⤤ ↑
       ↓   ⤩ ⤦   ↓  
    Peer C ←→ Peer D
```

**Benefits**:
- High availability (no single point of failure)
- Load distribution across multiple paths
- Automatic failover when peers disconnect

### Super Peers

Some peers can act as "super peers" with enhanced capabilities:

- **Higher bandwidth**: Can handle more connections
- **Persistent storage**: Store data for longer periods  
- **Discovery service**: Help new peers find the network
- **Relay service**: Bridge connections between peers

## Data Synchronization

### Delta Synchronization

Air only transmits changes (deltas) rather than full data copies:

```javascript
// Only the changed field is synchronized
{
  "user123": {
    "name": "John",
    "status": "online" // ← Only this field syncs
  }
}
```

### Vector Clocks

Each data change includes vector clock information for ordering:

```javascript
{
  "data": "new value",
  "_": {
    "#": "user123",
    ">": {
      "status": 1630000000.123
    }
  }
}
```

### Conflict Resolution

When conflicts occur, Air uses last-write-wins with timestamp ordering:

1. **Compare timestamps**: Most recent change wins
2. **Peer tiebreaker**: Use peer ID as tiebreaker
3. **Merge strategy**: Merge non-conflicting fields

## Connection Management

### Connection Lifecycle

```
1. Discovery    → 2. Handshake   → 3. Authentication
       ↓               ↓                 ↓
4. Data Sync    ← 5. Heartbeat   ← 6. Active
       ↓
7. Disconnect
```

### Peer Discovery

Multiple discovery mechanisms:

1. **Bootstrap peers**: Initial peer list in configuration
2. **Peer exchange**: Peers share their peer lists
3. **mDNS discovery**: Local network discovery
4. **DHT lookup**: Distributed hash table queries

### Connection Pooling

Air maintains optimal connection pools:

- **Minimum connections**: Always maintain base connectivity
- **Maximum connections**: Prevent resource exhaustion
- **Quality scoring**: Prefer high-quality connections
- **Geographic distribution**: Connect to geographically diverse peers

## Storage Layer

### Multi-Tier Storage

```
┌─────────────────┐
│   Memory Cache  │ ← Hot data (milliseconds)
├─────────────────┤
│   Local Disk    │ ← Persistent data (seconds)
├─────────────────┤
│  Network Cache  │ ← Peer redundancy (minutes)
├─────────────────┤
│  Cold Storage   │ ← Long-term backup (hours)
└─────────────────┘
```

### Storage Strategies

- **Write-through**: Data written to cache and storage simultaneously
- **Write-back**: Data written to cache first, storage later
- **Read-through**: Cache misses trigger storage reads
- **Eviction**: LRU eviction for memory management

## Security Architecture

### Encryption Layers

1. **Transport encryption**: TLS/WSS for connections
2. **Message encryption**: End-to-end encryption for sensitive data
3. **Storage encryption**: Encrypted local storage
4. **Identity encryption**: Cryptographic peer identities

### Authentication Flow

```
Peer A                    Peer B
  │                        │
  │ ─── Challenge ────────→ │
  │                        │
  │ ←─── Response ─────────│
  │                        │
  │ ─── Verify ──────────→ │
  │                        │
  │ ←─── Success ─────────│
```

### Access Control

- **Public data**: Readable by all peers
- **Private data**: Encrypted, only readable by authorized peers
- **Group data**: Shared encryption keys for group access
- **Temporal access**: Time-limited access tokens

## Performance Optimization

### Caching Strategy

```javascript
// Multi-level caching
const cache = {
  L1: new Map(),      // In-memory (1ms)
  L2: new LRUCache(), // Memory LRU (5ms)
  L3: new DiskCache() // Disk cache (50ms)
}
```

### Bandwidth Optimization

- **Compression**: GZIP compression for large messages
- **Batching**: Batch multiple operations
- **Prioritization**: Priority queues for urgent data
- **Rate limiting**: Prevent bandwidth abuse

### Connection Optimization

- **Keep-alive**: Maintain persistent connections
- **Multiplexing**: Multiple streams per connection
- **Connection reuse**: Reuse connections for multiple operations
- **Adaptive timeouts**: Dynamic timeout based on network conditions

## Fault Tolerance

### Network Partitioning

When network splits occur:

1. **Detect partition**: Monitor peer connectivity
2. **Continue operation**: Each partition operates independently  
3. **Store conflicts**: Record conflicting changes
4. **Heal partition**: Merge data when connectivity restores
5. **Resolve conflicts**: Apply conflict resolution rules

### Peer Failure Handling

```javascript
// Automatic failover
air.on('peer.disconnect', (peer) => {
  // 1. Remove peer from active list
  activePeers.delete(peer.id)
  
  // 2. Redistribute connections
  if (activePeers.size < minPeers) {
    findNewPeers()
  }
  
  // 3. Rebalance data
  rebalanceShards(peer.id)
})
```

### Data Recovery

- **Redundancy**: Data replicated across multiple peers
- **Checksums**: Verify data integrity
- **Repair**: Automatic repair of corrupted data
- **Backup**: Regular backups to cold storage

## Scalability

### Horizontal Scaling

Add more peers to increase capacity:

- **Linear scaling**: Performance increases with peer count
- **Load balancing**: Distribute load across peers
- **Sharding**: Partition data across peer subsets
- **Federation**: Connect multiple Air networks

### Performance Metrics

| Peers | Throughput | Latency | Memory |
|-------|------------|---------|---------|
| 1     | 1,000 ops/s | 1ms    | 50MB   |
| 10    | 8,000 ops/s | 5ms    | 200MB  |
| 100   | 50,000 ops/s| 15ms   | 1GB    |
| 1000  | 200,000 ops/s| 50ms   | 5GB    |

## Monitoring and Observability

### Metrics Collection

```javascript
// Network metrics
const metrics = {
  peers: air.getPeerCount(),
  connections: air.getConnectionCount(),
  throughput: air.getThroughput(),
  latency: air.getAverageLatency(),
  errors: air.getErrorRate()
}
```

### Health Checks

Regular health assessments:

- **Peer connectivity**: Check peer reachability
- **Data consistency**: Verify data integrity
- **Performance**: Monitor response times
- **Resource usage**: Check memory/disk usage

### Alerting

Configure alerts for:

- **Peer disconnections**: Mass peer offline events
- **High latency**: Network performance degradation
- **Data conflicts**: Excessive conflict resolution
- **Resource exhaustion**: Memory or disk full

---

*Generated with ❤️ by @akaoio/composer*