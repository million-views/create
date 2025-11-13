---
title: "CLI Reference"
type: "reference"
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
last_updated: "2025-11-12"
---

# CLI Reference

Complete command reference for the `@m5nv/create-scaffold` package.

## Overview

The `@m5nv/create-scaffold` package provides two complementary CLI tools:

- **`create-scaffold`**: Scaffolds new projects from templates
- **`make-template`**: Converts projects to templates and back

Both tools use command-based interfaces and support progressive disclosure help.

## Tools

### create-scaffold

Scaffolds new projects from git-based templates.

```bash
# Using npm create (recommended)
npm create @m5nv/scaffold <project-directory> -- --template <template-name> [options]

# Using npx with command syntax
npx @m5nv/create-scaffold new <project-directory> --template <template-name> [options]

# Global installation
create-scaffold new <project-directory> --template <template-name> [options]
```

### make-template

Converts existing Node.js projects into reusable templates.

```bash
# Convert project to template
make-template convert [options]

# Restore templated project
make-template restore [options]

# Initialize template.json
make-template init [options]

# Validate template
make-template validate [options]

# Show authoring hints
make-template hints

# Test template end-to-end
make-template test <template-path> [options]
```

## create-scaffold Commands

### `new` - Create New Project

Create a new project from a template.

**Usage:**

```bash
create-scaffold new <project-directory> --template <template-name> [options]
```

**Arguments:**
- `<project-directory>`: Name of the directory to create for your project

**Options:**
- `--template, -T`: Template URL or shorthand (required)
- `--branch, -b`: Git branch to use
- `--selection`: Path to selection.json file to load existing choices
- `--options`: Contextual options for template customization
- `--dry-run`: Preview operations without executing them
- `--log-file`: Write structured logs to specified file
- `--no-cache`: Bypass the local repository cache
- `--cache-ttl`: Override cache TTL in hours
- `--verbose`: Enable verbose logging

### `list` - List Available Templates

List available templates and registries.

**Usage:**

```bash
create-scaffold list [options]
```

**Options:**
- `--registry`: Registry name to list templates from
- `--json`: Emit JSON-formatted results

### `info` - Show Template Information

Show detailed information about a template.

**Usage:**

```bash
create-scaffold info <template-name> [options]
```

**Arguments:**
- `<template-name>`: Name of the template to get information about

**Options:**
- `--registry`: Registry to search in

### `validate` - Validate Template

Validate a template directory.

**Usage:**

```bash
create-scaffold validate <template-path> [options]
```

**Arguments:**
- `<template-path>`: Path to the template directory to validate

**Options:**
- `--json`: Emit JSON-formatted results

## make-template Commands

### `convert` - Convert Project to Template

Convert an existing Node.js project into a reusable template.

**Usage:**

```bash
make-template convert [options]
```

**Options:**
- `--dry-run, -d`: Preview conversion without making changes
- `--yes, -y`: Skip confirmation prompts
- `--silent, -s`: Suppress output except errors
- `--type, -t`: Project type hint
- `--placeholder-format`: Placeholder format
- `--sanitize-undo`: Clean undo log of sensitive data

### `restore` - Restore Template to Project

Restore a templated project back to its original working state.

**Usage:**

```bash
make-template restore [options]
```

**Options:**
- `--restore-files`: Comma-separated list of files to restore
- `--restore-placeholders`: Restore placeholder values
- `--generate-defaults`: Generate default values for missing placeholders

### `init` - Initialize Template

Generate a skeleton template.json file.

**Usage:**

```bash
make-template init [options]
```

**Options:**
- `--init-file`: Output filename for skeleton (default: template.json)

### `validate` - Validate Template

Validate template.json against the schema.

**Usage:**

```bash
make-template validate [options] [template-file]
```

**Options:**
- `--lint-file`: Specific template.json file to validate
- `--suggest`: Show improvement suggestions
- `--fix`: Automatically apply fixes where possible

### `hints` - Show Authoring Hints

Display available hints catalog for template authoring.

**Usage:**

```bash
make-template hints
```

### `test` - Test Template

Test templates by creating projects and validating functionality.

**Usage:**

```bash
make-template test [options] <template-path>
```

**Options:**
- `--verbose, -v`: Enable verbose test output
- `--keep-temp`: Preserve temporary test directories

## Registry System

The CLI supports a decentralized registry system for template discovery and organization. Unlike centralized registries that act as gatekeepers, this system allows users to define their own registries locally.

### How Registries Work

