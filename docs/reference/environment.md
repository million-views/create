---
title: "Environment Reference"
description: "Complete reference for the Environment object passed to template setup scripts"
type: reference
audience: "template-authors"
estimated_time: "N/A (reference)"
prerequisites:
  - "Comfortable with modern JavaScript syntax"
  - "Basic understanding of @m5nv/create-scaffold template workflow"
related_docs:
  - "../how-to/creating-templates.md"
  - "../how-to/setup-recipes.md"
  - "cli-reference.md"
last_updated: "2025-11-12"
---

# Environment Reference

## Setup Contract

Template setup scripts (`_setup.mjs`) run inside a secure sandbox using Node.js VM. Every script must export a default `async` function that receives a single **Environment** object containing `{ ctx, tools }`.

```javascript
export default async function setup({ ctx, tools }) {
  // ...
}
```

- **`ctx`** – immutable context describing the project being generated.
- **`tools`** – curated helper library for manipulating the scaffold without importing Node built-ins.
- You can destructure the Environment object (recommended) or access it as a single parameter (e.g. `export default async function setup(environment)`).

### Sandbox Restrictions

Setup scripts execute in a restricted Node.js VM context with the following limitations:

#### 🚫 **Forbidden Operations**
- **`import`** statements – blocked at the source level
- **`require()`** – disabled in sandbox context
- **`eval()`** – disabled in sandbox context
- **`Function()`** constructor – disabled in sandbox context
- **Node built-ins** like `fs`, `path`, `os`, `crypto`, etc. – not available
- **Global access** to `process` (except `process.env`) – restricted

#### ✅ **Available Operations**
- **`console`** – available for logging (but flagged by validation rules)
- **`setTimeout`/`clearTimeout`** – available for timing
- **`setInterval`/`clearInterval`** – available for intervals
- **`process.env`** – read-only access to environment variables
- **`structuredClone`** – available if supported by Node.js version
- **Basic JavaScript** – all standard language features work

#### 🛠️ **Required: Use Tools for Everything Else**
All filesystem operations, JSON manipulation, text processing, and project modifications must use the provided `tools` object. This ensures security, consistency, and proper error handling.

```javascript
// ✅ CORRECT: Use tools for all operations
export default async function setup({ ctx, tools }) {
  await tools.templates.copy('auth', 'src/auth');
  await tools.json.set('package.json', 'name', ctx.projectName);
  tools.logger.info('Setup complete');
}

// ❌ WRONG: Direct filesystem access (blocked)
export default async function setup({ ctx, tools }) {
  const fs = require('fs'); // Throws SetupSandboxError
  fs.copyFileSync('source', 'dest'); // Not available
}
```

## Context (`ctx`)

| Property | Type | Description |
|----------|------|-------------|
| `projectDir` | `string` | Absolute path to the project directory. All helper methods already scope operations to this root, so you rarely need it directly. |
| `projectName` | `string` | Sanitized name chosen by the user (letters, numbers, hyphen, underscore). Use it when updating metadata such as `package.json` or README content. |
| `cwd` | `string` | Directory where the CLI command was executed. Helpful when you need to compute workspace-relative paths. |
| `ide` | `string \| null` | IDE specified by user (lowercase: 'vscode', 'kiro', 'cursor', 'windsurf') or null if not specified. |
| `authoring` | `"wysiwyg" \| "composable"` | Mode declared in `template.json`. WYSIWYG templates mirror a working project; composable templates assemble features via `_setup.mjs`. |
| `authorAssetsDir` | `string` | Directory name for template assets (configured via `setup.authorAssetsDir`, defaults to `"__scaffold__"`). |
| `options` | `object` | Normalized user selections with defaults already applied. See breakdown below. |
| `inputs` | `Record<string, string \| number \| boolean>` | Placeholder answers collected during template instantiation. Keys omit braces (`PROJECT_NAME`). Values are immutable and type-coerced based on `metadata.placeholders` and any canonical `metadata.variables` entries. |
| `constants` | `Record<string, any>` | Template-defined constants from `template.json` that are always available regardless of user selections. |

`ctx.options` contains two readonly views:

| Field | Type | Description |
|-------|------|-------------|
| `raw` | `string[]` | Ordered list of tokens supplied on the command line. |
| `byDimension` | `Record<string, string \| string[]>` | Canonical selections drawn from the template's `metadata.dimensions` metadata. Multi-select dimensions return arrays; single-select dimensions return a string or `null`. |

The context object is frozen; attempting to mutate it throws.

## How template metadata populates the environment

