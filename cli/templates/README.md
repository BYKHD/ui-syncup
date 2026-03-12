# CLI Templates

This directory contains template files used by the `init` command to generate environment and configuration files.

## Files

- `env.local.template` - Local development environment template (MinIO S3-compatible storage)
- `env.production.template` - Production environment template
- `docker-compose.override.template.yml` - Docker Compose customization template

## Template Syntax

Templates use `{{VARIABLE}}` placeholders that are replaced during file generation:

```
DATABASE_URL="{{DATABASE_URL}}"
BETTER_AUTH_SECRET="{{RANDOM_SECRET}}"
```
