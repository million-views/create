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
last_updated: "2025-10-31"
---

# @m5nv/create-scaffold

[![npm version](https://badge.fury.io/js/@m5nv%2Fcreate-scaffold.svg)](https://badge.fury.io/js/@m5nv/create-scaffold)
[![npm downloads](https://img.shields.io/npm/dm/@m5nv/create-scaffold.svg)](https://www.npmjs.com/package/@m5nv/create-scaffold)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub issues](https://img.shields.io/github/issues/million-views/create.svg)](https://github.com/million-views/create/issues)
[![GitHub stars](https://img.shields.io/github/stars/million-views/create.svg)](https://github.com/million-views/create/stargazers)

`@m5nv/create-scaffold` scaffolds projects from Git repositories. Templates define the files to copy, optional metadata, and a sandboxed `_setup.mjs` script that can tailor the output with a curated helper toolkit. The CLI relies on built-in Node.js modules, validates inputs, and supports template caching.

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
| `--interactive`       | Force guided prompts for template selection     |
| `--no-interactive`    | Disable interactive mode                        |
| `--help, -h`          | Show help                                       |

## Examples

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

## Community and support

- [Report issues](https://github.com/million-views/create/issues/new)
- [Open discussions](https://github.com/million-views/create/discussions)
- [Read the contributing guide](CONTRIBUTING.md)

**Requirements:** Node.js (latest LTS) and Git

**License:** MIT • **Maintainer:** [@million-views](https://github.com/million-views)
