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
last_updated: "2025-11-12"
---

# CLI Reference

Complete command reference for `@m5nv/create-scaffold` and `@m5nv/make-template`.

## Overview

Complete reference for the `@m5nv/create-scaffold` command-line interface. This package provides two complementary tools: `create-scaffold` for scaffolding new projects from templates, and `make-template` for converting existing projects into reusable templates.

The `@m5nv/create` ecosystem provides two CLI tools:

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

1. CLI flags (`--repo`, `--branch`, `--placeholder`, etc.).
2. Environment variables (e.g. `CREATE_SCAFFOLD_PLACEHOLDER_<TOKEN>`).
3. Configuration defaults from `.m5nvrc`.
4. Template-declared defaults.

Verbose mode prints which configuration file was used and which fields were applied, masking sensitive placeholder values. Errors reference the offending path and suggest `--no-config` for bypassing corrupt files.

## Examples

### Basic Usage

```bash
# Create a new React project
npm create @m5nv/scaffold my-app -- --template react-vite
```

### Custom Repository

```bash
# Use a custom repository
npm create @m5nv/scaffold my-app -- --template nextjs --repo custom-user/templates
```

### Template Options Customization

```bash
# Create project with template options
npm create @m5nv/scaffold my-app -- --template react --options "typescript,testing"
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

`--options` accepts a comma-separated list. Use `dimension=value` to target a specific dimension; join multiple values for the same dimension with `+` (for example `capabilities=auth+testing`). Tokens without `=` apply to the template's default multi-select dimension, typically `capabilities`.

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

# CLI Reference

Complete command reference for `@m5nv/create-scaffold` and `@m5nv/make-template`.

## Overview

## Overview

Complete reference for the `@m5nv/create-scaffold` command-line interface. This package provides two complementary tools: `create-scaffold` for scaffolding new projects from templates, and `make-template` for converting existing projects into reusable templates.

The `@m5nv/create` ecosystem provides two CLI tools:

## Tools

- **`create-scaffold`**: Scaffolds new projects from templates

- **`make-template`**: Converts projects to templates and back### create-scaffold



Both tools use command-based interfaces and support progressive disclosure help.Scaffolds new projects from git-based templates.



---```bash

# Using npm create (recommended)

## create-scaffoldnpm create @m5nv/scaffold <project-directory> -- --template <template-name> [options]



Scaffolds new projects from git-based templates with intelligent validation and guided workflows.# Using npx with command syntax

npx @m5nv/create-scaffold new <project-directory> --template <template-name> [options]

### Installation

# Global installation

```bashcreate-scaffold new <project-directory> --template <template-name> [options]

# Global installation```

npm install -g @m5nv/create-scaffold

### make-template

# One-time usage

npm create @m5nv/scaffoldConverts existing Node.js projects into reusable templates.

npx @m5nv/create-scaffold

``````bash

# Convert project to template

### Basic Usagemake-template convert [options]



```bash# Restore templated project

# Using npm create (recommended)make-template restore [options]

npm create @m5nv/scaffold <project-name> -- --template <template>

# Initialize template.json

# Using npxmake-template init [options]

npx @m5nv/create-scaffold new <project-name> --template <template>

# Validate template

# Global installationmake-template validate [options]

create-scaffold new <project-name> --template <template>

```# Show authoring hints

make-template hints

---

# Test template end-to-end

## create-scaffold Commandsmake-template test <template-path> [options]

```

### `new` - Create New Project

## Template manifest schema

Create a new project from a template.

@m5nv/create-scaffold publishes its canonical `template.json` contract so automation and editors stay aligned with the CLI:

**Usage:**

```bash- `@m5nv/create-scaffold/schema/template.json` – latest stable schema (currently `template.v1.json`).

create-scaffold new <project-directory> --template <template> [options]- `@m5nv/create-scaffold/schema/template.v1.json` – immutable versioned schema.

```- `@m5nv/create-scaffold/types/template-schema` – TypeScript declarations for programmatic tooling.



**Arguments:**Add the schema to your editor configuration to surface validation and completions:

- `<project-directory>` - Name of directory to create for your project

```json

**Required Options:**// .vscode/settings.json

- `--template, -T <template>` - Template URL or shorthand{

  - Registry shortcut: `favorites/react-spa`  "json.schemas": [

  - GitHub URL: `github.com/owner/repo`    {

  - Local path: `./my-template`      "fileMatch": ["template.json"],

      "url": "./node_modules/@m5nv/create-scaffold/schema/template.json"

**Optional Options:**    }

- `--branch, -b <branch>` - Git branch to use (default: `main`)  ]

- `--options <options>` - Comma-separated template options}

