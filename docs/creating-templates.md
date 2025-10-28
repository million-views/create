---
title: "How to Create Templates"
type: "guide"
audience: "intermediate"
estimated_time: "30 minutes"
prerequisites: 
  - "Basic familiarity with @m5nv/create-scaffold"
  - "Git repository management experience"
  - "Node.js and npm knowledge"
related_docs: 
  - "tutorial/getting-started.md"
  - "reference/cli-reference.md"
  - "reference/environment.md"
  - "how-to/setup-recipes.md"
last_updated: "2024-11-05"
---

# How to Create Templates

## Overview

This guide shows you how to create template repositories for @m5nv/create-scaffold. Use this when you want to share reusable project structures with your team or the community.

## When to use this guide

Use this guide when you need to:
- Create standardized project templates for your team
- Share reusable project structures with the community
- Set up templates with IDE-specific configurations
- Build templates with conditional features based on user options
- Implement complex setup logic for project initialization

## Prerequisites

Before following this guide, ensure you have:

- A GitHub account (or access to another Git hosting service)
- Node.js (latest LTS) installed
- Basic understanding of @m5nv/create-scaffold usage
- Familiarity with JavaScript ES modules

## Step-by-step instructions

### Step 1: Create your template repository

Create a new Git repository to house your templates:

```bash
# Create and initialize repository
mkdir my-templates
cd my-templates
git init
```

Each template lives in its own subdirectory at the root level:

```
my-templates/
├── react-vite/
│   ├── package.json
│   ├── src/
│   │   └── App.jsx
│   └── _setup.mjs          # Optional setup script
├── express-api/
│   ├── package.json
│   ├── server.js
│   └── _setup.mjs
└── nextjs-app/
    ├── package.json
    ├── pages/
    │   └── index.js
    └── _setup.mjs
```

**Template naming conventions:**
- Use kebab-case names: `react-vite`, `express-api`, `nextjs-app`
- Keep names descriptive but concise
- Avoid special characters or spaces

### Step 2: Create your first template

Let's create a simple React template as an example:

```bash
# Create template directory
mkdir react-vite
cd react-vite
```

Create the basic project structure:

**package.json:**
```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

**src/App.jsx:**
```jsx
function App() {
  return (
    <div>
      <h1>Welcome to {{PROJECT_NAME}}</h1>
      <p>Your React app is ready!</p>
    </div>
  );
}

export default App;
```

**Template guidelines:**
- Each template should be a complete, runnable project
- Use `{{PROJECT_NAME}}` placeholder for dynamic project names
- Include all necessary dependencies in package.json
- Provide clear file structure and sensible defaults

### Step 3: Add setup script for customization

Create a `_setup.mjs` file that exports a default async function. The runtime
provides a sandboxed Environment object (`{ ctx, tools }`), so you never import
Node built-ins:

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  await tools.placeholders.replaceAll(
    { PROJECT_NAME: ctx.projectName },
    ['README.md', 'package.json']
  );

  await tools.text.insertAfter({
    file: 'README.md',
    marker: '# {{PROJECT_NAME}}',
    block: ['## Commands', '- npm install', '- npm run dev']
  });

  await tools.json.set('package.json', 'scripts.dev', 'node index.js');
  await tools.json.addToArray('package.json', 'keywords', 'scaffold', { unique: true });

  await tools.options.when('testing', async () => {
    await tools.files.ensureDirs('tests');
    await tools.templates.renderFile(
      'templates/smoke.spec.js.tpl',
      'tests/smoke.spec.js',
      { PROJECT_NAME: ctx.projectName }
    );
  });

  if (ctx.ide) {
    await tools.ide.applyPreset(ctx.ide);
  }
}
```

Key ideas:

- **No imports.** All filesystem and templating work routes through `tools`.
- **Idempotent helpers.** Re-running the script produces the same output, which
  keeps dry-run previews meaningful.
- **Context-aware options.** `tools.options.when()` is the easiest way to
  toggle features.

Refer to the [Environment Reference](reference/environment.md)
for the exhaustive list of helpers.

> Need more examples? Jump to the [Setup Script Recipes](how-to/setup-recipes.md)
> guide for copy-ready snippets that build on the helpers shown here.

### Supported options metadata

If your setup logic only understands a specific vocabulary, declare it in
`template.json` so the CLI can warn users when they supply unknown options:

```json
{
  "name": "react-vite",
  "setup": {
    "supportedOptions": ["testing", "docs"]
  }
}
```

The scaffold still succeeds when the user provides extra options, but the CLI
prints a friendly warning.

### Post-create handoff instructions

Help users get productive immediately by adding a `handoff` array to `template.json`.
Each entry becomes a bullet under “Next steps” after scaffolding.

```json
{
  "name": "react-vite",
  "description": "React starter with Vite",
  "handoff": [
    "npm install",
    "npm run dev",
    "Open README.md for IDE-specific tips"
  ],
  "setup": {
    "supportedOptions": ["testing", "docs"]
  }
}
```

Keep each instruction short and actionable (commands, follow-up docs, etc.). When
`handoff` is omitted, the CLI falls back to `cd <project>` and a reminder to review
the README.

### Step 4: Test your template

Before publishing, test your template locally:

```bash
# Navigate back to your templates repository root
cd ..

# Test the template (replace 'yourusername' with your GitHub username)
npm create @m5nv/scaffold test-project -- --from-template react-vite --repo yourusername/my-templates
```

Verify the template works correctly:
1. Check that `{{PROJECT_NAME}}` placeholders were replaced
2. Ensure all files were copied correctly
3. Test that the project runs: `cd test-project && npm install && npm run dev`

### Step 5: Publish your template repository

Commit and push your templates to make them available:

```bash
# Add and commit your templates
git add .
git commit -m "Add React Vite template"

# Push to GitHub (create repository first)
git remote add origin https://github.com/yourusername/my-templates.git
git push -u origin main
```

## Setup Context & Tools quick reference

Every setup script receives the Environment object (`{ ctx, tools }`). The table below summarizes the most
common properties—see the full [Environment Reference](reference/environment.md)
for details.

| Item | Description |
|------|-------------|
| `ctx.projectName` | Sanitized project name. Ideal for injecting into README files, package metadata, or IDE settings. |
| `ctx.ide` | Target IDE (`kiro`, `vscode`, `cursor`, `windsurf`, or `null`). Pair with `tools.ide.applyPreset()`. |
| `ctx.options` | Array of options from `--options`. Use `tools.options.when()` for feature toggles. |
| `tools.placeholders` | Replace `{{TOKEN}}` strings across one or many files. |
| `tools.text` | Insert/ensure blocks, replace between markers, append lines, or run guarded search/replace. |
| `tools.files` | Ensure directories, copy/move/remove paths, write files, or copy directory trees. |
| `tools.json` | Read, set, remove, or merge JSON values using dot-path helpers. |
| `tools.templates` | Render project-local template files with placeholder values. |
| `tools.logger` | Emit informational messages during setup. |

The helpers are designed to be composable—prefer building small reusable
operations over reaching for raw filesystem APIs.
