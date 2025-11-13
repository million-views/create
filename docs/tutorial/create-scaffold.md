---
title: "Create Scaffold Tutorial"
type: "tutorial"
audience: "intermediate"
estimated_time: "25 minutes"
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

# Create Scaffold Tutorial

## What you'll learn

In this tutorial, you'll learn how to scaffold new projects using the three templates you created in the [make-template tutorial](make-template.md). You'll explore different project types and see how templates enable rapid development of various application architectures.

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
- **25 minutes** available for hands-on practice
- **A code editor** ready

## Example 1: Basic React App

Let's start by scaffolding a project using the Basic React App template you created in the make-template tutorial.

### Instructions

1. **Navigate to your template workshop directory:**
   ```bash
   cd template-workshop
   ```

2. **Create a React SPA project from your template:**
   ```bash
   npx @m5nv/create-scaffold my-react-spa --template ./basic-react-spa --repo local
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

```
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

Now let's scaffold a server-side rendered portfolio application using the SSR Portfolio template you created.

### Instructions

1. **Navigate back to the template workshop:**
   ```bash
   cd ..
   ```

2. **Create an SSR portfolio project:**
   ```bash
   npx @m5nv/create-scaffold my-portfolio --template ./ssr-portfolio-app --repo local
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

```
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

Finally, let's create a complete full-stack application using the split architecture: separate API server and client app.

### Instructions

1. **Navigate back to the template workshop:**
   ```bash
   cd ..
   ```

2. **Create the API server:**
   ```bash
   npx @m5nv/create-scaffold portfolio-api --template ./portfolio-api --repo local
   cd portfolio-api
   npm install
   npx wrangler d1 create portfolio_db
   npm run db:migrate
   npm run dev
   ```

3. **In a new terminal, create the client app:**
   ```bash
   cd ..
   npx @m5nv/create-scaffold portfolio-client --template ./portfolio-client --repo local
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

```
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

## What you accomplished

You successfully scaffolded three different types of projects using templates you created:

1. **Basic React SPA** - Modern frontend application with Vite and React
2. **SSR Portfolio App** - Server-side rendered application with Cloudflare Workers and D1
3. **Split Architecture Full-Stack** - Separate API server and client app for maximum flexibility

Each project demonstrates how templates enable rapid development by providing:
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

You've now experienced the complete create-scaffold workflow using templates you created:

1. **Basic React SPA**: Scaffolded a modern frontend application with Vite and React
2. **SSR Portfolio App**: Created a server-side rendered application with Cloudflare Workers and D1 database
3. **Split Architecture Full-Stack**: Built separate API and client projects for maximum flexibility and scalability

Each example demonstrated how templates enable rapid development by providing complete project structures, proper tooling, and best practices. The split architecture approach shows how to build scalable full-stack applications with independent deployment capabilities.

Remember: Templates are the foundation - start with the right template for your project type and customize as needed!
