# Template Undo Ignore — Requirements

## Context
- The make-template workflow will now emit a `.template-undo.json` artifact beside `template.json` and `_setup.mjs`. Template authors use it locally to revert their test projects back to a known good state.
- This file is not intended for consumers of `create-scaffold`; if copied it would leak author tooling into generated projects and confuse operators.
- The current scaffolding pipeline blindly copies every file (except `.git`) and the dry-run reporting surfaces every discovered path. Without an explicit rule, `.template-undo.json` will appear everywhere.

## Goals
- Treat `.template-undo.json` as tooling-only metadata that is excluded from all scaffold outputs and previews.
- Ensure every file replication surface (core copy, dry-run analysis, setup runtime helpers) skips this artifact without manual workarounds from template authors.
- Keep logging and telemetry clean—no file-copy events, summaries, or warnings should reference the undo file when a template includes it.
- Update developer and author documentation so expectations around ignored artifacts are crystal clear.

## Non-Goals
- Designing the structure or lifecycle of `.template-undo.json`; the make-template team owns its semantics.
- Building a generalized ignore-file mechanism or exposing new configuration knobs for template authors in this iteration.
- Modifying template discovery heuristics beyond what is necessary to avoid end-user exposure.

## Success Criteria
- Generated projects never contain `.template-undo.json`, even when templates ship one at any depth.
- Dry-run summaries, tree previews, and file-copy logs omit the undo file entirely.
- `tools.templates.copy` and any other runtime helpers used by `_setup.mjs` do not propagate the undo artifact.
- Documentation explicitly lists `.template-undo.json` among the automatically ignored template files.

## Decisions
1. Hard-code `.template-undo.json` into the scaffold ignore set alongside other internal artifacts (e.g., `.git`). A configuration-based solution can be revisited later if more entries appear.
