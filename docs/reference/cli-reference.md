---
title: "CLI Reference"
description: "Complete command reference for the @m5nv/create-scaffold package"
type: reference
audience: "all"
estimated_time: "N/A (reference)"
prerequisites: []
related_docs:
  - "../how-to/creating-templates.md"
  - "../tutorial/getting-started.md"
  - "../tutorial/create-scaffold.md"
  - "../how-to/setup-recipes.md"
  - "environment.md"
  - "error-codes.md"
last_updated: "2025-11-19"
---

# CLI Reference

Complete command reference for the `@m5nv/create-scaffold` package.

## Overview

The `@m5nv/create-scaffold` package provides two complementary CLI tools:

- **`create-scaffold`**: Scaffolds new projects from templates
- **`make-template`**: Converts projects to templates and back

Both tools use command-based interfaces and support help commands:

- `<tool> <command> --help`: Quick reference - shows options at a glance
- `<tool> help <command>`: Detailed documentation - comprehensive format with examples

## Global Options

Both tools support these global options:

- `--help, -h`: Print help
- `--version, -v`: Show version information
- `--verbose`: Enable verbose output

*Note: JSON output is available via `--format json` on commands that support it (e.g., `list`).*

<!-- AUTO-GENERATED: create-scaffold commands -->
## create-scaffold Commands
<!-- END AUTO-GENERATED: create-scaffold commands -->

<!-- AUTO-GENERATED: make-template commands -->
## make-template Commands
<!-- END AUTO-GENERATED: make-template commands -->

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

### Registry Auto-Discovery

When listing templates from a registry, the CLI automatically discovers templates by scanning repository contents for template indicators:

**Template Indicators:**
- `package.json` - Node.js project marker
- `template.json` - Template metadata file
- `_setup.mjs` - Template setup script
- `src/`, `lib/` - Source code directories

**Discovery Process:**
1. Clone/fetch the registry repository
2. Scan subdirectories for template indicators
3. Extract metadata from `template.json` or `package.json`
4. Return list of discovered templates

### Using Registries

Once configured, registries enable shorthand template references:

```bash
# List all templates in the default registry
create-scaffold list

# List all templates in a specific registry
create-scaffold list --registry work

# Use a template from a registry
create-scaffold new my-app --template work/react-app

# Use a template from a community collection
create-scaffold new my-tool --template community/useful-tool
```

**Registry Discovery:**
- **Single repositories** auto-discover all templates in subdirectories
- **Template collections** aggregate single templates from multiple repositories
- **Local directories** auto-discover templates in subdirectories

### Default Registry

The default registry is `git@github.com:million-views/templates.git` (private). This contains the official templates maintained by the million-views team.

### Template Discovery

When listing templates from a registry:
- **Single repositories**: Scan subdirectories for template indicators
- **Template collections**: Check each repository for its single template
- **Local directories**: Scan subdirectories for template indicators
- **Template indicators**: `package.json`, `template.json`, `_setup.mjs`, `src/`, `lib/`, etc.
- **Metadata**: Retrieved from `template.json` or `package.json`

## Template manifest schema

@m5nv/create-scaffold publishes its canonical `template.json` contract so automation and editors stay aligned with the CLI:

- `@m5nv/create-scaffold/schema/template.json` – latest stable schema (currently `template.v1.json`).
- `@m5nv/create-scaffold/schema/template.v1.json` – immutable versioned schema.
- `@m5nv/create-scaffold/types/template-schema` – TypeScript declarations for programmatic tooling.

Add the schema to your editor configuration to surface validation and completions:

```json
// .vscode/settings.json
{
  "json.schemas": [
    {
      "fileMatch": ["template.json"],
      "url": "./node_modules/@m5nv/create-scaffold/schema/template.json"
    }
  ]
}
```

TypeScript utilities can import the generated types directly:

```ts
import type { TemplateManifest } from '@m5nv/create-scaffold/types/template-schema';
```

CLI contributors should run `npm run schema:build` after editing the schema and rely on `npm run schema:check` (already wired into `npm run validate`) to detect drift.

## Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `<project-directory>` | string | Yes* | Name of the directory to create for your project. Must contain only letters, numbers, hyphens, and underscores. Cannot start with a dot or contain path separators. |

*Not required when using `list` command or `--help`

## Configuration Defaults

