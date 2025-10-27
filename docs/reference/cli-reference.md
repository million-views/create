---
title: "CLI Reference"
type: "reference"
audience: "all"
estimated_time: "N/A (reference)"
prerequisites: []
related_docs: 
  - "../creating-templates.md"
  - "../tutorial/getting-started.md"
  - "environment-object.md"
  - "error-codes.md"
last_updated: "2024-01-15"
---

# CLI Reference

## Overview

Complete reference for the `@m5nv/create-scaffold` command-line interface. This tool scaffolds new projects using templates from git repositories.

## Syntax

```bash
# Using npm create (recommended)
npm create @m5nv/scaffold <project-directory> -- --from-template <template-name> [options]

# Using npx
npx @m5nv/create-scaffold@latest <project-directory> --from-template <template-name> [options]

# Global installation
create-scaffold <project-directory> --from-template <template-name> [options]
```

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
| `--options` | `-o` | string | No | - | Comma-separated list of contextual options for template customization. Templates use these to adapt behavior to your specific needs. |

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

## General Options

| Option | Short | Type | Required | Default | Description |
|--------|-------|------|----------|---------|-------------|
| `--help` | `-h` | boolean | No | `false` | Show help information and exit. |

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

# Contextual options for different scenarios
npm create @m5nv/scaffold my-app -- --from-template react --options monorepo,no-git,typescript

# Combine IDE and contextual options
npm create @m5nv/scaffold my-app -- --from-template react --ide vscode --options full-featured,typescript
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
🔍 DRY RUN MODE - Preview of operations (no changes will be made)

Planned Operations:
📁 Create directory: my-app
📋 Copy template files: react → my-app
  ├── 📄 package.json
  ├── 📄 README.md
  ├── 📁 src/
  └── 📄 _setup.mjs
⚙️  Execute setup script: _setup.mjs
🧹 Remove setup script: _setup.mjs

✅ Dry run completed - no actual changes were made
```

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

## Contextual Options

The `--options` parameter enables template customization based on your specific context and preferences. Templates can use these hints to adapt their behavior:

### Project Stage Options

| Option | Description |
|--------|-------------|
| `poc` | Proof of concept setup with minimal dependencies |
| `prototype` | Prototype development with rapid iteration focus |
| `mvp` | Minimum viable product with essential functionality only |
| `production` | Production-ready setup with full tooling |

### Environment Context

| Option | Description |
|--------|-------------|
| `monorepo` | Part of a monorepo structure (affects paths, configs) |
| `standalone` | Standalone project (full independent setup) |
| `existing-project` | Adding to existing codebase (minimal conflicts) |

### Development Preferences

| Option | Description |
|--------|-------------|
| `no-git` | Skip git initialization and related setup |
| `minimal` | Minimal dependencies and configuration |
| `full-featured` | Include all available functionality and tooling |
| `typescript` | TypeScript-focused configuration and dependencies |
| `testing-focused` | Comprehensive test setup and utilities |
| `ci-ready` | Include CI/CD configuration files |
| `docker-ready` | Include Docker configuration and setup |

**Note:** Templates define their own option vocabularies, so check template documentation for supported options. Options are passed to setup scripts as an array for custom processing.

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
- **Environment:** Receives [Environment_Object](environment-object.md) with project context
- **Cleanup:** Setup script is automatically removed after execution
- **Error Handling:** Failures are logged but don't stop project creation

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

- [Environment Object Reference](environment-object.md) - Complete Environment_Object documentation
- [Error Codes Reference](error-codes.md) - Exit codes and error messages
- [Creating Templates Guide](../creating-templates.md) - How to create your own templates
- [Getting Started Tutorial](../tutorial/getting-started.md) - Step-by-step beginner guide