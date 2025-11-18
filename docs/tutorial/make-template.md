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

In this tutorial, you'll learn how to create three templates that demonstrate a progressive modern stack for Cloudflare deployment. You'll start by learning the make-template workflow (manual → auto-templatization) while creating your first template, then build up complexity from a simple React SPA to a full-stack application with edge computing and databases, focusing on auto-templatization for subsequent projects.

## What you'll build

You'll create three templates that showcase a progressive modern stack for Cloudflare deployment:

1. **Basic React SPA** - Modern frontend foundation with Vite + React (learn manual → auto templatization workflow)
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

### Manual Templatization

Replace hardcoded values with placeholders:

```bash
# Edit files to replace specific values with {{PLACEHOLDER}} syntax
# Example: "My Awesome Project" → "{{PROJECT_NAME}}"
```

### Create template.json

Define your placeholders in `template.json` using the V1.0.0 schema:

```json
{
  "schemaVersion": "1.0.0",
  "id": "my-org/basic-react-spa",
  "name": "Basic React SPA Template",
  "description": "A basic React single-page application template",
  "placeholders": {
    "PROJECT_NAME": { "default": "my-awesome-project", "description": "Project name" },
    "AUTHOR": { "default": "John Doe", "description": "Author info" }
  }
}
```

   **Why this matters:** The `template.json` file defines your placeholders and their default values. During scaffolding, users can override these defaults. The `.template-undo.json` (created during conversion) uses these defaults for the restore functionality.

6. **Convert to template:**

   Now convert your manually templatized project:

   ```bash
   npx make-template convert . --yes
   ```

   This creates the `.template-undo.json` file with the reverse mappings for restoration.

7. **Auto-Templatization (Recommended):**

   Instead of manually replacing all strings, let's use make-template's auto-detection feature:

   ```bash
   # Convert with auto-detection (this will detect and replace common placeholders)
   npx make-template convert . --placeholder-format "{{NAME}}" --yes
   ```

   This creates a complete template with auto-detected placeholders. Let's see what was detected:

   ```bash
   cat .template-undo.json | head -20
   ```

8. **Compare Manual vs Auto Results:**

   The auto-templatization should have detected placeholders like:
   - `{{PROJECT_NAME}}` for "my-awesome-project"
   - `{{AUTHOR}}` for "John Doe <john@example.com>"
   - `{{README_TITLE}}` for the README title
   - `{{HTML_TITLE}}` for the HTML page title
   - `{{TEXT_CONTENT_0}}`, `{{TEXT_CONTENT_1}}`, etc. for text content blocks
   - `{{TAGLINE}}` for "Built with Vite + React"
   - `{{IMAGE_URL_0}}`, `{{IMAGE_URL_1}}`, etc. for image sources
   - `{{ALT_TEXT_0}}`, `{{ALT_TEXT_1}}`, etc. for image alt text
   - `{{LINK_URL_0}}`, `{{LINK_URL_1}}`, etc. for link URLs

   **Note:** The system now supports up to 10 placeholders per type (images, links, alt text, text content, quotes). If your project has more templatable elements than this limit, only the first 10 of each type will be converted to placeholders.

9. **Test the Template:**

   Let's test that the template works by scaffolding a new project:

   ```bash
   cd ..
   npx create-scaffold new basic-react-spa-scaffolded --template ./basic-react-spa --yes
   cd basic-react-spa-scaffolded
   npm install
   npm run dev
   ```

   You should see the template working with placeholder values.

10. **Undo Feature - Restore the original project:**

   Now let's demonstrate the undo feature to restore the original project:

   ```bash
   cd ../basic-react-spa
   npx make-template restore --yes
   ```

   This restores all the original values from the `.template-undo.json` file.

11. **Verify Restoration:**

   Check that your original values are back:

   ```bash
   grep "My Awesome Project" src/App.jsx
   grep "John Doe" package.json
   ```

12. **Advanced Auto-Templatization:**

   Let's try a different project type to see more auto-detection features. Create a Cloudflare Worker project:

   ```bash
   cd ..
   mkdir cf-worker-demo
   cd cf-worker-demo
   npm create cloudflare@latest . -- --template hello-world --yes
   ```

   Add a wrangler.jsonc with specific values:

   **wrangler.jsonc:**
   ```jsonc
   {
     "name": "my-special-worker",
     "main": "src/index.ts",
     "compatibility_date": "2024-01-01",
     "account_id": "1234567890abcdef",
     "d1_databases": [
       {
         "binding": "MY_DATABASE",
         "database_name": "my_special_db",
         "database_id": "abcdef1234567890"
       }
     ]
   }
   ```

   Now convert this Cloudflare project:

   ```bash
   npx make-template convert . --type cf-d1 --yes
   ```

   The auto-templatization should detect:
   - `{{WORKER_NAME}}` for "my-special-worker"
   - `{{CLOUDFLARE_ACCOUNT_ID}}` for the account ID
   - `{{D1_DATABASE_BINDING_0}}` for "MY_DATABASE"
   - `{{D1_DATABASE_ID_0}}` for the database ID

13. **Clean up and continue:**

    ```bash
    cd ..
    rm -rf cf-worker-demo *-scaffolded
    ```

### What You Learned

- **Manual Templatization**: Editing files directly to replace project-specific values with placeholders
- **Auto-Detection**: make-template automatically finds project-specific values in:
  - package.json (name, description, author, repository)
  - README.md titles
  - HTML titles and content
  - JSX text content, images, links, and alt text
  - Cloudflare wrangler.jsonc configurations
- **Undo Feature**: `restore` command reverses templatization using `.template-undo.json`
- **Project Types**: Different auto-detection rules for different project types (`vite-react`, `cf-d1`, `cf-turso`)

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

**Conversion fails:** Ensure Node.js project with package.json, run `npm install` first
**Missing placeholders:** Use double braces `{{VARIABLE}}`, verify template.json
**Structure issues:** Check generated template.json and _setup.mjs