1. **`template.json` declares intent** – Dimensions under `metadata.dimensions` define the option vocabulary, `metadata.placeholders` inventories template-defined `{{TOKEN}}` values, and `metadata.variables` opts into canonical placeholders supplied by the CLI.
2. **The CLI normalizes user input** – Flags such as `--options "capabilities=auth+logging"` are validated against the declared dimensions and cached in `ctx.options.byDimension` (with defaults pre-applied). Placeholder values are gathered via `--placeholder`, environment variables, defaults, or interactive prompts so `ctx.inputs` is fully populated before `_setup.mjs` executes.
3. **`ctx` and `tools` expose the results** – Setup scripts read `ctx.options` or helper wrappers (`tools.options.*`) to branch on selected features, and they access placeholder answers via `ctx.inputs` or `tools.inputs`. Helper APIs such as `tools.placeholders.applyInputs()` consume these values directly, keeping setup code deterministic.

**Example**

```jsonc
// template.json (excerpt)
{
  "setup": {
    "dimensions": {
      "capabilities": {
        "type": "multi",
        "values": ["auth", "docs"],
        "default": ["auth"]
      }
    }
  },
  "metadata": {
    "placeholders": [
      { "name": "{{PROJECT_NAME}}", "required": true }
    ],
    "variables": [
      { "name": "author" },
      { "name": "license" }
    ]
  }
}
```

With `--options "capabilities=auth+docs"` and a placeholder answer `AUTHOR="Jane"`, the setup script receives:

```javascript
ctx.options.byDimension.capabilities; // ['auth', 'docs']
ctx.inputs.AUTHOR; // 'Jane'
await tools.placeholders.applyInputs(['README.md']);
await tools.templates.renderFile('README.tpl.mjs', 'README.md', {
  author: ctx.inputs.AUTHOR,
  projectName: ctx.projectName
});
```

This shared schema lets template authoring tools (such as `make-template`) prompt for placeholder values, while the runtime guarantees consistent option handling inside `_setup.mjs`.

## Tools Overview

The `tools` object exposes high-level utilities. Each module is scoped to the project directory and performs validation automatically.

### `tools.inputs`

| Method | Description |
|--------|-------------|
| `get(name, fallback?)` | Returns the collected value for `name` (e.g. `PROJECT_NAME`). Falls back to `fallback` when undefined. |
| `all()` | Returns a frozen clone of every placeholder value. Useful for spreading into other helpers. |

**Example**
```javascript
const author = tools.inputs.get('AUTHOR', 'Unknown');
```

### `tools.placeholders`

Placeholder replacement operations.

**applyInputs(selector, extra?)**  
Apply values from `ctx.inputs`, `ctx.projectName`, and optional `extra` map to files matching the selector.  
*Parameters:* `selector?: string | string[], extra?: Record<string, any>`

**replaceAll(replacements, selector)**  
Replace `{{TOKEN}}` placeholders in files matching the selector with custom values.  
*Parameters:* `replacements: Record<string, string>, selector?: string | string[]`

**replaceInFile(file, replacements)**  
Replace placeholders in a single file with custom values.  
*Parameters:* `file: string, replacements: Record<string, string>`

**Usage guidance**
- Use `applyInputs` when you simply need the answers collected from the instantiator.
- Use `replaceAll`/`replaceInFile` when you must provide custom values or merge computed data.

**Example**
```javascript
await tools.placeholders.applyInputs(['README.md', 'package.json']);
await tools.placeholders.replaceAll({ SUPPORT_EMAIL: ctx.inputs.SUPPORT_EMAIL }, ['src/config.ts']);
```

> Placeholder helpers operate on file contents. To incorporate placeholder values into filenames or directories, combine `ctx.inputs` with `tools.files` (for renames) or `tools.templates.renderFile` (for generated assets).

### `tools.text`

Text manipulation operations.

**insertAfter({ file, marker, block })**  
Insert a block of text immediately after a marker line, if not already present.  
*Parameters:* `file: string, marker: string, block: string | string[]`

**ensureBlock({ file, marker, block })**  
Guarantee a block exists after the marker (idempotent operation).  
*Parameters:* `file: string, marker: string, block: string | string[]`

**replaceBetween({ file, start, end, block })**  
Replace content bounded by start and end markers, preserving the markers themselves.  
*Parameters:* `file: string, start: string, end: string, block: string | string[]`

**appendLines({ file, lines })**  
Append lines to a file with automatic newline handling.  
*Parameters:* `file: string, lines: string | string[]`

**replace({ file, search, replace, ensureMatch })**  
String or regex replacement with optional guard to ensure a match exists.  
*Parameters:* `file: string, search: string | RegExp, replace: string, ensureMatch?: boolean`

