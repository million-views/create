---
title: "CLI Reference"
description: "Complete command reference for the @m5nv/create package"
type: reference
audience: "all"
estimated_time: "N/A (reference)"
prerequisites: []
related_docs:
  - "../how-to/template-author-workflow.md"
  - "../tutorial/getting-started.md"
  - "../tutorial/scaffold.md"
  - "../how-to/setup-recipes.md"
  - "environment.md"
  - "error-codes.md"
last_updated: "2025-11-26"
---

# CLI Reference

Complete command reference for the `@m5nv/create` package.

## Overview

The `@m5nv/create` package provides two complementary CLI tools:

- **`create scaffold`**: Scaffolds new projects from templates
- **`create template`**: Converts projects to templates and back

Both tools use command-based interfaces and support help commands:

- `<tool> <command> --help`: Quick reference - shows options at a glance
- `<tool> help <command>`: Detailed documentation - comprehensive format with examples

## Global Options

Both tools support these global options:

- `--help, -h`: Print help
- `--version, -v`: Show version information
- `--verbose`: Enable verbose output

*Note: JSON output is available via `--format json` on commands that support it (e.g., `list`).*

---

## create scaffold Commands

| Command | Description |
|---------|-------------|
| [new](./commands/scaffold/new.md) | Create a new project from a template |
| [list](./commands/scaffold/list.md) | List templates from a registry repository |
| [validate](./commands/scaffold/validate.md) | Validate template configuration |

### Quick Examples

```bash
# Create a new project from a template
create scaffold new my-app --template react-vite

# List available templates
create scaffold list

# Validate a template
create scaffold validate ./my-template
```

---

## create template Commands

| Command | Description |
|---------|-------------|
| [init](./commands/template/init.md) | Initialize template configuration files |
| [convert](./commands/template/convert.md) | Convert project to template |
| [restore](./commands/template/restore.md) | Restore template to project |
| [validate](./commands/template/validate.md) | Validate template.json |
| [hints](./commands/template/hints.md) | Show hints catalog |
| [test](./commands/template/test.md) | Test template functionality |
| [config validate](./commands/template/config-validate.md) | Validate .templatize.json |

### Quick Examples

```bash
# Initialize template configuration
create template init

# Convert project to template
create template convert --dry-run

# Restore template to working project
create template restore

# Validate configuration
create template config validate
```

---

## Registry System

The CLI supports a decentralized registry system for template discovery and organization. Unlike centralized registries that act as gatekeepers, this system allows users to define their own registries locally.

### How Registries Work

Registries are Git repositories containing template directories. Each registry can contain multiple templates, and users can define multiple registries in their configuration.

### Registry Configuration

Registries are configured in `.m5nvrc` configuration files. Each registry points to one or more template sources that are automatically discovered:

```json
{
  "registries": {
    "work": "git@github.com:million-views/templates.git",
    "community": [
      "https://github.com/community-1/template.git",
      "https://github.com/community-2/template.git"
    ],
    "workshop": "~/my-templates"
  }
}
```

**Registry Types:**
- **Single Repository**: String URL/path pointing to a repository with multiple templates
- **Template Collection**: Array of URLs/paths, each pointing to a single-template repository
- **Local Directory**: Local path to a directory containing template subdirectories

### Template URL MicroDSL

Templates can be referenced using a compact URL syntax that combines registry, template name, and branch information:

```text
registry-name/template-name#branch
```

**Examples:**
- `workshop/basic-react-spa` - Template from workshop registry, main branch
- `workshop/basic-react-spa#feature-branch` - Template from specific branch
- `https://github.com/user/repo.git#develop` - Direct URL with branch

### Using Registries

Once configured, registries enable shorthand template references:

```bash
# List all templates in the default registry
create scaffold list

# List all templates in a specific registry
create scaffold list --registry work

# Use a template from a registry
create scaffold new my-app --template work/react-app

# Use a template from a community collection
create scaffold new my-tool --template community/useful-tool
```

### Default Registry

The default registry is `git@github.com:million-views/templates.git` (private). This contains the official templates maintained by the million-views team.

---

## Template Manifest Schema

@m5nv/create publishes its canonical `template.json` contract so automation and editors stay aligned with the CLI:

