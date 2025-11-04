# Design Document

## Overview
Canonical template variables let templates opt into well-known placeholder tokens—launching with `{{AUTHOR}}` and `{{LICENSE}}`—backed by curated prompts, defaults, and validation. The CLI augments manifest metadata with these canonical definitions, ensuring downstream systems receive consistent placeholder structures while avoiding repetitive template author boilerplate.

## Architecture
```
Template Manifest
   │
   ▼
 templateValidator.mjs ──┐
   │                     │
   │  (extract variables)│
   ▼                     ▼
canonicalVariables.mjs  placeholderSchema.mjs
   │                     │
   └───── merged placeholder definitions ─────► Placeholder Resolver
```

## Components and Interfaces

### `schema/template.v1.json`
- Add `metadata.variables` array with entries validated against a new `$defs.canonicalVariable` that enumerates supported canonical identifiers and optional placeholder overrides.

### `scripts/build-template-schema.mjs`
- Extend type generation to emit:
  - `TemplateCanonicalVariable` interface describing manifest entries.
  - Updated `TemplateMetadata` to expose `variables?: TemplateCanonicalVariable[]`.

### `types/template-schema.{ts,d.ts,mjs}`
- Generated files reflecting schema changes; runtime stub still exports nothing.

### `bin/utils/canonicalVariables.mjs`
- New module exporting:
  - `CANONICAL_VARIABLES`: registry keyed by canonical identifier with token, description, type, required flag, sensitivity, default value, and prompt metadata.
  - `normalizeCanonicalVariables(entries)` → validates manifest entries, enforces uniqueness, and returns normalized descriptors `{ id, token, description, required, sensitive, type, defaultValue, overrides }`.
  - `mergeCanonicalPlaceholders({ canonical, placeholders })` → merges canonical descriptors into normalized placeholder list, allowing author overrides via manifest or placeholder duplicates.

### `bin/utils/templateValidator.mjs`
- Parse `metadata.variables` via `normalizeCanonicalVariables`.
- Merge canonical definitions with author-defined placeholders.
- Expose merged placeholders in the validation result so downstream consumers (e.g., `loadTemplateMetadataFromPath`) receive canonical tokens automatically.

### `bin/index.mjs`
- No structural changes; continues to rely on `validateTemplateManifest`. Canonical placeholders now flow through to existing placeholder handling paths.

### `bin/placeholderResolver.mjs`
- No code changes; receives enriched placeholder definitions with canonical descriptions to satisfy prompt requirements.

## Data Models

### Manifest Additions
```json
{
  "metadata": {
    "variables": [
      {
        "name": "author",
        "required": true,
        "overrides": {
          "description": "Full name of the project author",
          "sensitive": false
        }
      }
    ]
  }
}
```
- `name`: string enum (`author`, `license`).
- `required`: optional boolean to mark canonical variable as required (defaults to canonical registry settings).
- `overrides`: optional object mirroring subset of placeholder properties (`description`, `default`, `sensitive`, `type`).

### Canonical Registry Defaults

| Name    | Token      | Type    | Required | Default | Sensitive | Description                                                           |
| ------- | ---------- | ------- | -------- | ------- | --------- | --------------------------------------------------------------------- |
| author  | `{{AUTHOR}}`  | string | true     | _none_  | false     | "Author name recorded in generated documentation and metadata."       |
| license | `{{LICENSE}}` | string | false    | `MIT`   | false     | "Open-source license identifier applied to generated project content." |

### Normalized Placeholder Payload
```
{
  token: 'AUTHOR',
  raw: '{{AUTHOR}}',
  description: 'Author name shown in README header',
  required: true,
  defaultValue: null,
  sensitive: false,
  type: 'string',
  origin: 'canonical' | 'author' | 'merged'
}
```
- Extend placeholder normalization to tag entries with an `origin` flag (for debugging/tests). Origin is not exposed to runtime consumers but helps verify merges.

## Error Handling
- Unknown canonical variable names → throw `ValidationError` referencing `metadata.variables` as per Requirement 3.1.
- Duplicate canonical declarations or conflicts between canonical entry and placeholder metadata (contradictory types) → throw `ValidationError` with `metadata.variables` field.
- Overrides must match canonical type rules; invalid override values raise `ValidationError`.
- When both canonical entry and author placeholder exist, canonical defaults act as base; incompatible author overrides (e.g., conflicting type) raise `ValidationError` to prevent inconsistent metadata.

## Testing Strategy
1. **Schema Generator Tests**
   - Update `test/schema-build.test.mjs` fixtures to include `metadata.variables` and assert the generated `TemplateMetadata` type exposes the new array.
2. **Template Validator Tests**
   - Add tests covering:
     - Canonical variables produce placeholder entries without author duplicates (Req 1.1 & 2.1).
     - Canonical variable + placeholder merge respects overrides (Req 1.2).
     - Unknown canonical identifier rejected (Req 3.1).
3. **Placeholder Resolver Integration**
   - Extend `test/template-validator.test.mjs` or a new test to ensure resolved metadata includes canonical descriptions for prompting (Req 2.2).
4. **Documentation Validation**
   - Update relevant docs (roadmap, reference) and run `npm run validate:docs` to maintain compliance.

## Unresolved Questions
- None (canonical set scoped to `author` and `license`; new variables require a follow-up spec).
