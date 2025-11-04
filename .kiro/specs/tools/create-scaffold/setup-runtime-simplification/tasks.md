# Tasks

1. **Retire ast-grep integration**
   - [x] Remove `tools.astGrep` logic from `bin/setupRuntime.mjs` and any references in `bin/index.mjs`, tests, fixtures, or docs.
   - [x] Delete ast-grep-related documentation snippets and warnings.

2. **Enhance helper toolkit**
   - [x] Implement marker-based `tools.text` helpers (`insertAfter`, `replaceBetween`, `ensureBlock`, `appendLines`, guarded `replace`).
   - [x] Extend `tools.json` with dot-path helpers (`set`, `remove`, `addToArray`, `mergeArray`).
   - [x] Add convenience write/copy helpers to `tools.files` as needed.
   - [x] Update runtime exports and helper validation tests.

3. **Refactor fixtures and tests**
   - [x] Rewrite fixtures to showcase new helper APIs (remove ast-grep usage).
   - [x] Expand `test/setup-runtime.test.mjs` with coverage for new helpers.
   - [x] Update CLI/integration/spec tests to reflect the new helper surface.

4. **Documentation revamp (Diátaxis aligned)**
   - [x] Tutorial: update `docs/tutorial/first-template.md` to walk through the new helpers.
   - [x] How-to: revise `docs/how-to/creating-templates.md` with practical recipes using the toolkit.
   - [x] How-to Recipes: add a focused guide (e.g., `docs/how-to/setup-recipes.md`) with common scenarios powered by the new helpers.
   - [x] Explanation: adjust `docs/explanation/ide-integration.md` and `docs/explanation/template-system.md` to describe the helper philosophy.
   - [x] Reference: refresh `docs/reference/environment-object.md` and `docs/reference/cli-reference.md` with the new API tables.

5. **Verification**
   - [x] Ensure `npm test` passes after runtime and doc updates.
   - [x] Optional: capture a representative dry-run transcript showcasing helper-related output once formatting stabilizes.
