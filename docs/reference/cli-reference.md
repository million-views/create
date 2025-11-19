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
- `--json`: Output results in JSON format (supported by: `list`, `validate` commands)

<!-- AUTO-GENERATED: create-scaffold commands -->
## create-scaffold Commands

### `list` - List templates from a registry repository

Display templates from a registry repository.
By default, lists templates from the official million-views/templates registry.
Use --registry to specify a different repository URL or configured registry name.

Registries are Git repositories containing template directories.
Each template directory should contain project files like package.json, template.json, etc.
If a repository contains a single template, --template is not needed when using it.
If a repository contains multiple templates, --template specifies which directory to use.

**Usage:**

```bash
create-scaffold list [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--registry <name-or-url>` | Registry to list templates from Specify a registry by name (from .m5nvrc) or repository URL. If not specified, uses the default million-views/templates registry. Examples: --registry my-templates, --registry https://github.com/user/repo.git |
| `--format <format>` | Output format (table|json, default: table) Choose output format:   • table - Human-readable table format   • json  - Machine-readable JSON format |
| `--verbose` | Show detailed information |

**Examples:**

```bash
list
```
    List templates from default registry (million-views/templates)

```bash
list --registry https://github.com/user/templates.git
```
    List templates from a specific repository URL

```bash
list --registry my-templates
```
    List templates from a configured registry shortcut

```bash
list --format json
```
    Output template information in JSON format

```bash
list --verbose
```
    Show detailed template information including versions and authors

### `new` - Create a new project from a template

Creates a new project by cloning and configuring a template from a registry.
The command fetches the specified template, processes placeholders, and sets up a working project structure.

**Usage:**

```bash
create-scaffold new <project-name> --template <template-name> [options]
```

**Arguments:**
- `<project-name>`: Name of the directory to create for your project
- `<template-name>`: Template to use for project creation

**Options:**

| Option | Description |
|--------|-------------|
| **Required** | |
| `-T, --template <name>` | Template to use Template identifier from a configured registry. Can be specified as:   • Short name: react-app   • Full URL: https://github.com/user/template.git   • Registry path: official/react-app   • With branch: workshop/basic-react-spa#feature-branch |
| **Cache Options** | |
| `--no-cache` | Bypass cache system and clone directly Skip local cache and fetch template directly from source |
| `--cache-ttl <hours>` | Override default cache TTL Specify cache time-to-live in hours (default: 24) |
| **Placeholder Options** | |
| `--placeholder <NAME=value>` | Supply placeholder value Provide placeholder values in NAME=value format. Can be specified multiple times. |
| `--no-input-prompts` | Suppress prompts and non-essential output |
| **Configuration** | |
| `--no-config` | Skip loading user configuration |
| `--options <file>` | Path to options file for template configuration Load template configuration from a JSON file |
| **Operation Modes** | |
| `-d, --dry-run` | Preview changes without executing them |
| `--log-file <path>` | Enable detailed logging to specified file |

**Examples:**

```bash
new my-app --template react-app
```
    Create React app from template

```bash
new my-app --template workshop/basic-react-spa#feature-branch
```
    Use template from specific branch

```bash
new my-app --template react-app --placeholder NAME=MyApp
```
    Provide placeholder values

```bash
new my-app --template react-app --no-cache
```
    Skip cache and fetch fresh

```bash
npm create @m5nv/scaffold my-app --template react-app
```
    Use with npm create

```bash
npx @m5nv/create-scaffold new my-app --template react-app
```
    Use with npx

### `validate` - Validate template configuration

Validates a template directory or template.json file.
Checks for required fields, valid structure, and common issues.

**Usage:**

```bash
create-scaffold validate <template-path> [options]
```

**Arguments:**
- `<template-path>`: Path to the template directory to test

**Options:**

| Option | Description |
|--------|-------------|
| `--suggest` | Show intelligent fix suggestions Provide suggestions for fixing validation errors |
| `--fix` | Auto-apply safe fixes Automatically fix issues that can be safely corrected. Manual review recommended after automated fixes. |
| `--json` | Output results in JSON format Machine-readable output for automation |

**Examples:**

```bash
validate ./my-template
```
    Validate template in directory

```bash
validate ./template.json
```
    Validate template configuration file

```bash
validate ./my-template --suggest
```
    Get fix suggestions

```bash
validate ./my-template --fix
```
    Auto-fix safe issues
<!-- END AUTO-GENERATED: create-scaffold commands -->

<!-- AUTO-GENERATED: make-template commands -->
## make-template Commands

### `config init` - Initialize .templatize.json configuration file

Generate a default .templatize.json configuration file for templatization.
This file defines patterns for converting project content into reusable templates.
Run this command before using 'make-template convert' if no configuration exists.

**Usage:**

