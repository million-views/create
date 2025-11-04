# Tasks for Schema Formalization & Tooling Sprint

## Milestone 1: Schema Authoring & Versioning
- [x] Create `schema/template.v1.json` capturing current template metadata contract (placeholders, dimensions, setup, etc.).
- [x] Add `schema/template.json` as a copy of the latest stable version.
- [x] Document versioning policy (major/minor) within schema folder README or comments.

## Milestone 2: Schema Build Pipeline
- [x] Implement `scripts/build-template-schema.mjs` to validate schema and emit types.
- [x] Wire script to generate `types/template-schema.ts` and derived `types/template-schema.d.ts`.
- [x] Ensure generator supports `--check` mode and exits non-zero on drift.
- [x] Add npm scripts `schema:build` and `schema:check` (with `tsc --noEmit`) to `package.json`.

## Milestone 3: Runtime Validation
- [x] Implement bespoke validator (`bin/utils/templateValidator.mjs`) enforcing the schema invariants.
- [x] Integrate validator into template metadata discovery flow (reject invalid metadata with clear errors).
- [x] Add caching/memoization so schema parsing is not repeated unnecessarily.

## Milestone 4: Packaging & Exports
- [x] Update `package.json` `files` and `exports` to ship schema and `.d.ts` declarations.
- [x] Verify `npm pack` output contains schema and types.

## Milestone 5: Testing & Quality Gates
- [x] Add unit tests for generator script (happy path + failure modes).
- [x] Extend CLI/template tests to cover schema validation success/failure scenarios.
- [x] Run `tsc --noEmit` in CI to validate `types/template-schema.ts`.
- [x] Update comprehensive validation scripts if they need awareness of new artifacts.

## Milestone 6: Documentation & Tooling Guidance
- [x] Update docs (CLI reference, how-to author workflow, validation setup) with schema usage and versioning instructions.
- [x] Provide VS Code `json.schemas` snippet referencing packaged schema path.
- [x] Draft follow-up note/issue for make-template repo to consume exported schema.
