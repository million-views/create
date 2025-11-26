# Coverage Improvement Task List

## Summary

- **Overall Coverage**: 84.15% statements (+4.4%), 77.79% branches (+4.30%), 88.09% functions (+2.21%)
- **Test Suites**: 42 passing, 0 failing
- **Generated**: 2025-11-25 (Updated after dead code removal)

---

## 🔑 Key Insight: Test Pyramid Inversion Problem

### Current Test Distribution (INVERTED - WRONG)

```
     /\           <- L5 E2E:     1,392 lines (7%)   [Should be LARGEST]
    /  \          <- L3/L4 Int:  7,728 lines (37%)  [Medium - OK]
   /____\         <- L2 Unit:   11,788 lines (56%)  [Should be TINY]
```

### Expected Test Pyramid (Per testing.md Philosophy)

```
   ______         <- L5 E2E:     Should be LARGEST (user workflows)
    \  /          <- L3/L4 Int:  Medium (orchestrator contracts)
     \/           <- L2 Unit:    TINY (core logic only)
```

### Root Cause Analysis

**Greedy unit tests are a SYMPTOM of poorly designed SUT, not the root cause.**

| Symptom | Evidence | Root Cause |
|---------|----------|------------|
| 993 lines for `template-manifest-validator` | Exhaustive edge case testing | Validator exposes too much surface area |
| 962 lines for `template-validator-extended` | Overlap with `template-validator` | Two validators doing similar work |
| 708 lines for `placeholder-schema` | Every type/default combination | Schema API is too granular |
| L3 tests in `tests/shared/` folder | `template-resolver.test.mjs` uses `fs.mkdir()` | No folder discipline |

### Correct Fix Order

1. **Address SUT design FIRST** - Consolidate overlapping validators, reduce API surface
2. **Consolidate/Simplify SUT** - Merge modules, apply single-responsibility
3. **THEN reorganize tests** - Move L3 tests out of `tests/shared/`
4. **Finally, balance pyramid** - L2 shrinks naturally with cleaner SUT

**Principle**: A well-designed SUT with a small, focused API needs fewer tests. If you need 1000 lines to test a module, the module is doing too much.

---

## Completed Tasks (This Session)

### ✅ Fix Make-Template Validate Tests failure
- **Issue**: Temp directory race condition under c8 coverage
- **Fix**: Use `t.before()` hook and unique temp path with `process.pid`
- **File**: `tests/make-template/cli-integration.test.mjs`

### ✅ Investigate dead code candidates
- **Result**: NO DEAD CODE found
- All low-coverage files are actively used in production:
  - templatize-html.mjs: Used by make-template convert
  - templatize-jsx.mjs: Used by make-template convert
  - template-discovery.mjs: Used by list, validate, registries
  - registry-fetcher.js: Used by list command

### ✅ Improve security.mjs Coverage (Priority 1.1)
- **Before**: 59.46% statements, 60.96% branches, 57.14% functions
- **After**: 81.49% statements, 81.70% branches, 95.23% functions
- **File Created**: `tests/security/security-functions.test.mjs` (113 tests)
- **Tests Added**:
  - Package identity functions (getPackageName, validatePackageName, etc.)
  - sanitizePath edge cases
  - validateRepoUrl comprehensive tests
  - sanitizeBranchName edge cases
  - validateTemplateName tests
  - validateProjectDirectory tests
  - sanitizeErrorMessage tests
  - validateIdeParameter tests
  - validateAuthoringMode tests
  - validateAuthorAssetsDir tests
  - validateDimensionsMetadata comprehensive tests
  - validateLogFilePath tests
  - validateCacheTtl tests
  - validateAllInputs comprehensive tests
  - ValidationError class tests

### ✅ Remove validateOptionsParameter Dead Code
- **Issue**: `validateOptionsParameter` in `lib/security.mjs` was never called from any CLI command
- **Investigation**: Verified no CLI command supports `--options` flag (NewCommand, ListCommand, ValidateCommand)
- **Action**: Removed function and related test file
- **Files Removed**:
  - Function `validateOptionsParameter` from `lib/security.mjs` (lines 559-605)
  - Call to `validateOptionsParameter` in `validateAllInputs`
  - Test file `tests/shared/security.test.mjs` (218 lines, dedicated to dead code)
  - Reference in `scripts/test-runner.mjs`
- **Result**: Test suites reduced from 43 to 42, dead code eliminated

### ✅ Improve security-gate.mjs Coverage (Priority 1.2)
- **Coverage**: 84.73% statements (unchanged in full run, 96.18% in isolation)
- **Test Added**: clearCache() method test in `defense-in-depth.test.mjs`

