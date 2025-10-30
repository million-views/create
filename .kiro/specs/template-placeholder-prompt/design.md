# Template Placeholder Prompt Design

## Overview

We extend @m5nv/create-scaffold so template instantiation collects values for `metadata.placeholders` defined in `template.json`. The CLI prompts for missing required values, accepts overrides via flags/environment variables, and exposes results to `_setup.mjs` through the Environment object. Helper APIs simplify placeholder application to encourage deterministic code generation—both for human authors and AI assistants. Templates without placeholder metadata continue to scaffold unchanged.

## Components

### 1. Schema Module (`src/template/schema/metadata.js`)
- Define a shared TypeScript-like schema (implemented in JS) for placeholder entries.
- Fields: `name` (string, `{{TOKEN}}`), `description` (string), `required` (boolean, default false), `default` (string"), `sensitive` (boolean), `type` (`"string" | "number" | "boolean"`).
- Export `normalizePlaceholders(entries)` that strips braces, validates uniqueness, and returns canonical entries (`{ token: 'PROJECT_NAME', raw: '{{PROJECT_NAME}}', ... }`).
- Both create-scaffold and make-template can import this module to keep behavior aligned.

### 2. Placeholder Resolver (`src/runtime/placeholderResolver.mjs`)
Responsible for merging sources of values:

1. **CLI flags** (`--placeholder NAME=value`) − parsed into an object.
2. **Environment variables** (`CREATE_SCAFFOLD_PLACEHOLDER_<NAME>`) − case-sensitive (uppercased tokens).
3. **Defaults** from metadata entries.
4. **Interactive prompts** – for required placeholders still missing values (unless `--no-input-prompts`).

API: `await resolvePlaceholders({ placeholders, options })` returning `{ values, promptReport }`.
- `placeholders`: normalized entries from schema module.
- `options`: { `providedFlags`, `env`, `stdin`, `interactive`, `logger` }.
- `values`: frozen object `{ PROJECT_NAME: 'acme-demo', AUTHOR: 'Jane Doe' }`.
- `promptReport`: array for verbose logging (`[{ name: 'AUTHOR', source: 'prompt' }]`).
- Sensitive inputs are collected via masked prompt (`readlinePrompter.prompt({ mask: true })`) and redacted in report.

### 3. CLI Integration (`bin/cli.mjs`)
- Extend argument parser to accept repeated `--placeholder NAME=value` flags.
- Respect existing `--no-input-prompts` (fails if any required placeholder remains unresolved).
- After loading `template.json`, call schema normalizer + resolver before scaffolding begins.
- Store resolved values on the instantiation context: `ctx.inputs = Object.freeze(values)`.

### 4. Environment Enhancements (`bin/setupRuntime.mjs`)
- Inject `ctx.inputs` into Environment.
- Add `tools.inputs` with:
  - `get(name, fallback)` – returns value or fallback.
  - `all()` – returns frozen clone of entire object.
- Extend `tools.placeholders` with `applyInputs(selector, extra = {})` merging `ctx.inputs`, `ctx.projectName`, and optional `extra` map. It delegates to `replaceAll` under the hood so authors (and AI assistants) can apply the collected values without rebuilding the token map each time. Example usage:
  ```javascript
  await tools.placeholders.applyInputs(['README.md', 'package.json']);
  ```
- `replaceAll(replacements, selector)` remains available when authors need custom values or non-standard mappings.

### 5. Logging & Reporting (`bin/logger.mjs`)
- When `--verbose`, print placeholder summary: `AUTHOR ← provided via flag`, masking sensitive entries `PASSWORD ← [redacted]`.
- Suppress mention entirely when not verbose to avoid noise.

### 6. Documentation Updates
- Update `docs/reference/environment.md` with `ctx.inputs` and `tools.inputs`, plus new placeholder helper.
- Extend `docs/how-to/creating-templates.md` with instructions for populating `metadata.placeholders` and guidance on defaults/sensitive flags.
- Update `docs/how-to/setup-recipes.md` to use `tools.placeholders.applyInputs` in WYSIWYG examples.

## Control Flow

1. CLI parses args → obtains `template.json`.
2. Schema normalizer builds `placeholderSpec[]`.
3. Resolver merges CLI/env/defaults; prompts if needed.
4. On failure (missing required values, non-interactive), exit with descriptive message listing tokens.
5. Resolved values stored in `ctx.inputs`.
6. `_setup.mjs` scripts can call `ctx.inputs` or helper APIs.
7. `tools.placeholders.applyInputs` used for easy token replacement.
8. File or directory names that contain placeholders still require explicit handling (e.g., `tools.files.move` or `tools.templates.renderFile`) because the helper APIs operate on file contents only. We will document this limitation for template authors and consider future enhancements if demand arises.

## Error Handling

- Unknown placeholder passed via `--placeholder` triggers warning but is ignored (opt-in: future strict mode?).
- Invalid `type`: log warning, treat as string (but mark as schema error for template authors when validations enabled).
- Type coercion failure (e.g., `number` but value not numeric) results in error before scaffolding begins.
- Missing required values with `--no-input-prompts` or piped stdin produce exit code 1 with message `Missing required placeholders: AUTHOR, WORKER_NAME`.

## Security Considerations

- Sensitive inputs never printed in logs unless `--debug-placeholder-values` (not exposed now).
- Stored values kept in memory only; not written to disk.
- CLI history may contain flag values (`--placeholder`), so docs encourage env vars for secrets.

## AI & DX Considerations

- Deterministic helper APIs (`ctx.inputs`, `tools.inputs`, `tools.placeholders.applyInputs`) reduce boilerplate and make AI-generated `_setup.mjs` scripts predictable.
- Schema documentation ensures AI assistants know which metadata fields exist, allowing them to scaffold placeholder arrays accurately.
- Hand-authored scripts benefit from terse helper methods and typed access (e.g., `ctx.inputs.WORKER_NAME`).

## Testing Strategy

1. Unit tests for schema normalizer: duplicates, brace stripping, and validation.
2. Resolver tests covering combinations of flag/env/default/prompt.
3. CLI integration tests verifying interactive prompts, non-interactive failure, and logging.
4. Setup runtime tests ensuring `ctx.inputs` immutability and helper APIs exist.
5. Documentation lint/test to ensure references updated.
6. End-to-end fixture test: template with placeholders, run CLI with mixed overrides, assert generated files include replacements.

## Rollout Plan

- Feature flag within CLI (`--experimental-placeholder-prompts`) for initial rollout; default disabled until docs finalize (optional, can skip if confident).
- Communicate in release notes; include migration guidance for template authors.
- Encourage make-template team to adopt schema module so both tools stay aligned.

## Alternatives Considered

- Storing values in `tools.meta` – rejected to keep context data centralized in `ctx`.
- Auto-replacing placeholders without helper call – rejected because some authors may prefer manual control; helper covers 90% use-cases without forcing behavior.
- Reusing existing `--input` flag naming – renamed to `--placeholder` for clarity and to avoid conflicts with future features.
