# Template Schema

This directory stores the authoritative `template.json` schema shipped with `@m5nv/create-scaffold`.

- `template.v1.json` contains the immutable v1 schema definition.
- `template.json` is a convenience copy pointing to the latest stable schema consumed by the CLI.

## Versioning Policy

- Breaking changes (removals, incompatible type shifts) require a new major schema file (`template.v2.json`).
- Additive, backwards-compatible changes append a minor suffix (for example `template.v1.1.json`) and update `template.json` to mirror the new file.
- Patch-level clarifications that do not alter validation behaviour update documentation only.

Remember to regenerate types and re-run `npm run schema:check` after modifying any schema files.
