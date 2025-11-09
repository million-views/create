---
title: "CLI Reference"
type: "reference"
audience: "all"
estimated_time: "N/A (reference)"
prerequisites: []
related_docs:
  - "../how-to/creating-templates.md"
  - "../tutorial/getting-started.md"
  - "../tutorial/first-template.md"
  - "../how-to/setup-recipes.md"
  - "environment.md"
  - "error-codes.md"
last_updated: "2025-11-01"
---

# CLI Reference

## Overview

Complete reference for the `@m5nv/create-scaffold` command-line interface. This tool scaffolds new projects using templates from git repositories.

Use `--validate-template <directory>` to lint templates without running the scaffolding pipeline. Combine it with `--json` for machine-readable output.

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

## Syntax

```bash
# Using npm create (recommended)
npm create @m5nv/scaffold <project-directory> -- --from-template <template-name> [options]

# Using npx
npx @m5nv/create-scaffold@latest <project-directory> --from-template <template-name> [options]

# Global installation
create-scaffold <project-directory> --from-template <template-name> [options]
```

### Interactive entry

- `npm create @m5nv/scaffold` (no positional arguments) automatically launches
  the interactive session when run in a TTY.
- `npm create @m5nv/scaffold -- --interactive` forces the interactive prompts
  even when positional arguments are provided.
- Set `CREATE_SCAFFOLD_FORCE_INTERACTIVE=1` to opt in globally; use
  `CREATE_SCAFFOLD_NO_INTERACTIVE=1` or `--no-interactive` to disable.

## Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `<project-directory>` | string | Yes* | Name of the directory to create for your project. Must contain only letters, numbers, hyphens, and underscores. Cannot start with a dot or contain path separators. |

*Not required when using `--list-templates` or `--help`

## Core Options

| Option | Short | Type | Required | Default | Description |
|--------|-------|------|----------|---------|-------------|
| `--from-template` | `-t` | string | Yes* | - | Template name to use for scaffolding. Must contain only letters, numbers, hyphens, underscores, and forward slashes for nested templates. |
| `--repo` | `-r` | string | No | `million-views/templates` | Repository URL or user/repo format. Supports GitHub URLs, local paths, or user/repo shorthand. |
| `--branch` | `-b` | string | No | `main/master` | Git branch to use. Must follow git branch naming rules. |

*Not required when using `--list-templates` or `--help`

## Customization Options

| Option | Short | Type | Required | Default | Description |
|--------|-------|------|----------|---------|-------------|
| `--ide` | `-i` | string | No | - | Target IDE for template customization. Supported values: `kiro`, `vscode`, `cursor`, `windsurf`. |
| `--options` | `-o` | string | No | - | Comma-separated selections. Use `dimension=value` (e.g. `capabilities=auth+testing`) to target specific dimensions. Tokens without `=` apply to the template’s default multi-select dimension. |

## Placeholder Input Options *(experimental)*

| Option | Short | Type | Required | Default | Description |
|--------|-------|------|----------|---------|-------------|
| `--experimental-placeholder-prompts` | - | boolean | No | `false` | Opt in to interactive placeholder resolution for templates that declare `metadata.placeholders`. Without this flag the CLI skips prompting and ignores `--placeholder` overrides. |
| `--placeholder` | - | string | No | - | Provide placeholder overrides in `NAME=value` form. Repeat the flag to set multiple values. Tokens must match the placeholder names declared in the template (without braces). |
| `--no-input-prompts` | - | boolean | No | `false` | Fail immediately when required placeholders are missing instead of prompting. Useful for CI pipelines. |

> You can also supply placeholder values via environment variables: set `CREATE_SCAFFOLD_PLACEHOLDER_<TOKEN>=value` (uppercase token without braces). Combine environment variables with `--no-input-prompts` for fully non-interactive runs. Verbose mode (`--verbose`) prints a source summary showing how each placeholder was satisfied, masking sensitive entries.

### Canonical template variables

Templates can opt into CLI-provided placeholders by declaring canonical variables in `template.json`:

```json
{
  "metadata": {
    "variables": [
      { "name": "author" },
      { "name": "license" }
    ]
  }
}
```

