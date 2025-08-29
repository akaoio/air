// @akaoio/composer configuration for Air cortex
module.exports = {
  sources: {
    docs: {
      pattern: 'src/doc/**/*.yaml',
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
      data: 'docs'
    },
    {
      target: 'CLAUDE.md',
      template: 'templates/claude.md',
      data: 'docs'
    },
    {
      target: 'API.md',
      template: 'templates/api.md',
      data: 'docs'
    },
    {
      target: 'P2P-ARCHITECTURE.md',
      template: 'templates/p2p-architecture.md',
      data: 'docs'
    }
  ],
  options: {
    baseDir: process.cwd()
  }
}