- `@m5nv/create/schema/template.json` – latest stable schema (currently `template.v1.json`).
- `@m5nv/create/schema/template.v1.json` – immutable versioned schema.
- `@m5nv/create/types/template-schema` – TypeScript declarations for programmatic tooling.

Add the schema to your editor configuration to surface validation and completions:

```json
// .vscode/settings.json
{
  "json.schemas": [
    {
      "fileMatch": ["template.json"],
      "url": "./node_modules/@m5nv/create/schema/template.json"
    }
  ]
}
```

---

## Configuration Defaults

The CLI can preload defaults from configuration files so teams avoid repeating flags for repository, branch, author metadata, and placeholder values.

### Discovery Order

1. Project-level `.m5nvrc` in the current working directory.
2. User config: `~/.m5nv/rc.json` (or `$M5NV_HOME/rc.json` when M5NV_HOME is set).

Discovery stops at the first file found. Use `--no-config` to bypass discovery entirely.

### File Format

```json
{
  "registries": {
    "work": "git@github.com:your-org/templates.git",
    "community": [
      "https://github.com/community-1/templates.git",
      "https://github.com/community-2/templates.git"
    ],
    "local": "~/my-templates"
  },
  "author": {
    "name": "Example Dev",
    "email": "dev@example.com",
    "url": "https://example.com"
  },
  "placeholders": {
    "PROJECT_NAME": "demo-app",
    "API_TOKEN": "example-token"
  }
}
```

### Precedence

1. CLI flags (`--placeholder`, etc.).
2. URL parameters in template URLs (e.g., `?options=typescript`).
3. Branch specifications in template URLs (e.g., `user/repo#branch`).
4. Environment variables (e.g. `CREATE_SCAFFOLD_PLACEHOLDER_<TOKEN>`).
5. Configuration defaults from `.m5nvrc`.
6. Template-declared defaults.

---

## Template URL Formats

Templates can be specified in multiple formats:

| Format | Example | Description |
|--------|---------|-------------|
| Registry shorthand | `favorites/react-vite` | Template from configured registry |
| Registry with branch | `favorites/react-vite#develop` | Template from specific branch |
| GitHub shorthand | `user/repo/template` | GitHub repo with subpath |
| Full URL | `https://github.com/user/repo` | Complete repository URL |
| URL with branch | `https://github.com/user/repo#branch` | Repository URL with specific branch |
| Local path | `./my-templates/react` | Local directory path |
| SSH URL | `git@github.com:user/repo.git` | SSH URL (requires SSH keys) |

---

## Cache System

Templates are cached locally for faster subsequent operations:

- **Cache Location:** `~/.m5nv/cache/`
- **Default TTL:** 24 hours
- **Cache Key:** Repository URL + branch name
- **Automatic Cleanup:** Corrupted entries are automatically re-cloned

| Scenario | Behavior |
|----------|----------|
| First use | Repository is cloned and cached |
| Within TTL | Cached version is used (fast) |
| After TTL | Repository is re-cloned and cache updated |
| `--no-cache` | Cache is bypassed, direct clone performed |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `M5NV_HOME` | Override default `~/.m5nv` base directory for cache and config storage |

See [Error Codes Reference](error-codes.md#environment-variables) for detailed documentation.

---

## Input Validation

All inputs are validated for security and correctness:

### Project Directory
- Must contain only letters, numbers, hyphens, and underscores
- Cannot start with a dot or contain path separators
- Maximum length: 100 characters

### Template Name
- Must contain only letters, numbers, hyphens, underscores, and forward slashes
- Cannot contain path traversal attempts (`..`)
- Maximum length: 255 characters

### Repository URL
- Must use safe protocols (`http:`, `https:`, `git:`, `ssh:`)
- Private networks are blocked for security

---

## See Also

- [Environment Reference](environment.md) - Complete Environment contract for setup scripts
- [Error Codes Reference](error-codes.md) - Exit codes and error messages
- [Template Author Workflow](../how-to/template-author-workflow.md) - How to create your own templates
- [Getting Started Tutorial](../tutorial/getting-started.md) - Step-by-step beginner guide
- [Troubleshooting Guide](../how-to/troubleshooting.md) - Common issues

---

## Version History

**Current Version**: 0.6.0

See [CHANGELOG.md](../../CHANGELOG.md) for detailed version history.
