---
title: "Getting Started with make-template"
type: "tutorial"
audience: "beginner"
estimated_time: "15 minutes"
prerequisites:
  - "Node.js v22+ installed"
  - "Git installed and configured"
  - "Basic command line familiarity"
  - "An existing Node.js project to convert"
related_docs:
  - "../how-to/creating-templates.md"
  - "../reference/cli-reference.md"
  - "../tutorial/getting-started.md"
  - "../how-to/author-workflow.md"
last_updated: "2025-11-12"
---

# Getting Started with make-template

## What you'll learn

In this tutorial, you'll learn how to convert existing projects into reusable templates using the `make-template` command. You'll understand the template authoring workflow and how to test your templates before sharing them.

## What you'll build

You'll convert a project into a template:
1. A working project into a reusable template using `make-template convert`
2. Test the template by creating a new project from it
3. Restore the template back to a working project

## Prerequisites

Before starting this tutorial, make sure you have:

- **Node.js v22+** installed ([Download here](https://nodejs.org/))
  - Verify: `node --version` should show v22 or higher
- **Git** installed and configured ([Setup guide](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup))
  - Verify: `git --version` should show git version info
- **15 minutes** available
- **An existing Node.js project** to convert (or create one using the [create-scaffold tutorial](getting-started.md))
- **Basic command line familiarity** (navigating directories, running commands)

## Step 1: Prepare Your Project

Let's start with an existing Node.js project that you'll convert into a template.

### Instructions

1. **Navigate to your existing project:**
   ```bash
   cd your-existing-project
   ```

2. **Verify it's a working project:**
   ```bash
   npm install
   npm test  # if tests exist
   npm run build  # if build script exists
   ```

3. **Check the current structure:**
   ```bash
   ls -la
   ```

### Expected Result

You should have a working Node.js project with:
- A `package.json` file
- Source code in appropriate directories
- Working npm scripts

**What makes a good template candidate?**
- Clean project structure
- Working build and test scripts
- No sensitive data (API keys, passwords)
- Reasonable dependencies

## Step 2: Convert Project to Template

Now let's convert your working project into a reusable template.

### Instructions

1. **Convert the project to a template:**
   ```bash
   npx @m5nv/make-template convert
   ```

2. **Review the conversion output** (it will show what files were processed)

3. **Examine the generated template files:**
   ```bash
   ls -la
   cat template.json
   ```

### Expected Result

The conversion will:
- Generate `template.json` with metadata about your template
- Create `_setup.mjs` for template setup logic
- Generate `.template-undo.json` for restoration
- Show a summary of processed files

```
🔄 Converting project to template...
📄 Generated template.json
⚙️  Generated _setup.mjs
🔄 Generated .template-undo.json
✅ Conversion complete!

Template ready for testing.
```

**What just happened?**
- Your project files were analyzed for placeholders and configuration
- Template metadata was extracted from `package.json`
- Setup scripts were generated to recreate the project structure
- An undo file was created to restore the original project

## Step 3: Test Your Template

Before sharing your template, test it by creating a new project from it.

### Instructions

1. **Create a test directory:**
   ```bash
   cd ..
   mkdir template-test
   cd template-test
   ```

2. **Create a project from your template:**
   ```bash
   npx @m5nv/create-scaffold my-test-project --template ../your-existing-project --repo local
   ```

3. **Navigate to the test project:**
   ```bash
   cd my-test-project
   ```

4. **Verify the generated project works:**
   ```bash
   npm install
   npm test  # if available
   npm run dev  # if available
   ```

### Expected Result

You should have a working project that matches your original:
- Same file structure and content
- Working npm scripts
- All dependencies properly configured

**Testing best practices:**
- Test on a different machine if possible
- Verify all scripts work as expected
- Check that sensitive data wasn't included
- Ensure the project builds and runs correctly

## Step 4: Restore Template to Project

Once you've tested your template, you can restore it back to a working project state.

### Instructions

1. **Navigate back to your template directory:**
   ```bash
   cd ../your-existing-project
   ```

2. **Restore the template to a working project:**
   ```bash
   npx @m5nv/make-template restore
   ```

3. **Verify the project is restored:**
   ```bash
   npm install
   npm run dev
   ```

### Expected Result

Your template should be restored to its original working project state:
- All template-specific files removed
- Original project files restored
- Working development environment

```
🔄 Restoring template to project...
📄 Removed template.json
⚙️  Removed _setup.mjs
🔄 Applied .template-undo.json
✅ Restoration complete!

Project ready for development.
```

## What you accomplished

Summary:

- Converted a working project into a reusable template
- Generated template metadata and setup scripts
- Tested the template by creating a new project
- Restored the template back to working project state

Core workflow:
1. Convert projects with `make-template convert`
2. Test templates with `create-scaffold`
3. Restore with `make-template restore`
4. Iterate and improve as needed

## Next steps

Next steps:

- [How to Create Templates](../how-to/creating-templates.md) — Advanced template authoring techniques
- [Author Workflow](../how-to/author-workflow.md) — Professional template development practices
- [Template Validation](../reference/cli-reference.md#make-template-validate) — Ensure template quality
- [Publishing Templates](../how-to/setup-recipes.md) — Share templates with your team
- [Template Testing](../reference/cli-reference.md#make-template-test) — Automated template validation

## Troubleshooting

### Conversion fails

**Problem:** `make-template convert` fails with errors
**Solution:**
1. Ensure you're in a Node.js project directory with `package.json`
2. Check for file permission issues
3. Try `--dry-run` first to see what would be changed
4. Clean the project of build artifacts and temporary files

### Template doesn't work

**Problem:** Created project from template doesn't work
**Solution:**
1. Check that all dependencies are in `package.json`
2. Verify file paths and references are correct
3. Test the original project still works
4. Use `make-template validate` to check template structure

### Restore fails

**Problem:** `make-template restore` doesn't work
**Solution:**
1. Ensure `.template-undo.json` exists and is valid
2. Check that the template files haven't been modified
3. Try restoring specific files with `--restore-files`
4. As last resort, recreate from git history

### Sensitive data in template

**Problem:** Template contains API keys or passwords
**Solution:**
1. Use `--sanitize-undo` during conversion
2. Manually remove sensitive files before conversion
3. Add sensitive files to `.gitignore`
4. Use placeholders for configuration values</content>
<parameter name="filePath">/Users/vijay/workspaces/ws-million-views/create/docs/tutorial/make-template-getting-started.md