- `--dry-run` - Preview operations without executing```

- `--no-cache` - Bypass cache and clone fresh

- `--cache-ttl <hours>` - Override cache TTL (1-720 hours)TypeScript utilities can import the generated types directly:

- `--log-file <path>` - Write detailed logs to file

- `--verbose` - Enable verbose output```ts

import type { TemplateManifest } from '@m5nv/create-scaffold/types/template-schema';

**Examples:**```

```bash

# Basic usageCLI contributors should run `npm run schema:build` after editing the schema and rely on `npm run schema:check` (already wired into `npm run validate`) to detect drift.

create-scaffold new my-app --template react-vite

## Arguments

# From GitHub

create-scaffold new my-app --template github.com/owner/repo| Argument | Type | Required | Description |

|----------|------|----------|-------------|

# With options| `<project-directory>` | string | Yes* | Name of the directory to create for your project. Must contain only letters, numbers, hyphens, and underscores. Cannot start with a dot or contain path separators. |

create-scaffold new my-app --template react-vite --options "typescript,testing"

*Not required when using `--list-templates` or `--help`

# Dry run

create-scaffold new my-app --template react-vite --dry-run## Commands



# Bypass cache### new

create-scaffold new my-app --template react-vite --no-cache

```Create a new project from a template.



### `list` - List Templates```bash

create-scaffold new <project-directory> --template <template-name> [options]

List available templates from configured registries.```



**Usage:****Arguments:**

```bash- `<project-directory>`: Name of the directory to create for your project

create-scaffold list [options]

```**Options:**

- `--template, -T`: Template URL or shorthand (required)

**Options:**- `--branch, -b`: Git branch to use

- `--registry <name>` - List templates from specific registry- `--options`: Contextual options for template customization

- `--json` - Output in JSON format- `--dry-run`: Preview operations without executing them

- `--log-file`: Write structured logs to specified file

**Examples:**- `--no-cache`: Bypass the local repository cache

```bash- `--cache-ttl`: Override cache TTL in hours

# List all registries- `--verbose`: Enable verbose logging

create-scaffold list

### list

# List from specific registry

create-scaffold list --registry officialList available templates and registries.



# JSON output```bash

create-scaffold list --jsoncreate-scaffold list [options]

``````



### `info` - Template Information**Options:**

- `--registry`: Registry name to list templates from

Show detailed information about a template.- `--json`: Emit JSON-formatted results



**Usage:**### info

```bash

create-scaffold info <template> [options]Show detailed information about a template.

```

```bash

**Arguments:**create-scaffold info <template-name> [options]

- `<template>` - Template name or URL```



**Options:****Arguments:**

- `--registry <name>` - Registry to search in- `<template-name>`: Name of the template to get information about

- `--json` - Output in JSON format

**Options:**

**Examples:**- `--registry`: Registry to search in

```bash

# Get template info### validate

create-scaffold info react-vite

Validate a template directory.

# From specific registry

create-scaffold info react-spa --registry favorites```bash

create-scaffold validate <template-path> [options]

# JSON output```

create-scaffold info react-vite --json

```**Arguments:**

- `<template-path>`: Path to the template directory to validate

### `validate` - Validate Template

**Options:**

Validate a template directory structure and schema.- `--json`: Emit JSON-formatted results

| `--no-interactive` | boolean | `false` | Explicitly disable interactive mode (overrides automatic detection and environment flags). |

**Usage:**

```bash**Environment toggles**

create-scaffold validate <template-path> [options]

```- `CREATE_SCAFFOLD_FORCE_INTERACTIVE`: any truthy value forces interactive mode.

- `CREATE_SCAFFOLD_NO_INTERACTIVE`: any truthy value disables interactive mode.

**Arguments:**

- `<template-path>` - Path to template directoryUse these environment variables to opt in or out across shell sessions (for

example in onboarding scripts or CI smoke tests).

**Options:**

- `--json` - Output results in JSON format## Configuration Defaults



**Examples:**The CLI can preload defaults from configuration files so teams avoid repeating

```bashflags for repository, branch, author metadata, and placeholder values.

# Validate template

create-scaffold validate ./my-template### Discovery order



# JSON output1. `CREATE_SCAFFOLD_CONFIG_PATH` (environment override) when set.

create-scaffold validate ./my-template --json2. Project-level `.m5nvrc` in the current working directory.

