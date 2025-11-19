---
title: "Create Scaffold Tutorial"
description: "Learn to scaffold new projects using templates with advanced customization features"
type: tutorial
audience: "intermediate"
estimated_time: "35 minutes"
prerequisites:
  - "Completed Getting Started tutorial"
  - "Completed make-template tutorial"
  - "Node.js v22+ installed"
  - "Git installed and configured"
related_docs:
  - "../reference/cli-reference.md"
  - "../how-to/setup-recipes.md"
  - "../tutorial/getting-started.md"
  - "../tutorial/make-template.md"
last_updated: "2025-11-12"
---

# `create-scaffold` Tutorial

## What you'll learn

Scaffold projects using templates from the [make-template tutorial](make-template.md). Master registry management and customization with `.m5nvrc` configuration.

## Prerequisites

- Completed [Getting Started](getting-started.md) and [make-template](make-template.md) tutorials
- Node.js v22+ and Git installed

## Registries Overview

Registries are template repositories that auto-discover available templates. Configure them in `.m5nvrc`:

```json
{
  "registries": {
    "workshop": "./tmp/template-workshop",
    "work": "git@github.com:your-org/templates.git",
    "community": [
      "https://github.com/community/templates.git"
    ]
  }
}
```

**List templates from a registry:**
```bash
npx @m5nv/create-scaffold list --registry workshop
```

**Use templates from registries:**
```bash
npx @m5nv/create-scaffold new my-app --template workshop/basic-react-spa
```

## Example 1: Basic React SPA

```bash
cd ..
mkdir scaffolded-projects
cd scaffolded-projects
npx @m5nv/create-scaffold new my-react-spa --template workshop/basic-react-spa
cd my-react-spa
npm install && npm run dev
```

## Example 2: Custom Configuration

```bash
cd ..
npx @m5nv/create-scaffold new my-custom-app --template workshop/basic-react-spa \
  --placeholder projectName="My Custom App" \
  --placeholder authorName="Your Name"
cd my-custom-app
npm install && npm run dev
```

## Example 3: Using Selection Files

```bash
cd ..
npx @m5nv/create-scaffold new my-quick-start --template workshop/basic-react-spa \
  --selection '{}'
cd my-quick-start
npm install && npm run dev
```

## Customization Methods

### CLI Flags
```bash
npx @m5nv/create-scaffold new custom-app --template workshop/basic-react-spa \
  --placeholder projectName=MyApp \
  --placeholder authorName="Your Name"
```

### .m5nvrc Configuration
```json
{
  "placeholders": {
    "authorName": "Your Name",
    "authorEmail": "your.email@example.com",
    "license": "MIT"
  }
}
```

### Environment Variables
```bash
CREATE_SCAFFOLD_PLACEHOLDER_projectName=MyProject \
npx @m5nv/create-scaffold new env-test --template workshop/basic-react-spa
```

## Selection Files for Variants

Use `selection.json` for predefined template configurations:

```bash
# Use existing selection
npx @m5nv/create-scaffold new my-project --template workshop/basic-react-spa \
  --selection ./my-selection.selection.json

# Skip prompts with defaults
npx @m5nv/create-scaffold new quick-start --template workshop/basic-react-spa \
  --selection '{}'
```

## What You Accomplished

Scaffolded projects using the basic-react-spa template:
1. **Basic React SPA** - Modern frontend with Vite + React
2. **Custom Configuration** - Template with custom placeholders
3. **Quick Start** - Template with selection file for defaults

Learned:
- Registry configuration with local template directories
- CLI customization with `--placeholder` flags
- Global configuration with `.m5nvrc`
- Selection files for template variants

## Next Steps

- [Template Authoring](../how-to/creating-templates.md)
- [CLI Reference](../reference/cli-reference.md)
- [Setup Recipes](../how-to/setup-recipes.md)

## Troubleshooting

**Template not found:** Verify path and `template.json` exists
**Directory not empty:** Choose different project name
**Dependencies fail:** Check Node.js version and internet connection
**App won't start:** Ensure dependencies installed and ports available
