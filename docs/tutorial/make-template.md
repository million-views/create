---
title: "make-template Tutorial"
description: "Learn to create templates using make-template, starting with minimal templates and progressively adding features"
type: tutorial
audience: "beginner"
estimated_time: "20 minutes"
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

In this tutorial, you'll learn how to create templates using make-template's progressive enhancement approach. You'll start with a minimal template that beginners can understand, then learn how to add advanced features like auto-templatization, setup scripts, and complex placeholder systems.

## What you'll build

You'll create templates that demonstrate progressive complexity:

1. **Minimal Template** - Basic template with required fields only (learn the foundation)
2. **Enhanced Template** - Add auto-templatization and setup scripts (learn automation)
3. **Advanced Template** - Full-featured template with custom placeholders (learn customization)

Each step builds on the previous one, showing how to start simple and add complexity as needed.

## Prerequisites

Before starting this tutorial, make sure you have:

- **Node.js v22+** installed ([Download here](https://nodejs.org/))
  - Verify: `node --version` should show v22 or higher
- **Git** installed and configured ([Setup guide](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup))
  - Verify: `git --version` should show git version info
- **20 minutes** available
- **Basic command line familiarity** (navigating directories, running commands)
- **Completed the [getting-started tutorial](getting-started.md)**

## Step 1: Create Minimal Template

Start with the simplest possible template to understand the foundation.

### Quick Setup

```bash
mkdir template-workshop && cd template-workshop
```

### Create a Minimal Template

The minimal template requires only 5 fields and can be created automatically:

```bash
npx make-template init my-minimal-template
```

This creates a `template.json` file with the required fields:

```json
{
  "schemaVersion": "1.0.0",
  "id": "your-org/my-minimal-template",
  "name": "My Minimal Template",
  "description": "A minimal template example",
  "placeholders": {
    "PROJECT_NAME": {
      "default": "my-project",
      "description": "The project name"
    }
  }
}
```

**Why this matters:** The minimal template gives you a working starting point. The `id` field uniquely identifies your template, and the `placeholders` define what users can customize.

### Test the Minimal Template

Let's test that this minimal template works:

```bash
# Create a test project using the template
npx create-scaffold new test-project --template ./my-minimal-template --yes
cd test-project
ls -la
```

You should see the basic project structure created from your minimal template.

### What You Learned

- **Minimal Template**: Start with just the required fields (schemaVersion, id, name, description, placeholders)
- **Template ID**: Unique identifier in `org/name` format
- **Basic Placeholders**: Simple customization points for users
- **Quick Start**: `init` command creates a working template instantly

## Step 2: Enhance with Auto-Templatization

Now let's enhance our minimal template by converting an existing project with auto-templatization.

### Create a Sample Project

```bash
cd ..
mkdir sample-project && cd sample-project
npm init -y
echo "# {{PROJECT_NAME}}" > README.md
echo "console.log('Hello from {{AUTHOR}}');" > index.js
```

### Convert to Template with Auto-Detection

Use the `convert` command to automatically detect and replace placeholders:

```bash
npx make-template convert . --yes
```

This creates an enhanced `template.json` with auto-detected placeholders:

```json
{
  "schemaVersion": "1.0.0",
  "id": "your-org/sample-project",
  "name": "Sample Project Template",
  "description": "A sample project with auto-detected placeholders",
  "placeholders": {
    "PROJECT_NAME": {
      "default": "sample-project",
      "description": "The project name"
    },
    "AUTHOR": {
      "default": "Your Name",
      "description": "Author information"
    }
  }
}
```

**Why this matters:** Auto-templatization automatically finds project-specific values in package.json, README files, and source code, making template creation much faster.

### Test the Enhanced Template

```bash
cd ..
npx create-scaffold new enhanced-test --template ./sample-project --yes
cd enhanced-test
cat README.md
cat index.js
```

You should see the placeholders have been replaced with values.

### What You Learned

- **Auto-Templatization**: `convert` command automatically detects placeholders
- **Enhanced Template**: Builds on minimal template with auto-detected values
- **Faster Creation**: No manual placeholder replacement needed

## Step 3: Advanced Customization

Let's create a fully customized template with setup scripts and advanced features.

### Create an Advanced Template

```bash
cd ..
npx make-template init advanced-template
```

### Add Setup Scripts

Edit the generated `template.json` to add a setup script:

```json
{
  "schemaVersion": "1.0.0",
  "id": "your-org/advanced-template",
  "name": "Advanced Template",
  "description": "A template with setup scripts and advanced features",
  "placeholders": {
    "PROJECT_NAME": {
      "default": "advanced-project",
      "description": "The project name"
    }
  },
  "setup": {
    "script": "_setup.mjs",
    "environment": {
      "NODE_ENV": "development"
    }
  }
}
```

Create the setup script `_setup.mjs`:

```javascript
#!/usr/bin/env node

console.log('🚀 Setting up {{PROJECT_NAME}}...');

// Install dependencies
console.log('📦 Installing dependencies...');
// Your setup logic here

console.log('✅ Setup complete!');
```

### Add Template Files

Create a `templates/` directory with template files:

```bash
mkdir templates
echo "console.log('Hello from {{PROJECT_NAME}}!');" > templates/index.js.tpl
```

### Test the Advanced Template

```bash
npx create-scaffold new advanced-test --template ./advanced-template --yes
cd advanced-test
ls -la
```

You should see the setup script ran and template files were processed.

### What You Learned

- **Setup Scripts**: Automate post-scaffolding tasks with `_setup.mjs`
- **Template Files**: Use `.tpl` files for complex file generation
- **Advanced Features**: Add environment variables, custom logic, and automation
- **Progressive Enhancement**: Start minimal, add features as needed

## What You Accomplished

You created three templates demonstrating progressive enhancement:

1. **Minimal Template** - Basic template with required fields only
2. **Enhanced Template** - Auto-templatization with detected placeholders
3. **Advanced Template** - Full-featured template with setup scripts and custom files

Each step builds on the previous one, showing how to start simple and add complexity as needed.

## Next Steps

- **[Create Scaffold Tutorial](create-scaffold.md)** - Use these templates to scaffold new projects
- [Template Validation](../reference/cli-reference.md#make-template-commands) - Ensure template quality
- [Progressive Enhancement](../how-to/creating-templates.md#progressive-enhancement) - Learn advanced template features

## Template Locations

Your templates are ready in `template-workshop/`:
- `my-minimal-template/` - Minimal template foundation
- `sample-project/` - Enhanced with auto-templatization
- `advanced-template/` - Full-featured with setup scripts

## Troubleshooting

**Init fails:** Ensure you're in an empty directory, check Node.js version
**Conversion fails:** Ensure Node.js project with package.json, run `npm install` first
**Missing placeholders:** Use double braces `{{VARIABLE}}`, verify template.json
**Setup script issues:** Check `_setup.mjs` syntax and permissions