- `author` maps to `{{AUTHOR}}` and is required by default. The CLI prompts for the author name (or reads flags/env) and surfaces the value via `ctx.inputs.AUTHOR` and `tools.inputs.AUTHOR`.
- `license` maps to `{{LICENSE}}`, defaults to `MIT`, and remains optional unless you set `required: true`.
- Use `overrides` to customize metadata without redefining the placeholder:

```json
{
  "metadata": {
    "variables": [
      {
        "name": "license",
        "overrides": {
          "description": "SPDX identifier for the project",
          "default": "Apache-2.0"
        }
      }
    ]
  }
}
```

Canonical variables merge with `metadata.placeholders`, so declaring both does not create duplicates. Unknown canonical names fail validation.

## Performance & Caching Options

| Option | Short | Type | Required | Default | Description |
|--------|-------|------|----------|---------|-------------|
| `--no-cache` | - | boolean | No | `false` | Bypass cache system and clone directly from remote. Use when you need the latest template version. |
| `--cache-ttl` | - | string | No | `24` | Override default cache TTL in hours (1-720). Higher values = less frequent updates, faster operations. |

## Debugging & Preview Options

| Option | Short | Type | Required | Default | Description |
|--------|-------|------|----------|---------|-------------|
| `--log-file` | - | string | No | - | Enable detailed logging to specified file. Logs git operations, file copies, and setup script execution. |
| `--dry-run` | - | boolean | No | `false` | Preview operations without executing them. Shows planned file operations and setup scripts. |
| `--list-templates` | - | boolean | No | `false` | Display available templates from repository. Fast discovery using cached repositories. |

## Validation Options

| Option | Short | Type | Required | Default | Description |
|--------|-------|------|----------|---------|-------------|
| `--validate-template` | - | string | No | - | Validate the template located at the provided path and exit without scaffolding. |
| `--json` | - | boolean | No | `false` | Emit JSON-formatted results. Only supported alongside `--validate-template`. |

## General Options

| Option | Short | Type | Required | Default | Description |
|--------|-------|------|----------|---------|-------------|
| `--help` | `-h` | boolean | No | `false` | Show help information and exit. |
| `--no-config` | - | boolean | No | `false` | Skip configuration file discovery (`.m5nvrc`). Useful when troubleshooting or forcing flag-only execution. |
| `--verbose` | - | boolean | No | `false` | Enable verbose CLI output, including placeholder resolution summaries and additional logging context. |

## Interaction Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--interactive` | boolean | `false` | Force interactive prompts even when project directory and template arguments are provided. |
| `--no-interactive` | boolean | `false` | Explicitly disable interactive mode (overrides automatic detection and environment flags). |

**Environment toggles**

- `CREATE_SCAFFOLD_FORCE_INTERACTIVE`: any truthy value forces interactive mode.
- `CREATE_SCAFFOLD_NO_INTERACTIVE`: any truthy value disables interactive mode.

Use these environment variables to opt in or out across shell sessions (for
example in onboarding scripts or CI smoke tests).

## Configuration Defaults

The CLI can preload defaults from configuration files so teams avoid repeating
flags for repository, branch, author metadata, and placeholder values.

### Discovery order

1. `CREATE_SCAFFOLD_CONFIG_PATH` (environment override) when set.
2. Project-level `.m5nvrc` in the current working directory.
3. User config: `~/.m5nv/rc.json` (macOS/Linux) or `%APPDATA%/m5nv/rc.json`
   (Windows).

Discovery stops at the first file found unless `CREATE_SCAFFOLD_CONFIG_PATH`
points elsewhere. Use `--no-config` to bypass discovery entirely.

### File format

Configuration files must be UTF-8 JSON objects with the following optional
fields:

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
- `author`: optional metadata surfaced to setup scripts and logs (values are not
  printed).
- `placeholders`: map of placeholder tokens to default values (same syntax as
  `--placeholder`).

### Precedence

1. CLI flags (`--repo`, `--branch`, `--placeholder`, etc.).
2. Environment variables (e.g. `CREATE_SCAFFOLD_PLACEHOLDER_<TOKEN>`).
3. Configuration defaults from `.m5nvrc`.
4. Template-declared defaults.

