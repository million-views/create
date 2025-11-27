---
title: "Getting Started with make-template and create-scaffold"
description: "Set up your development environment and verify prerequisites for using make-template and create-scaffold tools"
type: tutorial
audience: "beginner"
estimated_time: "10 minutes"
prerequisites:
  - "Node.js v22+ installed"
  - "Git installed and configured"
  - "Basic command line familiarity"
related_docs:
  - "../how-to/creating-templates.md"
  - "../reference/cli-reference.md"
  - "../how-to/author-workflow.md"
  - "create-scaffold.md"
  - "make-template.md"
  - "../how-to/setup-recipes.md"
last_updated: "2025-11-14"
---

# Getting Started with `make-template` and `create-scaffold`

## Quick Environment Check

Verify your setup in one command:

```bash
node --version && git --version && npm --version
```

**Expected:** Versions for Node.js v22+, Git, and npm.

## Install the Package

Install globally to get both CLI tools:

```bash
npm install -g @m5nv/create-scaffold
```

This installs two commands:
- `create-scaffold` - Scaffold new projects from templates
- `make-template` - Convert projects into reusable templates

## Verify Installation

Test both tools are accessible:

```bash
create-scaffold --help | head -5
make-template --help | head -5
```

**Expected:** Help text for both commands.

## You're Ready!

✅ Environment verified  
✅ Tools installed  

**Next:** [Create your first template](make-template.md) or [scaffold from existing templates](create-scaffold.md)

## Troubleshooting

- **Node.js < v22**: Download latest from [nodejs.org](https://nodejs.org/)
- **Git missing**: Install from [git-scm.com](https://git-scm.com/)
- **Permission errors**: Use `sudo npm install -g` or fix npm permissions
- **Command not found**: Ensure npm global bin is in your PATH
