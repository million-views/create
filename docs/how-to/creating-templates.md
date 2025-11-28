---
title: "How to Build Composable Templates"
type: "how-to"
audience: "intermediate"
estimated_time: "15 minutes"
prerequisites:
  - "Completed the [create template tutorial](../tutorial/template.md)"
  - "Understanding of WYSIWYG templates and setup scripts"
related_docs:
  - "../tutorial/template.md"
  - "../reference/environment.md"
  - "setup-recipes.md"
  - "../reference/template-schema.md"
last_updated: "2025-11-19"
---

# How to Build Composable Templates

This how-to covers advanced templating patterns for templates that need conditional features based on user selections.

> **Prerequisite**: Complete the [create template tutorial](../tutorial/template.md) first. This assumes you understand WYSIWYG templates.

---

## Add conditional features based on user options

**Problem**: Your template needs to include different code depending on user choices (e.g., authentication, deployment target).

**Solution**: Use composable authoring mode with dimensions.

1. Set authoring mode in `template.json`:
```json
{
  "setup": {
    "authoring": "composable",
    "dimensions": {
      "features": {
        "type": "multi",
        "values": ["auth", "blog", "analytics"],
        "default": ["analytics"]
      }
    }
  }
}
```

2. Check options in `_setup.mjs`:
```javascript
export default async function setup({ ctx, tools }) {
  if (tools.options.in('features', 'auth')) {
    await tools.templates.copy('auth', 'src/auth');
    await tools.json.set('package.json', 'dependencies.@m5nv/auth-lib', '^1.0.0');
  }
}
```

**Available dimensions**: `deployment`, `features`, `database`, `storage`, `auth`, `payments`, `analytics`. Custom names are not allowed.

---

## Store reusable snippets for conditional copying

**Problem**: You have code that should only be included for certain feature selections.

**Solution**: Use an author assets directory.

1. Configure the directory in `template.json`:
```json
{
  "setup": {
    "authorAssetsDir": "__scaffold__"
  }
}
```

2. Organize snippets by feature:
```text
my-template/
├── __scaffold__/
│   ├── auth/
│   │   └── src/auth/
│   ├── infra/
│   │   ├── cloudflare-d1/
│   │   └── vercel-postgres/
└── src/
```

3. Copy conditionally in `_setup.mjs`:
```javascript
if (tools.options.in('deployment', 'cloudflare-d1')) {
  await tools.templates.copy('infra/cloudflare-d1', 'infra');
}
```

The `__scaffold__` directory is removed automatically after setup runs.

---

## Provide post-scaffold instructions

**Problem**: Users don't know what to do after scaffolding completes.

**Solution**: Add a `handoff` array to `template.json`:
```json
{
  "handoff": [
    "npm install",
    "npm run dev  # Development server",
    "npm run build && npm run start  # Production test"
  ]
}
```

Each entry becomes a bullet under "Next steps" after scaffolding.

---

## Choose between inline edits and composition

**Problem**: You're not sure whether to use placeholders or template copying.

**Solution**: Use this decision table:

| You need to… | Approach | Helper(s) |
|--------------|----------|-----------|
| Update text inside existing files | Inline placeholders | `tools.placeholders.applyInputs`, `tools.text.ensureBlock` |
| Generate variations of entire files | Author assets + copying | `tools.templates.copy`, `tools.templates.renderFile` |
| Produce derived JSON values | JSON manipulation | `tools.json.set`, `tools.json.merge` |
| Toggle optional capabilities | Dimensions + branching | `tools.options.in`, `tools.options.when` |

---

## Test templates iteratively

**Problem**: Testing template changes is slow.

**Solution**: Use these testing workflows:

1. **Use `restore` for placeholder changes**:
```bash
# Rehydrate the working app from .template-undo.json
create template restore
```

2. **Dry-run for metadata/setup changes**:
```bash
create scaffold test-project --template ./my-template --dry-run
```

3. **Validate before publishing**:
```bash
create scaffold validate ./my-template
create scaffold validate ./my-template --suggest  # Get fix suggestions
```

---

## Enable VS Code schema validation

**Problem**: You want IDE help when editing `template.json`.

**Solution**: Add to `.vscode/settings.json`:
```json
{
  "json.schemas": [
    {
      "fileMatch": ["template.json"],
      "url": "./node_modules/@m5nv/create/schema/template.json"
    }
  ]
}
```

For TypeScript:
```ts
import type { TemplateManifest } from '@m5nv/create/types/template-schema';
```

---

## Quick reference

| Item | Description |
|------|-------------|
| `ctx.projectName` | Sanitized project name for injection |
| `ctx.options` | Resolved template options |
| `tools.options.in()` | Check if option is selected |
| `tools.templates.copy()` | Copy from author assets |
| `tools.placeholders.applyInputs()` | Replace placeholders with user input |
| `tools.json.set()` | Set JSON values by path |

See [Environment Reference](../reference/environment.md) for full API details.
