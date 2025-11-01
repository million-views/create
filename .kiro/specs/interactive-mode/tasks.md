# Task Plan

Track progress for the Interactive Mode feature. Update the checklist
sequentially as work completes.

## Implementation Tasks

1. [x] Extend CLI argument parsing
   - Add `--interactive`, `--no-interactive`, and environment flag plumbing.
   - Update validation logic to bypass interactive mode when traditional inputs
     are present.

2. [x] Build the InteractiveSession module
   - Implement catalog loading, prompt flow, and validation retries.
   - Introduce optional prompt adapter for tests and non-TTY environments.

3. [x] Integrate session into CLI execution path
   - Decide on interactive trigger inside `bin/index.mjs`.
   - Merge collected answers with existing argument pipeline and logging.

4. [x] Update supporting utilities and helpers
   - Add any prompt/formatting helpers needed by the session.
   - Expose discovery formatting helpers for template listings.

5. [x] Add automated tests
   - Unit coverage for the session flow and prompt retries.
   - Extend argument parser and CLI integration suites for new behavior.

6. [x] Refresh documentation and specs
   - Update CLI reference, how-to guides, and roadmap to describe interactive
     mode.
   - Run `npm test` and `npm run validate:docs` to confirm compliance.
