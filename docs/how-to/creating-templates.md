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
  - "../tutorial/getting-started.md"
  - "../reference/cli-reference.md"
  - "../reference/environment.md"
  - "setup-recipes.md"
  - "author-workflow.md"
  - "../reference/template-schema.md"
last_updated: "2025-11-12"
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

> **Note:** This guide builds on the templates created in the [make-template tutorial](../tutorial/make-template.md), which creates `basic-react-spa`, `ssr-portfolio-app`, and `portfolio-api` templates. This guide shows advanced templating features like composable templates with dimensions, conditional asset inclusion, and complex setup scripts that go beyond the basic WYSIWYG approach covered in the tutorial.

## Progressive Enhancement Approach

Start with a minimal template and add features as needed:

### Level 1: Minimal Template
```json
{
  "schemaVersion": "1.0.0",
  "id": "author/minimal-template",
  "name": "Minimal Template",
  "description": "A minimal template example",
  "placeholders": {
    "PROJECT_NAME": {
      "default": "my-project",
      "description": "The project name"
    }
  }
}
```

### Level 2: Add Auto-Templatization
Use `make-template convert` to automatically detect and replace placeholders in existing projects.

### Level 3: Add Setup Scripts
```json
{
  "setup": {
    "script": "_setup.mjs",
    "environment": {
      "NODE_ENV": "development"
    }
  }
}
```

### Level 4: Add Template Files
Create `templates/` directory with `.tpl` files for complex file generation.

### Level 5: Add Dimensions & Features
Add user-selectable options and conditional features for advanced templates.

This approach lets beginners start simple and add complexity as they learn.

## Prerequisites

Before following this guide, ensure you have:

- A GitHub account (or access to another Git hosting service)
- Node.js (latest LTS) installed
- Basic understanding of @m5nv/create-scaffold usage
- Familiarity with JavaScript ES modules

## Step-by-step instructions

### Naming conventions

Keep template assets consistent so downstream projects read naturally across operating systems and tooling:
- Use `kebab-case` for directories and authored files (`react-vite`, `feature-flags.mjs`) to avoid case-only conflicts and mirror npm package norms.
- Prefer `snake_case` for internal configuration keys that stay inside author assets or metadata (`build_target`, `default_variant`) to highlight that consumers should not rely on them.
- Reserve `camelCase` for anything the CLI surfaces to template consumers (`ctx.projectName`, `tools.placeholders.applyInputs`) so public APIs feel idiomatic to JavaScript developers.
- Name capabilities and asset directories with singular nouns (`placeholder`, `logger`, `ide`) unless the directory truly aggregates peers, keeping option vocabularies concise.

### Step 1: Prepare your template repository

Create a Git repository that will host one or more templates:

```bash
mkdir my-templates
cd my-templates
git init
```

Each template lives in its own directory at the repository root:

```text
my-templates/
├── basic-react-spa/
│   ├── package.json
│   ├── src/
│   └── _setup.mjs
├── ssr-portfolio-app/
│   ├── package.json
│   └── _setup.mjs
└── portfolio-api/
    ├── package.json
    └── _setup.mjs
```

> make-template generates `template.json`, `_setup.mjs`, and `.template-undo.json` for you. Commit `.template-undo.json`: create-scaffold ignores it automatically, keeping author workflows intact.

If you are authoring composable templates with snippets, add an author-assets directory now (defaults to `__scaffold__/`). Everything stored there will be available to `_setup.mjs` but removed before the end user sees the scaffold.

### Step 2: Choose an authoring mode

| Mode | When to choose it | Expectations |
|------|-------------------|--------------|
| **WYSIWYG** (`authoring: "wysiwyg"`) | You iterate directly in a working app and only need light placeholder replacement. This is what the make-template tutorial creates. | No runtime option parsing. `metadata.dimensions` can stay empty. `_setup.mjs` should focus on tokens and minor tweaks. |
| **Composable** (`authoring: "composable"`) | You need a single template to produce several variants (stacks, infra, capabilities). Use this for advanced templating beyond the tutorial. | Define option dimensions in `template.json`, store reusable assets in `__scaffold__/`, and keep `_setup.mjs` small but declarative. |
| **Hybrid** | You start from a WYSIWYG base but require a few reusable snippets. | Keep placeholder replacement for inline updates, but move any repeated assets into `__scaffold__/` so they can be copied conditionally via helpers. |

