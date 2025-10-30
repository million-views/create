---
title: "Getting Started with @m5nv/create-scaffold"
type: "tutorial"
audience: "beginner"
estimated_time: "15 minutes"
prerequisites:
  - "Node.js (latest LTS) installed"
  - "Git installed and configured"
  - "Basic command line familiarity"
related_docs:
   - "../how-to/creating-templates.md"
   - "../reference/cli-reference.md"
   - "../guides/troubleshooting.md"
   - "first-template.md"
   - "../how-to/setup-recipes.md"
last_updated: "2024-11-07"
---

# Getting Started with @m5nv/create-scaffold

## What you'll learn

In this tutorial, you'll learn how to use @m5nv/create-scaffold to create new projects from templates. By the end, you'll understand how to scaffold projects, customize them for your IDE, and use optional features to tailor projects to your needs.

## What you'll build

You'll create three different projects:
1. A basic React project (simplest example)
2. An IDE-optimized project with features
3. A project from a custom template repository

## Prerequisites

Before starting this tutorial, make sure you have:

- **Node.js (latest LTS)** installed ([Download here](https://nodejs.org/))
  - Verify: `node --version` should show a supported version
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
   npm create @m5nv/scaffold my-first-app -- --from-template react-vite
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

2. **Create a project optimized for your IDE** (choose your IDE):
   ```bash
   # For Kiro IDE users:
   npm create @m5nv/scaffold my-kiro-app -- --from-template react-vite --ide kiro

   # For VSCode users:
   npm create @m5nv/scaffold my-vscode-app -- --from-template react-vite --ide vscode

   # For Cursor users:
   npm create @m5nv/scaffold my-cursor-app -- --from-template react-vite --ide cursor
   ```

3. **Navigate to your IDE-optimized project:**
   ```bash
   cd my-kiro-app  # or my-vscode-app, my-cursor-app
   ```

4. **Look for IDE-specific configuration:**
   ```bash
   ls -la
   # Look for .kiro/, .vscode/, or .cursor/ directories
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

Your IDE-optimized project will include configuration specific to your chosen IDE, making development smoother.

## Step 4: Combine Capabilities and Infrastructure

Templates declare structured dimensions in `template.json`. You can select values explicitly using `dimension=value` syntax (multi-select dimensions accept `+`-separated values).

### Instructions

1. **Create a feature-rich project with explicit dimensions:**
   ```bash
   npm create @m5nv/scaffold my-feature-app -- \
     --from-template react-vite \
     --ide kiro \
     --options "capabilities=auth+testing,infrastructure=cloudflare-d1"
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

> **How it maps:** Template authors describe these choices in `template.json` under `setup.dimensions`. The CLI normalizes your command-line flags into `ctx.options.byDimension` so setup scripts know exactly which features to enable, while `metadata.placeholders` tracks any remaining `{{TOKEN}}` values that still need to be replaced during setup.

## Step 5: Preview Mode (Dry Run)

Before creating projects, you can preview what will happen using dry run mode.

### Instructions

1. **Preview a project creation without actually creating it:**
   ```bash
   npm create @m5nv/scaffold preview-app -- \
     --from-template express \
     --ide vscode \
     --options "capabilities=api+logging" \
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

If the `tree` command is not available, you'll see a message explaining that the tree preview was skipped instead of the directory listing.

**What's useful about dry run?**
- See exactly what files will be created
- Understand what the setup script will do
- Verify your command is correct before running it
- Useful for automation and scripting

## Step 6: Working with Custom Repositories

You can use templates from any Git repository, not just the default one.

### Instructions

1. **Create a project from a custom repository** (this example uses a hypothetical custom repo):
   ```bash
   # Example with a custom repository
   npm create @m5nv/scaffold custom-project -- \
     --from-template my-template \
     --repo mycompany/templates \
     --branch develop
   ```

   **Note:** This command will fail since `mycompany/templates` doesn't exist, but it shows the syntax.

2. **List templates from a specific repository:**
   ```bash
   # This will also fail, but shows the pattern
   npm create @m5nv/scaffold -- \
     --list-templates \
     --repo mycompany/templates
   ```

### Expected Result

For custom repositories, you'd see similar output but pulling from your specified repository and branch. This approach helps with:

- **Company templates**: Internal project structures
- **Team standards**: Shared configurations and setups
- **Experimental templates**: Development branches with new features

## What you accomplished

Summary:

- Created a project using @m5nv/create-scaffold
- Explored template discovery with `--list-templates`
- Customized IDE-specific configuration
- Applied optional features during setup
- Ran dry run mode to inspect operations
- Practiced using custom repositories

Core workflow:
1. Discover templates with `--list-templates`
2. Preview with `--dry-run`
3. Create with your chosen template, IDE, and options
4. Customize further as needed

## Next steps

Next steps:

- [Create Your Own Templates](../how-to/creating-templates.md) — Build reusable project templates for your team
- [Complete CLI Reference](../reference/cli-reference.md) — Explore available commands and options
- [Troubleshooting Guide](../guides/troubleshooting.md) — Address common issues
- [Security Model](../explanation/security-model.md) — Review the protection mechanisms
- [Template System](../explanation/template-system.md) — Understand repository structure

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
1. Use `--no-cache` to bypass cache: `npm create @m5nv/scaffold my-app -- --from-template react-vite --no-cache`
2. Cache is stored in `~/.m5nv/cache/` - you can delete this directory if needed
