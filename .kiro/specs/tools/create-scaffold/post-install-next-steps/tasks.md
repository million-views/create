# Tasks

1. **Template metadata ingestion**
   - [x] Add helper to read `<template>/template.json` and extract a `handoff` array of strings.
   - [x] Log sanitized warnings when metadata is missing or malformed.

2. **Next steps rendering**
   - [x] Update `bin/index.mjs` to render the enriched “Next steps” block.
     - Always print `cd <projectDir>`.
     - Append template-provided instructions when available.
     - Otherwise append a fallback reminder to review README.md.
   - [x] Emit logger entry (`handoff_instructions`) with resolved steps when logging is enabled.

3. **Fixtures and tests**
   - [x] Add `handoff` arrays to relevant template fixtures.
   - [x] Extend CLI integration tests to assert the enriched output for templates with and without metadata.

4. **Documentation**
   - [x] Document the `handoff` key in `docs/how-to/creating-templates.md`, `docs/reference/cli-reference.md`, and `docs/phase-1-features.md`.
   - [x] Update tutorials/screenshot snippets to reflect the richer “Next steps”.

5. **Verification**
   - [x] Run `npm test`.
   - [x] Run `npm run validate:docs`.
