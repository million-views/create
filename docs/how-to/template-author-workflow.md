---
title: "Template Author Workflow"
type: "how-to"
audience: "template-authors"
estimated_time: "20 minutes"
prerequisites:
  - "Completed the [create template tutorial](../tutorial/template.md)"
  - "Understanding of templates and setup scripts"
related_docs:
  - "../tutorial/template.md"
  - "../reference/environment.md"
  - "setup-recipes.md"
  - "../reference/template-schema.md"
last_updated: "2025-11-28"
---

# Template Author Workflow

This guide helps template authors iterate efficiently and build advanced templates. It covers development workflows, template patterns, and debugging techniques.

> **Prerequisite**: Complete the [create template tutorial](../tutorial/template.md) first. This assumes you understand templates and basic setup scripts.

---

## Restore-first iteration

**Problem**: You need to make changes to a template while keeping it functional.

**Solution**: Use the restore-convert cycle.

1. **Restore the working app**:
   ```bash
   create template restore
   ```

2. **Edit the application** - make functional changes, run the app, commit as usual.

3. **Regenerate the template**:
   ```bash
   create template convert
   ```

4. **Verify with dry-run** (optional):
   ```bash
   create scaffold demo-app --template my-template --repo path/to/templates --dry-run
   ```

**Checklist for simple templates**:
- `_setup.mjs` limits itself to placeholder replacement and light adjustments
- `handoff` instructions cover install and startup steps
- `.template-undo.json` remains checked in for future restores
- `placeholders` enumerates every remaining `{{TOKEN}}`

---

## Add conditional features based on user options

**Problem**: Your template needs to include different code depending on user choices (e.g., authentication, deployment target).

**Solution**: Use dimensions for conditional features.

1. Configure dimensions and features in `template.json`:
```json
{
  "schemaVersion": "1.0.0",
  "id": "author/my-template",
  "placeholderFormat": "unicode",
  "placeholders": {},
  "setup": {},
  "dimensions": {
    "deployment": {
      "options": [
        { "id": "cloudflare-workers", "label": "Cloudflare Workers" },
        { "id": "deno-deploy", "label": "Deno Deploy" }
      ],
      "default": "cloudflare-workers"
    }
  },
  "features": [
    { "id": "user-login", "label": "User Authentication", "needs": { "identity": "required" } },
    { "id": "blog-posts", "label": "Blog", "needs": { "database": "required" } },
    { "id": "usage-tracking", "label": "Analytics", "needs": { "analytics": "required" } }
  ]
}
```

2. Check options in `_setup.mjs`:
```javascript
export default async function setup({ ctx, tools }) {
  // Check selected features from ctx.features or selection
  if (tools.options.in('identity', 'github')) {
    await tools.templates.copy('auth/github', 'src/auth');
    await tools.json.set('package.json', 'dependencies.@m5nv/auth-lib', '^1.0.0');
  }
}
```

**Available dimensions**: `deployment`, `database`, `storage`, `identity`, `billing`, `analytics`, `monitoring`. These 7 fixed infrastructure dimensions are enforced by schema validation.

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

## Iterating on feature combinations

**Problem**: You need to test multiple feature combinations in a template with dimensions.

**Solution**: Use systematic verification with selection files.

1. **Restore the base project**:
   ```bash
   create template restore
   ```

2. **Author or update snippets** inside `__scaffold__/`

3. **Update `template.json` dimensions** - add values, `requires`, `conflicts`, keep `metadata.placeholders` current

4. **Codify behaviour in `_setup.mjs`** - use `tools.options.in()` and `tools.options.require()`

5. **Verify combinations**:
   ```bash
   # Default selection
   create scaffold demo-default --template my-template --repo path/to/templates --dry-run

   # Specific feature mix
   create scaffold demo-auth --template my-template --repo path/to/templates \
     --selection ./my-selection.json --dry-run
   ```

**Checklist for templates with dimensions**:
- Every dimension lists allowed values and sensible defaults
- `_setup.mjs` uses helper APIs only (`tools.files`, `tools.json`, `tools.options`)
- Author assets live under `__scaffold__/` and are treated as immutable inputs
- Dry runs cover the default path plus each supported dimension combination

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

## Test templates iteratively

**Problem**: Testing template changes is slow.

**Solution**: Use these testing workflows:

1. **Use `restore` for placeholder changes**:
   ```bash
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

## Debug setup scripts

**Problem**: Your setup script fails or behaves unexpectedly.

**Solution**: Use systematic debugging techniques.

### Common failure patterns

**Setup script throws immediately:**
```bash
create scaffold new debug-test template-name --log-file debug.log --verbose
cat debug.log | grep -A 10 -B 5 "setup_script"
```

**Files not copied from `__scaffold__`:**
```bash
ls -la __scaffold__/
grep "templates.copy" _setup.mjs
```

**Placeholder replacement fails silently:**
```bash
grep "placeholders" template.json
grep "{{.*}}" src/*.js
```

### Add debug logging

```javascript
export default async function setup({ ctx, tools }) {
  tools.logger.info('Setup starting...', { projectName: ctx.projectName });

  try {
    await tools.templates.copy('auth', 'src/auth');
    tools.logger.info('Auth module copied');
  } catch (error) {
    tools.logger.warn('Setup failed:', error.message);
    throw error;
  }
}
```

**Note:** Use `tools.logger` instead of `console.log` - it routes through the CLI output system and respects log file settings.

### Test setup scripts in isolation

```bash
mkdir test-scaffold && cd test-scaffold
cp ../template.json ../_ setup.mjs .
cp -r ../__scaffold__ .
echo '{"name": "test", "version": "1.0.0"}' > package.json

node -e "
import('./_setup.mjs').then(async (module) => {
  const mockCtx = { projectName: 'test', options: { byDimension: {} }, inputs: {} };
  const mockTools = {
    templates: { copy: async (from, to) => console.log('Would copy', from, 'to', to) },
    placeholders: { applyInputs: async (files) => console.log('Would apply to', files) }
  };
  await module.default({ ctx: mockCtx, tools: mockTools });
}).catch(console.error);
"
```

### Recovery strategies

**Setup script corrupted the project:**
```bash
rm -rf my-project
create scaffold new my-project template-name
```

**Setup script has race conditions:**
```javascript
// Add await to all async operations
await tools.templates.copy('auth', 'src/auth');
await tools.json.set('package.json', 'dependencies.auth', '^1.0.0');
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

## Before publishing or sharing

- Run the full test suite for your template
- Run `create scaffold validate <path-to-template>` to catch manifest issues
- Update `handoff` instructions so users know the first commands to run
- Cross-link consumer docs: mention supported dimensions, recommended options
- Consider adding an appendix in the template README summarizing dimensions and defaults

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
| `tools.logger.info()` | Log messages (prefer over console.log) |

See [Environment Reference](../reference/environment.md) for full API details.
