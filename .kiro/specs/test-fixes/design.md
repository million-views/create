# Test Fixes Sprint - Design

## Architecture Overview
The failing tests indicate issues in several key areas of the CLI workflow:

1. **Setup Script Error Handling**: Multiple tests fail because setup script failures aren't being handled gracefully
2. **Resource Management**: Cleanup logic for temporary directories and files is broken
3. **Validation Logic**: Environment_Object validation and command pattern validation failing
4. **Author Assets**: Staging and cleanup of author assets not working

## Root Cause Analysis

### Setup Script Failures
**Problem**: Tests expect warning messages when setup scripts fail, but these aren't appearing.
**Root Cause**: Error handling in `executeSetupScript()` may not be propagating errors correctly or logging warnings.

### Resource Cleanup Issues
**Problem**: Temporary directories and setup script files not being cleaned up after failures.
**Root Cause**: Cleanup logic in workflow execution may be conditional on success rather than always running.

### Environment_Object Validation
**Problem**: Setup scripts can't find validation markers in the Environment_Object.
**Root Cause**: The validation logic or marker placement may have changed with the constants refactoring.

### Command Pattern Validation
**Problem**: Commands failing at argument parsing instead of template validation.
**Root Cause**: Validation order or error handling in the CLI workflow may be incorrect.

## Design Approach

### Phase 1: Error Handling Investigation
1. **Examine Setup Script Execution**
   - Review `executeSetupScript()` in guided-setup-workflow.mjs
   - Check error propagation and warning logging
   - Verify try/catch blocks and error handling patterns

2. **Review Cleanup Logic**
   - Examine temp directory cleanup in workflow execution
   - Check setup script file removal logic
   - Verify cleanup runs on both success and failure paths

### Phase 2: Validation Logic Fixes
1. **Environment_Object Validation**
   - Check how validation markers are added to Environment_Object
   - Verify setup scripts can access validation properties
   - Ensure constants integration didn't break validation

2. **Command Validation**
   - Review argument parsing vs template validation order
   - Check error handling in main CLI entry point
   - Verify validation error messages are correct

### Phase 3: Resource Management
1. **Author Assets Cleanup**
   - Examine author assets staging and removal logic
   - Check __scaffold__ directory handling
   - Verify cleanup happens after setup completion

2. **Resource Leak Detection**
   - Review resource snapshot and leak detection logic
   - Check invalid template scenario handling
   - Ensure proper cleanup on all error paths

## Implementation Strategy

### Incremental Fixes
- Fix one test category at a time to avoid cascading issues
- Run tests after each fix to verify no regressions
- Use existing code patterns and error handling approaches

### Error Handling Patterns
- Follow existing try/catch patterns in the codebase
- Maintain consistent error message formatting
- Ensure cleanup logic runs in finally blocks

### Testing Approach
- Each fix must include test validation
- Verify fixes don't break existing functionality
- Run full test suite after each major change

## Risk Mitigation
- **Regression Risk**: Run full test suite after each change
- **Breaking Changes**: Review all error handling paths before changes
- **Scope Creep**: Focus on specific failing tests, don't expand scope

## Success Metrics
- All 8 failing tests pass individually
- Full test suite passes (7/7 suites)
- No new test failures introduced
- Error handling and cleanup work correctly in all scenarios