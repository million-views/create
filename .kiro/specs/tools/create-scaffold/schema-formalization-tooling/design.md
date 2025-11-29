# Schema Formalization & Tooling Design

## Overview

This sprint delivers an authoritative schema for `template.json`, generated typings, runtime validation, and documentation so external tooling (make-template, IDEs) can consume the contract directly from the CLI package.

Key outcomes:
- JSON Schema authoring and versioning under `schema/`.
- Automated type generation into `types/` with zero manual maintenance.
- CLI package exports that expose schema + types to consumers.
- create-scaffold runtime validation using the schema.
- Documentation and tooling guidance referencing the published artifacts.

## Architecture & Components

### Schema Authoring
- **Location**: Store schema files under `schema/`, e.g., `schema/template.v1.json`.
- **Versioning Strategy**:
  - Maintain immutable versioned files (`template.v1.json`, `template.v1.1.json` for additive changes).
  - Provide `schema/template.json` as a copy of the latest stable version used by the CLI.
  - Document version policy (semantic intent: breaking → new major file, additive → minor suffix).
- **Schema Content**:
  - Cover existing fields: root metadata (`name`, `description`, `handoff`, etc.), `setup` subtree (dimensions, authorAssetsDir), `metadata.placeholders` structure, optional experimental flags.
  - Include `description` and `examples` for key properties to improve editor UX.
  - Use `$defs` to avoid duplication (e.g., placeholder definition reused across arrays, dimension definitions).

### Schema Build & Typings
- **Build Script**: `scripts/build-template-schema.mjs`
  - Validates schema against the JSON Schema draft meta-schema (download once and cache locally or embed minimal meta schema snippet).
  - Generates TypeScript definitions via a simple generator (no external runtime dependency). Logic lives in-repo so we avoid supply-chain risk.
  - Emits `types/template-schema.ts` checked by `tsc --noEmit`, along with a generated `types/template-schema.d.ts` for consumers that prefer declarations.
  - Emits `bin/utils/templateSchema-types.mjs` (optional) exporting helper JSDoc typedefs for runtime usage.
  - Updates `package.json` `files`/`exports` automatically if necessary.
- **Idempotency**: The script should exit with non-zero if output differs from formatted repo versions when `--check` flag is passed (for CI enforcement).

### Package Exports & Distribution
- Update `package.json`:
  - Add schema directory to `files` array to ensure `npm publish` includes it.
  - Extend `exports` with entries such as:
    ```json
    "./schema/template.json": "./schema/template.json",
    "./schema/template.v1.json": "./schema/template.v1.json",
    "./types/template-schema.d.ts": "./types/template-schema.d.ts"
    ```
  - Provide a `typesVersions` map if needed for consumers using TypeScript path resolution.
- Update README/CLI docs to note import paths and version policy.

### Runtime Validation Flow
- **Validation Module**: Create `bin/utils/templateValidator.mjs` or extend `templateMetadata.mjs` to:
  - Load schema (synchronously on first use) using `JSON.parse`.
  - Use an in-house bespoke validator tailored to the subset of JSON Schema features we rely on (types, enums, required, arrays, nested objects) to keep runtime dependency-free.
  - Convert validation failures to structured errors with clear messages (property path, expected constraint, actual value).
- **Integration Points**:
  - Validate templates during metadata discovery (where we currently normalize dimensions/placeholders).
  - Ensure validation errors integrate with existing error handling/logging (sanitized output).
  - Provide escape hatches (e.g., experimental flag) if validation must be bypassed temporarily (documented, default off).

### Tooling Integration (make-template & Editors)
- Document how make-template imports the schema via ESM/CJS (both variants).
- Suggest VS Code `settings.json` snippet linking `"@m5nv/create-scaffold/schema/template.json"` to `template.json` files via `$schema` or `json.schemas` configuration.
- Provide CLI/Node example demonstrating loading the schema for CI validation.
- Outline follow-up PR on make-template repo (non-blocking for this sprint) to consume exported schema.

## Data Flow

1. **Authoring**: Maintainers edit `schema/template.v1.json` (manually or via generator). Schema build script is run.
2. **Build**: `scripts/build-template-schema.mjs` validates schema, produces typings, formats outputs.
3. **Distribution**: Schema + types are included in the npm package via `package.json` `files`/`exports`.
4. **Runtime**: create-scaffold reads schema, validates template metadata before normalizing placeholders/dimensions.
5. **Tooling**: make-template/IDEs import schema from package, enabling validation and intellisense.

## Testing Strategy

- **Unit Tests**:
  - Test schema generator script with fixture schema to ensure deterministic output and proper error handling.
  - Add tests to `test/template-metadata-placeholders.test.mjs` (or new suite) asserting invalid metadata fails with descriptive error messages.
  - Validate exported types by type-checking representative objects (if TypeScript is used in tests, run `tsc --noEmit`).

- **Integration Tests**:
  - Extend CLI tests to cover failure cases when a template repository contains invalid metadata (simulate via fixture with intentional schema violation).
  - Ensure existing valid templates pass validation to catch regressions.

- **Documentation Tests**:
  - Update `scripts/validate-docs.mjs` or `comprehensive-validation.mjs` to confirm docs referencing schema paths are accurate (optionally verifying referenced files exist).

## Tooling & Automation

- Add npm scripts:
- `npm run schema:build` → invokes generator.
- `npm run schema:check` → generator in check mode (CI usage) and runs `tsc --noEmit` over `types/template-schema.ts`.
- Hook `schema:check` into existing CI workflows (e.g., `npm test` or dedicated `npm run validate`).

## Open Questions

1. **Schema Publishing Beyond Package**: For now, keep the schema in the package. We can explore SchemaStore submission post-launch.

## Risks & Mitigations

- **Schema Drift**: If maintainers update runtime behavior without editing the schema, consumers break. Mitigation: enforce generator CI check and require schema updates in PR template for relevant changes.
- **Validator Bugs**: A bespoke validator may miss constraints. Mitigation: comprehensive unit tests and fixture coverage mirroring schema features.
- **Packaging Oversight**: Forgetting to include schema in npm tarball. Mitigation: add `npm pack` smoke test to verify presence; update release checklist.
- **Performance Impact**: Schema validation adds overhead. Mitigation: measure against current metadata load (should be negligible given template sizes) and allow caching of compiled schema results.

## Deliverables Summary

- `schema/template.v1.json` + `schema/template.json` (latest copy).
- `scripts/build-template-schema.mjs` (generator) with documentation.
- `types/template-schema.d.ts` (generated output) + optional runtime typedef exports.
- Updated runtime validation in `bin/templateMetadata.mjs` (or dedicated validator module).
- Tests covering valid/invalid `template.json` metadata.
- Documentation updates referencing schema (how-to guide, CLI reference, validation setup).
- Optional VS Code snippet to wire schema automatically.