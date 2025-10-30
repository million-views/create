---
title: "Your First Template - Hands-On Examples"
type: "tutorial"
audience: "beginner"
estimated_time: "20 minutes"
prerequisites:
  - "Completed Getting Started tutorial"
  - "Node.js (latest LTS) installed"
  - "Git installed and configured"
related_docs:
  - "getting-started.md"
   - "../how-to/creating-templates.md"
  - "../reference/environment.md"
  - "../how-to/setup-recipes.md"
last_updated: "2024-11-07"
---

# Your First Template - Hands-On Examples

## What you'll learn

In this hands-on tutorial, you'll build progressively complex projects using @m5nv/create-scaffold, starting with the simplest possible example and gradually adding complexity. By the end, you'll understand how templates adapt to different scenarios and how to leverage advanced features.

> This tutorial focuses on template consumers operating create-scaffold. If you want to build or maintain templates, jump to [How to Create Templates](../how-to/creating-templates.md) after completing this walkthrough.

## What you'll build

You'll create five projects with increasing complexity:
1. **Minimal Project** - Simplest possible setup
2. **IDE-Optimized Project** - Enhanced for your development environment
3. **Feature-Rich Project** - Multiple integrated features
4. **Team Project** - Production-ready with full tooling
5. **Custom Workflow** - Advanced template usage patterns

## Prerequisites

Before starting this tutorial, make sure you have:

- **Completed the [Getting Started tutorial](getting-started.md)**
- **Node.js (latest LTS)** and **Git** installed and working
- **20 minutes** available for hands-on practice
- **A code editor** ready (preferably Kiro, VSCode, or Cursor)

## Example 1: Minimal Project (Simplest Start)

Let's begin with the absolute simplest example to understand the core workflow.

### Instructions

1. **Create the most basic project possible:**
   ```bash
   npm create @m5nv/scaffold minimal-demo -- --from-template react-vite
   ```

2. **Navigate and explore:**
   ```bash
   cd minimal-demo
   ls -la
   ```

3. **Verify it works:**
   ```bash
   npm install
   npm run dev
   ```

4. **Stop the dev server** (Ctrl+C) and **examine the structure:**
   ```bash
   tree -L 2  # or use 'find . -type d -maxdepth 2' if tree isn't available
   ```

### Expected Result

You'll see a clean React project with Vite:

```
minimal-demo/
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── public/
    └── vite.svg
```

**Key Learning:** This is the baseline - a working project with zero customization. The template provides a solid foundation that "just works."

### Verification Steps

- `npm install` completes without errors
- `npm run dev` starts a development server
- Opening `http://localhost:5173` shows a React app
- The project structure follows modern React conventions

## Example 2: IDE-Optimized Project (Adding Intelligence)

Now let's add IDE-specific optimizations to enhance your development experience.

### Instructions

1. **Create an IDE-optimized project** (choose your IDE):
   ```bash
   # For Kiro users:
   npm create @m5nv/scaffold kiro-demo -- --from-template react-vite --ide kiro

   # For VSCode users:
   npm create @m5nv/scaffold vscode-demo -- --from-template react-vite --ide vscode

   # For Cursor users:
   npm create @m5nv/scaffold cursor-demo -- --from-template react-vite --ide cursor
   ```

2. **Navigate to your project:**
   ```bash
   cd kiro-demo  # or vscode-demo, cursor-demo
   ```

3. **Explore the IDE-specific additions:**
   ```bash
   # Look for IDE configuration directories
   ls -la | grep -E '\.(kiro|vscode|cursor)'

   # Examine the IDE configuration
   find . -name "*.json" -path "./.kiro/*" -o -path "./.vscode/*" -o -path "./.cursor/*"
   ```

4. **Open the project in your IDE** and notice the enhanced experience

### Expected Result

Your project now includes IDE-specific configuration:

**For Kiro users:**
```
.kiro/
├── settings.json     # Kiro-specific editor settings
└── tasks.json        # Kiro task definitions
```

