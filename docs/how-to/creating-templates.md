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
  - "../reference/dimensions-glossary.md"
last_updated: "2025-11-01"
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

```
my-templates/
├── react-vite/
│   ├── package.json
│   ├── src/
│   └── _setup.mjs
└── express-api/
    ├── package.json
    └── _setup.mjs
```

> make-template generates `template.json`, `_setup.mjs`, and `.template-undo.json` for you. Commit `.template-undo.json`: create-scaffold ignores it automatically, keeping author workflows intact.

If you are authoring composable templates with snippets, add an author-assets directory now (defaults to `__scaffold__/`). Everything stored there will be available to `_setup.mjs` but removed before the end user sees the scaffold.

### Step 2: Choose an authoring mode

| Mode | When to choose it | Expectations |
|------|-------------------|--------------|
| **WYSIWYG** (`authoringMode: "wysiwyg"`) | You iterate directly in a working app and only need light placeholder replacement. | No runtime option parsing. `setup.dimensions` can stay empty. `_setup.mjs` should focus on tokens and minor tweaks. |
| **Composable** (`authoringMode: "composable"`) | You need a single template to produce several variants (stacks, infra, capabilities). | Define option dimensions in `template.json`, store reusable assets in `__scaffold__/`, and keep `_setup.mjs` small but declarative. |
| **Hybrid** | You start from a WYSIWYG base but require a few reusable snippets. | Keep placeholder replacement for inline updates, but move any repeated assets into `__scaffold__/` so they can be copied conditionally via helpers. |

Switching modes later is as simple as updating `template.json`, but start with WYSIWYG unless you know you need composability.

### Step 3: Describe metadata in `template.json`

`template.json` is the contract between your template and create-scaffold. Begin with the essentials:

