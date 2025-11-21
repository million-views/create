# Template Placeholder Prompt Tasks

## 1. Shared Schema & Normalization
- [x] Implement `normalizePlaceholders()` in `src/template/schema/metadata.mjs` with validation (duplicates, braces, type coercion).
- [x] Add unit tests covering valid/invalid placeholder definitions.
- [x] Export schema utilities for consumption by both create-scaffold and make-template.

## 2. CLI Argument & Env Parsing
- [x] Extend argument parser to accept repeated `--placeholder NAME=value` flags.
- [x] Parse `CREATE_SCAFFOLD_PLACEHOLDER_<NAME>` environment variables.
- [x] Update CLI help and error messaging for the new options.

## 3. Placeholder Resolver
- [x] Implement resolver that merges defaults, flags, env, and interactive prompts.
- [x] Support `type` coercion and `sensitive` masking.
- [x] Respect `--yes` (fail when required placeholders lack values).
- [x] Add unit tests covering merge precedence and error cases.

## 4. Runtime Context & Helpers
- [x] Inject `ctx.inputs` (frozen) into the setup runtime.
- [x] Add `tools.inputs.get/all` helpers.
- [x] Implement `tools.placeholders.applyInputs()` delegating to `replaceAll`.
- [x] Update existing tests or add new ones verifying helper behavior.

## 5. Logging & Reporting
- [x] Emit verbose summary of placeholder sources (redacting sensitive values).
- [x] Ensure non-verbose mode stays silent.

## 6. Documentation Updates
- [x] Refresh `docs/reference/environment.md` with `ctx.inputs`, helper APIs, and updated examples.
- [x] Update `docs/how-to/creating-templates.md` to explain placeholder workflow and helper choice.
- [x] Update `docs/how-to/setup-recipes.md` with new recipes for `applyInputs()` and template rendering.

## 7. Integration & End-to-End Tests
- [x] Add CLI integration tests for interactive prompts, flag/env overrides, and failure conditions.
- [x] Add fixture-based end-to-end test verifying final scaffold output uses placeholder values.

## 8. Launch Checklist
- [x] Gate feature behind optional flag if needed (`--experimental-placeholder-prompts`), remove once stable.
- [x] Update changelog/release notes.
- [x] Coordinate with make-template team to adopt schema module.

> Schema utilities for make-template live at `bin/utils/placeholderSchema.mjs`; notify the authoring tooling team during the next sync to consume the shared module.
