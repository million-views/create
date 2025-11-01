# Template Validation CLI — Requirements

## Summary

Introduce a first-party validation command so template authors can detect schema
issues, missing required files, and unsafe setup scripts before publishing.

## Goals

- Provide a single CLI entry point (`--validate-template`) that runs all
  supported checks and exits non-zero when any validation fails.
- Reuse existing schema/type infrastructure so manifest validation stays in
  sync across CLI, docs, and tooling.
- Catch the most common author mistakes (missing metadata, absent setup script,
  disallowed globals) without running the template in a project directory.
- Surface human-friendly diagnostics with actionable remediation guidance.

## Non-Goals

- Automatically fix template issues.
- Execute or sandbox `_setup.mjs` beyond static checks. The validator should not
  run template setup logic.
- Reach parity with every future best practice. Initial focus is on core health
  signals for Phase 2.

## Stakeholders

- Template authors preparing repositories for publication.
- Developer-experience reviewers who need consistent validation signals in CI.
- CLI maintainers ensuring the validator stays aligned with runtime behavior.

## Requirements (EARS)

1. **CLI entry point**
   - *When* the CLI receives `--validate-template <path>`, *the system shall*
     run validation workflows against the template located at `<path>` and exit
     without performing scaffolding operations.
   - *When* `--validate-template` is provided without a positional project
     directory, *the system shall* allow the command to run (no project directory
     required).

2. **Manifest validation**
   - *When* validation runs, *the system shall* parse `template.json` inside the
     target directory and validate it using the existing
     `validateTemplateManifest` logic (schema + canonical placeholder rules).
   - *When* `template.json` is missing or invalid, *the system shall* surface a
     descriptive error referencing the failing file and exit with status code 1.

3. **Setup script linting**
   - *For all* `_setup.mjs` files, *the system shall* perform static checks that
     ensure the script exports a default async function and does not use
     forbidden globals (`require`, `import`, `eval`, `Function`).
   - *When* `_setup.mjs` is missing, *the system shall* emit a warning (not
     failure) so authors know the script is optional but recommended.

4. **Required file verification**
   - *When* validation runs, *the system shall* verify that the template contains
     `template.json`, a README (`README.md` or `README`), and a `.template-undo.json`
     file, surfacing specific error messages for any missing required files.

5. **Aggregated reporting**
   - *When* validations complete, *the system shall* print a summary that lists
     passed checks, warnings, and failures. Failures must exit with code 1;
     warnings must keep exit code 0.
   - *When* `--json` is provided alongside `--validate-template`, *the system
     shall* emit machine-readable structured results to STDOUT.

6. **Documentation and tests**
   - *When* the feature is implemented, *the system shall* document the command
     in `docs/reference/cli-reference.md` and add a how-to section covering CI
     usage.
   - *The system shall* provide unit tests for each validator module and a CLI
     integration test that exercises success and failure modes.

## Risks & Mitigations

- **Risk:** Validation logic drifts from runtime behavior. *Mitigation:* reuse
  `validateTemplateManifest`, share forbidden-global lists with setup runtime.
- **Risk:** Authors expect auto-fix. *Mitigation:* documentation explicitly states
  the validator reports errors only.
- **Risk:** Large JSON payloads make output noisy. *Mitigation:* default to
  concise human-readable messages; optional `--json` output for CI.

## Success Metrics

- Adoption of `--validate-template` in template CI pipelines (qualitative tracking).
- Reduction in support requests caused by missing metadata or misconfigured setup scripts.
- Positive feedback from onboarding sessions indicating fewer template validation surprises.
