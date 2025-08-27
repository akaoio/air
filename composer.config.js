/**
 * @akaoio/air - Composer Documentation Configuration
 * Using @akaoio/composer for documentation generation
 */

export default {
    name: "@akaoio/air",
    
    // Input sources for documentation
    sources: {
        // Project atoms (YAML-based configuration)
        atoms: "src/doc/atoms/**/*.yaml",
        
        // Template files
        templates: "src/doc/templates/**/*.hbs",
        
        // Source code for API documentation
        code: "src/**/*.ts"
    },
    
    // Output configuration
    output: {
        // Main documentation files
        docs: {
            "README.md": "src/doc/templates/readme.md",
            "CLAUDE.md": "src/doc/templates/claude.md"
        },
        
        // API documentation
        api: {
            dir: "docs/api",
            format: "markdown"
        }
    },
    
    // Data processing
    data: {
        // Project information
        project: {
            name: "@akaoio/air", 
            version: "2.1.0",
            description: "Distributed P2P graph database with single data source",
            features: [
                "Single shared data source across multiple instances",
                "XDG-compliant configuration management", 
                "Development bypass for testing",
                "TypeScript implementation with strict typing",
                "Built with @akaoio core technologies"
            ]
        },
        
        // Technical specifications
        tech: {
            runtime: "Node.js 18+",
            language: "TypeScript",
            database: "GUN distributed graph database",
            build: "@akaoio/builder",
            testing: "@akaoio/battle", 
            docs: "@akaoio/composer"
        }
    },
    
    // Template helpers
    helpers: {
        // Format code examples
        code: (content, lang = 'typescript') => `\`\`\`${lang}\n${content}\n\`\`\``,
        
        // Generate usage examples
        usage: (example) => {
            const examples = {
                basic: `import { Peer } from '@akaoio/air'
                
const air = new Peer()
await air.start()`,
                
                config: `const air = new Peer({
    env: 'production',
    development: {
        port: 8765,
        peers: ['http://localhost:8766']
    }
})`,
                
                client: `import GUN from '@akaoio/gun'

const gun = GUN(['http://localhost:8765'])
gun.get('data').put({ message: 'Hello Air!' })`
            }
            return examples[example] || examples.basic
        }
    },
    
    // Build hooks
    hooks: {
        beforeBuild: () => {
            console.log('🔄 Generating Air documentation...')
        },
        
        afterBuild: () => {
            console.log('✅ Air documentation generated successfully')
        }
    }
}