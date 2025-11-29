---
title: "Getting Started with @m5nv/create"
description: "Set up your development environment and verify prerequisites for the create CLI"
type: tutorial
audience: "beginner"
estimated_time: "10 minutes"
prerequisites:
  - "Node.js v22+ installed"
  - "Git installed and configured"
  - "Basic command line familiarity"
related_docs:
  - "../how-to/template-author-workflow.md"
  - "../reference/cli-reference.md"
  - "../how-to/setup-recipes.md"
last_updated: "2025-11-28"
---

# Getting Started with @m5nv/create

## Quick Environment Check

Verify your setup in one command:

```bash
node --version && git --version && npm --version
```

**Expected:** Versions for Node.js v22+, Git, and npm.

## Install the Package

Install globally to get the CLI:

```bash
npm install -g @m5nv/create
```

This installs the `create` command with two domains:
- `create scaffold` - Scaffold new projects from templates
- `create template` - Convert projects into reusable templates

## Verify Installation

Test the CLI is accessible:

```bash
create --help
create scaffold --help
create template --help
```

**Expected:** Help text showing available commands.

## Quick Examples

### Scaffold a New Project

```bash
# Create a project from a template
create scaffold new my-app --template react-vite

# List available templates
create scaffold list
```

### Create a Template

```bash
# Initialize template configuration
create template init

# Convert project to template (preview first)
create template convert --dry-run

# Convert for real
create template convert --yes
```

## You're Ready!

✅ Environment verified  
✅ CLI installed  

**Next Steps:**
- [Scaffolding Tutorial](./scaffold.md) - Create projects from templates
- [Template Tutorial](./template.md) - Convert projects into reusable templates
- [CLI Reference](../reference/cli-reference.md) - Complete command documentation

## Troubleshooting

- **Node.js < v22**: Download latest from [nodejs.org](https://nodejs.org/)
- **Git missing**: Install from [git-scm.com](https://git-scm.com/)
- **Permission errors**: Use `sudo npm install -g` or fix npm permissions
- **Command not found**: Ensure npm global bin is in your PATH