The CLI can preload defaults from configuration files so teams avoid repeating flags for repository, branch, author metadata, and placeholder values.

### Discovery order

1. Project-level `.m5nvrc` in the current working directory.
2. User config: `~/.m5nv/rc.json` (or `$M5NV_HOME/rc.json` when M5NV_HOME is set).

Discovery stops at the first file found. Use `--no-config` to bypass discovery entirely.

### File format

Configuration files must be UTF-8 JSON objects with the following optional fields:

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

- `registries`: object mapping registry names to repository URLs or arrays of URLs that auto-discover available templates.
- `author`: optional metadata surfaced to setup scripts and logs (values are not printed).
- `placeholders`: map of placeholder tokens to default values (same syntax as `--placeholder`).

### Configuration schema

Configuration files are validated against a JSON schema to ensure correctness:

- `@m5nv/create-scaffold/schema/config.json` – latest stable schema.
- `@m5nv/create-scaffold/types/config-schema` – TypeScript declarations for programmatic tooling.

Add the schema to your editor configuration to surface validation and completions:

```json
{
  "json.schemas": [
    {
      "fileMatch": [".m5nvrc", "rc.json"],
      "url": "./node_modules/@m5nv/create-scaffold/schema/config.json"
    }
  ]
}
```

CLI contributors should run `npm run schema:build` after editing the schema and rely on `npm run schema:check` (already wired into `npm run validate`) to detect drift.

### Precedence

1. CLI flags (`--placeholder`, etc.).
2. URL parameters in template URLs (e.g., `?options=typescript`).
3. Branch specifications in template URLs (e.g., `user/repo#branch`).
4. Environment variables (e.g. `CREATE_SCAFFOLD_PLACEHOLDER_<TOKEN>`).
5. Configuration defaults from `.m5nvrc`.
6. Template-declared defaults.

Verbose mode prints which configuration file was used and which fields were applied, masking sensitive placeholder values. Errors reference the offending path and suggest `--no-config` for bypassing corrupt files.

## Examples

### Basic Usage

```bash
# Create a new React project
npm create @m5nv/scaffold my-app -- --template react-vite
```

### Custom Repository

```bash
# Use a custom repository by specifying it in the template URL
npm create @m5nv/scaffold my-app -- --template https://github.com/custom-user/templates/nextjs
# Or use shorthand for GitHub repos
npm create @m5nv/scaffold my-app -- --template custom-user/templates/nextjs
```

### Template Discovery

```bash
# List available templates
create-scaffold list
```

### Preview & Debugging

```bash
# Preview operations without executing (dry run)
create-scaffold new my-app --template react --dry-run
```

## Environment Variables

The CLI tools support the following environment variables:

| Variable | Description |
|----------|-------------|
| `M5NV_HOME` | Override default `~/.m5nv` base directory for cache and config storage |

