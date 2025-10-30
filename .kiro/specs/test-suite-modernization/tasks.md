# Test Suite Modernization — Tasks

## Task 1 — Consolidate validation coverage
- [x] Audit overlapping IDE/options validation cases across `test/environment-factory.test.mjs` and `test/security.test.mjs`.
- [x] Trim redundant assertions from `test/environment-factory.test.mjs`, keeping integration-level expectations only.
- [x] Reduce `test/argument-parser.test.mjs` validation cases to representative smoke checks.
- [x] Ensure remaining edge cases are retained (or added) within `test/security.test.mjs`.

## Task 2 — Extract shared test utilities
- [x] Create `test/utils/cli.js` and migrate CLI spawn helpers from `test/cli.test.mjs`.
- [x] Create `test/utils/resources.js` for resource snapshot/leak detection helpers.
- [x] Update suites (`test/cli.test.mjs`, `test/resource-leak-test.mjs`, etc.) to consume the shared utilities.

## Task 3 — Adopt node:test for argument parser suite
- [x] Rewrite `test/argument-parser.test.mjs` using `node:test` and `node:assert/strict`.
- [x] Verify the migrated suite passes via `node --test`.
- [x] Update `scripts/test-runner.mjs` (and npm scripts) to invoke the native runner while still running legacy harnesses.
- [x] Confirm `npm test` and `npm run test:quick` succeed after orchestration changes.

## Task 4 — Expand native runner adoption
- [x] Migrate `test/environment-factory.test.mjs` to `node:test` and streamline duplicate validations.
- [x] Convert `test/options-processor.test.mjs` to `node:test`, keeping representative equivalence classes only.
- [x] Rewrite `test/resource-leak-test.mjs` to use `node:test` and consolidate overlapping scenarios.
- [x] Update `scripts/test-runner.mjs` to execute the migrated suites via `node --test`.

## Task 5 — Harmonize test filenames
- [x] Rename remaining camelCase test files to kebab-case and update any references.

## Task 6 — Migrate setup runtime suite
- [x] Convert `test/setup-runtime.test.mjs` to the `node:test` runner using shared helpers.
- [x] Update quick/full orchestrator entries to invoke the suite via `node --test`.
- [x] Verify the migrated suite passes with `node --test`.

## Task 7 — Migrate security suite
- [x] Rewrite `test/security.test.mjs` using `node:test` while preserving edge-case coverage.
- [x] Update `scripts/test-runner.mjs` to execute the security suite via `node --test`.
- [x] Confirm `node --test test/security.test.mjs` succeeds after migration.

## Task 8 — Migrate CLI harness suites
- [x] Convert `test/cli.test.mjs` to `node:test`, reusing shared CLI spawn utilities.
- [x] Port `test/cli-integration.test.mjs` to `node:test` while keeping fixture orchestration intact.
- [x] Ensure orchestrator quick/full flows call the native runner for migrated CLI suites.
