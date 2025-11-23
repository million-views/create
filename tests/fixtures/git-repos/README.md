# Git Repository Fixtures

These fixture directories are source material for runtime-generated Git repositories used in integration tests. **Do not** commit bare repositories; the test helper clones these directories into temporary workspaces, initializes Git metadata, and exposes `file://` URLs for the test suites.

## Available Templates

- `simple-template/` – minimal template at the repository root
- `multi-template/` – registry-style repository with `react-app/` and `vue-app/` templates
- `nested-subpath/` – template located under `templates/starter/` to exercise nested subpath resolution

## Regeneration

Use the Git fixture helper (`tests/helpers/git-fixtures.mjs`) to convert these directories into bare repositories during test setup. Never run `git init` inside these folders directly; the helper performs all Git operations in the test workspace under `tmp/`.
