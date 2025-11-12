# Design Document

## Overview
We will overhaul the `_setup.mjs` experience so template authors rely on a curated runtime instead of ad-hoc Node.js scripting. The CLI will inject a **Setup Runtime** object that exposes high-level utilities for the most common mutations. Setup scripts operate inside this runtime, enabling future sandboxing and dramatically simplifying documentation and fixtures.

This implementation follows the decisions selected during triage:
1. **Standard utility kit** (placeholder, JSON, directory helpers, templating, structured logging).
2. **Optional ast-grep adapter** exposed when the dependency is available.
3. **Soft validation of `--options`** via template-declared support lists.
4. **Clean break** from the unrestricted Node.js execution model.

## Architecture

### Execution model
- `_setup.mjs` remains the entry point, but is executed through a new `SetupSandbox` that loads scripts using `vm.SourceTextModule`. The sandbox injects only the curated runtime (`env.runtime`) and blocks arbitrary `import` statements unless whitelisted.
- The sandbox enforces that setup scripts export a single `default` async function receiving `(ctx, tools)` where:
  - `ctx` mirrors the current Environment_Object primitives (`projectDir`, `projectName`, `cwd`, `ide`, `options`).
  - `tools` is the curated standard kit (detailed below). Access to Node built-ins (`fs`, `path`, etc.) is not provided.
- Scripts attempting to access undeclared globals, dynamic `import()`, or `require` will throw before execution. This satisfies the clean-break decision and sets the stage for true sandboxing.

### Setup Runtime Modules
We introduce `bin/setupRuntime.mjs` which exports factory functions used by `environmentFactory.mjs`:

```javascript
export function createSetupContext({ projectDirectory, projectName, cwd, ide, options }) { ... }
export function createSetupTools(options) { ... }
export async function loadSetupScript(setupPath, ctx, tools) { ... }
```

`createSetupTools` returns frozen objects to prevent mutation, and internally scopes all file operations to the project directory.

### Standard Utility Kit
`tools` is structured to encourage intent-based operations:

```javascript
{
  placeholders: {
    replaceAll(replacements, selector),
    replaceInFile(file, replacements)
  },
  files: {
    ensureDirs(paths),
    copy(fromRelative, toRelative, { overwrite }),
    remove(relativePath),
    move(fromRelative, toRelative, { overwrite })
  },
  json: {
    merge(relativePath, patch),
    update(relativePath, updater),
    read(relativePath)
  },
  templates: {
    renderString(template, data),
    renderFile(sourceRelative, targetRelative, data)
  },
  logger: {
    info(message, data?),
    warn(message, data?),
    table(rows)
  },
  ide: {
    applyPreset(presetName),
    presets: ['kiro', 'vscode', 'cursor', 'windsurf']
  },
  options: {
    has(name),
    when(name, fn),
    list()
  },
  astGrep: optional adapter (see below)
}
```

Key traits:
- **Path safety**: all file operations resolve against `ctx.projectDir`. Attempts to escape the project directory throw a `SetupSandboxError`.
- **Placeholder engine**: `selector` accepts glob patterns; internally uses `fast-glob` to enumerate files.
- **Templates**: `renderString` supports Mustache-style placeholders (with `{{ }}`) via `eta` or similar lightweight engine. `renderFile` reads a template file bundled with the template and writes the rendered content into the project tree.
- **IDE presets**: `applyPreset` loads curated configuration JSON from `docs/_templates/ide-presets/<ide>.json`. Authors can call it multiple times safely; merges are idempotent.

### Optional ast-grep Adapter
- `createSetupTools` tries to dynamically import `@ast-grep/napi` (Node binding) at runtime.
- When available, `tools.astGrep` exposes:
  - `available: true`
  - `run(query, options)` – thin pass-through to `ast-grep` search.
  - `transform(config)` – apply rewrite configuration to files within the project directory.
- When unavailable, `tools.astGrep` is `{ available: false, reason }`. Documentation encourages feature detection before use.
- We treat ast-grep as an optional peer dependency; tests can stub it by setting an environment variable (reusing the pattern established for `tree` command simulation).

### Options Support & Warnings
- Templates may declare their supported options in `template.json` under `setup.supportedOptions: []`.
- During scaffolding we compare user-supplied `ctx.options` against this list. Unrecognized options trigger a warning: `⚠️ template "api-starter" does not declare support for: ["graphql"]`.
- No hard failure, aligning with the “soft warnings” decision.
- If `supportedOptions` is absent, we skip validation; docs encourage authors to declare it to improve UX.

### Setup Script Contract
1. `_setup.mjs` scripts must export a default async function with signature `(ctx, tools)`. Any other export shape triggers a descriptive error.
2. Because scripts run within the sandbox module loader, direct `import` statements result in a descriptive error `Import is disabled within setup scripts; use provided tools.` This keeps the runtime ready for future sandboxing.
3. Errors reference the new contract directly so authors understand the expected shape without mentioning forbidden Node.js access.

## CLI Changes
- `bin/index.mjs`: replace direct dynamic `import(setupScriptUrl)` with `SetupSandbox.load(setupScriptPath, ctx, tools)`.
- `environmentFactory.mjs`: still constructs the sanitized context but now delegates to `createSetupContext`.
- `bin/logger.mjs`: add helper `createSetupLogger` that writes to console and optional log file; exposed as part of `tools.logger`.
- `bin/security.mjs`: introduce validations to ensure template-declared `supportedOptions` passes the same regex used for CLI input.
- `utils` additions: path safety helpers (`assertInsideProject`), globbing, and template rendering utilities.

## Documentation Updates
We will redesign the documents cited in the requirements:
- `docs/how-to/creating-templates.md`: rewrite setup section to show a <25 line example using `tools.placeholders` and `tools.ide.applyPreset`.
- `docs/tutorial/first-template.md`: update examples to demonstrate `tools.options.when('typescript', ...)`.
- `docs/explanation/ide-integration.md`: align messaging with `ide.applyPreset`.
- `docs/reference/environment-object.md`: rename section to “Setup Context & Tools” and document each utility method.
- `docs/reference/cli-reference.md`: clarify `--options` usage and the new warning behavior.
- `docs/reference/environment-object.md`: include ast-grep availability notes.

## Test Strategy
1. **Unit tests**
  - `setup-runtime.test.mjs`: validate sandbox enforcement, tool availability, path safety.
  - `environment-factory.test.mjs`: ensure context normalization.
  - `template-discovery.test.mjs`: confirm `supportedOptions` parsing.
2. **Integration tests**
   - Update existing CLI integration fixtures to use the new APIs (IDE demo, features demo, full demo).
   - Add new fixture showcasing `astGrep` usage guarded by feature detection; skip test when adapter unavailable.
3. **Security tests**
   - Attempt path traversal in setup script and assert rejection.
   - Attempt `import('fs')` and assert sandbox error.
4. **Docs-driven tests**
   - Validate code snippets via examples stored under `docs/_templates`.

## Risks & Mitigations
- **Sandbox bypass via dynamic evaluation**: the sandbox denies `eval` and `Function` by running in a strict context with a locked global object.
- **Template authors needing additional utilities**: we document an extension request process; tools are versioned to allow additive releases.
- **ast-grep availability variance**: fail softly and provide CLI warning when authors attempt to use it without availability.

## Follow-ups
- Explore future-friendly manifest (`template.json`) additions (e.g., `setup.requiresTools`) once the runtime stabilizes.
