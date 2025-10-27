# Environment API Consistency — Requirements

## Context
- Setup scripts currently receive two positional arguments (`ctx`, `tools`). Documentation refers to this pair as the “Environment Object,” which creates a mismatch between the API and the language used to describe it.
- Template authors have to remember positional ordering instead of destructuring a single payload, which is inconsistent with the rest of the runtime where contextual data is grouped in objects.
- The reference documentation is titled “Environment Object Reference,” but the underlying value is not actually an object; this confuses onboarding and makes it harder to expand the environment surface area.

## Goals
- Unify the setup runtime API so `_setup.mjs` exports `default async function setup({ ctx, tools })`, receiving a single environment object.
- Rename documentation, fixtures, and references from “Environment Object” to “Environment” to match the new API.
- Update all tests, fixtures, and helpers to expect/destructure the object-form signature.
- Ensure forward momentum: existing helper surface (`ctx`, `tools`) remains unchanged beyond the calling convention.

## Non-Goals
- Adding new helper modules or changing helper capabilities.
- Introducing backwards-compatibility shims for the old positional signature (greenfield project).
- Revisiting IDE or template discovery workflows; scope is limited to environment delivery and naming.

## Success Criteria
- `bin/setupRuntime.mjs` invokes setup scripts with a single `environment` object and validates the shape accordingly.
- All fixtures and tests destructure `{ ctx, tools }` (or whichever subset they need) and pass.
- Documentation (tutorials, guides, references, explanations) consistently refers to the Environment and shows the new signature.
- `npm test` and documentation validation continue to pass.

## Decisions
1. **Developer ergonomics:** We will encourage destructuring in all examples (`export default async function setup({ ctx, tools })`) while still allowing direct access via the `environment` parameter for advanced scenarios.
2. **Runtime guard:** The setup runtime will fail fast when a template attempts to export a positional signature by validating that the first argument is an object containing `ctx` and `tools`, surfacing a clear error message without swallowing unexpected exceptions.