See [Error Codes Reference](error-codes.md#environment-variables) for detailed documentation.

## Template URL Formats

Templates can be specified in multiple formats:

| Format | Example | Description |
|--------|---------|-------------|
| Registry shorthand | `favorites/react-vite` | Template from configured registry |
| Registry with branch | `favorites/react-vite#develop` | Template from specific branch |
| GitHub shorthand | `user/repo/template` | GitHub repo with subpath |
| GitHub with branch | `user/repo/template#feature-branch` | GitHub repo with branch and subpath |
| Full URL | `https://github.com/user/repo` | Complete repository URL |
| URL with branch | `https://github.com/user/repo#branch` | Repository URL with specific branch |
| Local path | `./my-templates/react` | Local directory path |
| URL with options | `user/repo?options=typescript&branch=main` | URL with query parameters |
| HTTPS URL | `https://github.com/user/repo.git` | Full GitHub HTTPS URL |
| SSH URL | `git@github.com:user/repo.git` | SSH URL (requires SSH keys) |
| Archive URL | `https://github.com/user/repo/archive/refs/tags/v1.0.0.tar.gz` | Direct archive download |
| Local path | `/path/to/local/repo` | Local git repository |
| Relative path | `./local-repo` | Relative path to local repository |

## Dimensions and options

Templates describe their vocabulary in `template.json` via `metadata.dimensions`:

```json
{
  "name": "react-vite",
  "metadata": {
    "dimensions": {
      "capabilities": {
        "type": "multi",
        "values": ["auth", "testing", "docs"],
        "default": ["logging"],
        "requires": {
          "testing": ["auth"]
        },
        "conflicts": {
          "docs": ["testing"]
        }
      },
      "deployment": {
        "type": "single",
        "values": ["none", "cloudflare-d1", "cloudflare-turso"],
        "default": "none"
      }
    }
  }
}
```

create-scaffold normalizes user selections against this metadata, applies defaults, and exposes the result through `ctx.options.byDimension` and `tools.options` helpers.

## Cache System

Templates are cached locally for faster subsequent operations:

- **Cache Location:** `~/.m5nv/cache/`
- **Default TTL:** 24 hours
- **Cache Key:** Repository URL + branch name
- **Automatic Cleanup:** Corrupted entries are automatically re-cloned

### Cache Behavior

| Scenario | Behavior |
|----------|----------|
| First use | Repository is cloned and cached |
| Within TTL | Cached version is used (fast) |
| After TTL | Repository is re-cloned and cache updated |
| `--no-cache` | Cache is bypassed, direct clone performed |
| Corrupted cache | Entry is automatically re-cloned |

## Setup Scripts

Templates may include a `_setup.mjs` file that runs after copying:

- **Execution Context:** Runs in a secure Node.js VM sandbox within your project directory
- **Sandbox Restrictions:** No access to Node built-ins (`fs`, `path`, `import`, `require`, `eval`); only `console`, timers, and `process.env` available
- **Environment:** Receives the [Environment](environment.md) object containing `{ ctx, tools }` - all operations must use the provided tools
- **Cleanup:** Setup script is automatically removed after execution
- **Error Handling:** Failures are logged but don't stop project creation

## Post-create guidance

After scaffolding, the CLI prints a "Next steps" block:

- `cd <projectDir>` is always listed first.
- If the template's `template.json` includes a `handoff` array of strings, each entry is rendered as a bullet.
- When `handoff` is absent or empty, the CLI falls back to a reminder to review the README.

Example `template.json` snippet:

```json
{
  "name": "vite-react",
  "handoff": [
    "npm install",
    "npm run dev",
    "Open README.md for IDE-specific tips"
  ]
}
```

## Input Validation

All inputs are validated for security and correctness:

### Project Directory Validation

- Must contain only letters, numbers, hyphens, and underscores
- Cannot start with a dot
- Cannot contain path separators (`/`, `\`)
- Cannot be a reserved name (`node_modules`, `package.json`, etc.)
- Maximum length: 100 characters

### Template Name Validation

- Must contain only letters, numbers, hyphens, underscores, and forward slashes
- Cannot contain path traversal attempts (`..`)
- Cannot start with a dot
- Maximum length: 255 characters
- Supports nested templates (e.g., `frontend/react`)

### Repository URL Validation

- GitHub shorthand: Must match `user/repo` pattern
- URLs: Must use safe protocols (`http:`, `https:`, `git:`, `ssh:`)
- Local paths: Cannot contain path traversal attempts
- Private networks are blocked for security

### Branch Name Validation

- Must follow git branch naming rules
- Cannot contain spaces or control characters
- Cannot contain git special characters (`~`, `^`, `:`, `?`, `*`, `[`, `]`, `\`)
- Cannot start or end with dots
- Cannot end with `.lock`
- Maximum length: 255 characters

## See Also

- [Environment Reference](environment.md) - Complete Environment contract
- [Error Codes Reference](error-codes.md) - Exit codes and error messages
- [Creating Templates Guide](../how-to/creating-templates.md) - How to create your own templates
- [Getting Started Tutorial](../tutorial/getting-started.md) - Step-by-step beginner guide

---

## Related Documentation

- [Getting Started Tutorial](../tutorial/getting-started.md) - First project walkthrough
- [Template Authoring Guide](../how-to/creating-templates.md) - Create templates
- [Author Workflow](../how-to/author-workflow.md) - Complete authoring workflow
- [Environment Reference](environment.md) - Setup script environment API
- [Error Codes](error-codes.md) - Detailed error explanations
- [Troubleshooting Guide](../guides/troubleshooting.md) - Common issues

---

## Version History

**Current Version**: 0.6.0

See [CHANGELOG.md](../../CHANGELOG.md) for detailed version history.