Verbose mode prints which configuration file was used and which fields were
applied, masking sensitive placeholder values. Errors reference the offending
path and suggest `--no-config` for bypassing corrupt files.

## Examples

### Basic Usage

```bash
# Create a new React project using the default repository
npm create @m5nv/scaffold my-app -- --from-template react
```

**Expected behavior:**
- Creates `my-app` directory
- Clones `million-views/templates` repository (cached)
- Copies `react` template to `my-app`
- Runs setup script if present

### Custom Repository

```bash
# Use a custom repository
npm create @m5nv/scaffold my-app -- --from-template nextjs --repo custom-user/templates
```

**Expected behavior:**
- Uses `custom-user/templates` repository instead of default
- Copies `nextjs` template from custom repository

### IDE & Options Customization

```bash
# Create project with IDE-specific customization
npm create @m5nv/scaffold my-app -- --from-template react --ide kiro

# Explicit capability selections (multi-select values joined with '+')
npm create @m5nv/scaffold my-app -- --from-template react --options capabilities=auth+testing

# Combine IDE, capabilities, and infrastructure dimensions
npm create @m5nv/scaffold my-app -- --from-template react --ide vscode --options "capabilities=full-featured,infrastructure=cloudflare-d1"
```

**Expected behavior:**
- Template receives IDE and options information
- Setup script can customize based on these parameters
- Different files/configurations may be included

### Template Discovery

```bash
# List available templates from default repository
npm create @m5nv/scaffold -- --list-templates

# List templates from custom repository
npm create @m5nv/scaffold -- --list-templates --repo user/templates

# List templates from specific branch
npm create @m5nv/scaffold -- --list-templates --repo user/templates --branch develop
```

**Expected output:**
```
📋 Discovering templates from user/templates (develop)...

Available Templates:
┌─────────────────┬──────────────────────────────────────────┐
│ Template        │ Description                              │
├─────────────────┼──────────────────────────────────────────┤
│ react           │ React application with modern tooling    │
│ nextjs          │ Next.js application with TypeScript     │
│ fastify         │ Fastify API server                       │
└─────────────────┴──────────────────────────────────────────┘
```

### Preview & Debugging

```bash
# Preview operations without executing (dry run)
npm create @m5nv/scaffold my-app -- --from-template react --dry-run

# Enable detailed logging for troubleshooting
npm create @m5nv/scaffold my-app -- --from-template react --log-file ./scaffold.log

# Combine dry run with logging
npm create @m5nv/scaffold my-app -- --from-template react --dry-run --log-file ./preview.log
```

**Dry run output:**
```
🔍 DRY RUN MODE - Preview of planned operations (no changes will be made)

📦 Template: react
🌐 Repository: user/templates
📁 Target Directory: my-app
🗂️ Template Path: ~/.m5nv/cache/XXXXXXXXXXXX/react

📄 Summary:
   • Directories: 2
   • Files: 5
   • Setup Scripts: 1

📋 File Copy (5 total):
   • ./ (2 files)
   • src/ (2 files)
   • public/ (1 file)

📁 Directory Creation (2 operations):
   📁 Ensure directory: src
   📁 Ensure directory: public

⚙️ Setup Script (1 operations):
   ⚙️ Execute setup script: _setup.mjs

📊 Total operations: 8
💡 Dry run only – no changes will be made.

🌲 Template structure (depth 2):
my-app
├── package.json
├── README.md
├── src
│   ├── index.js
│   └── utils.js
└── public
    └── index.html

✅ Dry run completed - no actual changes were made
```

When the `tree` command is unavailable, the CLI prints `🌲 Tree preview unavailable: tree command unavailable` instead of the directory listing.

### Template Validation

```bash
# Validate a local template directory with human-readable output
create-scaffold --validate-template ./templates/react-vite

# Produce JSON for CI pipelines
create-scaffold --validate-template ./templates/react-vite --json
```

**What happens:**
- Runs manifest, required-file, and setup-script validators against the target directory.
- Returns exit code `0` when all validators pass, `1` when any fail.
- Prints a summary table (or JSON payload when `--json` is supplied).

