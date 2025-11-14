# @m5nv/create-scaffold - Template Ecosystem for Node.js Projects

> **A complete template authoring and project scaffolding ecosystem**

[![npm version](https://badge.fury.io/js/@m5nv%2Fcreate-scaffold.svg)](https://badge.fury.io/js/@m5nv/create-scaffold)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

## What is this?

The `million-views/create` repository provides a complete ecosystem for creating and using project templates. The ecosystem consists of two complementary CLI tools and a template schema, all delivered through the `@m5nv/create-scaffold` npm package:

- **CLI Tools**:
  - **`create-scaffold`**: Scaffold new projects from templates with guided workflows
  - **`make-template`**: Convert existing projects into reusable templates
- **Template Schema V1.0**: Declarative composition format with platform gates, feature requirements, and smart defaults for use with developer tools

Together, these tools enable teams to codify project best practices, share battle-tested configurations, and bootstrap new projects in seconds.

## Quick Start

### Create a Project from a Template

```bash
# Using npm create (recommended)
npm create @m5nv/scaffold my-app -- --template basic-react-spa

# Or with npx
npx @m5nv/create-scaffold new my-app --template basic-react-spa
```

### Convert Your Project to a Template

```bash
# Navigate to your project
cd my-awesome-project

# Convert to template
npx make-template convert

# Template is ready - share it or publish it!
```

### Restore Template Back to Working Project

```bash
# When developing/testing templates
npx make-template restore
```

## Why Use This Ecosystem?

### For Project Creators

- **No Configuration Overhead**: Start coding immediately with pre-configured projects
- **Best Practices Baked In**: Get security, testing, and tooling setup by default
- **Guided Workflows**: Interactive prompts help you make the right choices
- **Registry System**: Discover and use templates from configured registries

### For Template Authors

- **Round-Trip Workflow**: Convert project → template → project seamlessly
- **Declarative Composition**: Define platform constraints and feature requirements
- **Smart Validation**: Catch errors before users encounter them
- **Comprehensive Tooling**: Full authoring CLI with validation, hints, and testing

### For Teams

- **Codify Standards**: Turn your team's best practices into reusable templates
- **Onboarding**: New team members get production-ready projects instantly
- **Consistency**: Every project starts with the same solid foundation
- **Evolution**: Update templates as standards evolve

## The Two Tools Explained

### `make-template`: Template Authoring Tool

**What it does**: Converts projects into reusable templates

**Key Features**:
- One-command conversion with automatic placeholder detection
- Schema V1.0 generation with dimensions, gates, and hints
- Round-trip workflow (convert ↔ restore)
- Comprehensive validation with fix suggestions
- Template testing service for cross-tool integration
- Undo tracking for safe experimentation

**When to use**: When codifying a project as a reusable template

### `create-scaffold`: Project Scaffolding Tool

**What it does**: Creates new projects from templates with guided workflows

*"Scaffolding" here means generating complete project structures from reusable templates, not building temporary construction scaffolding.*

**Key Features**:
- URL-based template resolution (GitHub, registries, local paths)
- Interactive guided workflows for template selection
- Platform-aware validation (Cloudflare, VPS, Deno, etc.)
- Feature-based composition with smart defaults
- Caching for fast repeated scaffolding
- Dry-run mode to preview changes

**When to use**: Every time you start a new project

## Template Schema V1.0

Templates use a declarative JSON schema that defines:

### Dimensions
Configurable aspects of the generated project (database, auth, features, etc.)

### Platform Gates (compat)
Which options are available on which platforms (e.g., D1 only on Cloudflare)

### Feature Requirements (needs)
What capabilities are required by selected features (e.g., "Comments feature needs database")

### Hints
Contextual guidance shown during scaffolding

### Constants
Fixed attributes that define the template's identity (TypeScript, React, etc.)

**Example**:
```json
{
  "schemaVersion": "1.0.0",
  "metadata": {
    "dimensions": {
      "deployment": {
        "type": "single",
        "values": ["cloudflare", "vps", "deno"],
        "default": "cloudflare"
      },
      "database": {
        "type": "single", 
        "values": ["d1", "sqlite3", "turso", "none"],
        "default": "d1",
        "compat": {
          "cloudflare": ["d1", "turso"],
          "vps": ["sqlite3", "turso"],
          "deno": ["sqlite3", "turso"]
        }
      }
    },
    "constants": {
      "language": "typescript",
      "framework": "react",
      "styling": "tailwind"
    }
  }
}
```

## Selection Files (<template-name>.selection.json)

When scaffolding V1.0 templates, `create-scaffold` generates a `<template-name>.selection.json` file in your current working directory that captures your configuration choices. This file enables:

- **Reproducible builds**: Recreate the exact same project setup
- **Configuration sharing**: Share your selections with team members
- **Automation**: Use selections in CI/CD pipelines
- **Template updates**: Reapply selections when updating templates

### Using Selection Files

```bash
# Create project with interactive selection
create-scaffold new my-app --template basic-react-spa

# Reuse previous selections (skips interactive prompts)
create-scaffold new my-other-app --template basic-react-spa --selection ./basic-react-spa.selection.json

# Load selections from a different path
create-scaffold new my-app --template basic-react-spa --selection ~/my-selections/basic-react-spa.selection.json
```

### Selection File Format

```json
{
  "templateId": "basic-react-spa",
  "version": "1.0.0",
  "selections": {
    "deployment": "vercel",
    "features": ["auth", "database"],
    "database": "postgresql",
    "storage": "s3",
    "auth": ["google"],
    "payments": "stripe",
    "analytics": "plausible"
  },
  "derived": {
    "needAuth": true,
    "needDb": true,
    "needPayments": true,
    "needStorage": true
  },
  "metadata": {
    "name": "my-app",
    "packageManager": "npm",
    "createdAt": "2025-11-12T10:30:00Z",
    "cliVersion": "1.0.0"
  }
}
```

## Installation

### Global Installation (Recommended)

```bash
npm install -g @m5nv/create-scaffold
```

This installs both `create-scaffold` and `make-template` commands.

### One-Time Usage

```bash
# create-scaffold
npm create @m5nv/scaffold my-app -- --template react-vite

# make-template  
npx make-template convert
```

## Documentation

### Getting Started
- [Getting Started Tutorial](docs/tutorial/getting-started.md) - Installation and setup
  - [Using make-template](docs/tutorial/make-template.md) - Convert projects to templates
  - [Using create-scaffold](docs/tutorial/create-scaffold.md) - Scaffold projects from templates

### How-To Guides
- [Template Authoring Guide](docs/how-to/creating-templates.md) - Create your first template
- [Authoring Workflow](docs/how-to/author-workflow.md) - Complete authoring workflow
- [Setup Script Recipes](docs/how-to/setup-recipes.md) - Common _setup.mjs patterns
- [Development Guide](docs/how-to/development.md) - Contributing to this project

### Reference
- [CLI Reference](docs/reference/cli-reference.md) - Complete command documentation
- [Environment Object](docs/reference/environment.md) - _setup.mjs environment API
- [Error Codes](docs/reference/error-codes.md) - Error messages and solutions

### Explanation
- [Security Model](docs/explanation/security-model.md) - Sandboxing and validation
- [Template System](docs/explanation/template-system.md) - Architecture and design

## Examples

### Scaffolding Projects

```bash
# Basic usage
create-scaffold new my-app --template basic-react-spa

# From GitHub repository
create-scaffold new my-app --template github.com/owner/repo

# From registry shortcut
create-scaffold new my-app --template favorites/react-spa

# With platform and features
create-scaffold new my-app --template basic-react-spa --options "cloudflare,authentication"

# Reuse previous selections (skips interactive prompts)
create-scaffold new my-other-app --template basic-react-spa --selection ./basic-react-spa.selection.json

# List available templates
create-scaffold list
create-scaffold list --registry official

# Validate a template
create-scaffold validate ./my-template

# Dry run (preview without creating)
create-scaffold new my-app --template basic-react-spa --dry-run
```

### Authoring Templates

```bash
# Convert your project
make-template convert

# Generate template.json skeleton
make-template init

# Validate your template
make-template validate

# Test your template end-to-end
make-template test ./my-template

# Restore to working project
make-template restore

# Show authoring hints
make-template hints
```

## Registry Configuration

Configure template registries in `~/.m5nvrc`:

```json
{
  "registries": {
    "official": {
      "url": "git@github.com:million-views/templates.git",
      "branch": "main"
    },
    "company": {
      "url": "git@github.com:mycompany/templates.git", 
      "branch": "main"
    }
  },
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  }
}
```

## Requirements

- **Node.js**: v22.0.0 or higher (LTS recommended)
- **Git**: For cloning template repositories
- **No external dependencies**: Built entirely with Node.js built-ins

## Features

### make-template
✅ One-command project → template conversion  
✅ Automatic placeholder detection  
✅ Schema V1.0 generation  
✅ Round-trip workflow (convert ↔ restore)  
✅ Comprehensive validation  
✅ Intelligent fix suggestions  
✅ Template testing service  
✅ Undo tracking  

### create-scaffold
✅ URL-based template resolution (GitHub, registries, local)  
✅ Interactive guided workflows  
✅ Platform-aware validation  
✅ Feature-based composition  
✅ Repository caching for performance  
✅ Dry-run mode  
✅ Progressive disclosure help system  
✅ Enhanced error messages with suggestions  

## Project Status

**Current Version**: 0.6.0  
**Status**: Pre-release (Production-ready, pending first publication)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/million-views/create.git
cd create

# Install dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint

# Validate specs
npm run validate
```

## License

MIT © Million Views

## Community

- [Report Issues](https://github.com/million-views/create/issues)
- [Code of Conduct](CODE_OF_CONDUCT.md)

---

**Built with ❤️ using only Node.js built-ins. Zero dependencies.**
