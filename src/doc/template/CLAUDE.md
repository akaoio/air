# Air - GUN Database System Codebase Documentation for AI Assistants

> **Last Updated**: December 2024  
> **Version**: {{info_title.version}}  
> **Language**: TypeScript
> **Status**: {{info_title.status}}

## Project Overview

{{info_overview.description}}

## Critical Information for AI Assistants

### TypeScript and ES Modules

**{{usage_typescript.critical_info}}**. When working with imports:

1. **{{usage_typescript.import_rules.rule}}**:
   ```typescript
   // {{usage_typescript.import_rules.correct_example.description}}
   {{usage_typescript.import_rules.correct_example.code}}
   
   // {{usage_typescript.import_rules.wrong_example.description}}
   {{usage_typescript.import_rules.wrong_example.code}}
   ```

2. **Why this works**: {{usage_typescript.why_it_works}}

3. **Build configurations**:
   - `{{usage_typescript.build_configs.development.file}}` - {{usage_typescript.build_configs.development.description}}
   - `{{usage_typescript.build_configs.production.file}}` - {{usage_typescript.build_configs.production.description}}

### Runtime Support

Air supports three runtime environments:
{{#each installation_quickstart.running_options}}
{{@index}}. **{{runtime}}**: {{description}}
{{/each}}

### Function Naming Convention

**STRICT RULE**: {{usage_typescript.function_naming.rule}}. Related functions are grouped using dot notation:
- Single-word functions: {{#each usage_typescript.function_naming.examples.single_word}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Grouped functions: {{#each usage_typescript.function_naming.examples.grouped_functions}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- **NEVER** use {{usage_typescript.function_naming.examples.never_use}}

## Architecture & Core Components

### Core Classes and Their Responsibilities

{{#each api_classes.classes}}
#### {{name}} Class ({{file}})

{{description}}:

```typescript
export class {{name}} {
{{#if methods.core}}
    // Core methods (single-word naming)
{{#each methods.core}}
    async {{name}}      // {{description}}
{{/each}}
{{/if}}
    
{{#if methods.ip_methods}}
    // IP methods (dot notation grouping)
    ip = {
{{#each methods.ip_methods}}
        {{name}}: async () => {{return}}  // {{description}}
{{/each}}
    }
{{/if}}
    
{{#if methods.status_methods}}
    // Status methods (dot notation grouping)
    status = {
{{#each methods.status_methods}}
        {{name}}: async () => void  // {{description}}
{{/each}}
    }
{{/if}}

{{#unless methods.core}}{{#unless methods.ip_methods}}{{#unless methods.status_methods}}
{{#each methods}}
    {{name}}{{#if params}}({{params}}){{/if}}{{#if return}}: {{return}}{{/if}}
{{/each}}
{{/unless}}{{/unless}}{{/unless}}
}
```

{{/each}}

## Development

### Quick Commands

{{#each troubleshooting_common.quick_commands}}
- `{{command}}` - {{description}}
{{/each}}

## Troubleshooting Guide

### Common Issues and Solutions

{{#each troubleshooting_common.issues}}
{{@index}}. **{{problem}}**
{{#each solutions}}
   - {{this}}
{{/each}}

{{#if example}}
   Example: `{{example}}`
{{/if}}

{{#if command}}
   ```bash
   {{command}}
   ```
{{/if}}

{{/each}}

## Best Practices

### When Modifying Code

1. **Always test builds**: Run `npm run build:prod` before committing
2. **Verify imports**: Ensure all relative imports use `.js` extensions
3. **Check runtime compatibility**: Test with `node dist/main.js`
4. **Follow naming convention**: Single words or dot notation only
5. **Update types**: Add new interfaces to `src/types/index.ts`
6. **Use tmp/ for temporary files**: Never create temporary files elsewhere

---

**For AI Assistants**: When working on this codebase, always remember:
1. Use `.js` extensions in all relative imports
2. Follow single-word or dot notation naming
3. Test with `npm run build:prod` before committing
4. Place temporary files in `tmp/` only
5. This is TypeScript that compiles to ES modules for Node.js

---

*Generated with ❤️ by @akaoio/composer*

*This documentation is automatically generated from atomic YAML files in `src/doc/` - modify the source atoms, not this file directly.*