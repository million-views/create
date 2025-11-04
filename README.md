---
title: "@m5nv/create-scaffold"
type: "guide"
audience: "all"
estimated_time: "5 minutes read, 15 minutes to get started"
prerequisites:
  - "Node.js (latest LTS) installed"
  - "Git installed and configured"
related_docs:
  - "docs/tutorial/getting-started.md"
  - "docs/how-to/creating-templates.md"
  - "docs/reference/cli-reference.md"
last_updated: "2025-11-01"
---

# @m5nv/create-scaffold & make-template

[![npm version](https://badge.fury.io/js/@m5nv%2Fcreate-scaffold.svg)](https://badge.fury.io/js/@m5nv/create-scaffold)
[![npm downloads](https://img.shields.io/npm/dm/@m5nv/create-scaffold.svg)](https://www.npmjs.com/package/@m5nv/create-scaffold)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub issues](https://img.shields.io/github/issues/million-views/create.svg)](https://github.com/million-views/create/issues)
[![GitHub stars](https://img.shields.io/github/stars/million-views/create.svg)](https://github.com/million-views/create/stargazers)

`@m5nv/create-scaffold` scaffolds projects from Git repositories. `make-template` converts existing projects into reusable templates. Both tools work together to provide a complete template ecosystem using only built-in Node.js modules.

## Tools Included

This package provides two complementary CLI tools:

### @m5nv/create-scaffold
The main scaffolding tool for creating new projects from templates.

### @m5nv/make-template
A companion tool for converting existing Node.js projects into reusable templates.

```bash
# Convert an existing project into a template
npx @m5nv/make-template --dry-run

# Restore a templated project back to working state
npx @m5nv/make-template --restore
```

## Quick start

```bash
# Create a React project based on the vite-react template
npm create @m5nv/scaffold my-app -- --from-template react-vite

# Installs dependencies and prepares the project for npm run dev
cd my-app
npm run dev
```

```bash
# Apply IDE configuration and template options during scaffolding
npm create @m5nv/scaffold my-app -- \
  --from-template react-vite \
  --ide kiro \
  --options "typescript,testing-focused"
```

```bash
# Discover available templates in the default repository
npm create @m5nv/scaffold -- --list-templates
```

```bash
# Validate a local template directory before publishing
create-scaffold --validate-template ./templates/react-vite
```

```bash
# Launch guided prompts (auto-launches when no arguments supplied)
npm create @m5nv/scaffold -- --interactive
```

## Key capabilities

- Sandboxed setup scripts with structured helpers (files, placeholders, text, JSON, IDE presets)
- Repository caching under `~/.m5nv/cache` for repeat scaffolds
- Template-defined metadata (`template.json`) that can expose handoff instructions
- Dry-run previews with operation summaries and optional tree output
- Guided interactive mode when arguments are missing (or explicitly requested) to collect project inputs
- CLI argument validation, logging, and preflight checks for Git access
- Template validation command for linting templates before publishing (supports JSON output)
- Versioned template schema and generated TypeScript declarations published for downstream tooling

## Maintainer commands

```bash
npm run schema:build   # Re-generate TypeScript artifacts after editing schema/template.v1.json
npm run schema:check   # Ensure generated artifacts and tsc checks stay in sync (also runs via npm run validate)
```

## Learn more

- [Getting Started Tutorial](docs/tutorial/getting-started.md) — first project walkthrough
- [Template Creation Guide](docs/how-to/creating-templates.md) — authoring templates and setup scripts
- [Complete CLI Reference](docs/reference/cli-reference.md) — command and flag documentation
- [Troubleshooting Guide](docs/guides/troubleshooting.md) — common failure scenarios
- [Security Model](docs/explanation/security-model.md) — sandboxing and validation overview
- [Template System](docs/explanation/template-system.md) — template repository structure

## Command reference

### create-scaffold
```bash
npm create @m5nv/scaffold <project-name> -- --from-template <template-name> [options]
```

| Option                | Description                                     |
| --------------------- | ----------------------------------------------- |
| `--from-template, -t` | Template name (required)                        |
| `--repo, -r`          | Repository (default: `million-views/templates`) |
| `--branch, -b`        | Git branch                                      |
| `--ide, -i`           | Target IDE (kiro, vscode, cursor, windsurf)     |
| `--options, -o`       | Comma-separated option list                     |
| `--list-templates`    | Display available templates                     |
| `--dry-run`           | Preview operations without executing them       |
| `--log-file`          | Write structured logs to the specified file     |
| `--no-cache`          | Bypass the local repository cache               |
| `--cache-ttl`         | Override cache TTL (1–720 hours)                |
| `--validate-template` | Validate a template directory and exit          |
| `--json`              | Use with `--validate-template` to emit machine-readable output |
| `--interactive`       | Force guided prompts for template selection     |
| `--no-interactive`    | Disable interactive mode                        |
| `--help, -h`          | Show help                                       |

### make-template
```bash
npx @m5nv/make-template [options]
```

| Option                | Description                                     |
| --------------------- | ----------------------------------------------- |
| `--dry-run`           | Preview changes without executing them          |
| `--restore`           | Restore template back to working project        |
| `--restore-files`     | Restore only specified files (comma-separated)  |
| `--type`              | Force specific project type detection           |
| `--placeholder-format`| Specify placeholder format                      |
| `--sanitize-undo`     | Remove sensitive data from undo log             |
| `--help, -h`          | Show help                                       |

## Examples

### create-scaffold

```bash
# Node.js API template
npm create @m5nv/scaffold my-api -- --from-template express

# React template with VSCode presets
npm create @m5nv/scaffold my-app -- --from-template react-vite --ide vscode

# Organization template hosted in a custom repository
npm create @m5nv/scaffold my-app -- \
  --from-template corporate-react \
  --repo mycompany/templates \
  --branch release
```

### make-template

```bash
# Convert existing project to template (preview first)
npx @m5nv/make-template --dry-run

# Convert project with specific placeholder format
npx @m5nv/make-template --placeholder-format __NAME__

# Restore templated project back to working state
npx @m5nv/make-template --restore

# Restore only specific files
npx @m5nv/make-template --restore --restore-files "package.json,README.md"
```

## Community and support

- [Report issues](https://github.com/million-views/create/issues/new)
- [Open discussions](https://github.com/million-views/create/discussions)
- [Read the contributing guide](CONTRIBUTING.md)

**Requirements:** Node.js (latest LTS) and Git

**License:** MIT • **Maintainer:** [@million-views](https://github.com/million-views)