### ✅ Improve placeholder-schema.mjs Coverage (Priority 2.3)
- **Before**: 59.75% statements, 32% branches
- **After**: 100% statements, 100% branches, 100% functions
- **File Created**: `tests/validators/placeholder-schema.test.mjs` (75 tests)
- **Tests Added**:
  - Entry validation (null, undefined, non-object entries)
  - Placeholder name pattern validation
  - Duplicate token detection
  - Type validation (all 6 supported types + legacy string alias)
  - Default value validation for all types
  - Optional fields (required, sensitive/secure, description)
  - Full normalization scenarios

### ✅ Improve template-manifest-validator.mjs Coverage (Priority 2.2)
- **Before**: 56.17% statements, 65.38% branches
- **After**: 98.29% statements, 98.34% branches, 100% functions
- **File Created**: `tests/validators/template-manifest-validator.test.mjs` (80 tests)
- **Tests Added**:
  - Input validation (null, undefined, array, primitive)
  - V1 required fields validation
  - Dimensions validation (values array, structured format with options)
  - Gates validation
  - Feature specs validation
  - Hints validation
  - Placeholder processing
  - Return value structure
  - Caching behavior

### ✅ Improve template-validator.mjs Coverage (Priority 2.1)
- **Before**: 54.78% statements, 74.77% branches
- **After**: 96.10% statements, 92.77% branches, 100% functions
- **File Created**: `tests/validators/template-validator-extended.test.mjs` (61 tests)
- **Tests Added**:
  - Dimensions schema validation
  - Gates schema validation
  - Feature specs schema validation
  - Domain validation - dimension values
  - Domain validation - gates reference
  - Domain validation - feature specs reference
  - Domain validation - all features have specs
  - Domain validation - hints reference
  - Runtime validation - gates enforcement
  - Runtime validation - feature needs
  - Runtime validation - cross-dimension compatibility
  - Runtime validation - hints consistency
  - Console output methods

---

## Remaining Priority Tasks

### Priority 3: CLI Command Coverage (NICE TO HAVE)

#### 3.1 `bin/create-scaffold/commands/validate/index.js` - 52.17% → Target 75%+

**Uncovered areas**:
- Lines 79, 82-84, 89-92 (error paths)

**Recommended tests**:
- [ ] CLI error handling paths
- [ ] Invalid argument combinations
- [ ] SecurityGate rejection handling

**Effort**: Low (1 hour)

#### 3.2 `registry-fetcher.js` - 69.23% → Target 85%+

**Uncovered areas**:
- Lines 102-103, 105-106 (registry resolution)

**Recommended tests**:
- [ ] Different registry URL formats
- [ ] Config-based registry lookup
- [ ] Error handling for invalid registries

**Effort**: Low (1 hour)

---

### Priority 4: Utility Coverage (OPTIONAL)

#### 4.1 `lib/utils/file.mjs` - 52.47% → Target 70%+

**Uncovered areas**:
- Lines 339-346, 355-362 (file operations)

**Recommended tests**:
- [ ] Edge cases for file operations
- [ ] Error handling for missing files
- [ ] Permission error handling

**Effort**: Medium (2 hours)

#### 4.2 `lib/logger.mjs` - 61.34% → Target 75%+

**Uncovered areas**:
- Lines 521-536, 543-548 (formatting)

**Recommended tests**:
- [ ] Various log level combinations
- [ ] Formatting edge cases
- [ ] Silent mode behavior

**Effort**: Low (1 hour)

---

## Metrics Tracking

| Metric | Before | Current | Target |
|--------|--------|---------|--------|
| Statement Coverage | 79.75% | 84.15% | 85% |
| Branch Coverage | 73.49% | 77.79% | 80% |
| Function Coverage | 85.88% | 88.09% | 90% |
| Test Suites | 39 | 42 | - |
| Failing Tests | 0 | 0 | 0 |

---

## Implementation Notes

### Test File Organization (per testing.md)
- L2 Unit Tests: `tests/` with `*.test.mjs`
- L3 Integration Tests: `tests/cli/`, `tests/create-scaffold/`, `tests/make-template/`
- L4 E2E Tests: `tests/e2e/`

### Coverage Tool
- Using `c8` with `--reporter=text --reporter=json-summary`
- Reports stored in `tmp/c8-baseline/`

### Key Principles
1. **Question if SUT is broken** - Don't work around missing functionality
2. **Fail fast** - No fallbacks that mask validation failures
3. **Multi-layer validation** - Validate at boundaries, not just entry points
