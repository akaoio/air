# {{project.name}}

> {{project.tagline}}

{{project.description}}

Air is in development and the "main" branch is the development branch.

## Features

{{#each features.features}}
- {{icon}} **{{name}}**: {{description}}
{{/each}}

## Installation

### Standalone Super Peer

You can install Air as a standalone GUN peer. Just clone this repo.

```bash
{{usage.installation.standalone}}
```

### NodeJS module

You can also use Air in your NodeJS projects.

```javascript
{{usage.installation.nodejs}}
```

## Requirements

You might need one of the following things:

{{#each usage.requirements}}
- **{{@key}}**: {{this}}
{{/each}}

## Tested Platforms

{{#each usage.platforms}}
- {{this}}
{{/each}}

## Documentation

- **GUN**: https://github.com/amark/gun
- **Air**: Documentation coming soon

## License

{{project.license}} © {{project.author}}

---

*Built with Air v{{project.version}}*
*Documentation generated with @akaoio/composer*