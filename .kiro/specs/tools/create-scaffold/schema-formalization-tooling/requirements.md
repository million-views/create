# Schema Formalization & Tooling Requirements

## Problem Statement

`template.json` has evolved organically—placeholder metadata, dimensions, authoring hints—but we have no authoritative schema or typings. Template authors guess the contract, make-template cannot validate output formally, and documentation drifts. We need a single source of truth (JSON Schema + generated typings) that both @m5nv/create-scaffold and future tooling (make-template, IDEs) consume.

## Goals

1. **Authoritative Schema** – Publish a versioned JSON Schema for `template.json` within the CLI package and expose it via the npm distribution.
2. **Type-Safe Tooling** – Generate JavaScript/TypeScript typings from that schema so runtime code and tests rely on consistent types without manual duplication.
3. **Consumer Integration** – Provide documented guidance and programmatic entry points so make-template (and other tools) can load the schema directly from the CLI package.
4. **Documentation Alignment** – Update author-facing docs to reference the schema, including instructions for editor integration and validation workflows.
5. **Runtime Validation** – Wire the schema into create-scaffold’s existing metadata loading so we fail fast with actionable errors when templates drift from the contract.

## Non-Goals

- Creating a separate npm package solely for the schema (lives with the CLI for now).
- Refactoring make-template’s entire validation pipeline (only the hand-off to the new schema integration).
- Requiring TypeScript throughout the codebase (typings can be consumed via JSDoc or optional TS builds).
- Introducing runtime dependencies beyond Node.js built-ins.
- Rewriting existing docs unrelated to `template.json`.

## Stakeholders

- **Template authors** – Need clear validation feedback and editor hints.
- **Tooling maintainers** (make-template, IDE integrations) – Require a consumable schema artifact.
- **create-scaffold maintainers** – Benefit from shared types between runtime validation and tests.
- **Documentation team** – Must communicate the new schema access patterns and validation workflows.

## Success Criteria

- JSON Schema file(s) (e.g., `schema/template.v1.json`) ship in the published CLI package and are accessible via `import '@m5nv/create-scaffold/schema/template.json'`.
- Generated typings power runtime validation and can be imported by tooling without hand-maintained duplicates.
- create-scaffold validates template metadata using the schema at load time, producing structured errors tied to schema paths.
- Docs provide copy-paste instructions for configuring editor schema associations and make-template references the packaged schema instead of ad-hoc validation.

## Constraints & Considerations

- Schema versioning must allow non-breaking additions without forcing consumers to upgrade immediately (e.g., `template.v1.json`, `template.latest.json`).
- Must support current metadata fields (placeholders, dimensions, authoringMode, authorAssetsDir, handoff, etc.) with room for future extensions.
- Generated typings should not require TypeScript adoption to use—JavaScript code can consume them via JSDoc or optional TS builds in tests.
- Keep build steps simple (prefer Node-based generation scripts; no webpack/rollup).
- Schema-driven validation must remain fast to avoid slowing CLI startup.
- Provide human-readable error messages even when failures originate from schema validation.

## Acceptance Criteria

### Requirement 1 – Schema Publication
**User Story:** As a tooling maintainer, I want to import the official `template.json` schema from the CLI package so I can validate templates without copying definitions.
- WHEN the CLI package is installed, THEN `node -p "require('@m5nv/create-scaffold/schema/template.json')"` (or ESM equivalent) returns the schema object.
- WHEN running `npm pack`, THEN the schema files appear in the tarball under the documented path.
- WHEN the schema changes, THEN versioned filenames (e.g., `template.v1.json`) preserve backward compatibility while `template.json` points to the latest stable version.

### Requirement 2 – Type Generation
**User Story:** As a create-scaffold maintainer, I want generated typings so runtime and tests share the same contract without manual drift.
- WHEN running the schema build script, THEN TypeScript declaration files (or `.d.ts`/`.ts`) regenerate from the JSON Schema without manual editing.
- WHEN runtime modules import the typings, THEN the type definitions cover placeholder metadata, dimensions, and other current fields.
- WHEN the schema build runs as part of CI, THEN changes in the schema or generator cause detectable diffs (ensuring regeneration occurs).

### Requirement 3 – Runtime Validation
**User Story:** As a template consumer, I want clear errors when templates violate the schema.
- WHEN create-scaffold loads `template.json`, THEN schema validation executes before further processing.
- WHEN validation fails, THEN the CLI surfaces a concise error message referencing the field path, expected constraint, and offending value.
- WHEN validation passes, THEN runtime behavior matches existing flows with no significant regression in performance.

### Requirement 4 – Tooling Integration
**User Story:** As a make-template maintainer, I want to reuse the schema without custom wiring.
- GIVEN the schema is versioned in the CLI package, WHEN make-template runs validation, THEN it loads the schema via the documented package export rather than bundling its own copy.
- WHEN running make-template in a repo with invalid metadata, THEN errors originate from (or reference) the shared schema.
- WHEN authors configure editors (VSCode, WebStorm) per doc instructions, THEN schema validation triggers on `template.json` edits.

### Requirement 5 – Documentation Updates
**User Story:** As a template author, I want clear instructions on how to leverage the schema.
- WHEN reading `docs/how-to/creating-templates.md`, THEN there is a section linking to the published schema and explaining validation workflows.
- WHEN reading `docs/reference/cli-reference.md`, THEN the schema export path and versioning policy are documented.
- WHEN referencing `docs/validation-setup.md`, THEN guidance exists for running schema validation (including any new CLI flags or scripts).

## Future Considerations

- Publishing schema artifacts to a public CDN or SchemaStore for IDE auto-discovery.
- Embedding richer metadata (examples, descriptions) for each schema property to power IDE tooltips.
- Providing a separate `@m5nv/template-schema` package if multiple projects outside the CLI ecosystem require the schema independently.
- Generating sample `template.json` files from the schema to assist onboarding.
