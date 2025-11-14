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

In this tutorial, you'll learn how to scaffold new projects using the three templates you created in the [make-template tutorial](make-template.md). You'll explore different project types, master registry management for template organization, and discover powerful customization features with `.m5nvrc` configuration files.

> This tutorial assumes you've completed both the [Getting Started tutorial](getting-started.md) and the [make-template tutorial](make-template.md) where you created the templates used here.

## What you'll scaffold

You'll create projects using three different templates:
1. **Basic React SPA** - Modern frontend application with Vite and React
2. **SSR Portfolio App** - Server-side rendered application with Cloudflare Workers and D1
3. **Split Architecture Full-Stack** - Separate API server and client app for maximum flexibility

## Prerequisites

Before starting this tutorial, make sure you have:

- **Completed the [Getting Started tutorial](getting-started.md)**
- **Completed the [make-template tutorial](make-template.md)** (you created the templates)
- **Node.js v22+** and **Git** installed and working
- **35 minutes** available for hands-on practice
- **A code editor** ready

## Introducing Registries

Before we start scaffolding projects, let's introduce **registries** - a powerful feature that makes template management much easier. Instead of constantly navigating to the `template-workshop` directory, we'll create a local registry and register all our templates there.

### What are Registries?

Registries are collections of templates that you can reference by name instead of file paths. They eliminate the need for `cd` commands and make your workflow much smoother.

### Create Your Workshop Registry

Registries are configured in your `.m5nvrc` configuration file. Let's set up a local registry for your workshop templates.

1. **Create or edit your `.m5nvrc` file in your home directory:**
   ```bash
   # If .m5nvrc doesn't exist, create it
   touch ~/.m5nvrc
   ```

2. **Add the workshop registry configuration:**
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

3. **Navigate to your template workshop directory:**
   ```bash
   cd template-workshop
   ```

4. **Verify your registry works:**
   ```bash
   npx @m5nv/create-scaffold list --registry workshop
   ```

### Expected Result

You should see all four templates listed in your workshop registry:

```console
📋 Templates in registry "workshop":

• basic-react-spa
  URL: ./template-workshop/basic-react-spa

• ssr-portfolio-app
  URL: ./template-workshop/ssr-portfolio-app

• portfolio-api
  URL: ./template-workshop/portfolio-api

• portfolio-client
  URL: ./template-workshop/portfolio-client
```

**Key Learning:** Registries provide a clean way to organize and reference templates. Now you can scaffold projects from anywhere without navigating to template directories!

### Registry Benefits

- **No more `cd` commands** - Reference templates by name
- **Centralized management** - All templates in one place
- **Easy sharing** - Registries can be shared across projects
- **Version control** - Track template versions in registries

## Example 1: Basic React SPA

Now let's scaffold a project using the Basic React SPA template from our workshop registry. Notice how we can do this from anywhere!

### Instructions

1. **Navigate to a clean directory for your projects:**
   ```bash
   cd ..
   mkdir scaffolded-projects
   cd scaffolded-projects
   ```

2. **Create a React SPA project from the registry:**
   ```bash
   npx @m5nv/create-scaffold my-react-spa --template basic-react-spa --registry workshop
   ```

3. **Navigate to the new project:**
   ```bash
   cd my-react-spa
   ```

4. **Install dependencies and start development:**
   ```bash
   npm install
   npm run dev
   ```

5. **Explore the project structure:**
   ```bash
   ls -la
   cat package.json
   ```

### Expected Result

You should have a working React application:

```text
my-react-app/
├── package.json          # Project dependencies and scripts
├── webpack.config.js     # Webpack configuration
├── src/
│   ├── index.js          # React app entry point
│   └── App.js            # Main App component
└── public/
    └── index.html        # HTML template
```

**Key Learning:** Templates preserve the exact project structure and dependencies from the original project, allowing you to quickly bootstrap new applications.

### Verification Steps

- The app runs on the development server (usually localhost:8080)
- React components render correctly
- Project structure matches the template
- All dependencies are properly installed

## Example 2: SSR Portfolio App

Now let's scaffold a server-side rendered portfolio application using the SSR Portfolio template from our registry.

### Instructions

1. **Navigate back to the projects directory:**
   ```bash
   cd ..
   ```

2. **Create an SSR portfolio project:**
   ```bash
   npx @m5nv/create-scaffold my-portfolio --template ssr-portfolio-app --registry workshop
   ```

3. **Navigate to the portfolio project:**
   ```bash
   cd my-portfolio
   ```

4. **Set up the database and start development:**
   ```bash
   npm install
   npx wrangler d1 create my-portfolio_db
   npm run db:migrate
   npm run dev
   ```

