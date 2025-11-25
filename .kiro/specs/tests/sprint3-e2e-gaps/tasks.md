# Sprint 3 Implementation Tasks

## Implementation Tasks

### Task Group 1: Edge Case Tests
- [x] Task 1.1: Create test for minimal template scaffolding
- [x] Task 1.2: Create test for scaffolding to non-empty directory (should fail)
- [x] Task 1.3: Create test for scaffolding to empty existing directory (should succeed)

### Task Group 2: Restore Workflow Tests
- [x] Task 2.1: Create test for successful restore after conversion
- [x] Task 2.2: Create test for restore without backup (should fail gracefully)

### Task Group 3: Error Scenario Tests
- [x] Task 3.1: Create test for invalid JSON in template.json
- [x] Task 3.2: Create test for missing required name field
- [x] Task 3.3: Create test for missing template.json file

### Task Group 4: Test Infrastructure
- [x] Task 4.1: Ensure hermetic isolation for all new tests
- [x] Task 4.2: Verify all tests clean up properly

## Implementation Notes

### Findings During Implementation

1. **Schema Version**: Templates must use `schemaVersion: '1.0.0'` (not just `version`) for placeholders to be properly loaded and processed. The old format without schemaVersion falls through to validation that requires different fields.

2. **Placeholder Format**: Unicode placeholders (`⦃PLACEHOLDER⦄`) are the standard format when `placeholderFormat: 'unicode'` is specified.

3. **Placeholder Requirements**: Each placeholder must have a `description` field. The `required` field defaults to true in V1 schema.

4. **Placeholder Values**: When using `--yes` flag, placeholders must be explicitly provided via `--placeholder NAME=value`. Default values from template.json aren't automatically applied without interactive prompts.

5. **Restore Workflow**: Requires `make-template init` before `convert`. The restore command uses `.template-undo.json` to track original file contents.

6. **Directory Validation**: Scaffolding to a non-empty directory fails with "not empty" error. Empty directories are allowed.

## Test Results

All 8 Sprint 3 tests pass:
- ✔ Edge case - minimal template scaffolding succeeds
- ✔ Edge case - scaffolding to non-empty directory fails
- ✔ Edge case - scaffolding to empty existing directory succeeds
- ✔ Restore workflow - successful restore after conversion
- ✔ Restore workflow - fails gracefully without undo log
- ✔ Error scenario - invalid JSON in template.json
- ✔ Error scenario - missing required name field in template.json
- ✔ Error scenario - missing template.json file

## Regression Verification

Full e2e test suite passes (36 tests):
- 20 existing tests: PASS
- 7 Sprint 1 tests: PASS
- 8 Sprint 2 tests: PASS
- 8 Sprint 3 tests: PASS
