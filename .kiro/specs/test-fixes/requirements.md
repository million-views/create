# Test Fixes Sprint - Requirements

## Problem Statement
Following the successful removal of legacy CLI flags (--ide, --options), 8 functional tests are still failing in the CLI test suite. These failures prevent the test suite from passing and indicate issues with error handling, cleanup, and validation logic.

## Current State
- 6/7 test suites passing
- 8 failing functional tests in `test/create-scaffold/cli.test.mjs`
- All failures are in the Functional Tests suite

## Failing Tests Analysis

### 1. Setup script failure is handled gracefully with warnings
**Error**: "Should show warning about setup script failure"
**Impact**: Setup script error handling not working correctly

### 2. Temp directory cleanup on executeSetupScript() failure
**Error**: "Should show warning about setup script failure"
**Impact**: Temporary directory cleanup logic broken when setup scripts fail

### 3. Setup script file cleanup on execution failure
**Error**: "Setup script should be removed even after execution failure"
**Impact**: Setup script files not being cleaned up after failures

### 4. Resource leak detection across multiple failure modes
**Error**: "Scenario invalid-template: Expected error containing 'Template directory not found'"
**Impact**: Resource leak detection not working for invalid template scenarios

### 5. Setup script receives Environment_Object with correct properties
**Error**: "Environment_Object validation marker not found - setup script validation failed"
**Impact**: Environment_Object validation not working in setup scripts

### 6. Setup script error handling with malformed setup scripts
**Error**: "Should show warning about setup script failure"
**Impact**: Malformed setup script error handling broken

### 7. Command patterns validate correct usage
**Error**: "Should fail at template validation, not argument parsing"
**Impact**: Command validation logic not working correctly

### 8. Author assets are staged for setup and removed afterwards
**Error**: "__scaffold__ directory should be removed after setup"
**Impact**: Author assets cleanup not working

## Success Criteria
- All 8 failing functional tests pass
- No regression in existing functionality
- Error handling and cleanup logic works correctly
- Test suite achieves 100% pass rate

## Constraints
- Must maintain backward compatibility
- Cannot break existing working functionality
- Changes must follow existing code patterns and architecture
- All fixes must include appropriate test validation

## Dependencies
- Requires understanding of CLI workflow execution
- Needs knowledge of setup script runtime and error handling
- Depends on template validation and resource management logic