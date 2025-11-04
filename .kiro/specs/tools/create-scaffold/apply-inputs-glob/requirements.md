# Requirements

## Problem
- `tools.placeholders.applyInputs()` skips root-level files because `'**/*'` selector fails to match paths without `/`.
- Template authors see unresolved `{{TOKEN}}` despite valid manifests.

## Goals
- Ensure default selector covers root and nested files.
- Prevent regressions via existing setup runtime tests.

## Non-Goals
- Introducing new glob syntax or third-party glob libraries.
- Changing placeholder manifest schema.
