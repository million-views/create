---
title: "make-template Tutorial"
description: "Learn to create templates using make-template, building a progressive modern stack from React SPA to full-stack Cloudflare applications"
type: tutorial
audience: "intermediate"
estimated_time: "30 minutes"
prerequisites:
  - "Node.js v22+ installed"
  - "Git installed and configured"
  - "Basic command line familiarity"
related_docs:
  - "../how-to/creating-templates.md"
  - "../reference/cli-reference.md"
  - "../tutorial/getting-started.md"
  - "../tutorial/create-scaffold.md"
  - "../how-to/author-workflow.md"
last_updated: "2025-11-12"
---

# `make-template` Tutorial

## What you'll learn

In this tutorial, you'll learn how to create three templates that demonstrate a progressive modern stack for Cloudflare deployment. You'll start by learning the make-template workflow using automated initialization and templatization while creating your first template, then build up complexity from a simple React SPA to a full-stack application with edge computing and databases.

## What you'll build

You'll create three templates that showcase a progressive modern stack for Cloudflare deployment:

1. **Basic React SPA** - Modern frontend foundation with Vite + React (learn automated templatization workflow)
2. **SSR Portfolio App** - React Router v7 with SSR and direct D1 database access (auto-templatization demo)
3. **Full-Stack Portfolio** - Split architecture with API server (Workers + D1) and client app (auto-templatization demo)

Each template demonstrates different levels of complexity and Cloudflare integration, building toward a complete portfolio management system.

## Prerequisites

Before starting this tutorial, make sure you have:

- **Node.js v22+** installed ([Download here](https://nodejs.org/))
  - Verify: `node --version` should show v22 or higher
- **Git** installed and configured ([Setup guide](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup))
  - Verify: `git --version` should show git version info
- **30 minutes** available
- **Basic command line familiarity** (navigating directories, running commands)
- **Completed the [getting-started tutorial](getting-started.md)**

## Step 1: Create Basic React SPA Template

Learn the make-template workflow by creating a modern React SPA template.

### Quick Setup

```bash
mkdir template-workshop && cd template-workshop
mkdir basic-react-spa && cd basic-react-spa
npm create vite@latest . -- --template react --no-interactive --immediate
```

### Initialize Template Configuration

Instead of manually creating configuration files, use the `init` command to generate them automatically:

```bash
npx make-template init
```

This creates:
- `template.json` - Template metadata and placeholder definitions
- `.templatize.json` - Configuration for what content to templatize

**What gets auto-detected:**
- Project name, author, and description from `package.json`
- Common placeholders like `{{PROJECT_NAME}}`, `{{AUTHOR}}`, etc.
- File patterns for different content types (JSX, JSON, Markdown, HTML)

### Customize Configuration (Optional)

Review and customize the generated `.templatize.json`:

```bash
cat .templatize.json
```

You can:
- Add custom placeholders
- Modify file patterns
- Adjust placeholder formats
- Exclude specific files or content

### Convert to Template

Now convert your project to a template:

```bash
npx make-template convert . --yes
```

This creates:
- `.template-undo.json` - Reverse mappings for restoration
- Updates files with placeholders according to your configuration

### Test the Template

Let's test that the template works by scaffolding a new project:

```bash
cd ..
npx create-scaffold new basic-react-spa-scaffolded --template ./basic-react-spa --yes
cd basic-react-spa-scaffolded
npm install
npm run dev
```

You should see the template working with placeholder values.

### Undo Feature - Restore the Original Project

Now let's demonstrate the undo feature to restore the original project:

```bash
cd ../basic-react-spa
npx make-template restore --yes
```

This restores all the original values from the `.template-undo.json` file.

### Verify Restoration

Check that your original values are back:

```bash
grep "my-awesome-project" package.json
grep "John Doe" package.json
```

### What You Learned

- **`make-template init`**: Automatically generates `template.json` and `.templatize.json` with smart defaults
- **Configuration Customization**: How to review and modify the generated configuration files
- **Auto-Templatization**: make-template automatically finds project-specific values in:
  - package.json (name, description, author, repository)
  - README.md titles and content
  - HTML titles and content
  - JSX text content, images, links, and alt text
  - JSON configuration files
- **Undo Feature**: `restore` command reverses templatization using `.template-undo.json`
- **Round-trip Workflow**: Convert ↔ restore with full fidelity
- **Template Testing**: How to scaffold and test your templates immediately

### Expected Result

You should see:
```text
🔄 Converting project to template...
📄 Generated template.json
⚙️  Generated _setup.mjs
🔄 Generated .template-undo.json
✅ Conversion complete!
```

The template is now ready and demonstrates modern React development with Vite, plus you've learned the complete make-template workflow!

## Step 2: Create SSR Portfolio App Template

Create a React Router v7 SSR application with direct D1 database access:

```bash
cd ..
mkdir ssr-portfolio-app
cd ssr-portfolio-app
npm create react-router@latest . -- --template cloudflare --yes
npm install @m5nv/stl
```

**Key files to create:**
- `app/db/schema.sql` - D1 database schema
- `app/db/client.ts` - Database client with SQL templating
- `app/routes/_index.tsx` - SSR route with database queries
- `wrangler.toml` - Cloudflare configuration

**Convert to template:**
```bash
npx make-template convert . --yes
```

## Step 3: Create Full-Stack Portfolio Template

Build a split-architecture app: Cloudflare Worker API + React Router client.

**API Server:**
```bash
mkdir portfolio-api
cd portfolio-api
npm create cloudflare@latest . -- --template hello-world --yes
npm install @m5nv/stl itty-router
```

**Key files:**
- `src/db/schema.sql` - Database schema
- `src/routes/projects.ts` - API routes with CRUD operations
- `src/index.ts` - Worker entry point
- `wrangler.toml` - Worker config

**Client App:**
```bash
cd ..
mkdir portfolio-client
cd portfolio-client
npm create react-router@latest . -- --template basic --yes
```

**Key files:**
- `app/routes/_index.tsx` - Client route fetching from API

**Convert both to templates:**
```bash
cd portfolio-api && npx make-template convert . --yes
cd ../portfolio-client && npx make-template convert . --yes
```

## What You Accomplished

You created three templates demonstrating progressive complexity:

1. **Basic React SPA** - Modern frontend with Vite + React
2. **SSR Portfolio App** - React Router v7 with direct D1 access
3. **Full-Stack Portfolio** - Split architecture (API server + client)

Each template includes:
- Auto-detected placeholders from package.json, configs
- Database integration with D1 and SQL templating
- Cloudflare deployment configurations
- Template metadata and setup scripts

## Next Steps

- **[Create Scaffold Tutorial](create-scaffold.md)** - Use these templates to scaffold new projects
- [Template Validation](../reference/cli-reference.md#make-template-commands) - Ensure template quality

## Template Locations

Your templates are ready in `template-workshop/`:
- `basic-react-spa/` - React SPA foundation
- `ssr-portfolio-app/` - SSR with D1 database
- `portfolio-api/` & `portfolio-client/` - Split architecture

## Troubleshooting

**Init fails:** Ensure you're in a Node.js project directory with package.json
**Conversion fails:** Run `npm install` first, ensure .templatize.json exists (run `make-template init` if missing)
**Missing placeholders:** Check .templatize.json configuration and placeholder format settings
**Structure issues:** Verify generated template.json and _setup.mjs are valid
**Restore fails:** Ensure .template-undo.json exists from a previous conversion