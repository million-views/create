---
title: "Getting Started with create-scaffold"
type: "tutorial"
audience: "beginner"
estimated_time: "15 minutes"
prerequisites:
  - "Node.js v22+ installed"
  - "Git installed and configured"
  - "Basic command line familiarity"
related_docs:
  - "../how-to/creating-templates.md"
  - "../reference/cli-reference.md"
  - "../how-to/author-workflow.md"
  - "create-scaffold-examples.md"
  - "../how-to/setup-recipes.md"
last_updated: "2025-11-12"
---

# Getting Started with create-scaffold

## What you'll learn

In this tutorial, you'll learn how to create projects from templates using the `create-scaffold` command. You'll explore template discovery, customization options, and best practices for getting started with the @m5nv/create ecosystem.

## What you'll build

You'll create projects from templates:
1. A basic project from a template using `create-scaffold`
2. A customized project with template options
3. Projects from custom repositories

## Prerequisites

Before starting this tutorial, make sure you have:

- **Node.js v22+** installed ([Download here](https://nodejs.org/))
  - Verify: `node --version` should show v22 or higher
- **Git** installed and configured ([Setup guide](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup))
  - Verify: `git --version` should show git version info
- **15 minutes** available
- **Basic command line familiarity** (navigating directories, running commands)

## Step 1: Verify Your Environment

Let's make sure everything is set up correctly before we begin.

### Instructions

1. **Check Node.js version:**
   ```bash
   node --version
   ```

2. **Check Git installation:**
   ```bash
   git --version
   ```

3. **Check npm is working:**
   ```bash
   npm --version
   ```

### Expected Result

You should see version numbers for all three commands. If any command fails, install the missing tool before continuing.

**Example output:**
```
$ node --version
v20.10.0

$ git --version
git version 2.39.0

$ npm --version
10.2.4
```

## Step 2: Create Your First Project

Let's start with the simplest possible example - creating a React project.

### Instructions

1. **Create a basic React project:**
   ```bash
   npm create @m5nv/scaffold my-first-app -- --template react-vite
   ```

2. **Wait for the process to complete** (this may take a moment for the first run as it downloads the template)

3. **Navigate to your new project:**
   ```bash
   cd my-first-app
   ```

4. **Explore what was created:**
   ```bash
   ls -la
   ```

### Expected Result

You should see a new directory called `my-first-app` with a complete React project structure. The command will show progress messages like:

```
🚀 Creating project: my-first-app
📦 Template: react-vite
📁 Repository: million-views/templates

📥 Accessing template repository...
📋 Copying template files...
⚙️  Running template setup script...
✅ Project created successfully!

📂 Next steps:
  cd my-first-app
  - npm install
  - npm run dev
  - Review README.md for additional instructions
```

**What just happened?**
- The tool downloaded the `react-vite` template from the default repository
- It copied all template files to your `my-first-app` directory
- It ran any setup scripts to configure the project
- Your project is now ready to use!

## Step 3: Understanding Template Options

Now let's explore how to customize projects with IDE settings and optional features.

### Instructions

1. **First, see what templates are available:**
   ```bash
   npm create @m5nv/scaffold -- --list-templates
   ```

2. **Create a customized project with template options:**
   ```bash
   npm create @m5nv/scaffold my-custom-app -- --template react-vite --options "typescript,testing-focused"
   ```

3. **Navigate to your customized project:**
   ```bash
   cd my-custom-app
   ```

4. **Check what was created:**
   ```bash
   ls -la
   ```

### Expected Result

The `--list-templates` command shows all available templates:

```
📋 Discovering templates from million-views/templates...

Available Templates:
┌─────────────────┬──────────────────────────────────────────────┐
│ Template        │ Description                                  │
├─────────────────┼──────────────────────────────────────────────┤
│ react-vite      │ Modern React app with Vite build system     │
│ express         │ Node.js Express API server                  │
│ nextjs          │ Full-stack React framework                  │
│ library         │ JavaScript/TypeScript library template      │
└─────────────────┴──────────────────────────────────────────────┘
```

Your customized project will include the selected options and configurations.

## Step 4: Combine Capabilities and Infrastructure

Templates declare structured dimensions in `template.json`. You can select values explicitly using `dimension=value` syntax (multi-select dimensions accept `+`-separated values).

### Instructions

1. **Create a feature-rich project with explicit options:**
   ```bash
   npm create @m5nv/scaffold my-feature-app -- \
     --template react-vite \
     --options "typescript,testing-focused"
   ```

2. **Navigate to the project:**
   ```bash
   cd my-feature-app
   ```

3. **Inspect generated assets:**
   ```bash
   find src -maxdepth 2 -type f | head -5
   ```

4. **Confirm infrastructure configuration:**
   ```bash
   ls infra
   ```

### Expected Result

create-scaffold validates your selections against `template.json` and applies defaults for any omitted dimensions. The output highlights the normalized choices:

```
🚀 Creating project: my-feature-app
📦 Template: react-vite
📁 Repository: million-views/templates

📥 Accessing template repository...
📋 Copying template files...
⚙️  Running template setup script...
📁 Project: my-feature-app
🎯 IDE: kiro
⚡ Capabilities: auth, testing
🏗️ Infrastructure: cloudflare-d1
✅ Project created successfully!
```

Your project now includes authentication scaffolding, test utilities, and Cloudflare D1 infrastructure assets. If you select an unsupported value, the CLI fails fast with a clear validation error.

> **How it maps:** Template authors describe these choices in `template.json` under `metadata.dimensions`. The CLI normalizes your command-line flags into `ctx.options.byDimension` so setup scripts know exactly which features to enable, while `metadata.placeholders` tracks any remaining `{{TOKEN}}` values that still need to be replaced during setup.

## Step 5: Preview Mode (Dry Run)

Before creating projects, you can preview what will happen using dry run mode.

### Instructions

1. **Preview a project creation without actually creating it:**
   ```bash
   npm create @m5nv/scaffold preview-app -- \
     --template express \
     --options "typescript" \
     --dry-run
   ```

2. **Review the preview output** to understand what would be created

### Expected Result

You'll see a detailed preview of all operations that would be performed:

```
🔍 DRY RUN MODE - Preview of planned operations (no changes will be made)

📦 Template: express
🌐 Repository: million-views/templates
📁 Target Directory: preview-app
🗂️ Template Path: ~/.m5nv/cache/XXXXXXXXXXXX/express

📄 Summary:
   • Directories: 2
   • Files: 6
   • Setup Scripts: 1

📋 File Copy (6 total):
   • ./ (3 files)
   • src/ (2 files)
   • public/ (1 file)

⚙️ Setup Script (1 operations):
   ⚙️ Execute setup script: _setup.mjs

📊 Total operations: 9
💡 Dry run only – no changes will be made.

🌲 Template structure (depth 2):
preview-app
├── package.json
├── README.md
└── src
    └── index.js

✅ Dry run completed - no actual changes were made
```

## Step 6: Working with Custom Repositories

You can use templates from any Git repository, not just the default one.

### Instructions

1. **Create a project from a custom repository** (this example uses a hypothetical custom repo):
   ```bash
   # Example with a custom repository
   npm create @m5nv/scaffold custom-project -- \
     --template my-template \
     --branch main
   ```
     --repo mycompany/templates \
     --branch develop
   ```

   **Note:** This command will fail since `mycompany/templates` doesn't exist, but it shows the syntax.

2. **List templates from a specific repository:**
   ```bash
   # List templates from a specific registry
   npm create @m5nv/scaffold -- --list-templates --registry mycompany
   ```

### Expected Result

For custom repositories, you'd see similar output but pulling from your specified repository and branch. This approach helps with:

- **Company templates**: Internal project structures
- **Team standards**: Shared configurations and setups
- **Experimental templates**: Development branches with new features

## What you accomplished

Summary:

- Created projects using create-scaffold
- Explored template discovery with `--list-templates`
- Applied template options during setup
- Ran dry run mode to inspect operations
- Practiced using custom repositories

Core workflow:
1. Discover templates with `--list-templates`
2. Preview with `--dry-run`
3. Create with your chosen template and options
4. Customize further as needed

## Step 7: Production Readiness

Before deploying to production, ensure your scaffolded project is production-ready.

### Instructions

1. **Configure production environment:**
   ```bash
   cd my-feature-app

   # Create production environment file
   cp .env.example .env.production 2>/dev/null || echo "# Production environment variables" > .env.production

   # Edit with production values (database URLs, API keys, etc.)
   nano .env.production
   ```

2. **Build for production:**
   ```bash
   # Install all dependencies
   npm install

   # Build the application (if it has a build step)
   npm run build 2>/dev/null || echo "No build step needed"

   # Check for production artifacts
   ls -la dist/ build/ out/ 2>/dev/null || echo "No build output directory found"
   ```

3. **Test production startup:**
   ```bash
   # Start in production mode
   NODE_ENV=production npm start &
   SERVER_PID=$!

   # Wait a moment for startup
   sleep 3

   # Test the application
   curl http://localhost:3000 2>/dev/null || echo "Application may not be running on port 3000"

   # Stop the test server
   kill $SERVER_PID 2>/dev/null || true
   ```

4. **Security audit:**
   ```bash
   # Check for security vulnerabilities
   npm audit --audit-level moderate

   # Verify no sensitive data in source
   grep -r "password\|secret\|key" . --exclude-dir=node_modules --exclude-dir=.git | head -5 || echo "No obvious secrets found"
   ```

### Expected Result

Your project should:
- ✅ Have production environment variables configured
- ✅ Build successfully (if applicable)
- ✅ Start in production mode without errors
- ✅ Pass basic security checks

**Production deployment options:**
- **Cloudflare Workers**: Use `wrangler deploy` for edge deployment
- **Linode VPS**: Use PM2 and nginx for traditional server deployment
- **Other platforms**: Follow platform-specific deployment guides

See [Production Deployment](../how-to/production-deployment.md) for detailed deployment instructions.

## Next steps

Next steps:

- [Create Your Own Templates](../how-to/creating-templates.md) — Build reusable project templates for your team
- [Complete CLI Reference](../reference/cli-reference.md) — Explore available commands and options
- [create-scaffold Examples](create-scaffold-examples.md) — Hands-on examples with increasing complexity
- [make-template Tutorial](make-template-getting-started.md) — Learn to convert projects into templates
- [Troubleshooting Guide](../guides/troubleshooting.md) — Address common issues

## Troubleshooting

### Template not found

**Problem:** `Template not found in the repository`
**Solution:**
1. Check the template name with `--list-templates`
2. Verify you're using the correct repository with `--repo`
3. Try `--no-cache` to get the latest repository version

### Git authentication failed

**Problem:** `Authentication failed` when accessing repositories
**Solution:**
1. Ensure git is configured: `git config --global user.name "Your Name"`
2. For private repositories, set up SSH keys or personal access tokens
3. Test git access: `git clone https://github.com/million-views/templates.git test-clone`

### Node.js version too old

**Problem:** `Node.js version requirement not met`
**Solution:**
1. Update Node.js from [nodejs.org](https://nodejs.org/)
2. Or use a version manager like nvm: `nvm install --lts && nvm use --lts`
3. Verify: `node --version`

### Permission denied errors

**Problem:** `Permission denied` when creating directories
**Solution:**
1. Ensure you have write permissions in the current directory
2. Try creating the project in your home directory or a different location
3. On macOS/Linux, check directory permissions: `ls -la`

### Cache issues

**Problem:** Getting old template versions or cache errors
**Solution:**
1. Use `--no-cache` to bypass cache: `npm create @m5nv/scaffold my-app -- --template react-vite --no-cache`
2. Cache is stored in `~/.m5nv/cache/` - you can delete this directory if needed
