# Template Placeholder Prompt Requirements

## Problem Statement

Template authors rely on `metadata.placeholders` in `template.json` to describe remaining `{{TOKEN}}` values, but @m5nv/create-scaffold currently ignores that metadata during scaffolding. Users must manually edit generated projects to fill in values, and AI assistants frequently regenerate existing helper code to compensate. We need an orchestrated prompt flow that:

- Collects required placeholder values from the person instantiating the template (not from the authoring workflow).
- Bridges the contract between authoring tools (make-template) and the scaffold runtime.
- Exposes user responses to setup scripts and helper APIs safely.

## Goals

1. **Prompt Alignment** – Inspect `metadata.placeholders` and request values from the end user (the person instantiating the template) whenever required placeholders lack defaults. This complements make-template’s authoring flow rather than replacing it.
2. **Runtime Availability** – Make captured values available to setup scripts without polluting existing `ctx.projectName` or `ctx.options` contracts.
3. **Non-invasive UX** – Integrate prompts into the existing CLI flow (`npm create @m5nv/scaffold ...`) without surprising users who expect non-interactive runs.
4. **Schema Validation** – Establish a documented schema for `metadata.placeholders` so both create-scaffold and make-template adhere to the same expectations.
5. **Automation Friendly** – Provide flags/env overrides so CI/CD or scripted usage can supply placeholder values non-interactively.

## Non-Goals

- Replacing existing dimensions/options prompts (those remain driven by `setup.dimensions`).
- Implementing GUI/IDE-based prompt experiences (CLI-only for this iteration).
- Publishing a separate npm package for shared schema (initially stays in-repo).
- Backfilling placeholder metadata into existing templates (authors handle data entry).
- Re-implementing make-template’s authoring workflow; this feature consumes the metadata that tool produces and focuses solely on template instantiation.

## Stakeholders

- **Template authors** – Define placeholder metadata; expect predictable prompts and runtime access.
- **Template consumers** – Answer prompts during scaffold creation; benefit from ready-to-run outputs.
- **make-template team** – Generates `template.json` with placeholder metadata; depends on shared schema.
- **create-scaffold maintainers** – Implement CLI UX, runtime plumbing, documentation.

## Success Criteria

- Running `npm create @m5nv/scaffold my-app -- --template demo` (i.e., instantiating a template) prompts for required placeholders defined in the template when not provided via CLI flags.
- Setup scripts can read collected values (e.g., via `ctx.inputs` or similar) and finish replacements without AI-generated boilerplate.
- Non-interactive usage can supply values with `--placeholder NAME=value` or env vars, and missing required values cause a clear error.
- Documentation updates clarify the schema and how to declare placeholders.

## Constraints & Considerations

- Maintain backward compatibility: templates lacking `metadata.placeholders` should scaffold as before.
- Ensure prompts respect defaults (`default` field) and optional statuses (`required: false`).
- Avoid leaking sensitive input in logs by default; offer redaction for secrets.
- Align prompt ordering with template metadata for predictability.
- Provide a way to skip prompts (`--yes`) for users scripting ephemeral projects.
- Favor the term “instantiate” in user-facing copy to avoid implying templates are authored from scratch during this flow.
- Deliver deterministic helper APIs so that AI coding assistants can generate consistent `_setup.mjs` snippets without re-deriving project-specific logic.
- Ensure silent CI/CD pipelines can supply all placeholder values via `--placeholder` flags or environment variables with zero interactive prompts.

## Design Decisions (formerly Open Questions)

1. **Where do captured values live?** Introduce `ctx.inputs` as a frozen, plain object keyed by placeholder name without braces (e.g., `ctx.inputs.PROJECT_NAME`). Provide a thin helper `tools.inputs.get(name)` and `tools.inputs.all()` for ergonomics. This keeps the contract predictable for both hand-written scripts and AI-generated code.
2. **How to mark sensitive values?** Extend the schema with optional `"sensitive": true`. When set, CLI prompts use masked input (no echo) and redact the value from verbose logs. Absent the flag, input is treated as non-sensitive—no heuristic guesses.
3. **Type hints?** Support an optional `"type"` field with accepted values `"string"` (default), `"number"`, and `"boolean"`. The CLI validates/coerces responses accordingly, and non-interactive overrides must parse to the declared type. Future iterations can add richer types (enum, pattern) without breaking this contract.
4. **Interaction with helpers.** Add a convenience API `await tools.placeholders.applyInputs(filesOrGlobs)` that merges `ctx.inputs` plus `ctx.projectName` into selected files. Authors (and AI assistants) can rely on this one-liner for WYSIWYG flows instead of re-implementing replacement logic. Existing `replaceAll` remains available for advanced control.
5. **CLI overrides.** Introduce `--placeholder NAME=value` (repeatable) and environment variables `CREATE_SCAFFOLD_PLACEHOLDER_<NAME>=value` for CI/CD. Both feed into the same resolver. Combined with the existing `--yes`, this enables fully silent pipelines.
6. **Telemetry/logging.** No telemetry for now. The CLI prints a summary only when `--verbose`, stating which placeholders were satisfied via defaults, CLI overrides, or interactive entry—values for sensitive placeholders remain redacted.

## Future Considerations (Not in Scope for This Iteration)

- Rich terminal interfaces (e.g., TUI-style wizards) that guide users through placeholder entry with previews, defaults, and validation. The schema defined here should enable these enhancements later without major redesign.

## Acceptance Tests (High-Level)

- **Interactive Prompt**: Given a template with `metadata.placeholders` containing a required `{{AUTHOR}}`, running the CLI without supplying a value prompts the user, stores the response, and the final project replaces `{{AUTHOR}}`.
- **Default Handling**: If a placeholder has `default: "My Project"`, the prompt pre-populates or auto-fills the value when the user accepts.
- **Non-Interactive Failure**: Running with `--yes` and without providing required values fails with a clear error message referencing the missing placeholders.
- **CLI Overrides**: Supplying `--placeholder AUTHOR="Jane Doe"` skips the prompt and uses the provided value.
- **Setup Script Access**: Inside `_setup.mjs`, `ctx.inputs.AUTHOR` (or equivalent API) contains the value for replacements.
- **Optional Placeholder**: Optional placeholders without provided values are left untouched; the scaffold warns (if configured) but proceeds.
- **Helper Convenience**: Calling `await tools.placeholders.applyInputs(['README.md'])` replaces matching tokens using collected inputs plus defaults, producing deterministic output without custom glue code.
