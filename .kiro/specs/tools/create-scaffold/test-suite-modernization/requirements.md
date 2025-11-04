# Test Suite Modernization — Requirements

## Context
- The CLI currently relies on bespoke per-file harnesses plus `scripts/test-runner.mjs` to orchestrate tests through child `node` invocations.
- Validation logic for IDE/options parameters is triplicated across `test/environment-factory.test.mjs`, `test/security.test.mjs`, and `test/argument-parser.test.mjs`, inflating execution time and maintenance cost.
- Node.js now ships a robust built-in test runner (`node:test`) that can replace the custom harnesses while maintaining ESM compatibility.

## Goals
- Reduce redundant validation coverage by carving unit suites back to integration-focused assertions while maintaining edge-case guarantees in the security suite.
- Consolidate shared helpers (CLI spawning, resource snapshotting, validation fixtures) so suites can reuse logic without duplication.
- Adopt the native `node:test` runner for at least one representative suite and pave the way for migrating the remaining tests.
- Keep quick vs. full execution modes available for developer ergonomics after the migration.

## Non-Goals
- Rewriting every test file in one iteration or changing coverage scope beyond redundancy removal.
- Introducing third-party test frameworks or assertion libraries beyond Node core modules.
- Modifying template fixtures or CLI implementation except where required to support the updated tests.

## Success Criteria
- Argument parser and environment factory suites no longer duplicate the exhaustive edge-case validation already owned by the security suite.
- Shared utilities live under `test/utils/` (or equivalent) and are consumed from at least two suites.
- `test/argument-parser.test.mjs` executes via `node:test` with `node --test` while preserving the ability to isolate scenarios (e.g., via CLI flags or annotations).
- `npm test` (or its successor) runs successfully using the updated orchestration strategy and still supports a quick-mode workflow.

## Decisions
1. Prioritize migrating `test/argument-parser.test.mjs` first to limit blast radius while validating the runner switch.
2. Retain the security suite as the single source of truth for exhaustive validation edge cases.
3. House reusable helpers (resource snapshots, CLI spawn wrappers) in a dedicated `test/utils/` directory, exporting ESM modules for consumption by suites.