### `tools.files`

File system operations scoped to the project directory.

**ensureDirs(paths)**  
Create directories. Accepts a single path or array of paths.  
*Parameters:* `paths: string | string[]`

**copy(from, to, options?)**  
Copy files or directories within the project.  
*Parameters:* `from: string, to: string, options?: { overwrite?: boolean }`

**move(from, to, options?)**  
Move files or directories within the project. Falls back to copy+remove for cross-device moves.  
*Parameters:* `from: string, to: string, options?: { overwrite?: boolean }`

**remove(path)**  
Remove a file or directory (recursive).  
*Parameters:* `path: string`

**write(file, content, options?)**  
Write text content to a file. Content can be string, array of strings, or Buffer.  
*Parameters:* `file: string, content: string | string[] | Buffer, options?: { overwrite?: boolean }`

> Note: File helpers skip `.template-undo.json` and other internal artifacts automatically. The CLI stages the `__scaffold__/` directory (or your configured `authorAssetsDir`) before `_setup.mjs` runs and removes it afterwards, so treat that directory as read-only runtime input.

### `tools.json`

JSON file manipulation operations.

**read(path)**  
Read and parse a JSON file. Throws if file doesn't exist.  
*Parameters:* `path: string`  
*Returns:* `any`

**merge(path, patch)**  
Deep-merge an object into an existing JSON file. Creates file if missing. Arrays are replaced wholesale.  
*Parameters:* `path: string, patch: object`

**update(path, updater)**  
Provide a function that receives a mutable clone of the JSON data. Return new object or mutate the draft.  
*Parameters:* `path: string, updater: (data: any) => any`

**set(path, value)**  
Assign a value at a dot-path (e.g. `scripts.dev`). Dots in the path act as property separators, allowing deep object navigation. Property names can contain any valid JavaScript identifier characters, including special characters like `@` in scoped package names. Intermediate objects are created automatically.  
*Parameters:* `path: string, value: any`  
*Examples:*  
- `tools.json.set('package.json', 'scripts.dev', 'node index.js')`  
- `tools.json.set('package.json', 'dependencies.@m5nv/auth-lib', '^1.0.0')`  
- `tools.json.set('package.json', 'config.database.host', 'localhost')`

**remove(path)**  
Remove a property or array entry at the dot-path. Dots act as property separators for deep navigation.  
*Parameters:* `path: string`

**addToArray(path, value, options?)**  
Push a value into an array at the dot-path, optionally enforcing uniqueness. Dots act as property separators for deep navigation.  
*Parameters:* `path: string, value: any, options?: { unique?: boolean }`

**mergeArray(path, items, options?)**  
Merge multiple values into an array at the dot-path, optionally enforcing uniqueness. Dots act as property separators for deep navigation.  
*Parameters:* `path: string, items: any[], options?: { unique?: boolean }`

### `tools.templates`

Template asset operations. All paths are resolved relative to the template assets directory (configured via `setup.authorAssetsDir`, defaults to `__scaffold__`).

**renderString(template, data)**  
Render a string containing `{{TOKEN}}` placeholders.  
*Parameters:* `template: string, data: Record<string, any>`  
*Returns:* `string`

**renderFile(source, target, data)**  
Read a template asset file, render it with placeholders, and write to target location in the project (creating directories as needed).  
*Parameters:* `source: string, target: string, data: Record<string, any>`

**copy(from, to, options?)**  
Copy a directory tree from template assets to the project, respecting template ignore rules.  
*Parameters:* `from: string, to: string, options?: { overwrite?: boolean }`

### `tools.logger`

Simple logger routed through the CLI output and optional log file.

**info(message, data?)**  
Log an info message with optional structured data.  
*Parameters:* `message: string, data?: any`

**warn(message, data?)**  
Log a warning message with optional structured data.  
*Parameters:* `message: string, data?: any`

**table(rows)**  
Log tabular data as formatted output.  
*Parameters:* `rows: any[]`

### `tools.options`

Dimension-based option checking and conditional logic.

**list(dimension?)**  
Without arguments returns `ctx.options.raw`. With dimension name returns the normalized selection for that dimension.  
*Parameters:* `dimension?: string`  
*Returns:* `string[] | string | null`

**raw()**  
Shortcut for `ctx.options.raw`.  
*Returns:* `string[]`

**dimensions()**  
Shallow clone of `ctx.options.byDimension`.  
*Returns:* `Record<string, string | string[]>`

**has(name)**  
Checks whether the default multi-select dimension includes the name.  
*Parameters:* `name: string`  
*Returns:* `boolean`