5. **Test the API endpoints:**
   ```bash
   # In another terminal, test the health endpoint
   curl http://localhost:8787/health

   # Test the projects API
   curl http://localhost:8787/api/projects
   ```

6. **Explore the API structure:**
   ```bash
   ls -la app/
   cat app/routes/_index.tsx
   cat wrangler.toml
   ```

### Expected Result

You should have a running API server:

```text
my-portfolio/
├── app/
│   ├── db/
│   │   ├── schema.ts      # Database schema with Drizzle
│   │   └── client.ts      # D1 database client
│   └── routes/
│       └── _index.tsx     # SSR route with data loading
├── wrangler.toml          # Cloudflare Workers configuration
├── drizzle.config.ts      # Database migration config
└── migrations/            # D1 migration files
```

**Key Learning:** SSR templates demonstrate server-side rendering with direct database access, Cloudflare Workers deployment, and modern React Router patterns.

### Verification Steps

- Application starts with wrangler dev
- Database migrations run successfully
- SSR routes load data from D1
- Application deploys to Cloudflare

## Example 3: Full-Stack Portfolio (Split Architecture)

Finally, let's create a complete full-stack application using the split architecture: separate API server and client app from our registry.

### Instructions

1. **Navigate back to the projects directory:**
   ```bash
   cd ..
   ```

2. **Create the API server:**
   ```bash
   npx @m5nv/create-scaffold portfolio-api --template portfolio-api --registry workshop
   cd portfolio-api
   npm install
   npx wrangler d1 create portfolio_db
   npm run db:migrate
   npm run dev
   ```

3. **In a new terminal, create the client app:**
   ```bash
   cd ..
   npx @m5nv/create-scaffold portfolio-client --template portfolio-client --registry workshop
   cd portfolio-client
   npm install
   npm run dev
   ```

4. **Test the full-stack application:**
   ```bash
   # API should be running on localhost:8787
   curl http://localhost:8787/health
   curl http://localhost:8787/api/projects

   # Client should be running on localhost:5173
   # Open http://localhost:5173 in your browser
   ```

5. **Explore the split architecture:**
   ```bash
   # Check API structure
   ls -la portfolio-api/app/

   # Check client structure
   ls -la portfolio-client/src/
   ```

### Expected Result

You should have two separate projects running:

```text
portfolio-api/           # Cloudflare Worker API
├── app/
│   ├── db/
│   │   ├── schema.ts      # Database schema with Drizzle
│   │   └── client.ts      # D1 database client
│   └── routes/
│       ├── _index.tsx     # API health check
│       └── api.projects.tsx # Projects API endpoint
├── wrangler.toml          # Cloudflare Workers configuration
├── drizzle.config.ts      # Database migration config
└── migrations/            # D1 migration files

portfolio-client/         # React SPA Client
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   └── lib/              # Utility functions
├── vite.config.ts         # Vite configuration
├── index.html            # HTML entry point
└── package.json          # Dependencies and scripts
```

**Key Learning:** Split architecture provides better separation of concerns, independent deployment, and scalability. The API can be deployed to Cloudflare Workers while the client can be deployed to any static hosting service.

### Verification Steps

- API server starts successfully on port 8787
- Client app starts successfully on port 5173
- API endpoints return expected data
- Client can communicate with API server
- Both projects can be developed and deployed independently

## Customizing Scaffolding with Placeholder Values

Templates often contain placeholders that get replaced during scaffolding. You can provide custom values for these placeholders in several ways.

### How Placeholders Work

When you create templates with `make-template`, it automatically detects placeholders in files like:
- `package.json` (project name, description, author)
- Configuration files (ports, database names, API endpoints)
- Documentation files (project titles, descriptions)

### Method 1: Command-Line Flags

The simplest way to customize placeholders is using the `--placeholder` flag:

1. **Scaffold with custom values via CLI:**
   ```bash
   npx @m5nv/create-scaffold custom-portfolio --template ssr-portfolio-app --registry workshop --placeholder projectName=MyAwesomePortfolio --placeholder authorName="Your Name" --placeholder authorEmail="your.email@example.com"
   ```

2. **Check the results:**
   ```bash
   cd custom-portfolio
   cat package.json
   ```

### Method 2: Configuration File (.m5nvrc)

For values you use frequently, add them to your `.m5nvrc` file:

1. **Edit your `.m5nvrc` file:**
   ```json
   {
     "registries": {
       "workshop": {
         "basic-react-spa": "./template-workshop/basic-react-spa",
         "ssr-portfolio-app": "./template-workshop/ssr-portfolio-app",
         "portfolio-api": "./template-workshop/portfolio-api",
         "portfolio-client": "./template-workshop/portfolio-client"
       }
     },
     "placeholders": {
       "authorName": "Your Name",
       "authorEmail": "your.email@example.com",
       "license": "MIT"
     }
   }
   ```