Registries are collections of templates organized by name. Each registry can contain multiple templates, and users can define multiple registries in their configuration.

**Registry Types:**
- **Local registries**: Templates stored on the local filesystem
- **Git registries**: Templates hosted in Git repositories  
- **HTTP registries**: Templates served via HTTP endpoints

### Registry Configuration

Registries are configured in `.m5nvrc` configuration files:

```json
{
  "registries": {
    "company": {
      "type": "git",
      "url": "https://github.com/company/templates.git"
    },
    "personal": {
      "type": "local", 
      "path": "~/my-templates"
    }
  }
}
```

### Using Registries

Once configured, registries enable shorthand template references:

```bash
# List all templates in a registry
create-scaffold list --registry company

# Use a template from a registry
create-scaffold new my-app --template react-app --registry company

# Get info about a template in a registry
create-scaffold info react-app --registry company
```

### Built-in Registries

The CLI includes built-in registry support that doesn't require configuration:

- **Git URLs**: Direct Git repository references work automatically
- **Local paths**: File system paths work automatically
- **HTTP URLs**: Web-hosted templates work automatically

### Registry Discovery Order

When resolving templates, the CLI searches in this order:

1. Explicit `--registry` option
2. Default registry from configuration
3. Built-in registries (git URLs, local paths, HTTP URLs)

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

*Not required when using `--list-templates` or `--help`

## Configuration Defaults

The CLI can preload defaults from configuration files so teams avoid repeating flags for repository, branch, author metadata, and placeholder values.

### Discovery order

1. `CREATE_SCAFFOLD_CONFIG_PATH` (environment override) when set.
2. Project-level `.m5nvrc` in the current working directory.
3. User config: `~/.m5nv/rc.json` (macOS/Linux) or `%APPDATA%/m5nv/rc.json` (Windows).

Discovery stops at the first file found unless `CREATE_SCAFFOLD_CONFIG_PATH` points elsewhere. Use `--no-config` to bypass discovery entirely.

### File format

Configuration files must be UTF-8 JSON objects with the following optional fields:

```json
{
  "repo": "owner/templates",
  "branch": "main",
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

- `repo`: default template repository (user/repo shorthand, URL, or local path).
- `branch`: optional git branch.
- `author`: optional metadata surfaced to setup scripts and logs (values are not printed).
- `placeholders`: map of placeholder tokens to default values (same syntax as `--placeholder`).

### Precedence

1. CLI flags (`--branch`, `--placeholder`, etc.).
2. URL parameters in template URLs (e.g., `?options=typescript&branch=main`).
3. Environment variables (e.g. `CREATE_SCAFFOLD_PLACEHOLDER_<TOKEN>`).
4. Configuration defaults from `.m5nvrc`.
5. Template-declared defaults.

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

### Template Options Customization

```bash
# Create project with template options via CLI flag
npm create @m5nv/scaffold my-app -- --template react --options "typescript,testing"
# Or specify options directly in the template URL
npm create @m5nv/scaffold my-app -- --template react?options=typescript,testing
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

## Template URL Formats

Templates can be specified in multiple formats:

| Format | Example | Description |
|--------|---------|-------------|
| Registry shorthand | `favorites/react-vite` | Template from configured registry |
| GitHub shorthand | `user/repo/template` | GitHub repo with subpath |
| Full URL | `https://github.com/user/repo` | Complete repository URL |
| Local path | `./my-templates/react` | Local directory path |
| URL with options | `user/repo?options=typescript&branch=main` | URL with query parameters |
| HTTPS URL | `https://github.com/user/repo.git` | Full GitHub HTTPS URL |
| SSH URL | `git@github.com:user/repo.git` | SSH URL (requires SSH keys) |
| Local path | `/path/to/local/repo` | Local git repository |
| Relative path | `./local-repo` | Relative path to local repository |

## Dimensions and options

`--options` accepts a comma-separated list. Use `dimension=value` to target a specific dimension; join multiple values for the same dimension with `+` (for example `capabilities=auth+testing`). Tokens without `=` apply to the template's default multi-select dimension, typically `capabilities`.

Options can also be specified directly in template URLs using query parameters:

```bash
# CLI flag approach
npm create @m5nv/scaffold my-app -- --template react --options "typescript,testing"

# URL parameter approach
npm create @m5nv/scaffold my-app -- --template react?options=typescript,testing
```

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
      "infrastructure": {
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

**Current Version**: 0.5.0

See [CHANGELOG.md](../../CHANGELOG.md) for detailed version history.