**in(dimension, value)**  
Returns true when the selected value(s) for dimension include value.  
*Parameters:* `dimension: string, value: string`  
*Returns:* `boolean`

**require(value)**  
Ensures the default multi-select dimension includes value; throws otherwise.  
*Parameters:* `value: string`

**require(dimension, value)**  
Ensures value is selected for dimension; throws otherwise.  
*Parameters:* `dimension: string, value: string`

**when(value, fn)**  
Runs fn when the default multi-select dimension includes value. Supports async callbacks.  
*Parameters:* `value: string, fn: () => void | Promise<void>`  
*Returns:* `Promise<void> | undefined`

> The “default dimension” is the first multi-select dimension defined in `template.json`. By convention we reserve `capabilities` for feature toggles, which becomes the default unless a template specifies otherwise.

**Example**
```javascript
await tools.options.when('logging', async () => {
  await tools.json.merge('package.json', {
    dependencies: { pino: '^9.0.0' }
  });
});

if (tools.options.in('deployment', 'cloudflare-d1')) {
  await tools.templates.copy('infra/cloudflare-d1', 'infra');
}
```

## Example Setup Script

```javascript
// _setup.mjs
export default async function setup({ ctx, tools }) {
  // Apply collected placeholder answers to common files
  await tools.placeholders.applyInputs(['README.md', 'package.json']);

  await tools.text.insertAfter({
    file: 'README.md',
    marker: `# ${ctx.projectName}`,
    block: ['## Next steps', '- npm install', '- npm run dev']
  });

  await tools.json.set('package.json', 'scripts.dev', 'node index.js');
  await tools.json.addToArray('package.json', 'keywords', ctx.projectName, { unique: true });

  // Render a file from author assets, injecting placeholder values
  await tools.templates.renderFile(
    'README.tpl',
    'docs/README.md',
    {
      projectName: ctx.projectName,
      author: tools.inputs.get('AUTHOR', 'Unknown Author')
    }
  );

  await tools.options.when('docs', async () => {
    await tools.files.ensureDirs('docs');
    await tools.text.replaceBetween({
      file: 'docs/overview.md',
      start: '<!-- docs:start -->',
      end: '<!-- docs:end -->',
      block: [`Generated for ${ctx.projectName}`]
    });
  });

  if (tools.options.in('deployment', 'cloudflare-d1')) {
    await tools.templates.copy('infra/cloudflare-d1', 'infra/cloudflare');
  }
}
```

## Template Metadata Essentials

`template.json` is the authoritative contract that create-scaffold reads before copying files or executing `_setup.mjs`. The `setup` block defines three critical aspects:

```json
{
  "setup": {
    "authoring": "composable",
    "authorAssetsDir": "__scaffold__",
    "dimensions": {
      "capabilities": {
        "type": "multi",
        "values": ["logging", "testing", "docs"],
        "default": ["logging"],
        "requires": {
          "testing": ["logging"]
        },
        "conflicts": {
          "docs": ["testing"]
        },
        "policy": "strict"
      },
      "deployment": {
        "type": "single",
        "values": ["none", "cloudflare-d1", "cloudflare-turso"],
        "default": "none"
      }
    }
  }
}
```

- **`authoring`** distinguishes WYSIWYG (`"wysiwyg"`) templates from composable ones (`"composable"`). The runtime exposes this value as `ctx.authoring` so setup scripts can tailor behaviour.
- **`authorAssetsDir`** names the directory that stores author-only snippets (defaults to `__scaffold__`). The CLI stages it before setup runs and deletes it afterwards.
- **`dimensions`** enumerate the option vocabulary. Each entry supports:
  - `type`: `"single"` or `"multi"`.
  - `values`: allowed tokens.
  - `default`: optional default selection(s).
  - `requires`: map of dependencies (value → required selections in the same dimension).
  - `conflicts`: map of conflicts (value → incompatible selections in the same dimension).
  - `policy`: `"strict"` (reject unknown values) or `"warn"` (allow but warn). Defaults to `"strict"`.
  - `ui`: optional UI configuration object.

## Additional Reading

- [Creating Templates](../how-to/creating-templates.md) – guided walkthrough with practical examples.
- [Author Workflow](../how-to/author-workflow.md) – recommended iteration loops for WYSIWYG and composable templates.
- [Setup Script Recipes](../how-to/setup-recipes.md) – copy-ready snippets for frequent helper tasks.
- [Template Schema Reference](../reference/template-schema.md) – complete schema reference
- [CLI Reference](cli-reference.md) – command-line options such as `--help`, `--dry-run`, `--log-file`, and `--no-cache`.
