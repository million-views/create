# Tasks: Environment Module Extraction

## Phase 1: Create New Module Structure

### Task 1.1: Create directory structure and base files
- [x] Create `lib/environment/` directory
- [x] Create `lib/environment/tools/` subdirectory
- [x] Create `lib/environment/index.mjs` with module exports
- [x] Create `lib/environment/context.mjs` with createContext()
- [x] Create `lib/environment/testing.mjs` with test utilities

### Task 1.2: Extract tool modules
- [x] Create `lib/environment/tools/index.mjs` with createTools() factory
- [x] Create `lib/environment/tools/files.mjs` - File operations API
- [x] Create `lib/environment/tools/json.mjs` - JSON manipulation API
- [x] Create `lib/environment/tools/text.mjs` - Text manipulation API
- [x] Create `lib/environment/tools/placeholders.mjs` - Placeholder replacement API
- [x] Create `lib/environment/tools/templates.mjs` - Template asset API
- [x] Create `lib/environment/tools/inputs.mjs` - Input values API
- [x] Create `lib/environment/tools/logger.mjs` - Logger API
- [x] Create `lib/environment/tools/options.mjs` - Options checking API
- [x] Create `lib/environment/utils.mjs` - Shared utilities
- [x] Add isTools() type guard

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
- [x] Create `tests/environment/tools.test.mjs` (49 tests)
  - tools.files API tests
  - tools.json API tests  
  - tools.text API tests
  - tools.templates API tests
  - tools.placeholders API tests
  - tools.inputs API tests
  - tools.options API tests
- [x] setup-runtime.test.mjs now focuses on L3 sandbox only (9 tests)

### Task 1.5: TypeScript definitions
- [x] Create `lib/environment/types.d.ts` with complete type definitions
- [x] Includes Context, Tools, all sub-APIs, Environment, and test utilities

## Phase 2: Migrate Consumers

### Task 2.1: Update setup-runtime.test.mjs helpers
- [x] Replace buildCtx() with createTestContext()
- [x] Replace buildTools() with createTestTools()
- [x] Verify all tests pass (60 tests)

### Task 2.2: Slim down setup-runtime.mjs
- [x] Refactor setup-runtime.mjs to use lib/environment/tools
- [x] setup-runtime.mjs now only contains L3 sandbox logic (161 lines)
- [x] createSetupTools() delegates to lib/environment/tools/index.mjs
- [x] All 38 test suites pass

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

## Summary

**Completed:**
- Full Environment module with all tool APIs extracted
- setup-runtime.mjs reduced from 1190 to 161 lines (86% reduction)
- TypeScript definitions for complete API surface
- 94 unit tests for Environment module (45 core + 49 tools)
- L2 tools tests in environment/tools.test.mjs
- L3 sandbox tests in setup-runtime.test.mjs (9 tests)
- All 39 test suites passing

**SUT Enhancements (during test extraction):**
- Added tools.json.write() for creating new JSON files
- Enhanced addToArray() to spread array values
- Added mergeKey support to mergeArray() for upsert behavior

## Acceptance Criteria

- [x] `lib/environment/` module exports createContext, createTools
- [x] `lib/environment/testing.mjs` exports createTestContext, createTestTools, createTestEnvironment
- [x] Environment module has 94 unit tests, all passing
- [x] Full test suite (39 suites) passes
- [x] setup-runtime.test.mjs uses Environment test utilities
- [x] Environment tests added to test-runner.mjs
- [x] setup-runtime.mjs slimmed to sandbox-only logic
- [x] L2 tools tests moved to environment/tools.test.mjs
- [x] L3 sandbox tests remain in setup-runtime.test.mjs
