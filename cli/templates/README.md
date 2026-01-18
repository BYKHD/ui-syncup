# CLI Templates

This directory contains template files used by the `init` command to generate environment and configuration files.

## Files (to be added in Task 5)

- `env.local.template` - Local development environment template
- `env.production.template` - Production environment template
- `docker-compose.override.template.yml` - Docker Compose customization template
- `config.template.json` - Project configuration template

## Template Syntax

Templates use `{{VARIABLE}}` placeholders that are replaced during file generation:

```
DATABASE_URL="{{DATABASE_URL}}"
BETTER_AUTH_SECRET="{{RANDOM_SECRET}}"
```