```3. User config: `~/.m5nv/rc.json` (macOS/Linux) or `%APPDATA%/m5nv/rc.json`

   (Windows).

---

Discovery stops at the first file found unless `CREATE_SCAFFOLD_CONFIG_PATH`

## create-scaffold Global Optionspoints elsewhere. Use `--no-config` to bypass discovery entirely.



These options work with all commands:### File format



| Option | Description |Configuration files must be UTF-8 JSON objects with the following optional

|--------|-------------|fields:

| `-h, --help` | Show help information |

| `--help-intermediate` | Show intermediate help with additional options |```json

| `--help-advanced` | Show advanced help with all options |{

| `--help-interactive` | Launch interactive help mode |  "repo": "owner/templates",

| `-v, --version` | Show version information |  "branch": "main",

| `--verbose` | Enable verbose logging |  "author": {

| `--no-config` | Disable configuration file discovery |    "name": "Example Dev",

| `--log-file <path>` | Write logs to specified file |    "email": "dev@example.com",

    "url": "https://example.com"

---  },

  "placeholders": {

## make-template    "PROJECT_NAME": "demo-app",

    "API_TOKEN": "example-token"

Converts Node.js projects into reusable templates compatible with `create-scaffold`.  }

}

### Installation```



```bash- `repo`: default template repository (user/repo shorthand, URL, or local path).

# Global installation- `branch`: optional git branch.

npm install -g @m5nv/make-template- `author`: optional metadata surfaced to setup scripts and logs (values are not

  printed).

# One-time usage- `placeholders`: map of placeholder tokens to default values (same syntax as

npx @m5nv/make-template  `--placeholder`).

```

### Precedence

### Basic Usage

1. CLI flags (`--repo`, `--branch`, `--placeholder`, etc.).

```bash2. Environment variables (e.g. `CREATE_SCAFFOLD_PLACEHOLDER_<TOKEN>`).

# Global installation3. Configuration defaults from `.m5nvrc`.

make-template <command> [options]4. Template-declared defaults.



# One-time usageVerbose mode prints which configuration file was used and which fields were

npx @m5nv/make-template <command> [options]applied, masking sensitive placeholder values. Errors reference the offending

```path and suggest `--no-config` for bypassing corrupt files.



---## Examples



## make-template Commands### Basic Usage



### `convert` - Convert to Template```bash

# Create a new React project using the default repository

Convert an existing project into a reusable template.npm create @m5nv/scaffold my-app -- --template react

```

**Usage:**

```bash**Expected behavior:**

make-template convert [options]- Creates `my-app` directory

```- Clones `million-views/templates` repository (cached)

- Copies `react` template to `my-app`

**Options:**- Runs setup script if present

- `--dry-run` - Preview changes without executing

- `--type <type>` - Force specific project type detection### Custom Repository

- `--yes, -y` - Skip confirmation prompts

- `--placeholder-format <format>` - Placeholder format (default: `{{TOKEN}}`)```bash

- `--silent` - Suppress non-error output# Use a custom repository

npm create @m5nv/scaffold my-app -- --template nextjs --repo custom-user/templates

**Project Types:**```

- `vite-react` - Vite + React project

- `next` - Next.js project**Expected behavior:**

- `remix` - Remix project- Uses `custom-user/templates` repository instead of default

- `express` - Express.js API- Copies `nextjs` template from custom repository

- `cli` - CLI tool

- `library` - JavaScript/TypeScript library### Template Options Customization



**Examples:**```bash

```bash# Create project with template options

# Convert current projectnpm create @m5nv/scaffold my-app -- --template react --options "typescript,testing"

make-template convert

# Explicit option selections

# Preview conversionnpm create @m5nv/scaffold my-app -- --template react --options "capabilities=auth+testing"

make-template convert --dry-run```



# Force project type**Expected behavior:**

make-template convert --type vite-react- Template receives options information

- Setup script can customize based on these parameters

# Skip confirmations- Different files/configurations may be included

make-template convert --yes

### Template Discovery

# Custom placeholder format

make-template convert --placeholder-format __TOKEN__```bash

```# List available templates from default repository

npm create @m5nv/scaffold -- --list-templates

**What Happens:**

1. Analyzes project structure and detects type# List templates from custom repository

2. Identifies templatable values (names, versions, etc.)npm create @m5nv/scaffold -- --list-templates --repo user/templates

3. Converts values to placeholders

4. Generates `template.json` with schema V1.0# List templates from specific branch

