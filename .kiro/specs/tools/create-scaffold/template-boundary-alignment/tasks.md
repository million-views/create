# Template Boundary Alignment — Tasks

> **⚠️ HISTORICAL NOTE**: This spec references `authoringMode` (`wysiwyg` vs `composable`), which was **removed** from the codebase. Analysis revealed that `authoringMode` had no behavioral impact in the CLI—it was purely metadata passed to setup scripts that was never used. Tasks referencing `authoringMode` should be considered obsolete.

- [x] Ratify `template.json` schema additions (`setup.dimensions.*` fields for defaults/requires/conflicts/policy/builtIn`).
- [x] Update create-scaffold option parser to read structured dimensions, apply defaults, enforce `requires`/`conflicts`, and expose normalized `ctx.options.byDimension`.
- [x] Extend `_setup.mjs` runtime helpers to surface dimension-aware utilities (`tools.options.in`, `tools.options.require`, `tools.options.conflictsWith`, `tools.options.list('capabilities')`).
- [x] ~~Teach make-template to emit `authoringMode`, seed dimensions for common stacks, and warn authors when toggling between WYSIWYG and Composable modes.~~ (OBSOLETE: authoringMode removed)
- [x] Establish `__scaffold__/` convention (configurable alias) and update copy/ignore logic in create-scaffold and make-template restore routines.
- [x] ~~Document dual template modes: move WYSIWYG guidance into make-template docs, adjust create-scaffold tutorials to focus on consumers, and add a shared glossary for dimensions.~~ (OBSOLETE: authoringMode removed)
- [x] Provide author workflow guide covering restore-first iteration, snippet management, and when to rely on create-scaffold for verification.
- [x] ~~Add validation tests and fixtures for both template modes (e.g., WYSIWYG template with no dimensions, Composable template with complex dependencies/conflicts).~~ (OBSOLETE: authoringMode removed)
- [x] Plan follow-on sprint to explore higher-level feature composition once the schema and docs are stable.