**For VSCode users:**
```
.vscode/
├── settings.json     # VSCode workspace settings
├── extensions.json   # Recommended extensions
└── launch.json       # Debug configurations
```

Result: IDE presets add configuration for syntax highlighting, debugging, and recommended extensions.

### Verification Steps

- IDE recognizes the project with enhanced features
- Recommended extensions are suggested (VSCode)
- Debug configurations are available
- Code formatting and linting operate with the new settings

## Example 3: Feature-Rich Project (Integrated Functionality)

Let's add multiple features that work together to create a more complete application.

### Instructions

1. **Create a project with integrated features:**
   ```bash
  npm create @m5nv/scaffold feature-demo -- \
    --from-template react-vite \
    --ide kiro \
    --options "capabilities=auth+database+testing+logging"
   ```

2. **Navigate and explore the enhanced structure:**
   ```bash
   cd feature-demo
   tree -L 3  # or use find for deeper exploration
   ```

3. **Examine feature-specific files:**
   ```bash
   # Look for authentication files
   find . -name "*auth*" -type f

   # Look for database files
   find . -name "*database*" -o -name "*db*" -type f

   # Look for testing files
   find . -name "*test*" -o -name "*spec*" -type f
   ```

4. **Check the integrated package.json:**
   ```bash
   cat package.json | jq '.scripts'  # or just: grep -A 10 '"scripts"' package.json
   ```

### Expected Result

Your project now has a rich feature set:

```
feature-demo/
├── src/
│   ├── auth/           # Authentication system
│   │   └── auth.js
│   ├── database/       # Database connectivity
│   │   └── database.js
│   └── logging/        # Structured logging
│       └── logger.js
├── tests/              # Testing utilities
│   └── utils.js
├── config/             # Configuration management
│   └── default.json
└── integration-config.json  # Feature integration settings
```

Result: The auth system integrates with the database, logging captures authentication events, and tests cover the combined functionality.

### Verification Steps

- Multiple feature directories are created
- `integration-config.json` shows how features connect
- `package.json` includes scripts for each feature
- IDE configuration reflects the enabled features

## Setup Deep Dive: Using the Helper Toolkit

Let’s pause and customize the `feature-demo` project you just generated. The
setup script lives at `templates/react-vite/_setup.mjs` inside your template
repository and receives the Environment object (`{ ctx, tools }`) from the sandbox.

1. **Open the setup script** shipped with the template (inside your template
   repository). For example:
   ```bash
   sed -n '1,160p' templates/react-vite/_setup.mjs
   ```

2. **Identify helper usage:** The template relies on the curated helper toolkit.
   A typical script now looks like:
   ```javascript
   export default async function setup({ ctx, tools }) {
     await tools.placeholders.replaceAll(
       { PROJECT_NAME: ctx.projectName },
       ['README.md', 'package.json']
     );

     await tools.text.ensureBlock({
       file: 'README.md',
       marker: '# {{PROJECT_NAME}}',
       block: ['## Getting Started', '- npm install', '- npm run dev']
     });

     await tools.json.set('package.json', 'scripts.dev', 'vite dev');
     await tools.json.mergeArray('package.json', 'keywords', ['scaffold'], { unique: true });

     await tools.options.when('docs', async () => {
       await tools.files.ensureDirs('docs');
       await tools.templates.renderFile('templates/docs.tpl', 'docs/README.md', {
         PROJECT_NAME: ctx.projectName
       });
     });

     if (ctx.ide) {
       await tools.ide.applyPreset(ctx.ide);
     }
   }
   ```

3. **Understand what changed:**
   - `tools.text.ensureBlock` inserts a README block once and keeps it
     idempotent.
   - `tools.json.set` and `tools.json.mergeArray` mutate `package.json`
     without manual parsing.
   - `tools.files.ensureDirs` + `tools.templates.renderFile` handle asset
     creation without exposing raw `fs`.

4. **Experiment:** Edit `_setup.mjs` and rerun the CLI. Because helpers are
   idempotent, re-running the script produces deterministic output and keeps
   dry-run previews accurate.

