---
title: "Environment Reference"
type: "reference"
audience: "template-authors"
estimated_time: "N/A (reference)"
prerequisites:
  - "Comfortable with modern JavaScript syntax"
  - "Basic understanding of @m5nv/create-scaffold template workflow"
related_docs:
  - "../how-to/creating-templates.md"
  - "../how-to/setup-recipes.md"
  - "cli-reference.md"
last_updated: "2025-10-30"
---

# Environment Reference

## Setup Contract

Template setup scripts (`_setup.mjs`) run inside a secure sandbox. Every script must export a default `async` function that receives a single **Environment** object containing `{ ctx, tools }`.

```javascript
export default async function setup({ ctx, tools }) {
  // ...
}
```

- **`ctx`** – immutable context describing the project being generated.
- **`tools`** – curated helper library for manipulating the scaffold without importing Node built-ins.
- You can destructure the Environment object (recommended) or access it as a single parameter (e.g. `export default async function setup(environment)`).

Direct access to `fs`, `path`, `import`, `eval`, or `require` is blocked. All filesystem and transformation work must go through `tools` so that the runtime can remain sandbox-friendly.

## Context (`ctx`)

| Property | Type | Description |
|----------|------|-------------|
| `projectDir` | `string` | Absolute path to the project directory. All helper methods already scope operations to this root, so you rarely need it directly. |
| `projectName` | `string` | Sanitized name chosen by the user (letters, numbers, hyphen, underscore). Use it when updating metadata such as `package.json` or README content. |
| `cwd` | `string` | Directory where the CLI command was executed. Helpful when you need to compute workspace-relative paths. |
| `ide` | `"kiro" \| "vscode" \| "cursor" \| "windsurf" \| null` | Target IDE provided via `--ide`. `null` when no IDE preference was expressed. |
| `authoringMode` | `"wysiwyg" \| "composable"` | Mode declared in `template.json`. WYSIWYG templates mirror a working project; composable templates assemble features via `_setup.mjs`. |
| `options` | `object` | Normalized user selections with defaults already applied. See breakdown below. |
| `inputs` | `Record<string, string \| number \| boolean>` | Placeholder answers collected during template instantiation. Keys omit braces (`PROJECT_NAME`). Values are immutable and type-coerced based on `metadata.placeholders` and any canonical `metadata.variables` entries. |

`ctx.options` contains two readonly views:

| Field | Type | Description |
|-------|------|-------------|
| `raw` | `string[]` | Ordered list of tokens supplied on the command line. |
| `byDimension` | `Record<string, string \| string[]>` | Canonical selections drawn from the template’s `setup.dimensions` metadata. Multi-select dimensions return arrays; single-select dimensions return a string or `null`. |

The context object is frozen; attempting to mutate it throws.

## How template metadata populates the environment

