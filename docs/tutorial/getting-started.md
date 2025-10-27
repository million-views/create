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
  - "../creating-templates.md"
  - "../reference/cli-reference.md"
  - "../guides/troubleshooting.md"
last_updated: "2024-10-26"
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

## Step 4: Using Optional Features

Templates can be customized with optional features. Let's create a project with multiple features enabled.

### Instructions

1. **Create a feature-rich project:**
   ```bash
   npm create @m5nv/scaffold my-feature-app -- \
     --from-template react-vite \
     --ide kiro \
     --options "auth,database,testing"
   ```

2. **Navigate to the project:**
   ```bash
   cd my-feature-app
   ```

3. **Explore the additional features that were added:**
   ```bash
   # Look for feature-specific files and directories
   find . -name "*auth*" -o -name "*database*" -o -name "*test*" | head -10
   ```

4. **Check the package.json for feature-specific scripts:**
   ```bash
   cat package.json | grep -A 10 '"scripts"'
   ```

### Expected Result

Your project now includes additional functionality based on the options you specified:

- **auth**: Authentication system files and configuration
- **database**: Database connection utilities and setup
- **testing**: Test framework and example tests

The setup process shows which features were configured:

```
🚀 Creating project: my-feature-app
📦 Template: react-vite
📁 Repository: million-views/templates

📥 Accessing template repository...
📋 Copying template files...
⚙️  Running template setup script...
🔧 Setting up comprehensive IDE and feature configuration...
📁 Project: my-feature-app
🎯 IDE: kiro
⚡ Features: auth, database, testing
✅ Project created successfully!
```

## Step 5: Preview Mode (Dry Run)

Before creating projects, you can preview what will happen using dry run mode.

### Instructions

1. **Preview a project creation without actually creating it:**
   ```bash
   npm create @m5nv/scaffold preview-app -- \
     --from-template express \
     --ide vscode \
     --options "api,logging" \
     --dry-run
   ```

2. **Review the preview output** to understand what would be created

### Expected Result

You'll see a detailed preview of all operations that would be performed:

```
🔍 DRY RUN MODE - Preview of operations (no changes will be made)

📋 Planned Operations:
┌─────────────────────────────────────────────────────────────────┐
│ Operation: Copy Template Files                                  │
│ Source: express template from million-views/templates          │
│ Target: ./preview-app/                                         │
│ Files: 12 files, 3 directories                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Operation: Execute Setup Script                                 │
│ Script: _setup.mjs                                             │
│ IDE: vscode                                                     │
│ Options: api, logging                                          │
└─────────────────────────────────────────────────────────────────┘

✅ Dry run completed - no actual changes were made
```

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

For custom repositories, you'd see similar output but pulling from your specified repository and branch. This is powerful for:

- **Company templates**: Internal project structures
- **Team standards**: Shared configurations and setups
- **Experimental templates**: Development branches with new features

## What you accomplished

Congratulations! You've successfully:

✅ **Created your first project** using @m5nv/create-scaffold  
✅ **Explored template discovery** with `--list-templates`  
✅ **Customized projects** with IDE-specific configurations  
✅ **Added optional features** to enhance your projects  
✅ **Used dry run mode** to preview operations  
✅ **Learned about custom repositories** for advanced use cases  

You now understand the core workflow:
1. **Discover** templates with `--list-templates`
2. **Preview** with `--dry-run` 
3. **Create** with your chosen template, IDE, and options
4. **Customize** further as needed

## Next steps

Now that you've mastered the basics, you might want to:

- 📖 **[Create Your Own Templates](../creating-templates.md)** - Build reusable project templates for your team
- 🔍 **[Complete CLI Reference](../reference/cli-reference.md)** - Explore all available commands and options
- 🚨 **[Troubleshooting Guide](../guides/troubleshooting.md)** - Fix common issues and problems
- 💡 **[Security Model](../explanation/security-model.md)** - Understand how the tool keeps you safe
- 🏗️ **[Template System](../explanation/template-system.md)** - Deep dive into how templates work

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