2. **Scaffold using the configured defaults:**
   ```bash
   npx @m5nv/create-scaffold test-project --template basic-react-spa --registry workshop
   ```

### Method 3: Environment Variables

You can also set placeholders via environment variables using the `CREATE_SCAFFOLD_PLACEHOLDER_` prefix:

```bash
CREATE_SCAFFOLD_PLACEHOLDER_projectName=MyProject CREATE_SCAFFOLD_PLACEHOLDER_authorName="Your Name" npx @m5nv/create-scaffold env-test --template basic-react-spa --registry workshop
```

### Expected Result

Your scaffolded projects will have placeholders replaced with your custom values:

```json
{
  "name": "myawesomeportfolio",
  "description": "A portfolio project",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  ...
}
```

**Key Learning:** Multiple customization methods give you flexibility - use CLI flags for one-off customizations, `.m5nvrc` for common defaults, and environment variables for CI/CD pipelines.

## Using selection.json for Composable Templates

For composable templates like the split architecture full-stack example (portfolio-api + portfolio-client), you can manually provide a `selection.json` file to instantiate specific variants with pre-configured feature combinations.

### What is selection.json?

The `selection.json` file contains your template configuration choices and can be:
- **Automatically generated** by `create-scaffold` during interactive scaffolding
- **Manually created** for repeatable setups
- **Generated by web UIs** for visual template configuration

### Method 1: Load Existing Selection

If you have a `<template-name>.selection.json` file from a previous scaffolding session:

```bash
npx @m5nv/create-scaffold my-project --template portfolio-api --registry workshop --selection ./portfolio-api.selection.json
```

### Method 2: Create Custom Selection Files

For composable templates, you can create `<template-name>.selection.json` files to define specific feature combinations:

```json
{
  "templateId": "portfolio-api",
  "version": "1.0.0",
  "selections": {
    "database": "d1",
    "authentication": "none",
    "cors": "enabled"
  },
  "derived": {
    "needsDatabase": true,
    "needsAuth": false
  },
  "placeholders": {
    "projectName": "my-api",
    "databaseName": "my_db"
  },
  "metadata": {
    "name": "my-api",
    "packageManager": "npm",
    "createdAt": "2025-11-12T10:00:00.000Z",
    "cliVersion": "1.0.0"
  }
}
```

### Method 3: Skip Interactive Prompts

Use `--selection` with an empty object to skip all prompts and use template defaults:

```bash
npx @m5nv/create-scaffold quick-start --template basic-react-spa --registry workshop --selection '{}'
```

### Expected Result

When using `--selection`, the scaffolding process becomes non-interactive and uses your predefined choices, making it perfect for:
- **CI/CD pipelines** - Repeatable, automated project creation
- **Team standardization** - Consistent project setups across team members
- **Template variants** - Different feature combinations from the same base template

**Key Learning:** `<template-name>.selection.json` files are written to your current working directory (not the project directory) to avoid conflicts and enable reuse across different projects. Each template generates its own uniquely named selection file.

## Using .m5nvrc for Global Configuration

For values you use frequently across all your projects, create a `.m5nvrc` file in your home directory to store common defaults for both registries and placeholders.

### Setting Up .m5nvrc

1. **Create the config file in your home directory:**
   ```bash
   cd ~
   touch .m5nvrc
   ```

2. **Add your common values and registries:**
   ```json
   {
     "registries": {
       "workshop": {
         "basic-react-spa": "./template-workshop/basic-react-spa",
         "ssr-portfolio-app": "./template-workshop/ssr-portfolio-app",
         "portfolio-api": "./template-workshop/portfolio-api",
         "portfolio-client": "./template-workshop/portfolio-client"
       }
     },
     "placeholders": {
       "authorName": "Your Name",
       "authorEmail": "your.email@example.com",
       "license": "MIT",
       "repository": "https://github.com/yourusername"
     }
   }
   ```

3. **Test it works:**
   ```bash
   cd ~/scaffolded-projects
   npx @m5nv/create-scaffold test-project --template basic-react-spa --registry workshop
   cd test-project
   cat package.json
   ```

### Expected Result

The scaffolded project automatically includes your `.m5nvrc` values:

```json
{
  "name": "test-project",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": "https://github.com/yourusername",
  ...
}
```

**Key Learning:** `.m5nvrc` provides global defaults that apply to all scaffolding, combining both registry definitions and placeholder values in one convenient location.