### Interactive Walkthrough

```bash
# Launch guided prompts with explicit flag
npm create @m5nv/scaffold -- --interactive

# Automatically enter interactive mode when no positional arguments are supplied
npm create @m5nv/scaffold
```

**What happens:**

- The CLI fetches the template catalog from the cache (cloning when necessary)
  and renders descriptions, tags, and canonical variables for each entry.
- You select the template by number, then provide the project directory name
  and optional overrides such as repository, branch, IDE, options, logging, and
  cache TTL.
- If experimental placeholder prompts are enabled during the session and the
  chosen template declares placeholders, the CLI resolves them interactively in
  sequence.
- Cancelling the session (Ctrl+C or typing `q`) exits without mutating the file
  system.

### Cache Management

```bash
# Bypass cache for fresh clone (slower but ensures latest version)
npm create @m5nv/scaffold my-app -- --from-template react --no-cache

# Set custom cache TTL (48 hours)
npm create @m5nv/scaffold my-app -- --from-template react --cache-ttl 48

# Force fresh template discovery
npm create @m5nv/scaffold -- --list-templates --no-cache
```

**Expected behavior:**
- `--no-cache`: Always clones fresh from remote
- `--cache-ttl`: Sets custom expiration time for cached repositories
- Cached repositories stored in `~/.m5nv/cache/`

### Using npx Directly

```bash
# Use latest version without npm create
npx @m5nv/create-scaffold@latest my-app --from-template react --repo user/templates
```

## Repository Formats

The `--repo` parameter accepts multiple formats:

| Format | Example | Description |
|--------|---------|-------------|
| GitHub shorthand | `user/repo` | Expands to `https://github.com/user/repo.git` |
| HTTPS URL | `https://github.com/user/repo.git` | Full GitHub HTTPS URL |
| SSH URL | `git@github.com:user/repo.git` | SSH URL (requires SSH keys) |
| Local path | `/path/to/local/repo` | Local git repository |
| Relative path | `./local-repo` | Relative path to local repository |

## Dimensions and options

`--options` accepts a comma-separated list. Use `dimension=value` to target a specific dimension; join multiple values for the same dimension with `+` (for example `capabilities=auth+testing`). Tokens without `=` apply to the template’s default multi-select dimension, typically `capabilities`.

Templates describe their vocabulary in `template.json` via `setup.dimensions`:

```json
{
  "name": "react-vite",
  "setup": {
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

### Project stage suggestions

| Option | Description |
|--------|-------------|
| `poc` | Proof of concept setup with minimal dependencies |
| `prototype` | Prototype development with rapid iteration focus |
| `mvp` | Minimum viable product with essential functionality only |
| `production` | Production-ready setup with full tooling |

### Environment context

| Option | Description |
|--------|-------------|
| `monorepo` | Part of a monorepo structure (affects paths, configs) |
| `standalone` | Standalone project (full independent setup) |
| `existing-project` | Adding to existing codebase (minimal conflicts) |

### Development preferences

| Option | Description |
|--------|-------------|
| `no-git` | Skip git initialization and related setup |
| `minimal` | Minimal dependencies and configuration |
| `full-featured` | Include all available functionality and tooling |
| `typescript` | TypeScript-focused configuration and dependencies |
| `testing` | Comprehensive test setup and utilities |
| `ci-ready` | Include CI/CD configuration files |
| `docs` | Generate documentation skeletons |
| `docker-ready` | Include Docker configuration and setup |

**Reminder:** Option names are template-defined. Always consult the template's
README or `template.json` for the authoritative list.

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

- **Execution Context:** Runs in your project directory
- **Environment:** Receives the [Environment](environment.md) object containing `{ ctx, tools }`
- **Cleanup:** Setup script is automatically removed after execution
- **Error Handling:** Failures are logged but don't stop project creation

## Post-create guidance

After scaffolding, the CLI prints a “Next steps” block:

- `cd <projectDir>` is always listed first.
- If the template’s `template.json` includes a `handoff` array of strings, each entry is rendered as a bullet.
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
