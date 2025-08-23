export default {
  sources: {
    // Individual YAML file sources for better control
    info_title: {
      pattern: 'src/doc/info/title.yaml',
      parser: 'yaml'
    },
    info_overview: {
      pattern: 'src/doc/info/overview.yaml',
      parser: 'yaml'
    },
    features_core: {
      pattern: 'src/doc/features/core.yaml',
      parser: 'yaml'
    },
    installation_quickstart: {
      pattern: 'src/doc/installation/quick-start.yaml',
      parser: 'yaml'
    },
    usage_typescript: {
      pattern: 'src/doc/usage/typescript-imports.yaml',
      parser: 'yaml'
    },
    api_classes: {
      pattern: 'src/doc/api/core-classes.yaml',
      parser: 'yaml'
    },
    troubleshooting_common: {
      pattern: 'src/doc/troubleshooting/common-issues.yaml',
      parser: 'yaml'
    },
    migration_standards: {
      pattern: 'src/doc/migration/standards-compliance.yaml',
      parser: 'yaml'
    }
  },

  build: {
    tasks: []
  },

  outputs: [
    {
      target: 'README.md',
      template: 'src/doc/template/README.md',
      format: 'markdown'
    },
    {
      target: 'CLAUDE.md',
      template: 'src/doc/template/CLAUDE.md',
      format: 'markdown'
    }
  ],

  options: {
    baseDir: '.',
    verbose: true
  }
}