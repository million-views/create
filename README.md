# @m5nv/create-scaffold

> **Start new projects in seconds. Share your best practices as templates.**

[![npm version](https://badge.fury.io/js/@m5nv%2Fcreate-scaffold.svg)](https://badge.fury.io/js/@m5nv/create-scaffold)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

## The Problem

Every time you start a new project, you face the same setup decisions:

- Which testing framework?
- How to structure the codebase?
- What CI/CD pipeline?
- Which linting rules?
- How to handle environment variables?

You end up copying configurations from old projects, hoping you remember all the gotchas. Your team does this differently. New hires struggle to get productive.

## The Solution

**A template ecosystem that captures your expertise and shares it instantly.**

Turn any project into a reusable template. Scaffold new projects with battle-tested configurations. Let your team focus on building features, not reinventing setup.

## Quick Examples

### 🚀 Scaffold a new project
```bash
npm create @m5nv/scaffold my-app -- --template basic-react-spa
```

### 🔄 Convert your project to a template
```bash
cd my-project
npx @m5nv/make-template convert .
```

### 📋 Reuse previous choices
```bash
npm create @m5nv/scaffold my-app -- --template basic-react-spa --selection ./previous-choices.json
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

Unlike other scaffolding tools, this ecosystem focuses on **round-trip workflows** and **team collaboration**:

- **Convert ↔ Restore**: Seamlessly move between project and template forms
- **Selection Files**: Capture and reuse your configuration choices
- **Registry Support**: Share templates across teams and organizations
- **Progressive Enhancement**: Start simple, add complexity as needed
- **Platform Awareness**: Smart validation based on deployment targets

## Intelligent Templatization

**Automatically detect and replace project-specific content with reusable placeholders.**

The templatization system intelligently analyzes your code and automatically identifies content that should be parameterized:

### Supported File Types
- **JSX/TSX**: Component text, attributes, and titles
- **JSON**: Configuration values and metadata
- **Markdown**: Headings, frontmatter, and content
- **HTML**: Page titles, meta descriptions, and content

### Smart Detection Examples
```javascript
// Before: Hard-coded values
<h1>Welcome to My App</h1>
<title>My App</title>

// After: Templated placeholders
<h1>{CONTENT_TITLE}</h1>
<title>{CONTENT_TITLE}</title>
```

```json
{
  "name": "my-app",
  "description": "My awesome app"
}
```

Becomes:
```json
{
  "name": "{PACKAGE_NAME}",
  "description": "{PACKAGE_DESCRIPTION}"
}
```

### Control & Customization
- **Skip Regions**: Use `/* @template-skip */` to exclude content from templatization
- **Manual Placeholders**: Existing `{MANUAL_PLACEHOLDER}` syntax takes precedence
- **Configuration**: Customize detection patterns in `.templatize.json`

## Installation

```bash
# Global install (recommended)
npm install -g @m5nv/create-scaffold

# Or use directly with npx
npx @m5nv/create-scaffold --help
```

## Real-World Examples

### Team Onboarding
```bash
# New developer joins the team
npm create @m5nv/scaffold onboarding-app -- --template company/react-fullstack

# Project is ready with:
# ✅ ESLint + Prettier configured
# ✅ Jest testing setup
# ✅ CI/CD pipeline ready
# ✅ Database integration prepared
# ✅ Authentication scaffolded
```

### Template Authoring
```bash
# You built an awesome project with custom content
cd my-awesome-fullstack-app
npx @m5nv/make-template convert .

# The system automatically detects and templatizes:
# • JSX component titles and text → {CONTENT_TITLE}
# • Package.json name/description → {PACKAGE_NAME}
# • README headings → {CONTENT_TITLE}
# • HTML page titles → {CONTENT_TITLE}

# Preview changes before applying
npx @m5nv/make-template convert --dry-run

# Skip auto-templatization for manual control
npx @m5nv/make-template convert --no-auto-detect

# Now share it with the world
git add .
git commit -m "Add fullstack template with smart templatization"
git push origin main
```

### Reproducible Builds
```bash
# First time - interactive setup
npm create @m5nv/scaffold my-app -- --template complex-microservice

# Creates: complex-microservice.selection.json

# Next time - instant recreation
npm create @m5nv/scaffold my-other-app -- --template complex-microservice --selection ./complex-microservice.selection.json
```

## The Two Tools

### `create-scaffold` - Project Scaffolding
**Turn templates into projects instantly.**

Creates new projects from templates with intelligent guidance. Supports GitHub repos, local paths, and registry shortcuts. Features platform-aware validation and reusable selection files.

```bash
# From a GitHub template
npm create @m5nv/scaffold my-app -- --template github.com/owner/repo

# From a registry
npm create @m5nv/scaffold my-app -- --template company/react-fullstack

# Reuse previous choices
npm create @m5nv/scaffold my-app -- --template complex-app --selection ./choices.json
```

### `make-template` - Template Authoring
**Turn projects into templates effortlessly with intelligent content detection.**

Converts any Node.js project into a reusable template. Automatically detects and replaces project-specific content (JSX, JSON, Markdown, HTML) with placeholders, generates schema, and creates restoration files.

```bash
# Convert your project with automatic templatization
cd my-project
npx @m5nv/make-template convert .

# Preview changes before applying
npx @m5nv/make-template convert --dry-run

# Skip automatic templatization if preferred
npx @m5nv/make-template convert --no-auto-detect
```

# Or start from scratch
npx @m5nv/make-template init
```

## Learn More

Ready to dive deeper? Our tutorials will get you productive in minutes:

- **[Getting Started](docs/tutorial/getting-started.md)** - Installation and basic usage
- **[Template Tutorial](docs/tutorial/make-template.md)** - Convert projects to templates
- **[Scaffolding Tutorial](docs/tutorial/create-scaffold.md)** - Create projects from templates
- **[Intelligent Templatization](docs/explanation/templatization.md)** - Auto-detection and placeholder replacement
- **[Template Authoring Guide](docs/how-to/creating-templates.md)** - Advanced template creation

## Technical Details

### Template Schema V1.0

Templates use a declarative JSON format supporting progressive enhancement:

**Minimal Template** (just the basics):
```json
{
  "schemaVersion": "1.0.0",
  "id": "author/template-name",
  "name": "My Template",
  "description": "A simple template",
  "placeholders": {
    "PROJECT_NAME": {"default": "my-app", "description": "Project name"}
  }
}
```

**Advanced Template** (with full features):
```json
{
  "schemaVersion": "1.0.0",
  "id": "author/advanced-template",
  "name": "Advanced Template",
  "description": "Full-featured template",
  "placeholders": { /* ... */ },
  "setup": {"script": "_setup.mjs"},
  "dimensions": { /* user choices */ },
  "gates": { /* compatibility rules */ },
  "featureSpecs": { /* feature definitions */ }
}
```

### Selection Files

Capture your configuration choices for reproducible builds:

```bash
# First time - interactive
npm create @m5nv/scaffold my-app -- --template complex-template

# Creates: complex-template.selection.json with your choices

# Reuse instantly
npm create @m5nv/scaffold another-app -- --template complex-template --selection ./complex-template.selection.json
```

### Registry Configuration

Share templates across teams:

```json
{
  "registries": {
    "company": {
      "url": "git@github.com:mycompany/templates.git"
    }
  }
}
```

## Requirements & Installation

- **Node.js**: v22.0.0 or higher
- **Git**: For cloning templates

```bash
# Install globally
npm install -g @m5nv/create-scaffold

# Or use directly
npx @m5nv/create-scaffold --help
```

## Project Status

**Version**: 0.6.0  
**Status**: Production-ready, pre-publication

Built with ❤️ using Node.js and carefully selected dependencies for optimal performance and reliability.

---

**Ready to eliminate setup friction?** Start with our [Getting Started tutorial](docs/tutorial/getting-started.md).
