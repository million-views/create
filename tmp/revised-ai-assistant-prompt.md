**AI Assistant Prompt: Methodical Resolution of Testing Architecture Violations**

You are an expert software engineer tasked with bringing the `@m5nv/create-scaffold` codebase and test suite into full compliance with the design principles documented in `docs/guides/testing.md`. The current state has significant violations that undermine test reliability, refactoring safety, and integration confidence.

**CRITICAL: Follow the Layered Testing Model Strictly**
- **L0**: Runtime (Node.js APIs) - NEVER test directly
- **L1**: Low-level wrappers - Test with L0 for fixtures, but only test L1 functions
- **L2**: Business logic utilities - PURE data transformation, ZERO L0/L1 imports
- **L3**: Orchestrators - Test public interface with data objects, ZERO L0 imports
- **L4**: CLI Entry Points - Test command classes with dependency injection
- **L5**: CLI Binary - Test executable artifact via process spawning

**MANDATORY: Zero-Mock Philosophy**
- Replace ALL mock objects with real implementations
  - Setup ESLINT rules to catch all mockup tests
- Use controlled environments (temp directories) for integration testing
- Test observable outcomes, not implementation details

**Work Methodically Through These Phases:**

## Phase 1: Mock Object Elimination (CRITICAL - Do First)

**Target Files:**
- `tests/security/defense-in-depth.test.mjs` (mock fs object)
- `tests/shared/registry-cache-manager.test.mjs` (mock registry)
- `tests/shared/placeholder-resolver.test.mjs` (MockPromptAdapter, mockNonTTYStreams)

**For Each File:**
1. Identify the mock object and what real implementation it replaces
2. Create a controlled test environment using temp directories
3. Replace mock with real object instantiation and cleanup
4. Verify test still validates the same behavior
5. Run test to ensure it passes with real implementation

## Phase 2: Layer Boundary Corrections (HIGH PRIORITY)

**Step 2.1: Fix L2 Tests Using L0 Functions**
**Target Files:**
- `tests/shared/config-loader-templates.test.mjs`
- `tests/shared/boundary-validator.test.mjs`
- `tests/shared/cache-manager.git.test.mjs`
- `tests/shared/template-resolver.git.test.mjs`
- `tests/shared/registry-cache-manager.test.mjs`
- `tests/shared/config-discovery.test.mjs`
- `tests/shared/template-validator.test.mjs`
- `tests/shared/template-resolver.test.mjs`
- `tests/shared/config-loader.test.mjs`

**For Each File:**
1. Audit all imports - remove any L0 (fs, path, os, child_process) imports
2. If the test needs filesystem operations, it's at the wrong layer - move to L1
3. Restructure to provide pure data inputs to L2 functions
4. Verify the test validates business logic, not I/O operations

**Step 2.2: Fix L3 Tests Using L0 Functions**
**Target File:** `tests/create-scaffold/setup-runtime.test.mjs`

1. Remove direct L0 imports (fs, path, os)
2. Restructure to provide data context objects instead of creating filesystem fixtures
3. Test the orchestrator's public interface and observable side effects
4. Move any filesystem setup to separate L1 utility functions if needed

## Phase 3: Implementation vs Behavior Testing Fixes

**Target Files:**
- `tests/shared/template-ignore.test.mjs` (instanceof Set check)

**For Each File:**
1. Remove assertions about internal data structures (instanceof checks)
2. Replace with behavioral assertions (what entries are ignored, not how they're stored)
3. Ensure tests survive internal refactoring

## Phase 4: Test Organization and Isolation

**Step 4.1: Correct Layer Labeling**
- `tests/utils/file.test.mjs`: Change "L2" to "L1" in comments
- `tests/shared/boundary-validator.test.mjs`: Verify correct layer assignment

**Step 4.2: Add Clear Layer Indicators**
Within existing feature-based directories, add consistent layer indicators:
- Update test file headers to clearly state which layer they test
- Use naming patterns like `*.l1.test.mjs`, `*.l2.test.mjs` where helpful
- Ensure test comments clearly explain layer boundaries and constraints

**Step 4.3: Ensure Proper Resource Management**
- Audit all tests for proper `beforeEach`/`afterEach` cleanup
- Add missing cleanup for temp directories
- Verify tests don't leave artifacts

## Phase 5: Architecture Validation

**Step 5.1: Module Layer Assignment Audit**
Review these modules and ensure correct layer classification:
- `lib/boundary-validator.mjs` - Determine if L1 wrapper or L2 utility
- `bin/create-scaffold/modules/config-loader.mjs` - Confirm L3 orchestrator
- `lib/utils/file.mjs` - Confirm L1 wrapper

**Step 5.2: Cross-Layer Integration Testing**
Ensure L3 orchestrators properly call L2/L1 functions without the tests reaching down.

## Validation Protocol

**After Each Phase:**
1. Run the affected test suite: `npm run test:unit` (for L1/L2), `npm run test:integration` (for L3/L4)
2. Verify no test failures introduced
3. Check coverage hasn't decreased
4. Ensure tests pass with real implementations

**Final Validation:**
1. Run full test suite: `npm test`
2. Verify zero mock objects remain in codebase
3. Confirm L2 tests have zero L0/L1 imports
4. Test refactoring safety by changing internal implementations
5. Validate security tests fail fast on malicious inputs

**Success Criteria:**
- ✅ All tests pass without mock frameworks
- ✅ Layer boundaries strictly enforced
- ✅ Tests validate behavior, not implementation
- ✅ Refactoring internal code doesn't break tests
- ✅ Security validation fails fast with no fallbacks

**If Issues Persist:**
- Document the specific violation and why the fix didn't work
- Re-evaluate layer assignment for the problematic module
- Consider if the module itself needs architectural changes

Work through each phase systematically. Do not proceed to the next phase until the current phase is fully compliant. Focus on one file at a time to ensure quality fixes.