5. **Need more patterns?** The [Setup Script Recipes](../how-to/setup-recipes.md)
   how-to guide contains copy-ready snippets that build on these helpers.

### Inline vs composable updates

- **Inline iteration** keeps authored files (README, package.json, etc.) in place with `{{TOKEN}}` markers recorded under `metadata.placeholders`. The setup script swaps those tokens using `tools.placeholders` and `tools.text.*`, which is ideal when you only need to personalize text inside an otherwise complete project.
- **Composable assembly** moves reusable assets into `authorAssetsDir` (for example `__scaffold__/`) and conditionally copies or renders them with `tools.files.copyTemplateDir` or `tools.templates.renderFile`. Pair this with `setup.dimensions` + `tools.options` when features or infrastructure choices dictate which snippets belong in the final scaffold.
- **Hybrid workflows** often start inline, then graduate specific files to composable assets once they need branching. Because `metadata.placeholders` still documents every token, you have a clear checklist of values that must be provided either via direct replacement or via rendered templates.

## Example 4: Team Project (Production-Ready Setup)

Now let's create a project ready for team development with full tooling.

### Instructions

1. **Create a comprehensive team project:**
   ```bash
  npm create @m5nv/scaffold team-project -- \
    --from-template react-vite \
    --ide vscode \
    --options "capabilities=auth+database+api+testing+logging+config"
   ```

2. **Navigate and examine the comprehensive setup:**
   ```bash
   cd team-project
   ls -la
   ```

3. **Explore the API integration:**
   ```bash
   # Look at API structure
   find . -path "*/api/*" -type f

   # Check for configuration files
   find . -name "*.json" -o -name "*.config.*" | head -10
   ```

4. **Review the team-ready package.json:**
   ```bash
   cat package.json | jq '.scripts, .features, .ideConfiguration'
   ```

5. **Test the integrated features:**
   ```bash
   npm install
   # Try running different scripts
   npm run test 2>/dev/null || echo "Tests configured but need implementation"
   npm run api 2>/dev/null || echo "API configured but needs startup"
   ```

### Expected Result

A production-ready project with comprehensive tooling:

```
team-project/
├── src/
│   ├── auth/           # Authentication with API integration
│   ├── database/       # Database with connection pooling
│   ├── api/            # RESTful API endpoints
│   └── logging/        # Production logging
├── tests/              # Comprehensive test suite
├── config/             # Environment-based configuration
├── .vscode/            # Team VSCode settings
│   ├── settings.json   # Shared workspace settings
│   ├── extensions.json # Required extensions for team
│   └── launch.json     # Debug configurations
└── integration-config.json  # Cross-feature integration
```

**Key Learning:** All features are designed to work together as a cohesive system. Authentication protects API endpoints, database operations are logged, and everything is testable.

### Verification Steps

- All features are present and integrated
- VSCode workspace is configured for team development
- `package.json` includes comprehensive scripts
- Configuration supports different environments

## Example 5: Custom Workflow (Advanced Patterns)

Finally, let's explore advanced usage patterns including dry runs, caching, and custom repositories.

### Instructions

1. **First, preview a complex project without creating it:**
   ```bash
  npm create @m5nv/scaffold preview-project -- \
    --from-template react-vite \
    --ide cursor \
    --options "capabilities=auth+database+api+testing+logging+config" \
    --dry-run
   ```

2. **Explore template discovery:**
   ```bash
   # List all available templates
   npm create @m5nv/scaffold -- --list-templates

   # Get fresh template list (bypass cache)
   npm create @m5nv/scaffold -- --list-templates --no-cache
   ```

3. **Create a project with custom caching:**
   ```bash
  npm create @m5nv/scaffold cached-project -- \
    --from-template express \
    --ide kiro \
    --options "capabilities=api+logging" \
     --cache-ttl 48
   ```

4. **Enable detailed logging for debugging:**
   ```bash
  npm create @m5nv/scaffold logged-project -- \
    --from-template react-vite \
    --ide vscode \
    --options "capabilities=testing" \
     --log-file ./scaffold-debug.log
   ```

