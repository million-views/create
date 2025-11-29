# @m5nv/create

> **Bidirectional template system for Node.js projects.**

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

**A bidirectional template system: convert projects to templates, scaffold projects from templates.**

Turn any project into a reusable template. Scaffold new projects with
your team's standard configurations.

## Quick Examples

> **Install once:** `npm install -g @m5nv/create`  
> **Or try without installing:** `npx @m5nv/create ...`

### 🔄 Convert your project to a template

```bash
cd my-project
create template init
create template convert
```

### 🚀 Scaffold from your template

```bash
create scaffold new my-new-app --template ./my-project
```

### 📋 Reuse previous choices

```bash
create scaffold new another-app --template ./my-project --selection ./my-project.selection.json
```

## Key Benefits

### For Individual Developers

- **Pre-configured projects**: Start with working configurations
- **Consistent structure**: Every project follows the same patterns
- **Interactive prompts**: Answer questions to customize your project
- **Reproducible builds**: `create scaffold new app-v2 --selection ./app.selection.json`

### For Teams & Organizations

- **Codify standards**: Turn tribal knowledge into shareable templates
- **Faster onboarding**: `create scaffold new onboarding-app --template team/fullstack`
- **Evolving practices**: Update templates as your standards improve
- **Cross-project consistency**: Same setup, same quality, everywhere

### For Template Creators

- **One-command conversion**: `create template init && create template convert`
- **Placeholder detection**: Finds project-specific values in your code
- **Round-trip workflow**: Convert ↔ restore with full fidelity
- **Validation**: Catch schema issues before users encounter them

## What Makes This Different

Unlike other scaffolding tools, this system focuses on **round-trip
workflows** and **team collaboration**:

- **Convert ↔ Restore**: Move between project and template forms
- **Selection Files**: Capture and reuse your configuration choices
- **Registry Support**: Share templates across teams and organizations
- **Progressive Enhancement**: Start simple, add complexity as needed
- **Platform Awareness**: Validation based on deployment platforms

## Templatization

**Detect and replace project-specific content with placeholders.**

The templatization system analyzes your code and identifies content that
should be parameterized. Supports JSX/TSX, JSON, Markdown, and HTML files.

📖 **[Complete Templatization Guide](docs/explanation/templatization.md)**

### Quick Example

```jsx
// Before: Hard-coded values
<h1>Welcome to My App</h1>

// After: Templated placeholders
<h1>⦃CONTENT_TITLE⦄</h1>
```

## The Two Domains

### `create template` - Template Authoring

**Convert projects into reusable templates.**

Converts Node.js projects into templates. Detects and replaces project-specific
content (JSX, JSON, Markdown, HTML) with placeholders, generates schema, and
creates restoration files.

📖 **[Complete CLI Reference](docs/reference/cli-reference.md#template-operations)**

### `create scaffold` - Project Scaffolding

**Create projects from templates.**

Creates new projects from templates. Supports GitHub repos, local paths, and
registry shortcuts. Features platform-aware validation and reusable selection
files.

📖 **[Complete CLI Reference](docs/reference/cli-reference.md#scaffold-operations)**

## Learn More

- **[Getting Started](docs/tutorial/getting-started.md)** - Installation and basic usage
- **[Template Tutorial](docs/tutorial/template.md)** - Convert projects to templates
- **[Scaffolding Tutorial](docs/tutorial/scaffold.md)** - Create projects from templates
- **[Templatization System](docs/explanation/templatization.md)** - Content detection and placeholder replacement

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
    /* user choices: deployment, database, storage, identity, billing, analytics, monitoring */
  },
  "gates": {
    /* compatibility rules */
  },
  "features": [
    /* feature definitions with needs */
  ]
}
```

## Advanced Features

### Selection Files

Capture your configuration choices for reproducible builds.

📖 **[Complete Guide](docs/tutorial/scaffold.md#example-3-using-selection-files)**

### Registry Configuration

Share templates across teams by configuring registries in `.m5nvrc`.

📖 **[Complete Guide](docs/reference/cli-reference.md#registry-system)**

## Project Status

**Version**: 1.0.0  
**Status**: Production-ready

Built with ❤️ using Node.js and carefully selected dependencies for optimal
performance and reliability.
