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
  - "create-scaffold.md"
  - "../how-to/setup-recipes.md"
last_updated: "2025-11-12"
---

# Getting Started with create-scaffold

## What you'll learn

In this tutorial, you'll set up your development environment and verify that you have everything needed to work with create-scaffold and make-template. This tutorial focuses on prerequisites and environment setup.

## What you'll accomplish

You'll verify your development environment is ready for:
1. Creating templates with `make-template`
2. Scaffolding projects with `create-scaffold`

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
v22.10.0

$ git --version
git version 2.39.0

$ npm --version
10.2.4
```

## Step 2: Verify create-scaffold Installation

Let's make sure the create-scaffold tool is available.

### Instructions

1. **Check if create-scaffold is available:**
   ```bash
   npx @m5nv/create-scaffold --help
   ```

### Expected Result

You should see the help text for create-scaffold, showing available commands and options.

## Step 3: Verify make-template Installation

Let's also verify that make-template is available.

### Instructions

1. **Check if make-template is available:**
   ```bash
   npx make-template --help
   ```

### Expected Result

You should see the help text for make-template, showing available commands and options.

## What you accomplished

You successfully verified that your development environment is ready for working with create-scaffold and make-template:

- ✅ Node.js v22+ is installed and working
- ✅ Git is installed and configured
- ✅ npm is available
- ✅ create-scaffold CLI tool is accessible
- ✅ make-template CLI tool is accessible

Your environment is now ready for template development and project scaffolding!

## Next steps

Now that your environment is set up, you can proceed to the hands-on tutorials:

- **[make-template Tutorial](make-template.md)** — Learn how to create templates from existing projects
- **[Create Scaffold Tutorial](create-scaffold.md)** — Learn how to scaffold projects from templates

## Troubleshooting

### Node.js version issues

**Problem:** `node --version` shows version below v22
**Solution:**
1. Download and install Node.js v22+ from [nodejs.org](https://nodejs.org/)
2. Restart your terminal/command prompt
3. Verify with `node --version`

### Git not found

**Problem:** `git --version` command not found
**Solution:**
1. Install Git from [git-scm.com](https://git-scm.com/)
2. Configure Git with your name and email:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

### CLI tools not accessible

**Problem:** `npx @m5nv/create-scaffold --help` fails
**Solution:**
1. Check your internet connection
2. Try clearing npm cache: `npm cache clean --force`
3. Verify npm is working: `npm --version`