5. **Examine the detailed log:**
   ```bash
   cat scaffold-debug.log | head -20
   ```

### Expected Result

**Dry run output shows planned operations:**
```
🔍 DRY RUN MODE - Preview of planned operations (no changes will be made)

📦 Template: react-vite
📁 Target Directory: preview-project

📄 Summary:
   • Directories: 3
   • Files: 8
   • Setup Scripts: 1

📋 File Copy (... operations):
   📄 Copy: package.json
   📄 Copy: src/main.tsx
   📄 Copy: src/App.tsx
   ...

⚙️ Setup Script (1 operations):
   ⚙️ Execute setup script: _setup.mjs

🌲 Template structure (depth 2):
preview-project
├── package.json
├── src
│   ├── App.tsx
│   └── main.tsx
└── public
    └── index.html
```

If the `tree` command is missing, the CLI explains that the tree view was skipped so you still know why it’s absent.

**Template discovery shows all options:**
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
│ fastify         │ High-performance Node.js web framework      │
└─────────────────┴──────────────────────────────────────────────┘
```

Observation: Advanced flags make it possible to preview operations, manage cache lifetime, and capture detailed logs before running a scaffold.

### Verification Steps

- Dry run shows exactly what would be created
- Template discovery reveals available options
- Custom cache TTL improves performance for repeated operations
- Detailed logging helps debug any issues

## Progressive Complexity Summary

Let's review what we built and the complexity progression:

| Example | Complexity | Features | Use Case |
|---------|------------|----------|----------|
| **Minimal** | ⭐ | Basic template only | Quick prototypes, learning |
| **IDE-Optimized** | ⭐⭐ | + IDE configuration | Personal development |
| **Feature-Rich** | ⭐⭐⭐ | + Multiple integrated features | Small team projects |
| **Team Project** | ⭐⭐⭐⭐ | + All features + team settings | Production applications |
| **Custom Workflow** | ⭐⭐⭐⭐⭐ | + Advanced CLI features | Enterprise/automation |

## What you accomplished

Summary of skills practiced:

- Progressive complexity — From simple to advanced project setups
- IDE integration — Optimizing projects for specific environments
- Feature composition — Combining multiple features
- Team workflows — Creating collaborative project structures
- Advanced patterns — Dry runs, caching, logging, and debugging

These examples show how templates scale from simple prototypes to complex applications while maintaining consistent structure.

## Next steps

Recommended next readings:

- [Creating Your Own Templates](../how-to/creating-templates.md) — Build custom templates for specific needs
- [Environment Reference](../reference/environment.md) — Understand how setup scripts receive context
- [CLI Reference](../reference/cli-reference.md) — Review available options and parameters
- [Template System Architecture](../explanation/template-system.md) — Learn how the system is structured
- [Troubleshooting Complex Setups](../guides/troubleshooting.md) — Debug advanced scenarios

## Key Takeaways

### Template Selection Strategy

**Choose templates based on your project needs:**
- **react-vite**: Modern React applications
- **express**: API servers and backends
- **nextjs**: Full-stack React applications
- **library**: Reusable JavaScript/TypeScript packages

### IDE Optimization Benefits

**IDE flags provide immediate value:**
- **Kiro**: Advanced debugging and task integration
- **VSCode**: Extension recommendations and workspace settings
- **Cursor**: AI-powered development optimizations
- **Windsurf**: Collaborative development features

### Feature Composition Principles

**Feature composition notes:**
- **auth + api**: Secure API endpoints
- **database + auth**: Persistent user management
- **logging + all features**: Comprehensive observability
- **testing + all features**: Quality assurance coverage

### Advanced Usage Patterns

**Power features for sophisticated workflows:**
- **--dry-run**: Always preview complex setups
- **--list-templates**: Discover available options
- **--log-file**: Debug issues with detailed logging
- **--cache-ttl**: Optimize performance for repeated operations

Remember: Start simple and add complexity as needed. The scaffolding tool grows with your project requirements!
