
            import { Peer } from '/home/x/Projects/ventureone/projects/air/Peer.js'
            const peer = new Peer({ name: 'signal-test', development: { port: 18888 } })
            process.on('SIGTERM', () => {
                if (peer.server) peer.server.close()
                peer.cleanpid()
                process.exit(0)
            })
            // Keep process alive
            setInterval(() => {}, 1000)
        