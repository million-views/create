# Tasks

1. **Runtime environment object**
   - [x] Update `bin/setupRuntime.mjs` to invoke setup scripts with `{ ctx, tools }`.
   - [x] Add guard ensuring the argument is an object containing `ctx` and `tools`, with clear error messaging.

2. **Fixture and test updates**
   - [x] Update template fixtures (`test/fixtures/*/_setup.mjs`) to destructure `{ ctx, tools }`.
   - [x] Extend `test/setupRuntime.test.mjs` to cover the new signature and guard behavior.
   - [x] Adjust any other tests referencing positional signatures.

3. **Documentation refresh**
   - [x] Rename `docs/reference/environment-object.md` to `docs/reference/environment.md` and fix inbound links.
   - [x] Update tutorials, guides, and explanation docs to demonstrate `export default async function setup({ ctx, tools })`.
   - [x] Verify doc validation after renames and text updates.

4. **Verification**
   - [x] Run `npm test` to confirm runtime/fixture changes.
   - [x] Run `npm run validate:docs` to ensure doc consistency.
