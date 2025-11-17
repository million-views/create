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

Registries organize templates by name instead of file paths. Configure them in `.m5nvrc`:

```json
{
  "registries": {
    "workshop": {
      "basic-react-spa": "./template-workshop/basic-react-spa",
      "ssr-portfolio-app": "./template-workshop/ssr-portfolio-app", 
      "portfolio-api": "./template-workshop/portfolio-api",
      "portfolio-client": "./template-workshop/portfolio-client"
    }
  }
}
```

**Create registry:**
```bash
cd template-workshop
npx @m5nv/create-scaffold list --registry workshop
```

## Example 1: Basic React SPA

```bash
cd ..
mkdir scaffolded-projects
cd scaffolded-projects
npx @m5nv/create-scaffold new my-react-spa --template basic-react-spa --registry workshop
cd my-react-spa
npm install && npm run dev
```

## Example 2: SSR Portfolio App

```bash
cd ..
npx @m5nv/create-scaffold new my-portfolio --template ssr-portfolio-app --registry workshop
cd my-portfolio
npm install
npx wrangler d1 create my-portfolio-db
npm run dev
```

**Test API:**
```bash
curl http://localhost:8787/health
curl http://localhost:8787/api/projects
```

## Example 3: Full-Stack Portfolio

**API Server:**
```bash
npx @m5nv/create-scaffold new portfolio-api --template portfolio-api --registry workshop
cd portfolio-api
npm install
npx wrangler d1 create portfolio-db
npm run dev
```

**Client App (new terminal):**
```bash
cd ..
npx @m5nv/create-scaffold new portfolio-client --template portfolio-client --registry workshop
cd portfolio-client
npm install && npm run dev
```

## Customization Methods

### CLI Flags
```bash
npx @m5nv/create-scaffold new custom-app --template basic-react-spa --registry workshop \
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
npx @m5nv/create-scaffold new env-test --template basic-react-spa --registry workshop
```

## Selection Files for Variants

Use `selection.json` for predefined template configurations:

```bash
# Use existing selection
npx @m5nv/create-scaffold new my-project --template portfolio-api --registry workshop \
  --selection ./portfolio-api.selection.json

# Skip prompts with defaults
npx @m5nv/create-scaffold new quick-start --template basic-react-spa --registry workshop \
  --selection '{}'
```

## What You Accomplished

Scaffolded three project types:
1. **Basic React SPA** - Modern frontend with Vite + React
2. **SSR Portfolio App** - Server-side rendering with D1 database
3. **Full-Stack Portfolio** - Split architecture (API + client)

Learned:
- Registry management for template organization
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
