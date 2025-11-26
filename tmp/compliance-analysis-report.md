# Codebase and Test Compliance Analysis Report

## Executive Summary

This report analyzes the codebase and test suite against the design principles and philosophy documented in `docs/guides/testing.md`. The analysis reveals **significant violations** of the layered testing model, zero-mock philosophy, and other core principles. The confidence level in the codebase following these principles is **low to moderate**.

## Critical Findings

### 1. Zero-Mock Philosophy Violations

**Severity**: CRITICAL
**Impact**: Tests do not provide real confidence, integration bugs may be missed

**Violations Found**:

#### Mock Objects in Security Tests
- **File**: `tests/security/defense-in-depth.test.mjs`
- **Issue**: Uses mock fs object instead of real filesystem operations
- **Code**:
```javascript
// Mock fs module
const mockFs = {
  async readFile(path) {
    return `reading ${path}`;
  }
};
```
- **Why This Violates**: Security boundary validation should use real filesystem operations to catch integration issues.

#### Mock Registry in Cache Manager Tests
- **File**: `tests/shared/registry-cache-manager.test.mjs`
- **Issue**: Creates mock registry object instead of using real registry implementation
- **Code**:
```javascript
// Mock minimal templateRegistry
mockRegistry = {
  name: 'test-registry'
};
```
- **Why This Violates**: Cache manager should be tested with real registry implementations.

#### Mock Prompt Adapter in Placeholder Resolver Tests
- **File**: `tests/shared/placeholder-resolver.test.mjs`
- **Issue**: Uses MockPromptAdapter and mockNonTTYStreams
- **Code**:
```javascript
// Mock prompt adapter for testing
class MockPromptAdapter {
  constructor(responses = []) {
    this.responses = [...responses];
  }
}
```
- **Why This Violates**: Interactive prompting should use real TTY detection and process spawning.

**Required Fixes**:
- Replace all mock objects with real implementations using controlled test environments
- Use temporary directories and real filesystem operations
- Test interactive features by spawning actual processes with controlled stdin/stdout

### 2. Layer Boundary Violations

**Severity**: HIGH
**Impact**: Tests are not isolated, making failures hard to diagnose and refactoring risky

**Violations Found**:

#### L2 Tests Using L0 Functions
Multiple "L2" tests in `tests/shared/` are directly importing and using Node.js APIs:

- `tests/shared/config-loader-templates.test.mjs` - imports `fs`, `path`, `os`
- `tests/shared/boundary-validator.test.mjs` - imports `mkdtemp`, `rm`, `join`, `tmpdir`
- `tests/shared/cache-manager.git.test.mjs` - imports `fs`
- `tests/shared/template-resolver.git.test.mjs` - imports `fs`
- `tests/shared/registry-cache-manager.test.mjs` - imports `mkdtemp`, `rm`, `readFile`, `readdir`
- `tests/shared/config-discovery.test.mjs` - imports `mkdir`, `writeFile`, `rm`
- `tests/shared/template-validator.test.mjs` - imports `readFile`
- `tests/shared/template-resolver.test.mjs` - imports `fs`
- `tests/shared/config-loader.test.mjs` - imports `fs`

**Why This Violates**: L2 tests should operate on pure data structures only. Filesystem operations belong at L1.

#### L3 Tests Using L0 Functions
- **File**: `tests/create-scaffold/setup-runtime.test.mjs`
- **Issue**: L3 orchestrator test directly imports and uses `fs`, `path`, `os` for fixture creation
- **Code**:
```javascript
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
```

**Why This Violates**: L3 tests should provide data objects to orchestrators, not create filesystem fixtures.

#### Incorrect Layer Labeling
- **File**: `tests/utils/file.test.mjs` - Labeled as "L2 Utility Tests" but tests L1 File utilities
- **File**: `tests/shared/boundary-validator.test.mjs` - Labeled as "L2 Tests" but uses L0 functions inappropriately

