# Guidance for the make-template Team

> **⚠️ HISTORICAL NOTE**: This spec references `authoringMode` (`wysiwyg` vs `composable`), which was **removed** from the codebase. Analysis revealed that `authoringMode` had no behavioral impact in the CLI—it was purely metadata passed to setup scripts that was never used. All references to `authoringMode`, `wysiwyg`, and `composable` in this document are obsolete.

## What's New
- **Authoring modes:** Templates now declare `setup.authoringMode` as `"wysiwyg"` (inline iteration, minimal runtime options) or `"composable"` (runtime assembly via `_setup.mjs` + snippets). Default to `"wysiwyg"` and prompt authors before switching modes.
- **Dimensions schema:** `template.json.setup.dimensions` captures the option vocabulary. Each dimension entry supports:
  - `type: "single" | "multi"`
  - `values: string[]`
  - `default: string | string[]`
  - `requires: { value: string[] }` (dependencies within the dimension)
  - `conflicts: { value: string[] }`
  - `policy: "strict" | "warn"`
  - `builtIn: boolean` (e.g., `ide`)
  - `description: string` (optional, for docs/UI)
- **Author assets:** The CLI now stages `setup.authorAssetsDir` (defaults to `__scaffold__/`) before `_setup.mjs` runs and removes it afterwards. make-template should emit this property and ensure restore flows preserve the directory for authors.
- **Author assets directory:** Treat `__scaffold__/` as the canonical folder for snippets, templates, and other author-only resources. Leave it untouched during restore; create-scaffold ignores it at copy time.
- **Runtime contract:** `_setup.mjs` may rely only on the guaranteed fields:
  - `ctx.projectDir`
  - `ctx.projectName`
  - `ctx.ide`
  - `ctx.authoringMode`
  - `ctx.options.byDimension` (defaults already applied)
  - `ctx.options.raw`
  - `tools.*` helpers documented in the Environment reference

## Expectations for Conversion
1. **Detection & seeding**
   - Detect common stacks/infrastructure/capabilities and pre-populate the dimensions. Unused axes can be omitted.
   - For WYSIWYG templates, emit an empty `dimensions` object and leave mode as `"wysiwyg"`.
   - Always include `setup.authorAssetsDir` (default `"__scaffold__"`) so author tooling and create-scaffold remain in sync.
2. **Generated `_setup.mjs`**
   - Use `tools.options.in("<dimension>", "<value>")` style helpers (runtime to be added) instead of parsing raw strings.
   - Avoid referencing non-guaranteed ctx fields; warn the author if manual edits introduce them.
3. **Restore flow**
   - Continue generating `.template-undo.json` and `npm run make-template:restore` (or similar) instructions so authors can hop between template and working app views without invoking create-scaffold.
4. **Mode toggles**
   - When authors add a dimension to a WYSIWYG template, log a friendly reminder that they’re moving into Composable territory (different testing expectations).
   - Offer a helper to remove unused dimensions if they want to revert to WYSIWYG.

## Documentation Coordination
- Cross-link to create-scaffold docs for operator-facing topics (CLI usage, option syntax), but keep author-process references local to make-template.
- Provide before/after examples in recipe-style docs: show the input file, the `_setup.mjs` snippet, and the resulting output file so authors can map transformations with confidence.

Keeping to this contract lets both teams move fast without stepping on each other: make-template authors can iterate inline, and create-scaffold can guarantee deterministic behavior at instantiation time.
