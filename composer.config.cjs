// @akaoio/composer configuration for Air cortex
module.exports = {
  sources: {
    atoms: {
      pattern: 'src/doc/atoms/**/*.yaml',
      parser: 'yaml'
    },
    overview: {
      pattern: 'src/doc/overview.yaml',
      parser: 'yaml'
    }
  },
  build: {
    tasks: []
  },
  outputs: [
    {
      target: 'README.md',
      template: 'templates/readme.md',
      data: {
        project: 'overview.project',
        features: 'overview.features',
        usage: 'atoms.usage',
        overview: 'overview'
      }
    },
    {
      target: 'CLAUDE.md',
      template: 'templates/claude.md',
      data: {
        project: 'overview.project',
        features: 'overview.features',
        usage: 'atoms.usage',
        overview: 'overview'
      }
    },
    {
      target: 'API.md',
      template: 'templates/api.md',
      data: {
        project: 'overview.project',
        features: 'overview.features',
        usage: 'atoms.usage',
        overview: 'overview'
      }
    },
    {
      target: 'P2P-ARCHITECTURE.md',
      template: 'templates/p2p-architecture.md',
      data: {
        project: 'atoms.project',
        features: 'atoms.features',
        overview: 'overview'
      }
    }
  ],
  options: {
    baseDir: process.cwd()
  }
}