1. **`template.json` declares intent** – Dimensions under `setup.dimensions` define the option vocabulary, `metadata.placeholders` inventories template-defined `{{TOKEN}}` values, and `metadata.variables` opts into canonical placeholders supplied by the CLI.
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
await tools.templates.renderFile('__scaffold__/README.tpl.mjs', 'README.md', {
  author: ctx.inputs.AUTHOR,
  projectName: ctx.projectName
});
```

This shared schema lets template authoring tools (such as `@m5nv/make-template`) prompt for placeholder values, while the runtime guarantees consistent option handling inside `_setup.mjs`.

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

| Method | Description |
|--------|-------------|
| `applyInputs(selector, extra?)` | Apply values from `ctx.inputs`, `ctx.projectName`, and optional `extra` map to files matched by `selector`. Internally delegates to `replaceAll`. |
| `replaceAll(replacements, selector)` | Replace `{{TOKEN}}` placeholders in every file matched by the selector (string or array of glob patterns). |
| `replaceInFile(file, replacements)` | Replace placeholders in a single file. |

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

| Method | Description |
|--------|-------------|
| `insertAfter({ file, marker, block })` | Insert a block immediately after a marker if it is not already present. |
| `ensureBlock({ file, marker, block })` | Guarantee a block exists after the marker (idempotent). |
| `replaceBetween({ file, start, end, block })` | Replace the content bounded by two markers while preserving the markers themselves. |
| `appendLines({ file, lines })` | Append lines (string or array) with automatic newline handling. |
| `replace({ file, search, replace, ensureMatch })` | String/regex replacement with optional guard to ensure a match. |

### `tools.files`

| Method | Description |
|--------|-------------|
| `ensureDirs(paths)` | Ensure one or more directories exist inside the project (accepts string or array). |
| `copy(from, to, { overwrite })` | Copy files or directories within the project. |
| `move(from, to, { overwrite })` | Move files or directories. Cross-device moves fall back to copy + remove. |
| `remove(path)` | Remove a file or directory (recursive). |
| `write(file, content, { overwrite })` | Write text content (string/array/Buffer) to a file, optionally refusing to overwrite existing files. |
| `copyTemplateDir(from, to, { overwrite })` | Copy a project-local directory tree to a new location inside the project. |

> Note: File helpers skip `.template-undo.json` and other internal artifacts automatically. The CLI stages the `__scaffold__/` directory (or your configured `authorAssetsDir`) before `_setup.mjs` runs and removes it afterwards, so treat that directory as read-only runtime input.

### `tools.json`

| Method | Description |
|--------|-------------|
| `read(path)` | Read and parse a JSON file. Throws if it does not exist. |
| `merge(path, patch)` | Deep-merge a JSON object into an existing file. Creates the file when missing. Arrays are replaced whole. |
| `update(path, updater)` | Provide a function that receives a mutable clone of the JSON data. Return a new object or mutate the draft. |
| `set(path, value)` | Assign a value at a dot-path (e.g. `scripts.dev`). Intermediate objects/arrays are created automatically. |
| `remove(path)` | Remove a property or array entry addressed by the dot-path. |
| `addToArray(path, value, { unique })` | Push a value into an array addressed by the dot-path, optionally enforcing uniqueness. |
| `mergeArray(path, items, { unique })` | Merge multiple values into an array, optionally enforcing uniqueness. |

### `tools.templates`

| Method | Description |
|--------|-------------|
| `renderString(template, data)` | Render a string containing `{{TOKEN}}` placeholders. |
| `renderFile(source, target, data)` | Read a project-local template file, render it with placeholders, and write to the target location (creating directories as needed). |

### `tools.logger`

Simple logger routed through the CLI output and optional log file:

- `logger.info(message, data?)`
- `logger.warn(message, data?)`
- `logger.table(rows)`

### `tools.ide`

| Method | Description |
|--------|-------------|
| `applyPreset(name)` | Apply one of the built-in IDE presets (`kiro`, `vscode`, `cursor`, `windsurf`). Each preset creates or merges configuration files idempotently. |
| `presets` | Array of preset names for feature detection or UI. |

### `tools.options`

| Method | Description |
|--------|-------------|
| `list(dimension?)` | Without arguments returns `ctx.options.raw`. Provide a dimension name to receive the normalized selection for that dimension (string or array). |
| `raw()` | Shortcut for `ctx.options.raw`. |
| `dimensions()` | Shallow clone of `ctx.options.byDimension`. |
| `has(name)` | Checks whether the default multi-select dimension (usually `capabilities`) includes `name`. |
| `in(dimension, value)` | Returns `true` when the selected value(s) for `dimension` include `value`. |
| `require(value)` | Ensures the default multi-select dimension includes `value`; throws otherwise. |
| `require(dimension, value)` | Ensures `value` is selected for `dimension`; throws otherwise. |
| `when(value, fn)` | Runs `fn` when the default multi-select dimension includes `value`. Supports async callbacks. |

> The “default dimension” is the first multi-select dimension defined in `template.json`. By convention we reserve `capabilities` for feature toggles, which becomes the default unless a template specifies otherwise.

**Example**
```javascript
await tools.options.when('logging', async () => {
  await tools.json.merge('package.json', {
    dependencies: { pino: '^9.0.0' }
  });
});

if (tools.options.in('infrastructure', 'cloudflare-d1')) {
  await tools.files.copyTemplateDir('__scaffold__/infra/cloudflare-d1', 'infra');
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
    '__scaffold__/README.tpl',
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

  if (tools.options.in('infrastructure', 'cloudflare-d1')) {
    await tools.files.copyTemplateDir('__scaffold__/infra/cloudflare-d1', 'infra/cloudflare');
  }

  if (ctx.ide) {
    await tools.ide.applyPreset(ctx.ide);
  }
}
```

## Template Metadata Essentials

`template.json` is the authoritative contract that create-scaffold reads before copying files or executing `_setup.mjs`. The `setup` block defines three critical aspects:

```json
{
  "setup": {
    "authoringMode": "composable",
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
      "infrastructure": {
        "type": "single",
        "values": ["none", "cloudflare-d1", "cloudflare-turso"],
        "default": "none"
      }
    }
  }
}
```

- **`authoringMode`** distinguishes WYSIWYG (`"wysiwyg"`) templates from composable ones (`"composable"`). The runtime exposes this value as `ctx.authoringMode` so setup scripts can tailor behaviour.
- **`authorAssetsDir`** names the directory that stores author-only snippets (defaults to `__scaffold__`). The CLI stages it before setup runs and deletes it afterwards.
- **`dimensions`** enumerate the option vocabulary. Each entry supports:
  - `type`: `"single"` or `"multi"`.
  - `values`: allowed tokens.
  - `default`: optional default selection(s).
  - `requires`: map of dependencies (value → required selections in the same dimension).
  - `conflicts`: map of conflicts (value → incompatible selections in the same dimension).
  - `policy`: `"strict"` (reject unknown values) or `"warn"` (allow but warn). Defaults to `"strict"`.
  - `builtIn`: `true` for global dimensions such as `ide` when provided by create-scaffold.

Legacy `setup.supportedOptions` entries are automatically upgraded into a `capabilities` dimension at runtime, but new templates should rely on `setup.dimensions` exclusively.

## Additional Reading

- [Creating Templates](../how-to/creating-templates.md) – guided walkthrough with practical examples.
- [Author Workflow](../how-to/author-workflow.md) – recommended iteration loops for WYSIWYG and composable templates.
- [Setup Script Recipes](../how-to/setup-recipes.md) – copy-ready snippets for frequent helper tasks.
- [Dimensions Glossary](../reference/dimensions-glossary.md) – reserved names and usage guidelines.
- [CLI Reference](cli-reference.md) – command-line switches such as `--ide`, `--options`, and logging.
