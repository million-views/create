# Tasks: Environment Module Extraction

## Phase 1: Create New Module Structure

### Task 1.1: Create directory structure and base files
- [x] Create `lib/environment/` directory
- [x] Create `lib/environment/tools/` subdirectory
- [x] Create `lib/environment/index.mjs` with module exports
- [x] Create `lib/environment/context.mjs` with createContext()
- [x] Create `lib/environment/testing.mjs` with test utilities

### Task 1.2: Extract tools API builders
- [ ] Create `lib/environment/tools/index.mjs` with createTools()
- [ ] Extract files API to `lib/environment/tools/files.mjs`
- [ ] Extract json API to `lib/environment/tools/json.mjs`
- [ ] Extract text API to `lib/environment/tools/text.mjs`
- [ ] Extract placeholders API to `lib/environment/tools/placeholders.mjs`
- [ ] Extract templates API to `lib/environment/tools/templates.mjs`
- [ ] Extract inputs API to `lib/environment/tools/inputs.mjs`
- [ ] Extract options API to `lib/environment/tools/options.mjs`
- [ ] Extract logger API to `lib/environment/tools/logger.mjs`

### Task 1.3: Create TypeScript definitions
- [ ] Create `lib/environment/types.d.ts` with Environment interface
- [ ] Define Context interface with all properties
- [ ] Define Tools interface with all sub-APIs
- [ ] Define individual API interfaces (FilesApi, JsonApi, etc.)

### Task 1.4: Create comprehensive tests
- [x] Create `tests/environment/` directory
- [x] Create `tests/environment/environment.test.mjs` for createContext() and test utilities
- [ ] Create `tests/environment/tools.test.mjs` for createTools()
- [ ] Create `tests/environment/integration.test.mjs` for createEnvironment()

## Phase 2: Migrate Consumers

### Task 2.1: Update setup-runtime.mjs
- [ ] Import createContext, createTools from `lib/environment/`
- [ ] Replace inline ctx construction with createContext()
- [ ] Replace createSetupTools() implementation to delegate to createTools()
- [ ] Remove duplicated code (keep only sandbox logic)
- [ ] Verify existing tests still pass

### Task 2.2: Update guided-setup-workflow.mjs
- [ ] Import createEnvironment from `lib/environment/`
- [ ] Replace inline ctx/tools construction with createEnvironment()
- [ ] Verify workflow tests still pass

### Task 2.3: Update test files
- [ ] Update `tests/create-scaffold/setup-runtime.test.mjs` to use createTestEnvironment()
- [ ] Remove manual buildCtx() and buildTools() helper functions
- [ ] Verify all tests pass with new utilities

## Phase 3: Cleanup and Documentation

### Task 3.1: Slim down setup-runtime.mjs
- [ ] Ensure only sandbox-related code remains (~200 lines target)
- [ ] Export only sandbox-related functions (loadSetupScript, SetupSandboxError)
- [ ] Re-export createSetupTools for backward compatibility (deprecated)

### Task 3.2: Update documentation
- [ ] Update `docs/reference/environment.md` to reference `lib/environment/`
- [ ] Add note that types.d.ts is the authoritative source
- [ ] Verify all documented properties match the type definitions

### Task 3.3: Add to test runner
- [ ] Add Environment Module tests to test-runner.mjs
- [ ] Verify full test suite passes
- [ ] Commit all changes

## Acceptance Criteria

- [ ] `lib/environment/` module exists and exports createContext, createTools, createEnvironment
- [ ] `lib/environment/testing.mjs` exports createTestContext, createTestTools, createTestEnvironment
- [ ] `lib/environment/types.d.ts` defines all interfaces
- [ ] `setup-runtime.mjs` is under 300 lines (down from 1189)
- [ ] All 37+ existing test suites pass
- [ ] New Environment module tests achieve 100% coverage of factory functions
- [ ] Documentation references the new module as authoritative
