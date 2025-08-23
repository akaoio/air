# {{info_title.title}}

> **Version**: {{info_title.version}}  
> **Status**: {{info_title.status}}  
> **Runtime**: {{info_title.runtime}}

{{info_overview.description}}

## Features

{{#each features_core.features}}
- {{icon}} **{{name}}**: {{description}}
{{/each}}

## Quick Start

### Installation

{{#each installation_quickstart.installation_steps}}
#### {{title}}

```bash
{{#each commands}}
{{this}}
{{/each}}
```
{{/each}}

### Running Air

{{#each installation_quickstart.running_options}}
```bash
# {{runtime}} ({{description}})
{{#if commands}}
{{#each commands}}
{{this}}
{{/each}}
{{else}}
{{command}}
{{/if}}
```
{{/each}}

## TypeScript and ES Modules

**{{usage_typescript.critical_info}}**

### {{usage_typescript.import_rules.rule}}

```typescript
// {{usage_typescript.import_rules.correct_example.description}}
{{usage_typescript.import_rules.correct_example.code}}

// {{usage_typescript.import_rules.wrong_example.description}}
{{usage_typescript.import_rules.wrong_example.code}}
```

**Why this works**: {{usage_typescript.why_it_works}}

---

*Generated with ❤️ by @akaoio/composer*

*This documentation is automatically generated from atomic YAML files in `src/doc/` - modify the source atoms, not this file directly.*