# Design

## Approach
- Update `globToRegExp` in `bin/setupRuntime.mjs` so `'**'` segments match zero or more directories.
- Special-case `**/` sequences to allow optional directory prefixes.
- Keep regex-based implementation; no new deps.

## Testing
- Extend `test/setup-runtime.test.mjs` existing placeholder test to run `applyInputs()` with default selector and assert replacements persist.
