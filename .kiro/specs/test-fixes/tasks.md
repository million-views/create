# Test Fixes Sprint - Tasks

## Sprint Overview
Fix 8 failing functional tests by addressing error handling, cleanup, and validation issues in the CLI workflow.

## Task Breakdown

### Phase 1: Setup Script Error Handling (Tasks 1-3)

#### [ ] Task 1: Investigate Setup Script Failure Warnings
**Description**: Multiple tests expect warning messages when setup scripts fail, but these aren't appearing.
**Acceptance Criteria**:
- Find where setup script errors should be logged as warnings
- Verify error propagation from setup runtime to CLI output
- Identify why warning messages aren't appearing in stderr

**Files to Examine**:
- `bin/create-scaffold/guided-setup-workflow.mjs` - executeSetupScript()
- `bin/create-scaffold/setup-runtime.mjs` - setup script execution
- `test/create-scaffold/cli.test.mjs` - failing test expectations

**Test Impact**: Fixes tests 1, 2, 6 ("setup script failure warnings")

#### [ ] Task 2: Fix Setup Script File Cleanup
**Description**: Setup script files should be removed even after execution failures.
**Acceptance Criteria**:
- Setup script files are cleaned up on both success and failure
- Cleanup logic runs in finally blocks or error handlers
- Test verifies cleanup happens after failed execution

**Files to Modify**:
- `bin/create-scaffold/guided-setup-workflow.mjs` - cleanup logic
- `test/create-scaffold/cli.test.mjs` - test validation

**Test Impact**: Fixes test 3 ("Setup script file cleanup on execution failure")

#### [ ] Task 3: Fix Temp Directory Cleanup on Setup Failure
**Description**: Temporary directories should be cleaned up when setup script execution fails.
**Acceptance Criteria**:
- Temp directory cleanup runs regardless of setup script success/failure
- Cleanup logic properly handles partial setup states
- Test verifies temp directories are removed after setup failures

**Files to Modify**:
- `bin/create-scaffold/guided-setup-workflow.mjs` - temp directory handling
- `test/create-scaffold/cli.test.mjs` - test validation

**Test Impact**: Fixes test 2 ("Temp directory cleanup on executeSetupScript() failure")

### Phase 2: Validation Logic Fixes (Tasks 4-5)

#### [ ] Task 4: Fix Environment_Object Validation Markers
**Description**: Setup scripts can't find validation markers in the Environment_Object.
**Acceptance Criteria**:
- Environment_Object includes required validation properties
- Setup scripts can access validation markers
- Constants integration didn't break validation logic

**Files to Examine/Modify**:
- `bin/create-scaffold/environment-factory.mjs` - Environment_Object creation
- `bin/create-scaffold/setup-runtime.mjs` - context building
- `test/create-scaffold/cli.test.mjs` - test expectations

**Test Impact**: Fixes test 5 ("Setup script receives Environment_Object with correct properties")

#### [ ] Task 5: Fix Command Pattern Validation
**Description**: Commands failing at argument parsing instead of template validation.
**Acceptance Criteria**:
- Validation errors occur at correct stage (template validation, not argument parsing)
- Error messages are appropriate for the validation stage
- Command validation logic follows expected patterns

**Files to Examine/Modify**:
- `bin/create-scaffold/index.mjs` - main CLI logic and validation order
- `bin/create-scaffold/guided-setup-workflow.mjs` - workflow validation
- `test/create-scaffold/cli.test.mjs` - test expectations

**Test Impact**: Fixes test 7 ("Command patterns validate correct usage")

### Phase 3: Resource Management Fixes (Tasks 6-8)

#### [ ] Task 6: Fix Resource Leak Detection
**Description**: Resource leak detection not working for invalid template scenarios.
**Acceptance Criteria**:
- Resource snapshots work correctly for all failure modes
- Invalid template scenarios properly detected and cleaned up
- Leak detection logic handles edge cases

**Files to Examine/Modify**:
- `test/create-scaffold/cli.test.mjs` - resource leak detection logic
- `test/utils/resources.js` - snapshot and detection utilities
- Workflow execution cleanup paths

**Test Impact**: Fixes test 4 ("Resource leak detection across multiple failure modes")

#### [ ] Task 7: Fix Author Assets Cleanup
**Description**: __scaffold__ directory should be removed after setup completion.
**Acceptance Criteria**:
- Author assets are properly staged during setup
- __scaffold__ directory is removed after successful setup
- Cleanup logic handles both success and failure cases

**Files to Examine/Modify**:
- `bin/create-scaffold/guided-setup-workflow.mjs` - author assets handling
- Template processing and staging logic
- `test/create-scaffold/cli.test.mjs` - test validation

**Test Impact**: Fixes test 8 ("Author assets are staged for setup and removed afterwards")

#### [ ] Task 8: Integration Testing and Validation
**Description**: Ensure all fixes work together and don't introduce regressions.
**Acceptance Criteria**:
- All 8 failing tests pass individually
- Full test suite passes (7/7 suites)
- No new test failures introduced
- Error handling and cleanup work correctly in all scenarios

**Validation Steps**:
- Run individual failing tests to verify fixes
- Run full test suite to check for regressions
- Manual testing of error scenarios if needed

**Test Impact**: Validates all previous fixes work together

## Progress Tracking
- [ ] Task 1: Investigate Setup Script Failure Warnings
- [ ] Task 2: Fix Setup Script File Cleanup
- [ ] Task 3: Fix Temp Directory Cleanup on Setup Failure
- [ ] Task 4: Fix Environment_Object Validation Markers
- [ ] Task 5: Fix Command Pattern Validation
- [ ] Task 6: Fix Resource Leak Detection
- [ ] Task 7: Fix Author Assets Cleanup
- [ ] Task 8: Integration Testing and Validation

## Completion Criteria
- All 8 failing functional tests pass
- Full test suite achieves 100% pass rate
- No regressions in existing functionality
- All changes follow existing code patterns and architecture