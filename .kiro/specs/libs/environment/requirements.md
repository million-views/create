# Requirements: Environment Module

## Problem Statement

The Environment object is the **primary contract** between the CLI tool and template authors' setup scripts. It defines:
- What context (`ctx`) template authors can read
- What tools (`tools`) template authors can use to modify the scaffolded project

**Current Issues:**
1. **No formal definition**: The shape of `ctx` and `tools` is defined implicitly in a 1189-line monolithic file (`setup-runtime.mjs`)
2. **No type safety**: No TypeScript definitions or JSDoc to enforce the contract
3. **Scattered construction**: `ctx` is built in multiple places with slightly different shapes
4. **Poor testability**: Tests must reconstruct the Environment shape manually, leading to drift
5. **Documentation drift**: `docs/reference/environment.md` manually documents properties that may change in code

## Requirements

### REQ-1: Single Source of Truth
1. THE Environment module SHALL be the single source of truth for the Environment object shape
2. THE Environment module SHALL export type definitions usable by both code and documentation
3. THE Environment module SHALL be located at `lib/environment/` as a shared module

### REQ-2: Clear Contract Definition
1. THE module SHALL export an `Environment` interface/type with exactly two properties: `ctx` and `tools`
2. THE `ctx` property SHALL be an immutable object containing project context
3. THE `tools` property SHALL be an immutable object containing helper APIs
4. THE module SHALL define and export the shapes of both `ctx` and `tools` explicitly

### REQ-3: Factory Functions
1. THE module SHALL export `createContext(options)` to construct `ctx`
2. THE module SHALL export `createTools(options)` to construct `tools`  
3. THE module SHALL export `createEnvironment(options)` to construct the complete Environment
4. Factory functions SHALL validate their inputs and throw descriptive errors

### REQ-4: Backward Compatibility
1. THE module SHALL maintain the exact same runtime API surface for template authors
2. Setup scripts using `{ ctx, tools }` destructuring SHALL continue to work unchanged
3. Existing tests SHALL pass after migration (possibly with import path changes)

### REQ-5: Testability
1. THE module SHALL export test utilities for creating minimal valid Environment objects
2. THE test utilities SHALL allow partial overrides (e.g., `createTestEnvironment({ ctx: { projectName: 'test' } })`)
3. THE module SHALL export constants for default values (e.g., DEFAULT_AUTHOR_ASSETS_DIR)

### REQ-6: Documentation Generation
1. THE module SHALL include JSDoc annotations that can generate documentation
2. THE module's type definitions SHALL be authoritative for `docs/reference/environment.md`
3. Property descriptions in JSDoc SHALL match the documentation verbatim

## Non-Requirements

- This refactoring does NOT change the sandbox execution model
- This refactoring does NOT change the template author experience
- This refactoring does NOT add new features to `ctx` or `tools`

## Success Criteria

1. `setup-runtime.mjs` shrinks significantly (target: under 200 lines for sandbox logic only)
2. All existing tests pass
3. `environment.md` can be partially auto-generated from the module
4. New tests can use `createTestEnvironment()` instead of manual object construction
