# Environment API Consistency — Design

## Overview
We will replace the positional setup-script signature with a single environment object, clarifying the contract and aligning terminology across code and documentation. The runtime will construct `{ ctx, tools }`, execute `_setup.mjs` with that object, and enforce the presence of both properties. All examples and fixtures will use destructuring to highlight the intended ergonomics.

## Architecture Changes
1. **Runtime invocation (`bin/setupRuntime.mjs`):**
   - Build `const environment = { ctx, tools };`.
   - Validate that the setup script default export is a function that expects an object; invoke `await setup(environment);`.
   - Introduce a guard that throws a `SetupSandboxError` if the setup function returns a promise that rejects with a `TypeError` pointing to positional access (e.g., `Cannot read properties of undefined`). The guard will explicitly check that the argument received inside the sandbox is an object with `ctx` and `tools`, emitting a targeted error message such as “Setup scripts must destructure `{ ctx, tools }` from the Environment object.”

2. **Sandbox export shim:**
   - Update the `transformModuleSource` replacement to wrap default exports in a small adapter that performs the guard check before forwarding to user logic. This ensures check runs inside sandbox without exposing runtime internals.

3. **Fixtures and tests:**
   - Update `_setup.mjs` fixtures (`test/fixtures/*`) to destructure `{ ctx, tools }`.
   - Adjust `test/setupRuntime.test.mjs` expectations to the new signature and add scenarios verifying the guard (one valid script, one that incorrectly expects positional args).
   - Update CLI integration tests if they reference setup scripts directly.

4. **Reference renaming:**
   - Rename `docs/reference/environment-object.md` to `docs/reference/environment.md` and update all inbound links.
   - Update Diátaxis metadata (frontmatter titles, related docs lists).

## Data Flow
1. CLI collects user input as usual.
2. Environment factory produces `ctx`.
3. Helper factory produces `tools`.
4. Runtime builds `environment = { ctx, tools }`.
5. `_setup.mjs` default export runs inside sandbox, destructuring environment.
6. Guard verifies argument shape before proceeding, providing early feedback for positional scripts.

## Testing Strategy
- **Unit tests:** Extend `test/setupRuntime.test.mjs` to cover:
  - Successful execution with destructured signature.
  - Guard triggers when script attempts to access positional params.
- **Fixtures:** Ensure all template fixtures work with new signature.
- **Integration tests:** Run existing CLI suites (`npm test`) to confirm end-to-end behavior.
- **Docs validation:** Run `npm run validate:docs` to ensure link renaming and terminology updates pass.

## Rollout Considerations
- No backward-compatibility shims; the project treats this as the canonical behavior.
- Template authors must update their scripts; documentation and recipes will showcase the new signature.
- Communicate the change through the reference rename and updated guide sections, emphasizing the destructured payload.
