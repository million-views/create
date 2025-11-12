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
1. **Basic React App** - Simple frontend application
2. **API Server** - Backend service with REST API
3. **Full-Stack App** - Complete application with frontend and backend

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

2. **Create a React app project from your template:**
   ```bash
   npx @m5nv/create-scaffold my-react-app --template ./basic-react-app --repo local
   ```

3. **Navigate to the new project:**
   ```bash
   cd my-react-app
   ```

4. **Install dependencies and start development:**
   ```bash
   npm install
   npm start
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

## Example 2: API Server

Now let's scaffold a backend API server using the API Server template you created.

### Instructions

1. **Navigate back to the template workshop:**
   ```bash
   cd ..
   ```

2. **Create an API server project:**
   ```bash
   npx @m5nv/create-scaffold my-api-server --template ./api-server --repo local
   ```

3. **Navigate to the API project:**
   ```bash
   cd my-api-server
   ```

4. **Install dependencies and start the server:**
   ```bash
   npm install
   npm run dev
   ```

5. **Test the API endpoints:**
   ```bash
   # In another terminal, test the health endpoint
   curl http://localhost:3001/health

   # Test the users API
   curl http://localhost:3001/api/users
   ```

6. **Explore the API structure:**
   ```bash
   ls -la src/
   cat src/server.js
   ```

### Expected Result

You should have a running API server:

```
my-api-server/
├── package.json          # API server dependencies
├── src/
│   ├── server.js         # Express server setup
│   └── routes/
│       └── users.js      # User API routes
├── .env.example          # Environment configuration
└── node_modules/         # Installed dependencies
```

**Key Learning:** API templates provide complete backend setups with routing, middleware, and environment configuration, ready for development.

### Verification Steps

- Server starts successfully on port 3001
- Health endpoint returns status OK
- API routes are functional
- Environment variables are configured

## Example 3: Full-Stack Application

Finally, let's create a complete full-stack application using the Full-Stack App template that combines frontend and backend.

### Instructions

1. **Navigate back to the template workshop:**
   ```bash
   cd ..
   ```

2. **Create a full-stack application:**
   ```bash
   npx @m5nv/create-scaffold my-fullstack-app --template ./fullstack-app --repo local
   ```

3. **Navigate to the full-stack project:**
   ```bash
   cd my-fullstack-app
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Start the full-stack development environment:**
   ```bash
   npm run dev
   ```

6. **Test the application:**
   ```bash
   # The app should be running on localhost:3000
   # Frontend serves from client, backend API from server
   curl http://localhost:3000/health
   ```

7. **Explore the full-stack structure:**
   ```bash
   ls -la
   ls -la client/src/
   ls -la server/
   ```

### Expected Result

You should have a complete full-stack application:

```
my-fullstack-app/
├── package.json          # Full-stack dependencies and scripts
├── client/               # React frontend
│   ├── src/
│   │   ├── App.js        # React components
│   │   └── index.js      # Frontend entry point
│   ├── public/
│   └── webpack.config.js # Frontend build config
├── server/               # Express backend
│   ├── server.js         # Backend server
│   └── routes/           # API routes
└── shared/               # Shared utilities
```

**Key Learning:** Full-stack templates provide complete application architectures with both frontend and backend components, development tooling, and proper project organization.

### Verification Steps

- Both frontend and backend start successfully
- Frontend communicates with backend API
- Full-stack development workflow works
- Project structure supports both client and server development

## What you accomplished

You successfully scaffolded three different types of projects using templates you created:

1. **Basic React App** - Frontend application with modern tooling
2. **API Server** - Backend service with REST API endpoints
3. **Full-Stack App** - Complete application with integrated frontend and backend

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
- `template-workshop/my-react-app/` - React frontend project
- `template-workshop/my-api-server/` - Express API backend project
- `template-workshop/my-fullstack-app/` - Full-stack application project

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

You've now experienced the complete create-scaffold workflow:

1. **Basic Project**: Simple scaffolding workflow
2. **Customized Project**: Template options and preferences
3. **Feature Project**: Technology integration
4. **Team Project**: Production-ready configurations
5. **Advanced Workflow**: CLI power features

Remember: Start with basic templates and add options as your project needs grow. The scaffolding tool adapts to your requirements!
