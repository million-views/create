# @m5nv/create

> **Start new projects in seconds. Share your best practices as templates.**

[![npm version](https://badge.fury.io/js/@m5nv%2Fcreate.svg)](https://badge.fury.io/js/@m5nv/create)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D23.0.0-brightgreen.svg)](https://nodejs.org/)

## The Problem

Every time you start a new project, you face the same setup decisions:

- Which testing framework?
- How to structure the codebase?
- What CI/CD pipeline?
- Which linting rules?
- How to handle environment variables?

You end up copying configurations from old projects, hoping you remember all the
gotchas. Your team does this differently. New hires struggle to get productive.

## The Solution

**A template ecosystem that captures your expertise and shares it instantly.**

Turn any project into a reusable template. Scaffold new projects with
battle-tested configurations. Let your team focus on building features, not
reinventing setup.

## Quick Examples

> **Install once:** `npm install -g @m5nv/create`  
> **Or try without installing:** `npx @m5nv/create ...`

### 🚀 Scaffold a new project

```bash
create scaffold new my-app --template basic-react-spa
```

### 🔄 Convert your project to a template

```bash
# From within project
cd my-project
create template init
create template convert

# Or with explicit path
create template init ./my-project
create template convert ./my-project
```

### 📋 Reuse previous choices

```bash
create scaffold new my-app --template basic-react-spa --selection ./previous-choices.json
```

## Key Benefits

### For Individual Developers

- **Zero setup time**: Start coding immediately with pre-configured projects
- **Consistent quality**: Every project includes battle-tested configurations
- **Guided decisions**: Interactive prompts help you make the right choices
- **Reproducible builds**: Recreate exact project setups anytime

### For Teams & Organizations

- **Codify standards**: Turn tribal knowledge into shareable templates
- **Faster onboarding**: New developers get productive instantly
- **Evolving practices**: Update templates as your standards improve
- **Cross-project consistency**: Same setup, same quality, everywhere

### For Template Creators

- **One-command conversion**: Turn any project into a template
- **Smart placeholder detection**: Automatically finds project-specific values
- **Round-trip workflow**: Convert ↔ restore with full fidelity
- **Rich validation**: Catch issues before users encounter them

## What Makes This Different

Unlike other scaffolding tools, this ecosystem focuses on **round-trip
workflows** and **team collaboration**:

- **Convert ↔ Restore**: Seamlessly move between project and template forms
- **Selection Files**: Capture and reuse your configuration choices
- **Registry Support**: Share templates across teams and organizations
- **Progressive Enhancement**: Start simple, add complexity as needed
- **Platform Awareness**: Smart validation based on deployment platforms

## Intelligent Templatization

**Automatically detect and replace project-specific content with reusable
placeholders.**

The templatization system intelligently analyzes your code and automatically
identifies content that should be parameterized, supporting JSX/TSX, JSON,
Markdown, and HTML files.

📖 **[Complete Templatization Guide](docs/explanation/templatization.md)**

### Quick Example

```jsx
// Before: Hard-coded values
<h1>Welcome to My App</h1>

// After: Templated placeholders
<h1>⦃CONTENT_TITLE⦄</h1>
```

## Installation & Setup

Install the package globally:

```bash
npm install -g @m5nv/create
```

This gives you the unified `create` command with two domains: `scaffold` and `template`.

📖 **[Complete setup guide](docs/tutorial/getting-started.md)** for environment requirements and troubleshooting.

## Real-World Examples

### Team Onboarding

```bash
# New developer joins the team
create scaffold new onboarding-app --template company/react-fullstack
```

Project would be instantiated with all the best practices the org may have
baked into the template such as ESLint, Jest, CI/CD, database integration, and
authentication!

📖 **[Complete Tutorial](docs/tutorial/scaffold.md)**

### Template Authoring

```bash
# Convert your project to a reusable template
cd my-awesome-project
create template init      # Create configuration files
create template convert   # Apply templatization

# Or specify path explicitly
create template init ./my-awesome-project
create template convert ./my-awesome-project
```

Automatically detects and templatizes JSX, JSON, Markdown, and HTML content.

📖 **[Complete Tutorial](docs/tutorial/template.md)**

### Reproducible Builds

```bash
# First time - interactive setup
create scaffold new my-app --template complex-microservice

# Creates: complex-microservice.selection.json

# Next time - instant recreation
create scaffold new my-other-app --template complex-microservice --selection ./complex-microservice.selection.json
```

## The Two Domains

### `create scaffold` - Project Scaffolding

**Turn templates into projects instantly.**

Creates new projects from templates with intelligent guidance. Supports GitHub
repos, local paths, and registry shortcuts. Features platform-aware validation
and reusable selection files.

📖 **[Complete CLI Reference](docs/reference/cli-reference.md#scaffold-operations)**

### `create template` - Template Authoring

**Turn projects into templates effortlessly with intelligent content detection.**

Converts any Node.js project into a reusable template. Automatically detects and
replaces project-specific content (JSX, JSON, Markdown, HTML) with placeholders,
generates schema, and creates restoration files.

📖 **[Complete CLI Reference](docs/reference/cli-reference.md#template-operations)**

## Learn More

Ready to dive deeper? Our tutorials will get you productive in minutes:

- **[Getting Started](docs/tutorial/getting-started.md)** - Installation and basic usage
- **[Template Tutorial](docs/tutorial/template.md)** - Convert projects to templates
- **[Scaffolding Tutorial](docs/tutorial/scaffold.md)** - Create projects from templates
- **[Intelligent Templatization](docs/explanation/templatization.md)** - Auto-detection and placeholder replacement
- **[Template Author Workflow](docs/how-to/template-author-workflow.md)** - Advanced template authoring

## Technical Details

Templates use a declarative JSON format supporting progressive enhancement, from
minimal templates to full-featured ones with dimensions, setup scripts, and
conditional features.

📖 **[Complete Template Schema Reference](docs/reference/template-schema.md)**

### Quick Examples

**Minimal Template:**

```json
{
  "schemaVersion": "1.0.0",
  "id": "author/minimal-template",
  "name": "Minimal Template",
  "description": "A simple template",
  "placeholderFormat": "unicode",
  "placeholders": {
    "PROJECT_NAME": { "default": "my-app", "description": "Project name" }
  }
}
```

**Advanced Template:**

```jsonc
{
  "schemaVersion": "1.0.0",
  "id": "author/advanced-template",
  "name": "Advanced Template",
  "description": "Full-featured template",
  "placeholderFormat": "unicode",
  "placeholders": {
    /* ... */
  },
  "setup": { "script": "_setup.mjs" },
  "dimensions": {
    /* user choices */
  },
  "gates": {
    /* compatibility rules */
  },
  "featureSpecs": {
    /* feature definitions */
  }
}
```

## Advanced Features

### Selection Files

Capture your configuration choices for reproducible builds. Create once, reuse
instantly.

📖 **[Complete Guide](docs/tutorial/scaffold.md#example-3-using-selection-files)**

### Registry Configuration

Share templates across teams by configuring registries in `.m5nvrc`.

📖 **[Complete Guide](docs/reference/cli-reference.md#registry-system)**

## Project Status

**Version**: 1.0.0  
**Status**: Production-ready

Built with ❤️ using Node.js and carefully selected dependencies for optimal
performance and reliability.