Switching modes later is as simple as updating `template.json`, but start with WYSIWYG unless you know you need composability.

### Step 3: Describe metadata in `template.json`

`template.json` is the contract between your template and create-scaffold. Begin with the essentials:

```json
{
  "schemaVersion": "1.0.0",
  "id": "your-org/portfolio-template",
  "name": "portfolio-template",
  "description": "Full-stack portfolio with multiple deployment options",
  "author": "Your Organization",
  "license": "MIT",
  "tags": ["portfolio", "full-stack", "cloudflare"],
  "handoff": ["npm install", "npm run dev"],
  "setup": {
    "authoring": "composable",
    "authorAssetsDir": "__scaffold__",
    "dimensions": {
      "features": {
        "type": "multi",
        "values": ["auth", "blog", "analytics", "testing"],
        "default": ["testing"],
        "policy": "strict"
      },
      "deployment": {
        "type": "single",
        "values": ["cloudflare-d1", "vercel-postgres", "railway"],
        "default": "cloudflare-d1"
      }
    }
  },
  "featureSpecs": {},
  "constants": {
    "language": "javascript",
    "framework": "react",
    "runtime": "node"
  }
}
```

- `handoff` provides next-step instructions after scaffolding.
- `authorAssetsDir` names the directory you use for author-only snippets (defaults to `__scaffold__`).
- Each `dimensions` entry describes a vocabulary of options:
  - `type`: `"single"` or `"multi"`.
  - `values`: allowed tokens.
  - `default`: optional default when the user omits that dimension.
  - `requires` / `conflicts`: encode dependencies within the dimension.
  - `policy`: `"strict"` rejects unknown selections, `"warn"` logs but proceeds.

> **Important:** Dimensions must use registered names from the schema. The current registered dimensions are: `deployment`, `features`, `database`, `storage`, `auth`, `payments`, `analytics`. Custom dimension names are not allowed - use only these predefined names to ensure schema compliance.

> **Tooling tip:** Ship the schema with your repo to unlock editor validation. If you install `@m5nv/create-scaffold` as a dev dependency, VS Code can read the packaged schema automatically:
> ```json
> // .vscode/settings.json
> {
>   "json.schemas": [
>     {
>       "fileMatch": ["template.json"],
>       "url": "./node_modules/@m5nv/create-scaffold/schema/template.json"
>     }
>   ]
> }
> ```

TypeScript-aware editors can also reuse the generated types:

```ts
import type { TemplateManifest } from '@m5nv/create-scaffold/types/template-schema';

/** @type {TemplateManifest} */
export const template = { /* ... */ };
```

### Step 4: Write `_setup.mjs`

The setup script receives a sandboxed environment with restricted capabilities. Setup scripts run in a Node.js VM with access to only `console`, timers, and `process.env` - all other Node built-ins are blocked. Use the provided `tools` object for all filesystem operations, JSON manipulation, and project modifications.

**WYSIWYG example** (like basic-react-spa template from tutorial)
```javascript
export default async function setup({ ctx, tools }) {
  await tools.placeholders.replaceAll(
    { PROJECT_NAME: ctx.projectName },
    ['README.md', 'package.json', 'index.html']
  );

  // Copy IDE configurations from template
  await tools.templates.copy('.vscode', '.vscode');
}
```