```json
{
  "name": "react-vite",
  "description": "React starter with Vite",
  "handoff": ["npm install", "npm run dev"],
  "setup": {
    "authoringMode": "composable",
    "authorAssetsDir": "__scaffold__",
    "dimensions": {
      "capabilities": {
        "type": "multi",
        "values": ["auth", "docs", "logging"],
        "default": ["logging"],
        "policy": "strict"
      },
      "infrastructure": {
        "type": "single",
        "values": ["none", "cloudflare-d1", "cloudflare-turso"],
        "default": "none"
      }
    }
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

Legacy `setup.supportedOptions` arrays still work; the CLI upgrades them to a `capabilities` dimension automatically, but new templates should define `dimensions` explicitly.

### Step 4: Write `_setup.mjs`

The setup script receives a sandboxed environment. WYSIWYG templates typically only replace placeholders, while composable templates also branch on dimensions.

**WYSIWYG example**
```javascript
export default async function setup({ ctx, tools }) {
  await tools.placeholders.replaceAll(
    { PROJECT_NAME: ctx.projectName },
    ['README.md', 'package.json']
  );

  if (ctx.ide) {
    await tools.ide.applyPreset(ctx.ide);
  }
}
```

**Composable example with dimensions**
```javascript
export default async function setup({ ctx, tools }) {
  await tools.json.set('package.json', 'name', ctx.projectName);

  if (tools.options.in('capabilities', 'auth')) {
    await tools.files.copyTemplateDir('__scaffold__/auth', 'src/auth');
  }

  if (tools.options.in('infrastructure', 'cloudflare-d1')) {
    await tools.files.copyTemplateDir('__scaffold__/infra/cloudflare-d1', 'infra');
  }

  await tools.text.ensureBlock({
    file: 'README.md',
    marker: `# ${ctx.projectName}`,
    block: ['## Next Steps', '- npm install', '- npm run dev']
  });
}
```

Remember:
- Never import Node built-ins; use the helper APIs in the [Environment Reference](../reference/environment.md).
- Helpers are idempotent—rerunning `_setup.mjs` should not duplicate work.
- `ctx.options.byDimension` already includes defaults, so treat it as authoritative.
- `tools.placeholders.applyInputs()` saves you from rebuilding replacement maps—pair it with `tools.templates.renderFile()` when you need to inject placeholder values into generated assets.

#### Choose between inline edits and composition

`metadata.placeholders` in `template.json` documents every `{{TOKEN}}` that still exists in the authored files. Use this inventory to decide how the setup script should satisfy each variable. When you need standardized prompts, add `metadata.variables` entries to opt into the CLI’s canonical placeholders (currently `author` → `{{AUTHOR}}` and `license` → `{{LICENSE}}`). Canonical variables merge with your custom inventory, so you can override descriptions or defaults without duplicating entries.

| You need to… | Preferred approach | Helper(s) |
|--------------|-------------------|-----------|
| Update text inside existing files (README, package.json) | Leave the placeholder in the file and replace it inline | `tools.placeholders.applyInputs` for collected answers, `tools.placeholders.replaceAll`/`tools.text.ensureBlock` when you need custom values |
| Generate variations of an entire file or directory | Store the source material in `authorAssetsDir` and copy it on demand | `tools.files.copyTemplateDir`, `tools.templates.renderFile` |
| Produce derived JSON or config values | Mutate structured data during setup | `tools.json.set`, `tools.json.merge`
| Toggle optional capabilities | Express the vocabulary under `setup.dimensions` and branch on `tools.options.in/when` | `tools.options.*`

When `metadata.placeholders` lists a value that shouldn't be replaced inline, move the corresponding file into `__scaffold__/` (or your custom assets dir) and render it with helper data instead of leaving dangling tokens for end users.

> `tools.placeholders.applyInputs()` is the zero-configuration path—it consumes the instantiator's answers captured in `ctx.inputs`. Reach for `replaceAll()` only when you must supply derived values (for example, combining multiple inputs into one string) or modify files that have no recorded placeholder metadata.

> **Instantiator tips**
> - Placeholder prompting is opt-in while the feature stabilizes. Document `--experimental-placeholder-prompts` in your README so users know how to enable it.
> - CLI runs accept repeated `--placeholder NAME=value` flags for overrides and honour `CREATE_SCAFFOLD_PLACEHOLDER_<NAME>` environment variables (uppercase tokens).
> - Pipelines can combine the flag with `--no-input-prompts` to force hard failures when required placeholders are missing instead of falling back to interactive input.

### Step 5: Stage author assets (composable mode)

Store reusable snippets under `__scaffold__/` (or your custom `authorAssetsDir`):

```
react-vite/
├── __scaffold__/
│   ├── auth/
│   └── infra/
│       └── cloudflare-d1/
└── src/
```

create-scaffold copies this directory into the project before `_setup.mjs` runs and removes it afterward. Treat it as read-only input. If you need to generate new assets, write them into the project tree (`src/`, `infra/`, etc.), not back into `__scaffold__/`.

### Step 6: Test iteratively

1. **Use make-template restore for fast loops.** After editing placeholders, run the generated restore command (based on `.template-undo.json`) to rehydrate the working app and verify changes inline.
2. **Run create-scaffold dry runs when you touch metadata or `_setup.mjs`.**
   ```bash
   create-scaffold demo-app --from-template react-vite --repo path/to/my-templates --dry-run
   ```
   Dry runs show directory/file counts, setup script detection, and skip author assets so the preview matches the final scaffold.
3. **Execute a full scaffold periodically** to ensure the handoff instructions make sense and the generated project boots as expected.
4. **Lint your manifest before publishing.** If your template repo depends on @m5nv/create-scaffold, add `npm run schema:check` to CI. The command verifies both the JSON schema (`template.json`) and the generated TypeScript definition.
5. **Run the CLI validator before commits and releases.**
  ```bash
  create-scaffold --validate-template ./path/to/templates/react-vite

  # Capture JSON output for CI assertions
  create-scaffold --validate-template ./path/to/templates/react-vite --json
  ```
  The validator exits with code `1` when any manifest, required-file, or setup-script check fails, making it safe for local linting and CI pipelines.

Document any non-obvious behaviour inside your template repo (e.g., README sections explaining available dimensions) so both template authors and consumers share the same vocabulary.

Templates can choose to continue when a user supplies an unexpected value by setting `policy: "warn"` on the affected dimension. Most templates should stick with `"strict"` to fail fast.

### Post-create handoff instructions

Help users get productive immediately by adding a `handoff` array to `template.json`. Each entry becomes a bullet under “Next steps” after scaffolding.

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
    "dimensions": {
      "capabilities": {
        "type": "multi",
        "values": ["testing", "docs"],
        "default": ["testing"],
        "policy": "warn"
      }
    }
  }
}
```

Keep each instruction short and actionable (commands, follow-up docs, etc.). When `handoff` is omitted, the CLI falls back to `cd <project>` and a reminder to review the README.

### Step 7: Test your template

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
4. Run `create-scaffold --validate-template ./path/to/templates/react-vite` against the template directory to confirm linting passes

### Step 8: Publish your template repository

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
common properties—see the full [Environment Reference](../reference/environment.md)
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
