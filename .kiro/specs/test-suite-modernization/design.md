# Test Suite Modernization — Design

## Overview
We will streamline the CLI test suite by removing redundant validation coverage, centralizing shared helpers, and bootstrapping the native `node:test` runner. The effort proceeds in three tracks:
1. Consolidate validation edge cases inside `test/security.test.mjs` and refocus the argument parser and environment factory suites on integration coverage.
2. Extract common utilities (CLI spawning, resource snapshots, validation fixtures) into reusable modules under `test/utils/`.
3. Migrate `test/argument-parser.test.mjs` to the `node:test` runner and wire project scripts to execute the new harness while preserving quick/full modes.

## Implementation Plan
### 1. Consolidate validation coverage
- Identify overlapping cases across `test/environment-factory.test.mjs` and `test/security.test.mjs` (IDE casing, null bytes, injection, traversal, invalid types).
- Replace detailed edge-case assertions in `environment-factory.test.mjs` with targeted integration checks that ensure `createEnvironmentObject` invokes the validators correctly (e.g., accepts valid input, propagates errors).
- In `test/argument-parser.test.mjs`, pare down `validateArguments` scenarios to smoke tests that confirm happy-path and error propagation without repeating every equivalence class.
- Ensure remaining coverage references the new shared helpers for fixtures/constants where applicable.

### 2. Shared utilities
- Create `test/utils/cli.js` exporting helpers for spawning the CLI and capturing output/timeouts.
- Create `test/utils/resources.js` housing `getResourceSnapshot`, `detectResourceLeaks`, and cleanup helpers currently duplicated.
- Export any other commonly reused constants (e.g., fixture roots) from `test/utils/constants.js` if helpful.
- Update `test/cli.test.mjs` and `test/resource-leak-test.mjs` (or its successor) to consume the shared modules.

### 3. Native runner adoption
- Rewrite `test/argument-parser.test.mjs` using `node:test` with subtests for parsing, validation, and help output.
- Use `node:assert/strict` for assertions to keep dependencies minimal.
- Annotate long-running or integration tests with `test.skip`/`test.todo` as needed to maintain parity.
- Add a top-level `test/node-test.config.mjs` (if necessary) to configure test concurrency or file patterns.
- Update `scripts/test-runner.mjs` to detect the presence of the native runner:
  - For the full suite, invoke `node --test --experimental-test-runner --test-name-pattern` etc., delegating quick-mode selection to `--test-name-pattern` or `--test` CLI filters.
  - Provide compatibility shim for suites not yet migrated by executing them via `node` until fully ported.
- Adjust `package.json` scripts (`test`, `test:quick`, etc.) to call the updated runner entry point.

## Data Model & File Additions
- `test/utils/cli.js`: exports `execCLI(args, options)`.
- `test/utils/resources.js`: exports `getResourceSnapshot`, `detectResourceLeaks`, `cleanupPaths`.
- Optional: `test/utils/index.js` or `constants.js` for shared paths/timeouts.
- `test/node-test.config.mjs` (if required) to fine-tune runner settings.

## Testing Strategy
- Run `node --test test/argument-parser.test.mjs` to confirm the new harness.
- Execute `npm test` (full suite) and `npm run test:quick` (or successor) to ensure orchestration remains functional.
- Verify that trimmed suites still fail when validator contracts break (inject a temporary change if needed during development).
- Ensure the shared utilities are exercised by at least two suites via smoke runs.

## Risks & Mitigations
- **Partial migration mismatch:** Some suites stay on custom harnesses. Mitigate by allowing `scripts/test-runner.mjs` to run mixed strategies during transition.
- **Quick/full mode regression:** Document or maintain filter flags (e.g., `--test-name-pattern`) and update developer docs accordingly.
- **Flaky resource checks:** Centralized helpers should guard against environment noise; add retries or tolerant comparisons if necessary.
