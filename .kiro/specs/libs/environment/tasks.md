# Tasks: Environment Module Extraction

## Phase 1: Create New Module Structure

### Task 1.1: Create directory structure and base files
- [x] Create `lib/environment/` directory
- [x] Create `lib/environment/tools/` subdirectory
- [x] Create `lib/environment/index.mjs` with module exports
- [x] Create `lib/environment/context.mjs` with createContext()
- [x] Create `lib/environment/testing.mjs` with test utilities

### Task 1.2: Create tools wrapper (transitional)
- [x] Create `lib/environment/tools/index.mjs` with createTools() wrapper
- [x] Delegate to setup-runtime.mjs for actual implementation
- [x] Add isTools() type guard
- [*] Future: Extract individual tool modules (files.mjs, json.mjs, etc.)
  - Note: This is deferred - setup-runtime.mjs has complex interdependencies
  - When done, setup-runtime should use lib/environment/tools internally

### Task 1.3: Create test utilities
- [x] createTestContext() - creates Context with sensible defaults
- [x] createTestTools() - creates Tools with minimal config
- [x] createTestEnvironment() - creates complete { ctx, tools }
- [x] createTestLogger() - captures info/warn calls
- [x] createSilentLogger() - no-op logger

### Task 1.4: Create comprehensive tests
- [x] Create `tests/environment/` directory
- [x] Create `tests/environment/environment.test.mjs` (45 tests)
  - Context factory and validation
  - Tools factory and isTools() guard
  - All test utilities
- [*] Future: Move tools API tests from setup-runtime.test.mjs
  - The tools.files, tools.json, tools.text tests are L2 tests
  - They should be in environment/tools.test.mjs
  - setup-runtime.test.mjs should focus on L3 sandbox only

### Task 1.5: TypeScript definitions
- [x] Create `lib/environment/types.d.ts` with complete type definitions
- [x] Includes Context, Tools, all sub-APIs, Environment, and test utilities

## Phase 2: Migrate Consumers (Incremental)

### Task 2.1: Update setup-runtime.test.mjs helpers
- [x] Replace buildCtx() with createTestContext()
- [x] Replace buildTools() with createTestTools()
- [x] Verify all tests pass (60 tests)

### Task 2.2: Future - Full consumer migration
- [*] setup-runtime.mjs to use lib/environment internally
- [*] guided-setup-workflow.mjs to use lib/environment
- [*] Slim down setup-runtime.mjs to sandbox-only (~200 lines)

## Phase 3: Cleanup and Documentation

### Task 3.1: Dead code removed
- [x] Removed `lib/text-utils.mjs` (duplicate, unused)
- [x] Reviewed `lib/utils/text.mjs` - NOT duplicate (standalone utility for scripts, not setup runtime)

### Task 3.2: Add to test runner
- [x] Add Environment Module tests to test-runner.mjs
- [x] Verify full test suite passes (38 suites)

### Task 3.3: Documentation
- [x] Document Environment module in docs/reference/environment.md
- [x] ARCHITECTURE.md removed (content duplicated in docs/)

## Current Status

**Completed:**
- Environment module foundation with createContext, createTools, test utilities
- 45 unit tests covering context, tools, and all test helpers
- Dead code removal (lib/text-utils.mjs)

**Deferred (marked with [*]):**
- Full tool extraction from setup-runtime.mjs (complex interdependencies)
- Moving L2 tools tests from setup-runtime.test.mjs to environment/
- TypeScript definitions (JSDoc sufficient for now)

## Acceptance Criteria

- [x] `lib/environment/` module exports createContext, createTools
- [x] `lib/environment/testing.mjs` exports createTestContext, createTestTools, createTestEnvironment
- [x] Environment module has 45 unit tests, all passing
- [x] Full test suite (38 suites) passes
- [x] setup-runtime.test.mjs uses Environment test utilities
- [x] Environment tests added to test-runner.mjs
