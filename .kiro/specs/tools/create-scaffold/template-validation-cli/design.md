# Template Validation CLI — Design

## Overview

Implement `--validate-template` as a dedicated CLI pathway that inspects a
template directory without cloning or scaffolding. The mode reuses existing
schema validation utilities, introduces lightweight static checks for setup
scripts, verifies required files, and emits structured diagnostics suitable for
human review or CI automation.

## Architecture

```text
bin/
├── index.mjs                # detects --validate-template and dispatches
├── templateValidation.mjs   # new orchestrator (public entry for CLI mode)
├── validators/
│   ├── manifestValidator.mjs   # wrapper around validateTemplateManifest
│   ├── setupLint.mjs           # static analysis for _setup.mjs
│   └── requiredFiles.mjs       # presence checks for core assets
```

- `templateValidation.mjs` receives `{ targetPath, jsonOutput, logger }` and
  coordinates the individual validators.
- Each validator returns `{ status: 'pass' | 'warn' | 'fail', name, summary,
  details[] }`. Failures surface in the CLI summary and influence exit code.
- Output pipeline collects results, prints human-readable tables by default, and
  optionally serializes JSON when `--json` is supplied.

## Control Flow

1. Argument parser accepts `--validate-template <path>` (string) and optional
   `--json` (boolean). `validateArguments` enforces that no project directory is
   required when the validator flag is present.
2. `bin/index.mjs` short-circuits after preflight checks, resolving the target
   directory (relative to CWD) and invoking `runTemplateValidation()`.
3. `runTemplateValidation()` executes validators sequentially, accumulating
   warnings and failures. All validators run even after a failure so authors see
   aggregated feedback.
4. Results are rendered:
   - Human output: headings per validator, bullet list of issues, green check or
     red cross summaries, final status line.
   - JSON output: `{ status, summary: { passed, warnings, failed }, results: [] }`.
5. Process exits with code `1` if any validator fails; otherwise `0`.

## Validators

### Manifest Validator

- Reads `<target>/template.json` using `fs.promises.readFile`.
- On ENOENT: fail with message "template.json not found".
- Parses JSON; on syntax error, fail with parse message.
- Passes parsed object to `validateTemplateManifest` (existing utility).
- Captures thrown `ValidationError` and converts to failure messages with
  sanitized detail text.
- Success returns normalised manifest (for potential future checks) but only the
  status is needed for now.

### Setup Script Lint

- Checks for `_setup.mjs` in target root.
  - If missing: warning (status `warn`) with message "Optional setup script not
    found".
- If present:
  - Reads file (UTF-8) and runs three static checks:
    1. Default export: regex ensures `export default` occurs and that
       `async function` or arrow function is present. Reuse the runtime's
       `transformModuleSource()` to detect missing default export.
    2. Forbidden globals: regex search for `\brequire\s*\(`, `\bFunction\s*(`,
       `\beval\s*\(`, `\bimport\s+` (static import). If found, failure with
       actionable detail referencing sandbox rules.
    3. Ensure file is valid ESM syntax using `new vm.SourceTextModule()` in
       parse mode to catch syntax errors without executing code.
- Aggregates multiple failures per file.

### Required Files Validator

- Defines required files list: `template.json`, `.template-undo.json`, README
  (any of `README.md`, `README.MD`, `README`), and `template.json``? (already
  handled). Since manifest validator already ensures `template.json`, this
  validator focuses on `.template-undo.json` and README.
- Reports missing items individually as failures.
- Additional optional checks: if `docs/` contains `README`, this is optional and
  not enforced.

## Output Formatting

- Introduce helper `formatValidationSummary(results)` that returns `{ passed,
  warnings, failed }` counts and computed overall status.
- Human output example:
  ```text
  🔍 Validating template at ./templates/react

  ✅ Manifest
  ✅ Required files
  ⚠️  Setup script
    - Optional setup script not found

  Summary: 2 passed, 1 warning, 0 failed
  ```
- JSON output example:
  ```json
  {
    "status": "warn",
    "summary": { "passed": 2, "warnings": 1, "failed": 0 },
    "results": [
      { "name": "manifest", "status": "pass" },
      { "name": "setupScript", "status": "warn", "issues": ["Optional setup script not found"] }
    ]
  }
  ```

## Testing Strategy

- **Unit tests** for each validator module covering happy paths and edge cases
  (missing files, invalid JSON, forbidden globals, syntax errors).
- **Integration test** invoking CLI with `--validate-template` against fixtures:
  - Valid fixture returns exit code 0 and success summary.
  - Fixture with manifest error returns exit code 1 and message.
  - Fixture missing README triggers failure.
  - `--json` output validated via JSON.parse.
- Ensure tests run quickly by using `test/fixtures` clones (no git interactions).

## Documentation Updates

- `docs/reference/cli-reference.md`: new command synopsis, examples, precedence
  note for `--json`.
- `docs/how-to/development.md`: add section on integrating validation command in
  CI workflows.
- `docs/how-to/creating-templates.md`: mention validator as recommended
  preflight step.

## Open Questions

1. Should validation warn when `_setup.mjs` exists but is empty?
  - ✅ Yes. Validator will emit a warning so authors remember to implement
    personalization logic or intentionally document empty scripts.
2. Do we need configurable required files per team?
  - ❌ No. Phase 2 keeps a fixed required-file list; revisit if future sprints
    surface strong team-specific needs.
3. Should JSON output include sanitized manifest?
  - ⏳ Not at the moment. JSON payload remains focused on validation results; we
    can extend the schema later if consumers request manifest echoing.