**Composable example with dimensions** (advanced templating)
```javascript
export default async function setup({ ctx, tools }) {
  await tools.json.set('package.json', 'name', ctx.projectName);

  // Conditionally include authentication
  if (tools.options.in('features', 'auth')) {
    await tools.templates.copy('auth', 'src/auth');
    await tools.json.set('package.json', 'dependencies.@m5nv/auth-lib', '^1.0.0');
  }

  // Set up deployment target-specific files
  if (tools.options.in('deployment', 'cloudflare-d1')) {
    await tools.templates.copy('infra/cloudflare-d1', 'infra');
    await tools.placeholders.replaceAll(
      { D1_DATABASE_NAME: `${ctx.projectName}_db` },
      ['wrangler.toml']
    );
  }

  await tools.text.ensureBlock({
    file: 'README.md',
    marker: `# ${ctx.projectName}`,
    block: ['## Next Steps', '- npm install', '- npm run dev']
  });
}
```

Remember:
- **Sandbox restrictions**: No `import`, `require`, `fs`, `path`, `eval`, or other Node built-ins. All operations must use `tools`.
- Helpers are idempotent—rerunning `_setup.mjs` should not duplicate work.
- `ctx.options.byDimension` already includes defaults, so treat it as authoritative.
- `tools.placeholders.applyInputs()` saves you from rebuilding replacement maps—pair it with `tools.templates.renderFile()` when you need to inject placeholder values into generated assets.

#### Choose between inline edits and composition

`metadata.placeholders` in `template.json` documents every `{{TOKEN}}` that still exists in the authored files. Use this inventory to decide how the setup script should satisfy each variable. When you need standardized prompts, add `metadata.variables` entries to opt into the CLI’s canonical placeholders (currently `author` → `{{AUTHOR}}` and `license` → `{{LICENSE}}`). Canonical variables merge with your custom inventory, so you can override descriptions or defaults without duplicating entries.

| You need to… | Preferred approach | Helper(s) |
|--------------|-------------------|-----------|
| Update text inside existing files (README, package.json) | Leave the placeholder in the file and replace it inline | `tools.placeholders.applyInputs` for collected answers, `tools.placeholders.replaceAll`/`tools.text.ensureBlock` when you need custom values |
| Generate variations of an entire file or directory | Store the source material in `authorAssetsDir` and copy it on demand | `tools.templates.copy`, `tools.templates.renderFile` |
| Produce derived JSON or config values | Mutate structured data during setup | `tools.json.set`, `tools.json.merge`
| Toggle optional capabilities | Express the vocabulary under `metadata.dimensions` and branch on `tools.options.in/when` | `tools.options.*`

When `metadata.placeholders` lists a value that shouldn't be replaced inline, move the corresponding file into `__scaffold__/` (or your custom assets dir) and render it with helper data instead of leaving dangling tokens for end users.

> `tools.placeholders.applyInputs()` is the zero-configuration path—it consumes the instantiator's answers captured in `ctx.inputs`. Reach for `replaceAll()` only when you must supply derived values (for example, combining multiple inputs into one string) or modify files that have no recorded placeholder metadata.

> **Instantiator tips**
> - Placeholder prompting is opt-in while the feature stabilizes. Document `--experimental-placeholder-prompts` in your README so users know how to enable it.
> - CLI runs accept repeated `--placeholder NAME=value` flags for overrides and honour `CREATE_SCAFFOLD_PLACEHOLDER_<NAME>` environment variables (uppercase tokens).
> - Pipelines can combine the flag with `--yes` to force hard failures when required placeholders are missing instead of falling back to interactive input.

### Step 5: Stage author assets (composable mode)

Store reusable snippets under `__scaffold__/` (or your custom `authorAssetsDir`):

```text
portfolio-template/
├── __scaffold__/
│   ├── auth/
│   │   ├── src/auth/
│   │   └── package.json.partial
│   ├── infra/
│   │   ├── cloudflare-d1/
│   │   ├── vercel-postgres/
│   │   └── railway/
│   └── ui/
│       ├── tailwind/
│       ├── styled-components/
│       └── vanilla-css/
└── src/
```

create-scaffold copies this directory into the project before `_setup.mjs` runs and removes it afterward. Treat it as read-only input. If you need to generate new assets, write them into the project tree (`src/`, `infra/`, etc.), not back into `__scaffold__/`.

> **Note:** The templates created in the make-template tutorial use WYSIWYG authoring mode and don't require author assets directories. Use `__scaffold__` for advanced composable templates that need conditional asset inclusion based on user options.### Step 6: Test iteratively

1. **Use make-template restore for fast loops.** After editing placeholders, run the generated restore command (based on `.template-undo.json`) to rehydrate the working app and verify changes inline.
2. **Run create-scaffold dry runs when you touch metadata or `_setup.mjs`.**
   ```bash
   create-scaffold demo-app --template yourusername/my-templates/portfolio-template --dry-run
   ```
   Dry runs show directory/file counts, setup script detection, and skip author assets so the preview matches the final scaffold.
3. **Execute a full scaffold periodically** to ensure the handoff instructions make sense and the generated project boots as expected.
4. **Lint your manifest before publishing.** If your template repo depends on @m5nv/create-scaffold, add `npm run schema:check` to CI. The command verifies both the JSON schema (`template.json`) and the generated TypeScript definition.
5. **Run the CLI validator before commits and releases.**
  ```bash
  create-scaffold --validate-template ./path/to/templates/portfolio-template

  # Capture JSON output for CI assertions
  create-scaffold --validate-template ./path/to/templates/portfolio-template --json
  ```
  The validator exits with code `1` when any manifest, required-file, or setup-script check fails, making it safe for local linting and CI pipelines.

Document any non-obvious behaviour inside your template repo (e.g., README sections explaining available dimensions) so both template authors and consumers share the same vocabulary.

Templates can choose to continue when a user supplies an unexpected value by setting `policy: "warn"` on the affected dimension. Most templates should stick with `"strict"` to fail fast.

### Post-create handoff instructions

Help users get productive immediately by adding a `handoff` array to `template.json`. Each entry becomes a bullet under "Next steps" after scaffolding.

```json
{
  "schemaVersion": "1.0.0",
  "id": "your-org/portfolio-template",
  "name": "portfolio-template",
  "description": "Full-stack portfolio with multiple deployment options",
  "author": "Your Organization",
  "license": "MIT",
  "tags": ["portfolio", "full-stack", "cloudflare"],
  "handoff": [
    "npm install",
    "npm run dev  # Development server",
    "npm run build && npm run start  # Production build test",
    "See README.md for deployment options (Cloudflare Workers/Vercel/Railway)"
  ],
  "setup": {
    "authoring": "composable",
    "authorAssetsDir": "__scaffold__",
    "dimensions": {
      "features": {
        "type": "multi",
        "values": ["auth", "blog", "analytics"],
        "default": ["analytics"],
        "policy": "strict"
      },
      "deployment": {
        "type": "single",
        "values": ["cloudflare-d1", "vercel-postgres", "railway"],
        "default": "cloudflare-d1"
      }
    }
  },
  "featureSpecs": {},
  "constants": {
    "language": "javascript",
    "framework": "react",
    "runtime": "node"
  }
}
```

Keep each instruction short and actionable (commands, follow-up docs, etc.). Include both development and production testing steps. When `handoff` is omitted, the CLI falls back to `cd <project>` and a reminder to review the README.

### Step 7: Test your template

Before publishing, test your template locally:

```bash
# Navigate back to your templates repository root
cd ..

