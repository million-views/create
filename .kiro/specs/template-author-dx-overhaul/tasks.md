# Tasks

1. **Implement sandboxed setup runtime**
   - [x] Add `bin/setupRuntime.mjs` with context/tool factories and sandbox loader.
   - [x] Update `bin/index.mjs` to execute `_setup.mjs` via sandbox (`SetupSandbox.load`).
   - [x] Extend `environmentFactory.mjs` to hand back `(ctx, tools)` using the new factories.
   - [x] Ensure sandbox blocks disallowed globals (`import`, `require`, `eval`, `Function`).

2. **Provide standard utility kit**
   - [x] Implement placeholder utilities (glob selection, replacements) within runtime.
   - [x] Implement project-scoped file helpers (copy, move, remove, ensureDirs) with path safety.
   - [x] Implement JSON helpers (read, merge, update) plus templating helpers (`renderString`, `renderFile`).
   - [x] Implement structured logger and IDE preset application (`docs/_templates/ide-presets`).

3. **Integrate optional ast-grep adapter**
   - [x] Attempt dynamic import of `@ast-grep/napi` inside runtime; expose `tools.astGrep`.
   - [x] Add feature-detection guidance/errors when adapter unavailable.
   - [ ] Provide tests stubbing the adapter for deterministic behavior.

4. **Template option awareness**
   - [x] Extend `template.json` parsing to capture `setup.supportedOptions`.
   - [x] Emit warnings for user-supplied options not in a template’s support list.
   - [x] Validate metadata through `security.mjs` (naming, length).

5. **Update test fixtures and suites**
   - [x] Rewrite `_setup.mjs` under `test/fixtures/*` to use `(ctx, tools)` API.
   - [x] Add new fixture demonstrating conditional IDE preset + option gating.
   - [ ] Add unit tests for sandbox, utilities, ast-grep adapter, option warnings.
   - [x] Ensure CLI integration tests cover the new runtime flows.

6. **Refresh documentation**
   - [x] Update `docs/creating-templates.md`, `docs/tutorial/first-template.md`, `docs/explanation/ide-integration.md`, `docs/reference/environment-object.md`, `docs/reference/cli-reference.md`.
   - [ ] Create or refresh IDE preset examples in `docs/_templates`.
   - [x] Add concise reference for setup tools API and option declaration.

7. **Verification**
   - [x] Run full test suite (`npm test`) once changes land.
   - [ ] Capture dry-run output demonstrating new setup messaging in docs/examples.
