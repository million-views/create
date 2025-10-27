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
  - "docs/creating-templates.md"
  - "docs/reference/cli-reference.md"
last_updated: "2024-10-26"
---

# @m5nv/create-scaffold

[![npm version](https://badge.fury.io/js/@m5nv%2Fcreate-scaffold.svg)](https://badge.fury.io/js/@m5nv%2Fcreate-scaffold)
[![npm downloads](https://img.shields.io/npm/dm/@m5nv/create-scaffold.svg)](https://www.npmjs.com/package/@m5nv/create-scaffold)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub issues](https://img.shields.io/github/issues/million-views/create.svg)](https://github.com/million-views/create/issues)
[![GitHub stars](https://img.shields.io/github/stars/million-views/create.svg)](https://github.com/million-views/create/stargazers)

**Create production-ready projects in seconds with secure, git-based templates.**

Zero dependencies. Maximum security. IDE-optimized workflows.

## What is this?

Scaffold new projects from git-based template collections. Create production-ready projects with IDE-specific configurations, customizable options, and secure setup scripts - all from a single command.

## Quick Start

**Get started in 30 seconds:**

```bash
# Create a React project (most common)
npm create @m5nv/scaffold my-app -- --from-template react-vite

# ✅ Project created with modern React + Vite setup
# ✅ Dependencies installed automatically
# ✅ Ready to run: cd my-app && npm run dev
```

**Need more control?**

```bash
# Add IDE optimization + options
npm create @m5nv/scaffold my-app -- \
  --from-template react-vite \
  --ide kiro \
  --options "mvp,typescript,testing-focused"
```

**See what's available:**

```bash
# Browse all templates
npm create @m5nv/scaffold -- --list-templates
```

## Why use this?

✅ **Secure by design** - No arbitrary code execution, sandboxed setup scripts  
✅ **Zero dependencies** - Fast installs, minimal attack surface  
✅ **IDE-optimized** - Kiro, VSCode, Cursor, Windsurf configurations included  
✅ **Template caching** - Lightning-fast project creation after first use  
✅ **Template options** - Enable auth, database, testing with simple options  
✅ **Git-native** - Any repository can host multiple templates, version with branches

## Next Steps

**👋 New to project scaffolding?**  
📚 [Getting Started Tutorial](docs/tutorial/getting-started.md) - Your first project in 5 minutes

**🛠️ Want to create templates?**  
📖 [Template Creation Guide](docs/creating-templates.md) - Build reusable project templates

**🔍 Need specific help?**  
📋 [Complete CLI Reference](docs/reference/cli-reference.md) - All commands and options  
🚨 [Troubleshooting Guide](docs/guides/troubleshooting.md) - Fix common issues

**🤔 Want to understand the design?**  
💡 [Security Model](docs/explanation/security-model.md) - How we keep you safe  
🏗️ [Template System](docs/explanation/template-system.md) - Architecture deep-dive

---

## Command Reference

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
| `--list-templates`    | Display available templates from repository     |
| `--dry-run`           | Preview operations without executing them       |
| `--log-file`          | Enable detailed logging to specified file       |
| `--no-cache`          | Bypass cache system and clone directly          |
| `--cache-ttl`         | Override default cache TTL (1-720 hours)        |
| `--help, -h`          | Show help                                       |

## Common Examples

**Basic projects:**

```bash
# React app
npm create @m5nv/scaffold my-app -- --from-template react-vite

# Node.js API
npm create @m5nv/scaffold my-api -- --from-template express
```

**With IDE optimization:**

```bash
# Optimized for Kiro IDE
npm create @m5nv/scaffold my-app -- --from-template react-vite --ide kiro

# With VSCode settings
npm create @m5nv/scaffold my-app -- --from-template react-vite --ide vscode
```

**With options enabled:**

```bash
# Monorepo setup with TypeScript
npm create @m5nv/scaffold my-app -- --from-template react-vite --options "monorepo,typescript"

# Full-featured production setup
npm create @m5nv/scaffold my-app -- \
  --from-template react-vite \
  --ide kiro \
  --options "production,full-featured,ci-ready"
```

**Custom templates:**

```bash
# Your organization's templates
npm create @m5nv/scaffold my-app -- \
  --from-template corporate-react \
  --repo mycompany/templates
```

## Advanced Features

**🚀 Template caching** - Lightning-fast repeat usage  
**🔍 Template discovery** - Browse available templates with `--list-templates`  
**👀 Dry run mode** - Preview changes with `--dry-run`  
**📝 Detailed logging** - Debug with `--log-file scaffold.log`

[📖 Complete feature documentation](docs/phase-1-features.md)

## Community & Support

**🐛 Found a bug?** [Report it here](https://github.com/million-views/create/issues/new)  
**💡 Have an idea?** [Start a discussion](https://github.com/million-views/create/discussions)  
**🤝 Want to contribute?** [Read our guide](CONTRIBUTING.md)

**📚 Documentation:**

- [Phase 1 Features](docs/phase-1-features.md) - Caching, logging, discovery, and dry run features
- [Creating Templates](docs/creating-templates.md) - How to build your own template repository
- [Authentication](docs/authentication.md) - Setting up git access for private repositories
- [Troubleshooting](docs/guides/troubleshooting.md) - Common issues and solutions
- [Security](docs/security.md) - Security features and best practices
- [Development](docs/development.md) - Local development and testing guide

**Requirements:** Node.js (latest LTS) • Git installed and configured

---

## Related Documentation

**📚 Learning Path:**

- [Getting Started Tutorial](docs/tutorial/getting-started.md) - Your first project in 15 minutes
- [Template Creation Guide](docs/creating-templates.md) - Build reusable templates
- [Complete CLI Reference](docs/reference/cli-reference.md) - All commands and options

**🔍 Advanced Topics:**

- [Phase 1 Features](docs/phase-1-features.md) - Caching, logging, discovery, dry run
- [Security Model](docs/explanation/security-model.md) - How we keep you safe
- [Template System](docs/explanation/template-system.md) - Architecture deep-dive

**🛠️ Development:**

- [Development Guide](docs/development.md) - Local development and testing
- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute
- [Troubleshooting](docs/guides/troubleshooting.md) - Fix common issues

---

**License:** MIT • **Maintainer:** [@million-views](https://github.com/million-views)