### Configuration Hierarchy

Placeholder values are applied in this order (later sources override earlier ones):
1. Template defaults (defined in template.json)
2. `.m5nvrc` global placeholder values
3. Environment variables (`CREATE_SCAFFOLD_PLACEHOLDER_*`)
4. Command-line `--placeholder` flags (highest priority)

Registry definitions are loaded from `.m5nvrc` and can be referenced via the `--registry` flag.

## What you accomplished

You successfully scaffolded three different types of projects using templates from your workshop registry:

1. **Basic React SPA** - Modern frontend application with Vite and React
2. **SSR Portfolio App** - Server-side rendered application with Cloudflare Workers and D1
3. **Split Architecture Full-Stack** - Separate API server and client app for maximum flexibility

Along the way, you learned:
- **Registry Management**: How to create and manage template registries for organized template storage
- **Template Registration**: Registering templates for easy reference without file paths
- **CLI Customization**: Used `--placeholder` flags for project-specific customization
- **Global Configuration**: Setting up `.m5nvrc` for common values across all projects

Each project demonstrates how templates and registries enable rapid development by providing:
- Complete project structure and dependencies
- Working development environment
- Proper configuration and scripts
- Ready-to-develop codebase

## Template benefits

Working with templates provides several advantages:

- **Consistency** - All projects from the same template have identical structure
- **Speed** - New projects are ready for development in minutes
- **Quality** - Templates include best practices and proper tooling
- **Customization** - Templates can be modified and extended as needed

## Next steps

Now that you understand scaffolding from templates:

- [How to Create Templates](../how-to/creating-templates.md) — Learn advanced template authoring
- [Author Workflow](../how-to/author-workflow.md) — Professional template development
- [CLI Reference](../reference/cli-reference.md) — Complete command documentation
- [Setup Recipes](../how-to/setup-recipes.md) — Common project configurations

## Project locations

Your scaffolded projects are ready for development:
- `template-workshop/my-react-spa/` - Modern React SPA with Vite
- `template-workshop/my-portfolio/` - SSR portfolio app with D1 database
- `template-workshop/portfolio-api/` - Cloudflare Workers API server
- `template-workshop/portfolio-client/` - React Router v7 client app

## Troubleshooting

### Template not found

**Problem:** `create-scaffold` can't find your template
**Solution:**
1. Ensure you're using the correct path to your template directory
2. Use `--repo local` when scaffolding from local templates
3. Check that the template directory contains `template.json`
4. Verify the template was created successfully in make-template tutorial

### Project directory not empty

**Problem:** Target directory already contains files
**Solution:**
1. Choose a different project name or empty directory
2. Use a different directory name for your new project
3. Remove existing files if you're sure they're not needed

### Dependencies installation fails

**Problem:** `npm install` fails in the scaffolded project
**Solution:**
1. Check your internet connection
2. Verify Node.js version compatibility
3. Try clearing npm cache: `npm cache clean --force`
4. Check for conflicting package versions in the template

### Application doesn't start

**Problem:** `npm start` or `npm run dev` fails
**Solution:**
1. Ensure all dependencies are installed
2. Check that the required ports are available
3. Look for error messages in the console
4. Verify the template's package.json scripts are correct

### Option Usage Patterns

**Use options to customize without complexity:**
- **typescript**: Add TypeScript support
- **testing**: Include test frameworks and configuration
- Combine options for comprehensive setups

### CLI Efficiency Features

**Power features for better workflows:**
- **--dry-run**: Always preview before creating
- **`create-scaffold list`**: Discover available options
- **--log-file**: Debug with detailed logging
- **--no-cache**: Ensure fresh template downloads

## Summary

You've now experienced the complete create-scaffold workflow using templates from your workshop registry:

1. **Registry Management**: Created and configured a local registry in `.m5nvrc` with all your templates
2. **Basic React SPA**: Scaffolded a modern frontend application with Vite and React
3. **SSR Portfolio App**: Created a server-side rendered application with Cloudflare Workers and D1 database
4. **Split Architecture Full-Stack**: Built separate API and client projects for maximum flexibility and scalability
5. **CLI Customization**: Used `--placeholder` flags for project-specific customization
6. **Global Configuration**: Set up `.m5nvrc` for common values and registry definitions

Each example demonstrated how templates and registries enable rapid development by providing complete project structures, proper tooling, and best practices. The registry system eliminates navigation overhead, while multiple placeholder customization methods give you complete control over project setup.

Remember: Registries organize your templates, `.m5nvrc` sets your global defaults, and `--placeholder` flags customize individual projects - together they create a powerful, flexible scaffolding system!
