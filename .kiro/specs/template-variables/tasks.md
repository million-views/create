# Implementation Plan

- [x] 1. Schema updates
  - [x] 1.1 Extend `schema/template.v1.json` with `metadata.variables` definition and canonical enum
  - [x] 1.2 Regenerate `types/template-schema.{ts,d.ts,mjs}` via `npm run schema:build`
  - [x]* 1.3 Update `test/schema-build.test.mjs` fixtures to cover canonical variables

- [x] 2. Canonical registry module
  - [x] 2.1 Add `bin/utils/canonicalVariables.mjs` exporting registry and normalization helpers
  - [x] 2.2 Write unit tests for canonical normalization and merge logic (`test/canonical-variables.test.mjs`)

- [x] 3. Template validation integration
  - [x] 3.1 Update `bin/utils/templateValidator.mjs` to process `metadata.variables` and merge placeholders
  - [x] 3.2 Adjust `bin/templateMetadata.mjs` to expose merged placeholders and canonical metadata
  - [x] 3.3 Expand `test/template-validator.test.mjs` to verify canonical variable behavior

- [x] 4. Documentation & CLI references
  - [x] 4.1 Document canonical variables in `docs/reference/cli-reference.md` and relevant guides
  - [ ]* 4.2 Update roadmap and changelog sections if required

- [ ] 5. Verification
  - [x] 5.1 Run `npm run schema:check`
  - [ ] 5.2 Run `npm test`
  - [x] 5.3 Run `npm run validate:docs`