```bash
make-template config init [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Specify output file path Custom path for the configuration file. Defaults to ./.templatize.json |

**Examples:**

```bash
config init
```
    Generate default .templatize.json in current directory

```bash
config init --file custom-config.json
```
    Generate config with custom filename

### `config validate` - Validate .templatize.json configuration file

Check the .templatize.json configuration file for syntax and semantic errors.
Validates pattern definitions, file paths, and configuration structure.
Run this before conversion to catch configuration issues early.

**Usage:**

```bash
make-template config validate [config-file]
```

**Examples:**

```bash
config validate
```
    Validate default .templatize.json

```bash
config validate custom-config.json
```
    Validate specific configuration file

### `convert` - Convert project to template using configurable patterns

Convert an existing project into a reusable template using configurable templatization patterns.

The conversion process:
  1. Reads templatization rules from .templatize.json (created by 'make-template init')
  2. Replaces project-specific values with placeholders using specified format
  3. Creates .template-undo.json for restoration capabilities
  4. Generates/updates template.json with detected placeholders

Requires a .templatize.json configuration file to specify which content to replace with placeholders.
Use 'npx make-template init' to generate a default configuration file.
Always specify the project path explicitly to avoid accidental conversion.

**Usage:**

```bash
make-template convert <project-path> [options]
```

**Arguments:**
- `<project-path>`: Path to the project directory to convert

**Options:**

| Option | Description |
|--------|-------------|
| **Configuration** | |
| `--config <file>` | Use specific configuration file Specify custom .templatize.json file path. Defaults to ./.templatize.json in project directory. |
| **Templatization Options** | |
| `--placeholder-format <format>` | Specify placeholder format Choose placeholder style for replacements:   • mustache - {{PLACEHOLDER}} (default, works everywhere)   • dollar   - $PLACEHOLDER$ (avoids conflicts with template literals)   • percent  - %PLACEHOLDER% (avoids conflicts with CSS/custom syntax)   • unicode  - ⦃PLACEHOLDER⦄ (React-friendly, avoids JSX conflicts) |
| **Operation Modes** | |
| `-d, --dry-run` | Preview changes without executing them |
| `--yes` | Skip confirmation prompts |
| `--silent` | Suppress prompts and non-essential output |
| **Security** | |
| `--sanitize-undo` | Remove sensitive data from undo log Prevents sensitive data from being stored in restoration logs |

**Examples:**

```bash
convert ./my-project
```
    Convert project using existing or default config

```bash
convert ./my-project --dry-run
```
    Preview templatization changes

```bash
convert ./my-project --config custom-config.json --yes
```
    Use custom config file and skip prompts

```bash
convert ./my-project --placeholder-format dollar
```
    Use $PLACEHOLDER format for replacements

```bash
convert ./my-project --placeholder-format unicode
```
    Use ⦃PLACEHOLDER⦄ format for React compatibility

For configuration management:
  • make-template config init - Generate .templatize.json
  • make-template config validate - Validate configuration

For detailed configuration options, see:
  • docs/how-to/templatization-configuration.md
  • docs/reference/templatization-patterns.md

### `hints` - Show hints catalog

Display catalog of available hints for template creation.
Provides guidance on best practices and common patterns.

**Usage:**

```bash
make-template hints [options]
```

**Examples:**

```bash
hints
```
    Show all available hints

### `init` - Generate skeleton template.json

Creates a skeleton template.json file with common fields.
Useful for starting a new template from scratch.
Must be run inside the project directory you want to templatize.

**Usage:**

```bash
make-template init [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Specify output file path (default: template.json) Custom path for the generated template configuration |

**Examples:**

```bash
init
```
    Generate template.json in current directory

```bash
init --file my-template.json
```
    Generate with custom filename

### `restore` - Restore template to project

Restore a template back to a working project state.
Replaces placeholders with actual values and restores project structure.

**Usage:**

```bash
make-template restore <project-path> [options]
```

**Arguments:**
- `<project-path>`: Path to the project directory to convert

**Options:**

| Option | Description |
|--------|-------------|
| **Restore Scope** | |
| `--files <files>` | Restore only specified files (comma-separated) Comma-separated list of file paths to restore |
| `--placeholders-only` | Restore only placeholder values, keep template structure Useful for refreshing placeholder values without affecting template files |
| **Configuration** | |
| `--generate-defaults` | Generate .restore-defaults.json configuration Creates a configuration file for default restoration values |
| **Operation Modes** | |
| `-d, --dry-run` | Preview changes without executing them |
| `--yes` | Skip confirmation prompts |

**Examples:**

```bash
restore ./my-template
```
    Restore template to working state

```bash
restore ./my-template --dry-run
```
    Preview restoration

```bash
restore ./my-template --files package.json,src/index.js
```
    Restore specific files

```bash
restore ./my-template --placeholders-only
```
    Only restore placeholder values

### `test` - Test template functionality

Test templates by creating projects and validating functionality.

The testing process:
  • Creates a temporary project from the template
  • Validates template.json structure and metadata
  • Tests placeholder resolution and restoration
  • Verifies setup scripts execute correctly
  • Cleans up temporary files (unless --keep-temp specified)

Use --verbose for detailed output during testing phases.

**Usage:**

```bash
make-template test <template-path> [options]
```

**Arguments:**
- `<template-path>`: Path to the template directory to test

**Options:**

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed test output |
| `--keep-temp` | Preserve temporary directories after testing |

**Examples:**

```bash
test ./my-template
```
    Test template functionality

```bash
test ./my-template --verbose
```
    Test with detailed output

### `validate` - Validate template.json

Validates template.json in the current directory.
Checks for required fields, valid structure, and common issues.

**Usage:**

```bash
make-template validate [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Specify input file path Custom path to configuration file |
| `--suggest` | Show intelligent fix suggestions Provide suggestions for fixing validation errors |
| `--fix` | Auto-apply safe fixes Automatically fix issues that can be safely corrected. Manual review recommended after automated fixes. |

**Examples:**

```bash
validate template.json
```
    Validate template.json in current directory

```bash
validate --file my-template.json
```
    Validate specific file

```bash
validate --file template.json --suggest
```
    Get fix suggestions

```bash
validate --file template.json --fix
```
    Auto-fix safe issues
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
