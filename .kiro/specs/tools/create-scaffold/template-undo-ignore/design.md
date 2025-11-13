# Template Undo Ignore — Design

## Overview
We will introduce a single source of truth for template-level ignore rules so every pathway that replicates template files omits `.template-undo.json`. The change touches three execution contexts:
- Core scaffolding (`bin/index.mjs`) which copies templates into the project directory.
- Dry-run analysis/reporting (`bin/dryRunEngine.mjs`) which enumerates future copy operations and renders the tree preview.
- Setup runtime helpers (`bin/setupRuntime.mjs`) where `_setup.mjs` scripts can copy bundled directories via `tools.templates.copy`.

Documentation will be updated to describe the new ignore behavior and reassure template authors that `.template-undo.json` is safe to commit.

## Architecture & Implementation
### Shared ignore utility
- Create `bin/utils/templateIgnore.mjs` exporting:
  - `IGNORED_TEMPLATE_ARTIFACTS`: frozen `Set` containing `'.template-undo.json'` and any existing defaults
  - `shouldIgnoreTemplateEntry(entryName: string): boolean`
- The module preserves name-based matching only (no globbing) which is sufficient for this single artifact and keeps behaviour deterministic.

### Core copy pipeline (`bin/index.mjs`)
- Update `copyRecursive` to consult `shouldIgnoreTemplateEntry` before descending into directories or copying files.
- This keeps `.template-undo.json` out of generated projects and suppresses file-copy logging for the artifact.

### Dry run engine (`bin/dryRunEngine.mjs`)
- Guard `collectFileCopyOperations` so ignored names are skipped when enumerating operations and when building the summary counts.
- Post-process `generateTreePreview` output (both when `tree` is present and when unavailable) by removing any lines containing ignored filenames to keep the preview clean.

### Setup runtime helpers (`bin/setupRuntime.mjs`)
- In `tools.templates.copy`, apply the shared ignore filter via `fs.cp`'s `filter` option (falling back to manual skip if needed) so runtime copies initiated by template scripts never recreate the undo file.
- Ensure any helper that shells out or walks directories copies respecting the ignore list (currently only `tools.templates.copy` is affected).

### Documentation
- Refresh authoring docs (`docs/explanation/template-system.md`, authoring/reference pages) to list `.template-undo.json` among files excluded by default.
- Mention the ignore rule in developer docs if they discuss template repository structure or runtime helper behaviour.

## Testing Strategy
- Extend unit tests:
  - `test/setup-runtime.test.mjs` to assert `tools.templates.copy` omits `.template-undo.json`.
  - `test/dry-run-engine.test.mjs` (or equivalent) to verify summaries exclude the file.
- Update CLI integration fixture(s) to include `.template-undo.json` and confirm:
  - Generated projects do not contain it.
  - Dry run output has no references.
  - Tree preview omits the entry.
- Run full test suite (`npm test`) to guard regressions.

## Risks & Mitigations
- **Risk:** Hard-coded file name may need extension later.
  **Mitigation:** Central utility allows adding entries without hunting through call sites.
- **Risk:** Tree preview filtering could remove legitimate lines if they contain substring `.template-undo.json`.
  **Mitigation:** Filter entire lines only when they match the exact filename token.
