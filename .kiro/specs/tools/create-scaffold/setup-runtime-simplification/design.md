# Design Document

## Overview
We will streamline the setup runtime by removing the ast-grep dependency and introducing first-party helpers that solve the most common template authoring problems. The sandbox remains the execution boundary; only the `tools` interface changes. Documentation and tests will showcase the updated contract using Diátaxis-aligned content.

## Architecture Summary
- **Runtime** (`bin/setupRuntime.mjs`): remove ast-grep adapter logic and expand the helper factories with new modules.
- **Helpers**: introduce `tools.text` and enrich `tools.json`/`tools.files` for expressive yet safe mutations.
- **CLI Flow** (`bin/index.mjs`): continue to import the runtime and emit warnings for unsupported options; no structural changes beyond removing ast-grep references.
- **Testing**: add unit coverage for the new helpers, update integration tests and fixtures to rely on them, and retire any ast-grep-specific assertions.
- **Documentation**: rewrite references to the helper surface, focusing on the 80/20 UX and honoring the Diátaxis structure (tutorials vs. how-to vs. explanations vs. reference).

## Helper Enhancements
### `tools.text`
Marker-oriented helpers for plain-text editing:
- `insertAfter({ file, marker, block })`: idempotently insert a block after the first marker occurrence.
- `replaceBetween({ file, start, end, block })`: replace the content bounded by two markers.
- `ensureBlock({ file, marker, block })`: guarantee that a block exists after a marker.
- `appendLines({ file, lines })`: append lines with inferred newline handling.
- `replace({ file, search, replace, ensureMatch })`: predictable search/replace with optional guard.

### `tools.json`
Path-based helpers using dot notation:
- `set(path, value)` to assign nested values.
- `remove(path)` to delete a property or array element.
- `addToArray(path, value, { unique })` and `mergeArray(path, items, { unique })` for list management.
- Retain `read`, `merge`, `update` for advanced scenarios.

### `tools.files`
- `write(file, content, { overwrite })` for single-file writes without manual `fs`.
- `copyFromTemplate(source, target, { overwrite })` (optional convenience).

### Removal
- Delete `tools.astGrep`, related feature detection, and native import logic. Ensure runtime does not attempt to load optional modules.

## Data Flow
The CLI still:
1. Copies template files.
2. Builds `ctx` via `environmentFactory.mjs`.
3. Instantiates helpers via the runtime.
4. Executes `_setup.mjs` with `(ctx, tools)`.

The only difference is the helper surface.

## Testing Strategy
- **Unit Tests** (`test/setup-runtime.test.mjs`): cover new helper behavior (text operations, JSON path helpers).
- **Integration Tests** (`test/cli.test.mjs`, `test/cli-integration.test.mjs`): update fixtures to rely on new helpers; ensure warnings for unsupported options still fire.
- **Spec & Smoke**: confirm they no longer mention ast-grep and pass after runtime changes.

## Documentation Strategy
Following Diátaxis:
- **Tutorial** (`docs/tutorial/first-template.md`): demonstrate a beginner flow using the new helper APIs.
- **How-to Guides**:
  - Refresh `docs/how-to/creating-templates.md` with practical sequences using the simplified helpers.
  - Introduce a dedicated recipe collection (e.g., `docs/how-to/setup-recipes.md`) linking common tasks like adding ESLint config or extending tsconfig.
- **Explanation** (`docs/explanation/ide-integration.md`, `docs/explanation/template-system.md`): describe the rationale for sandboxed helpers and the 80/20 design.
- **Reference** (`docs/reference/environment-object.md`, `docs/reference/cli-reference.md`): enumerate helper APIs and option metadata.

All ast-grep references will be removed or replaced with the new helper examples.