5. Creates `.template-undo.json` for restorationnpm create @m5nv/scaffold -- --list-templates --repo user/templates --branch develop

```

### `restore` - Restore to Project

**Expected output:**

Restore a template back to a working project.```

📋 Discovering templates from user/templates (develop)...

**Usage:**

```bashAvailable Templates:

make-template restore [options]┌─────────────────┬──────────────────────────────────────────┐

```│ Template        │ Description                              │

├─────────────────┼──────────────────────────────────────────┤

**Options:**│ react           │ React application with modern tooling    │

- `--dry-run` - Preview changes without executing│ nextjs          │ Next.js application with TypeScript     │

- `--yes, -y` - Skip confirmation prompts│ fastify         │ Fastify API server                       │

- `--restore-files <files>` - Restore only specific files (comma-separated)└─────────────────┴──────────────────────────────────────────┘

- `--restore-placeholders` - Restore only placeholders, keep template.json```



**Examples:**### Preview & Debugging

```bash

# Restore template```bash

make-template restore# Preview operations without executing (dry run)

npm create @m5nv/scaffold my-app -- --template react --dry-run

# Preview restoration

make-template restore --dry-run# Enable detailed logging for troubleshooting

npm create @m5nv/scaffold my-app -- --template react --log-file ./scaffold.log

# Restore specific files

make-template restore --restore-files "package.json,README.md"# Combine dry run with logging

npm create @m5nv/scaffold my-app -- --template react --dry-run --log-file ./preview.log

# Keep template.json```

make-template restore --restore-placeholders

**Dry run output:**

# Skip confirmations```

make-template restore --yes🔍 DRY RUN MODE - Preview of planned operations (no changes will be made)

```

📦 Template: react

**What Happens:**🌐 Repository: user/templates

1. Reads `.template-undo.json` restoration data📁 Target Directory: my-app

2. Converts placeholders back to original values🗂️ Template Path: ~/.m5nv/cache/XXXXXXXXXXXX/react

3. Restores project-specific metadata

4. Removes template artifacts (optional)📄 Summary:

   • Directories: 2

### `init` - Initialize Template   • Files: 5

   • Setup Scripts: 1

Generate a skeleton `template.json` for manual authoring.

📋 File Copy (5 total):

**Usage:**   • ./ (2 files)

```bash   • src/ (2 files)

make-template init [options]   • public/ (1 file)

```

📁 Directory Creation (2 operations):

**Options:**   📁 Ensure directory: src

- `--force, -f` - Overwrite existing template.json   📁 Ensure directory: public



**Examples:**⚙️ Setup Script (1 operations):

```bash   ⚙️ Execute setup script: _setup.mjs

# Generate skeleton

make-template init📊 Total operations: 8

💡 Dry run only – no changes will be made.

# Overwrite existing

make-template init --force🌲 Template structure (depth 2):

```my-app

├── package.json

**Generated Structure:**├── README.md

```json├── src