**Required Fixes**:
- Move filesystem-dependent tests to proper L1 layer
- Restructure L3 tests to provide data objects instead of creating fixtures
- Correct layer labels and move tests to appropriate directories
- Create separate L1 test suites for filesystem utilities

### 3. Implementation vs Behavior Testing

**Severity**: MEDIUM
**Impact**: Tests are brittle and will break during refactoring

**Violations Found**:

#### Data Structure Testing
- **File**: `tests/shared/template-ignore.test.mjs`
- **Issue**: Tests that `createTemplateIgnoreSet()` returns a `Set` instance
- **Code**:
```javascript
assert.ok(ignoreSet instanceof Set);
```
- **Why This Violates**: Tests internal data structure choice instead of observable behavior.

**Required Fixes**:
- Remove `instanceof` checks for internal data structures
- Test only observable behavior: what entries are ignored, not how they're stored

### 4. Test Isolation and Resource Management

**Severity**: MEDIUM
**Impact**: Tests may interfere with each other, cleanup failures

**Violations Found**:

#### Missing Cleanup in Some Tests
Some tests create temporary directories but may not properly clean them up in all failure scenarios.

#### Inconsistent Test Organization
- Tests are scattered across multiple directories without clear layer separation
- Some L3 tests are in `shared/` directory instead of `create-scaffold/`

**Required Fixes**:
- Ensure all tests use proper `beforeEach`/`afterEach` cleanup
- **Revised Approach**: Keep current feature-based organization but add clear layer indicators in test file headers and naming
- Focus on fixing violations within existing structure rather than perfect reorganization
- Use consistent naming patterns (e.g., `*.l1.test.mjs`, `*.l2.test.mjs`) within existing directories

### 5. Security Validation Testing

**Severity**: MEDIUM
**Impact**: Security validation may not be thoroughly tested

**Assessment**: Security tests appear to follow fail-fast principles correctly. No fallback logic found that masks validation failures.

**Positive Findings**:
- Security tests properly reject malicious inputs
- Tests verify that validation throws errors rather than continuing with defaults

## Architecture Assessment

### Current State
The codebase has a **mixed architecture** with some modules following layered principles but significant violations in testing.

### Layer Identification Issues
Based on analysis, the current layer assignments appear incorrect:

- `lib/boundary-validator.mjs` - Currently tested as L2, but contains L1 wrapper functionality
- `bin/create-scaffold/modules/config-loader.mjs` - L3 orchestrator but tested with L0 dependencies
- `lib/utils/file.mjs` - L1 utilities but labeled as L2 in tests

## Recommended Remediation Plan

### Phase 1: Immediate Fixes (High Priority)
1. **Remove all mock objects** from test files
2. **Restructure L2 tests** to eliminate L0 imports
3. **Move filesystem-dependent tests** to L1 layer
4. **Fix layer labeling** and directory organization

### Phase 2: Test Restructuring (Medium Priority)
1. **Create proper L1 test suites** for filesystem utilities
2. **Restructure L3 tests** to use data-driven approach
3. **Implement consistent test isolation** patterns
4. **Remove implementation detail assertions**

### Phase 3: Architecture Alignment (Low Priority)
1. **Audit module layer assignments** and correct misclassifications
2. **Update testing.md** with clarified layer definitions
3. **Establish code review checklists** for layer compliance

## Success Criteria

After remediation:
- ✅ All tests pass without mock objects
- ✅ L2 tests contain zero L0/L1 imports
- ✅ L3 tests provide data objects, not filesystem fixtures
- ✅ Test failures clearly indicate which layer/component broke
- ✅ Refactoring internal implementations doesn't break tests
- ✅ Security validation fails fast on all malicious inputs

## Conclusion

The codebase demonstrates understanding of layered architecture principles but has significant gaps in test implementation. The most critical issues are the use of mock objects and layer boundary violations, which undermine the core philosophy of real integration testing and test isolation.

**Confidence Level**: LOW - Major architectural violations present that could mask integration bugs and make refactoring risky.

**Next Steps**: Begin with Phase 1 fixes to establish proper test isolation before proceeding with feature development.