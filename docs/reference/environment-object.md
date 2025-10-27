---
title: "Environment Object Reference"
type: "reference"
audience: "template-authors"
estimated_time: "N/A (reference)"
prerequisites:
  - "Comfortable with modern JavaScript syntax"
  - "Basic understanding of @m5nv/create-scaffold template workflow"
related_docs:
  - "../creating-templates.md"
  - "../how-to/setup-recipes.md"
  - "cli-reference.md"
last_updated: "2024-11-05"
---

# Environment Object Reference

## Setup Contract

Template setup scripts (`_setup.mjs`) run inside a secure sandbox. Every script must export a default `async` function that receives two arguments:

```javascript
export default async function setup(ctx, tools) {
  // ...
}
```

- **`ctx`** – immutable context describing the project being generated.
- **`tools`** – curated helper library for manipulating the scaffold without importing Node built-ins.

Direct access to `fs`, `path`, `import`, `eval`, or `require` is blocked. All filesystem and transformation work must go through `tools` so that the runtime can remain sandbox-friendly.

## Context (`ctx`)

| Property | Type | Description |
|----------|------|-------------|
| `projectDir` | `string` | Absolute path to the project directory. All helper methods already scope operations to this root, so you rarely need it directly. |
| `projectName` | `string` | Sanitized name chosen by the user (letters, numbers, hyphen, underscore). Use it when updating metadata such as `package.json` or README content. |
| `cwd` | `string` | Directory where the CLI command was executed. Helpful when you need to compute workspace-relative paths. |
| `ide` | `"kiro" \| "vscode" \| "cursor" \| "windsurf" \| null` | Target IDE provided via `--ide`. `null` when no IDE preference was expressed. |
| `options` | `string[]` | Sanitized list of contextual options provided through `--options`. Duplicate values are removed. |

The context object is frozen; attempting to mutate it throws.

## Tools Overview

The `tools` object exposes high-level utilities. Each module is scoped to the project directory and performs validation automatically.

### `tools.placeholders`

| Method | Description |
|--------|-------------|
| `replaceAll(replacements, selector)` | Replace `{{TOKEN}}` placeholders in every file matched by the selector (string or array of glob patterns). |
| `replaceInFile(file, replacements)` | Replace placeholders in a single file. |

**Example**
```javascript
await tools.placeholders.replaceAll({ PROJECT_NAME: ctx.projectName }, ['README.md', 'src/**/*.ts']);
```

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
| `list()` | Return the full array of options provided by the user. |
| `has(name)` | Boolean check for a specific option. |
| `when(name, fn)` | Execute `fn` only when the option is present. Supports `async` callbacks. |

## Example Setup Script

```javascript
// _setup.mjs
export default async function setup(ctx, tools) {
  await tools.placeholders.replaceAll(
    { PROJECT_NAME: ctx.projectName },
    ['README.md', 'package.json']
  );

  await tools.text.insertAfter({
    file: 'README.md',
    marker: '# {{PROJECT_NAME}}',
    block: ['## Next steps', '- npm install', '- npm run dev']
  });

  await tools.json.set('package.json', 'scripts.dev', 'node index.js');
  await tools.json.addToArray('package.json', 'keywords', ctx.projectName, { unique: true });

  await tools.options.when('docs', async () => {
    await tools.files.ensureDirs('docs');
    await tools.text.replaceBetween({
      file: 'docs/overview.md',
      start: '<!-- docs:start -->',
      end: '<!-- docs:end -->',
      block: [`Generated for ${ctx.projectName}`]
    });
  });

  if (ctx.ide) {
    await tools.ide.applyPreset(ctx.ide);
  }
}
```

## Supported Options Metadata

Templates can declare which options they understand by adding `setup.supportedOptions` to `template.json`:

```json
{
  "name": "full-demo-template",
  "setup": {
    "supportedOptions": ["docs", "auth", "api"]
  }
}
```

When the user passes unsupported options, the CLI emits a warning (but still completes the scaffold). The `tools.options` helpers always work with the sanitized list supplied by the user.

## Additional Reading

- [Creating Templates](../creating-templates.md) – guided walkthrough with practical examples.
- [Setup Script Recipes](../how-to/setup-recipes.md) – copy-ready snippets for frequent helper tasks.
- [CLI Reference](cli-reference.md) – command-line switches such as `--ide`, `--options`, and logging.
