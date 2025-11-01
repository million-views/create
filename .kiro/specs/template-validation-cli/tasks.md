# Template Validation CLI — Tasks

1. [x] Argument parser and CLI plumbing
   - Parse `--validate-template` and optional `--json`.
   - Short-circuit main flow to run validator when flag is present.

2. [x] Implement validator orchestrator
   - Create `bin/templateValidation.mjs` and supporting validator modules.
   - Aggregate status, format human output, and honour exit codes.

3. [x] Setup script linting
   - Add static checks for `_setup.mjs` (default export, forbidden globals, syntax).
   - Reuse runtime transform logic where possible.

4. [x] Required file verification
   - Ensure `.template-undo.json` and README are present.
   - Emit targeted error messages.

5. [x] Documentation updates
   - Update CLI reference and author guides with validation workflow.

6. [x] Test coverage
   - Add unit tests for validators and integration tests for the CLI flag.

7. [x] Final validation
   - Run `npm test` and relevant docs validation commands.
