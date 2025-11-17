# Template Schema

This directory stores the authoritative JSON schemas shipped with `@m5nv/create-scaffold`.

## Template Schema
- `template.v1.json` contains the immutable v1 template schema definition.
- `template.json` is a symlink pointing to the latest stable template schema consumed by the CLI.

## Selection Schema
- `selection.v1.json` contains the schema for selection.json files that store user choices and derived metadata during scaffolding.
- `selection.json` is a symlink pointing to the latest stable selection schema consumed by the CLI.

## Versioning Policy

- Breaking changes (removals, incompatible type shifts) require a new major schema file (`template.v2.json`, `selection.v2.json`).
- Additive, backwards-compatible changes append a minor suffix (for example `template.v1.1.json`) and update the convenience copies to mirror the new file.
- Patch-level clarifications that do not alter validation behaviour update documentation only.

Remember to regenerate types and re-run `npm run schema:check` after modifying any schema files.