{│   ├── index.js

  "schemaVersion": "1.0.0",│   └── utils.js

  "metadata": {└── public

    "name": "",    └── index.html

    "description": "",

    "author": {✅ Dry run completed - no actual changes were made

      "name": "",```

      "email": ""

    },When the `tree` command is unavailable, the CLI prints `🌲 Tree preview unavailable: tree command unavailable` instead of the directory listing.

    "constants": {},

    "dimensions": {}### Template Validation

  }

}```bash

```# Validate a local template directory with human-readable output

create-scaffold --validate-template ./templates/react-vite

### `validate` - Validate Template

# Produce JSON for CI pipelines

Validate `template.json` against schema V1.0.create-scaffold --validate-template ./templates/react-vite --json

```

**Usage:**

```bash**What happens:**

make-template validate [options]- Runs manifest, required-file, and setup-script validators against the target directory.

```- Returns exit code `0` when all validators pass, `1` when any fail.

- Prints a summary table (or JSON payload when `--json` is supplied).

**Options:**

- `--suggest` - Show intelligent fix suggestions### Interactive Walkthrough

- `--fix` - Auto-apply safe fixes

- `--json` - Output in JSON format```bash

# Launch guided prompts with explicit flag

**Examples:**npm create @m5nv/scaffold -- --interactive

```bash

# Validate template# Automatically enter interactive mode when no positional arguments are supplied

make-template validatenpm create @m5nv/scaffold

```

# Get fix suggestions

make-template validate --suggest**What happens:**



# Auto-fix common issues- The CLI fetches the template catalog from the cache (cloning when necessary)

make-template validate --fix  and renders descriptions, tags, and canonical variables for each entry.

- You select the template by number, then provide the project directory name

# JSON output  and optional overrides such as repository, branch, IDE, options, logging, and

make-template validate --json  cache TTL.

```- If experimental placeholder prompts are enabled during the session and the

  chosen template declares placeholders, the CLI resolves them interactively in

**Validation Checks:**  sequence.

- Schema version compliance- Cancelling the session (Ctrl+C or typing `q`) exits without mutating the file

- Required fields presence  system.

- Dimension structure validity

- Platform gates (compat) correctness### Cache Management

- Feature specifications (needs) validity

- Constants structure```bash

- Setup script presence# Bypass cache for fresh clone (slower but ensures latest version)

npm create @m5nv/scaffold my-app -- --template react --no-cache

### `hints` - Show Authoring Hints

# Set custom cache TTL (48 hours)

Display catalog of authoring hints and best practices.npm create @m5nv/scaffold my-app -- --template react --cache-ttl 48



**Usage:**# Force fresh template discovery

```bashnpm create @m5nv/scaffold -- --list-templates --no-cache

make-template hints [options]```

```

**Expected behavior:**

**Options:**- `--no-cache`: Always clones fresh from remote

- `--category <category>` - Show specific category- `--cache-ttl`: Sets custom expiration time for cached repositories

  - `dimensions` - Dimension authoring hints- Cached repositories stored in `~/.m5nv/cache/`

  - `gates` - Platform gate configuration

  - `needs` - Feature requirement specifications### Using npx Directly

  - `setup` - Setup script patterns

```bash

**Examples:**# Use latest version without npm create

```bashnpx @m5nv/create-scaffold@latest my-app --template react --repo user/templates

# Show all hints```

make-template hints

## Repository Formats

# Specific category

make-template hints --category dimensionsThe `--repo` parameter accepts multiple formats:

make-template hints --category gates

```| Format | Example | Description |

|--------|---------|-------------|

### `test` - Test Template| GitHub shorthand | `user/repo` | Expands to `https://github.com/user/repo.git` |

| HTTPS URL | `https://github.com/user/repo.git` | Full GitHub HTTPS URL |

Test template end-to-end by creating a project from it.| SSH URL | `git@github.com:user/repo.git` | SSH URL (requires SSH keys) |

| Local path | `/path/to/local/repo` | Local git repository |

**Usage:**| Relative path | `./local-repo` | Relative path to local repository |

```bash

make-template test <template-path> [options]## Dimensions and options

```

`--options` accepts a comma-separated list. Use `dimension=value` to target a specific dimension; join multiple values for the same dimension with `+` (for example `capabilities=auth+testing`). Tokens without `=` apply to the template’s default multi-select dimension, typically `capabilities`.

**Arguments:**

- `<template-path>` - Path to template directoryTemplates describe their vocabulary in `template.json` via `metadata.dimensions`:



**Options:**```json

- `--output <dir>` - Test project output directory (default: `./tmp/test-*`){

- `--cleanup` - Remove test project after success  "name": "react-vite",

- `--verbose` - Show detailed test output  "setup": {

    "dimensions": {

**Examples:**      "capabilities": {

```bash        "type": "multi",

# Test template        "values": ["auth", "testing", "docs"],

make-template test .        "default": ["logging"],

        "requires": {

# Custom output directory          "testing": ["auth"]

make-template test . --output ./test-output        },

        "conflicts": {

# Cleanup after success          "docs": ["testing"]

make-template test . --cleanup        }

```      },

      "infrastructure": {

---        "type": "single",

        "values": ["none", "cloudflare-d1", "cloudflare-turso"],

## make-template Global Options        "default": "none"

      }

| Option | Description |    }

|--------|-------------|  }

| `-h, --help` | Show help information |}

| `--help-intermediate` | Show intermediate help |```

| `--help-advanced` | Show advanced help |

| `-v, --version` | Show version information |create-scaffold normalizes user selections against this metadata, applies defaults, and exposes the result through `ctx.options.byDimension` and `tools.options` helpers.



---### Project stage suggestions



## Configuration File| Option | Description |

|--------|-------------|

Both tools support a shared configuration file: `~/.m5nvrc`| `poc` | Proof of concept setup with minimal dependencies |

| `prototype` | Prototype development with rapid iteration focus |

### Configuration Structure| `mvp` | Minimum viable product with essential functionality only |

| `production` | Production-ready setup with full tooling |

```json

{### Environment context

  "registries": {

    "official": {| Option | Description |

      "url": "git@github.com:million-views/templates.git",|--------|-------------|

      "branch": "main"| `monorepo` | Part of a monorepo structure (affects paths, configs) |

    },| `standalone` | Standalone project (full independent setup) |

    "favorites": {| `existing-project` | Adding to existing codebase (minimal conflicts) |

      "url": "git@github.com:myuser/templates.git",

      "branch": "main"### Development preferences

    },

    "company": {| Option | Description |

      "url": "git@github.com:company/templates.git",|--------|-------------|

      "branch": "main"| `no-git` | Skip git initialization and related setup |

    }| `minimal` | Minimal dependencies and configuration |

  },| `full-featured` | Include all available functionality and tooling |

  "author": {| `typescript` | TypeScript-focused configuration and dependencies |

    "name": "Your Name",| `testing` | Comprehensive test setup and utilities |

    "email": "your.email@example.com"| `ci-ready` | Include CI/CD configuration files |

  },| `docs` | Generate documentation skeletons |

  "defaults": {| `docker-ready` | Include Docker configuration and setup |

    "cacheTtl": 24,

    "verbose": false**Reminder:** Option names are template-defined. Always consult the template's

  }README or `template.json` for the authoritative list.

}

```## Cache System



### Configuration PriorityTemplates are cached locally for faster subsequent operations:



Settings are resolved in this order (highest to lowest):- **Cache Location:** `~/.m5nv/cache/`

- **Default TTL:** 24 hours

1. Command-line flags- **Cache Key:** Repository URL + branch name

2. Environment variables- **Automatic Cleanup:** Corrupted entries are automatically re-cloned

3. `~/.m5nvrc` configuration file

4. Built-in defaults### Cache Behavior



### Environment Variables| Scenario | Behavior |

|----------|----------|

**create-scaffold:**| First use | Repository is cloned and cached |

- `CREATE_SCAFFOLD_CONFIG_PATH` - Custom config file path| Within TTL | Cached version is used (fast) |

- `CREATE_SCAFFOLD_CACHE_DIR` - Custom cache directory| After TTL | Repository is re-cloned and cache updated |

- `CREATE_SCAFFOLD_FORCE_INTERACTIVE` - Force interactive mode| `--no-cache` | Cache is bypassed, direct clone performed |

- `CREATE_SCAFFOLD_NO_INTERACTIVE` - Disable interactive mode| Corrupted cache | Entry is automatically re-cloned |

- `CREATE_SCAFFOLD_PLACEHOLDER_<NAME>` - Placeholder values

## Setup Scripts

**make-template:**

- `MAKE_TEMPLATE_CONFIG_PATH` - Custom config file pathTemplates may include a `_setup.mjs` file that runs after copying:

- `MAKE_TEMPLATE_AUTHOR_NAME` - Default author name

- `MAKE_TEMPLATE_AUTHOR_EMAIL` - Default author email- **Execution Context:** Runs in your project directory

- **Environment:** Receives the [Environment](environment.md) object containing `{ ctx, tools }`

---- **Cleanup:** Setup script is automatically removed after execution

- **Error Handling:** Failures are logged but don't stop project creation

## Template URL Formats

## Post-create guidance

`create-scaffold` supports multiple template URL formats:

After scaffolding, the CLI prints a “Next steps” block:

### Registry Shortcuts

- `cd <projectDir>` is always listed first.

```bash- If the template’s `template.json` includes a `handoff` array of strings, each entry is rendered as a bullet.

# Format: registry/template-name- When `handoff` is absent or empty, the CLI falls back to a reminder to review the README.

create-scaffold new my-app --template favorites/react-spa

create-scaffold new my-app --template official/express-apiExample `template.json` snippet:

```

```json

### GitHub URLs{

  "name": "vite-react",

```bash  "handoff": [

# Full URL    "npm install",

create-scaffold new my-app --template github.com/owner/repo    "npm run dev",

    "Open README.md for IDE-specific tips"

# HTTPS  ]

create-scaffold new my-app --template https://github.com/owner/repo.git}

```

# SSH

create-scaffold new my-app --template git@github.com:owner/repo.git## Input Validation



# With branchAll inputs are validated for security and correctness:

create-scaffold new my-app --template github.com/owner/repo#branch-name

```### Project Directory Validation



### Local Paths- Must contain only letters, numbers, hyphens, and underscores

- Cannot start with a dot

```bash- Cannot contain path separators (`/`, `\`)

# Relative path- Cannot be a reserved name (`node_modules`, `package.json`, etc.)

create-scaffold new my-app --template ./my-template- Maximum length: 100 characters



# Absolute path### Template Name Validation

create-scaffold new my-app --template /path/to/template

```- Must contain only letters, numbers, hyphens, underscores, and forward slashes

- Cannot contain path traversal attempts (`..`)

---- Cannot start with a dot

- Maximum length: 255 characters

## Template Options Format- Supports nested templates (e.g., `frontend/react`)



Templates can define dimensions that accept options during scaffolding.### Repository URL Validation



### Single-Select Options- GitHub shorthand: Must match `user/repo` pattern

- URLs: Must use safe protocols (`http:`, `https:`, `git:`, `ssh:`)

```bash- Local paths: Cannot contain path traversal attempts

# Format: dimension=value- Private networks are blocked for security

create-scaffold new my-app --template react-vite --options "styling=tailwind"

```### Branch Name Validation



### Multi-Select Options- Must follow git branch naming rules

- Cannot contain spaces or control characters

```bash- Cannot contain git special characters (`~`, `^`, `:`, `?`, `*`, `[`, `]`, `\`)

# Format: dimension=value1+value2+value3- Cannot start or end with dots

create-scaffold new my-app --template react-vite --options "features=auth+testing+i18n"- Cannot end with `.lock`

```- Maximum length: 255 characters



### Multiple Dimensions## See Also



```bash- [Environment Reference](environment.md) - Complete Environment contract

# Format: dim1=val1,dim2=val2- [Error Codes Reference](error-codes.md) - Exit codes and error messages

create-scaffold new my-app --template react-vite --options "styling=tailwind,features=auth+testing"- [Creating Templates Guide](../how-to/creating-templates.md) - How to create your own templates

```- [Getting Started Tutorial](../tutorial/getting-started.md) - Step-by-step beginner guide



### Shorthand (Default Dimension)## make-template Command Reference



```bashmake-template provides 6 commands for template authoring workflows. All commands support `--help` for detailed usage information.

# Applies to template's default dimension

create-scaffold new my-app --template react-vite --options "typescript,testing"### convert

```

Convert an existing Node.js project into a reusable template by analyzing the codebase and generating template.json.

---

```bash

## Progressive Disclosure Helpmake-template convert [options]

```

Both tools support tiered help levels:

**Options:**

### Basic Help (Default)| Option | Short | Type | Default | Description |

|--------|-------|------|---------|-------------|

```bash| `--dry-run` | `-d` | boolean | `false` | Preview conversion without making changes. |

create-scaffold --help| `--yes` | `-y` | boolean | `false` | Skip confirmation prompts. |

make-template --help| `--silent` | `-s` | boolean | `false` | Suppress output except errors. |

```| `--type` | `-t` | string | - | Project type hint (cf-d1, cf-turso, vite-react, generic). |

| `--placeholder-format` | - | string | - | Placeholder format ({{NAME}}, __NAME__, %NAME%). |

Shows:| `--sanitize-undo` | - | boolean | `false` | Clean undo log of sensitive data. |

- Common commands| `--help` | `-h` | boolean | `false` | Show help information. |

- Essential options

- Basic examples**What it does:**

- Analyzes package.json, file structure, and dependencies

### Intermediate Help- Identifies templatable content (README, configs, source files)

- Generates template.json with appropriate placeholders

```bash- Creates undo log for restoration

create-scaffold --help-intermediate- Optionally sanitizes sensitive data from undo logs

make-template --help-intermediate

```### restore



Shows:Restore a templated project back to its original working state using the undo log.

- All commands

- Common and intermediate options```bash

- More examplesmake-template restore [options]

```

### Advanced Help

**Options:**

```bash| Option | Short | Type | Default | Description |

create-scaffold --help-advanced|--------|-------|------|----------|-------------|

make-template --help-advanced| `--restore-files` | - | string | - | Comma-separated list of files to restore. |

```| `--restore-placeholders` | - | boolean | `false` | Restore placeholder values. |

| `--generate-defaults` | - | boolean | `false` | Generate default values for missing placeholders. |

Shows:| `--help` | `-h` | boolean | `false` | Show help information. |

- All commands

- All options (including rarely-used)**What it does:**

- Complete examples- Reads the undo log created during conversion

- Technical details- Restores original file contents and structure

- Reverts placeholder transformations

### Interactive Help- Validates restoration integrity



```bash### init

create-scaffold --help-interactive

```Generate a skeleton template.json file to start template authoring from scratch.



Launches interactive help browser for guided exploration.```bash

make-template init [options]

---```



## Exit Codes**Options:**

| Option | Short | Type | Default | Description |

Both tools use standard exit codes:|--------|-------|------|----------|-------------|

| `--init-file` | - | string | `template.json` | Output filename for skeleton. |

| Code | Meaning || `--help` | `-h` | boolean | `false` | Show help information. |

|------|---------|

| `0` | Success |**What it does:**

| `1` | General error |- Creates minimal template.json with required fields

| `2` | Invalid arguments |- Includes common placeholder patterns

| `3` | Validation failed |- Provides setup script skeleton

| `4` | File system error |- Ready for customization and validation

| `5` | Git operation failed |

| `6` | Network error |### validate



---Validate template.json against the schema with intelligent suggestions and auto-fixes.



## Cache Management```bash

make-template validate [options] [template-file]

`create-scaffold` caches template repositories for performance.```



### Cache Location**Options:**

| Option | Short | Type | Default | Description |

```|--------|-------|------|----------|-------------|

~/.m5nv/cache/| `--lint-file` | - | string | - | Specific template.json file to validate. |

├── <repo-hash-1>/| `--suggest` | - | boolean | `false` | Show improvement suggestions. |

├── <repo-hash-2>/| `--fix` | - | boolean | `false` | Automatically apply fixes where possible. |

└── metadata.json| `--help` | `-h` | boolean | `false` | Show help information. |

```

**What it does:**

### Cache Operations- Validates against template.v1.json schema

- Checks file references and setup scripts

```bash- Provides actionable error messages

# Bypass cache for one operation- Suggests improvements and best practices

create-scaffold new my-app --template react-vite --no-cache- Can auto-fix common issues



# Override TTL (in hours)### hints

create-scaffold new my-app --template react-vite --cache-ttl 48

Display available hints catalog for template authoring assistance and best practices.

# Clear cache (manual)

rm -rf ~/.m5nv/cache/*```bash

```make-template hints

```

### Default Cache TTL

**Options:**

- **Default**: 24 hours| Option | Short | Type | Default | Description |

- **Minimum**: 1 hour|--------|-------|------|----------|-------------|

- **Maximum**: 720 hours (30 days)| `--help` | `-h` | boolean | `false` | Show help information. |



---**What it does:**

- Shows categorized hints for template authoring

## Validation & Security- Includes security, usability, and maintenance tips

- Provides examples and anti-patterns

Both tools implement comprehensive validation:- Updated with latest best practices



### Input Validation### test

- Project names: Letters, numbers, hyphens, underscores only

- Template URLs: Safe protocols only (http, https, git, ssh)Test templates by creating projects and validating functionality end-to-end.

- Paths: No path traversal (`../`)

- Shell safety: No injection characters (`;`, `|`, `&`, `` ` ``)```bash

make-template test [options] <template-path>

### Template Validation```

- Schema version compliance

- Required file presence (`template.json`, `README.md`)**Options:**

- Setup script validation (if present)| Option | Short | Type | Default | Description |

- Metadata completeness|--------|-------|------|----------|-------------|

- Dimension structure validity| `--verbose` | `-v` | boolean | `false` | Enable verbose test output. |

| `--keep-temp` | - | boolean | `false` | Preserve temporary test directories. |

### Runtime Safety| `--help` | `-h` | boolean | `false` | Show help information. |

- Sandboxed setup script execution

- No direct `eval` or `require`**What it does:**

- Scoped file system access- Creates temporary project from template

- Input sanitization- Runs setup scripts and validation

- Tests placeholder resolution

---- Verifies file structure and content

- Cleans up temporary directories (unless `--keep-temp`)

## Common Workflows

### First-Time Project Creation

```bash
# Discover templates
create-scaffold list

# Create project
create-scaffold new my-app --template react-vite

# Navigate and start
cd my-app
npm install
npm run dev
```

### Template Authoring

```bash
# Start with working project
cd my-project

# Convert to template
make-template convert

# Edit template.json
# ... customize dimensions, gates, etc ...

# Validate
make-template validate

# Test
make-template test .

# Restore for development
make-template restore

# Iterate...
```

### Team Setup

```bash
# Configure team registry (one-time)
# Edit ~/.m5nvrc
{
  "registries": {
    "team": {
      "url": "git@github.com:company/templates.git",
      "branch": "main"
    }
  }
}

# Use team templates
create-scaffold list --registry team
create-scaffold new project --template team/api-service
```

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