# Test the template (replace 'yourusername' with your GitHub username)
npm create @m5nv/scaffold test-project -- --template yourusername/my-templates/portfolio-template
```

Verify the template works correctly:
1. Check that `{{PROJECT_NAME}}` placeholders were replaced
2. Ensure all files were copied correctly
3. Test that the project runs: `cd test-project && npm install && npm run dev`
4. Run `create-scaffold --validate-template ./path/to/templates/basic-react-spa` against the template directory to confirm linting passes

### Step 8: Publish your template repository

Commit and push your templates to make them available:

```bash
# Add and commit your templates
git add .
git commit -m "Add portfolio-template with composable features and multiple deployment options"

# Push to GitHub (create repository first)
git remote add origin https://github.com/yourusername/my-templates.git
git push -u origin main
```

## Setup Context & Tools quick reference

Every setup script receives the Environment object (`{ ctx, tools }`). The table below summarizes the most
common properties—see the full [Environment Reference](../reference/environment.md)
for details.

| Item | Description |
|------|-------------|
| `ctx.projectName` | Sanitized project name. Ideal for injecting into README files, package metadata, or IDE settings. |
| `ctx.options` | Template options resolved from selection.json or interactive prompts. Use `tools.options.when()` for feature toggles. |
| `tools.placeholders` | Replace `{{TOKEN}}` strings across one or many files. |
| `tools.text` | Insert/ensure blocks, replace between markers, append lines, or run guarded search/replace. |
| `tools.files` | Ensure directories, copy/move/remove paths, write files, or copy directory trees. |
| `tools.json` | Read, set, remove, or merge JSON values using dot-path helpers. |
| `tools.templates` | Render project-local template files with placeholder values. |
| `tools.logger` | Emit informational messages during setup. |

The helpers are designed to be composable—prefer building small reusable
operations over reaching for raw filesystem APIs.
