# Sprint 3: Medium Priority E2E Test Gaps

## Overview

Sprint 3 addresses medium-priority gaps in e2e test coverage for tutorial documentation workflows. These tests cover edge cases, restore functionality, and additional error scenarios.

## Requirements

### REQ-1: Edge Case - Empty/Minimal Outputs
**Priority**: Medium
**Description**: Test scaffolding behavior with templates that produce minimal or empty outputs.

**Acceptance Criteria**:
- AC1.1: Scaffolding a template with no conditional files succeeds
- AC1.2: Output structure is valid even with minimal content
- AC1.3: No errors when template has few placeholders

### REQ-2: Edge Case - Overwrite Behavior
**Priority**: Medium  
**Description**: Test the --force flag behavior when output directory already exists.

**Acceptance Criteria**:
- AC2.1: Without --force, scaffolding to existing directory fails with appropriate error
- AC2.2: With --force, existing files are overwritten
- AC2.3: Force flag is respected for both local and registry templates

### REQ-3: Restore Workflow
**Priority**: Medium
**Description**: Test the `make-template restore` command to restore original files from backup.

**Acceptance Criteria**:
- AC3.1: Restore command recovers original files after conversion
- AC3.2: Restore fails gracefully when no backup exists
- AC3.3: Backup directory is properly cleaned up after restore

### REQ-4: Additional Error Scenarios
**Priority**: Medium
**Description**: Test various error conditions for robustness.

**Acceptance Criteria**:
- AC4.1: Invalid JSON in template.json produces clear error
- AC4.2: Missing required template.json fields produce specific errors
- AC4.3: Invalid placeholder syntax in source files is handled
- AC4.4: Permission errors are reported appropriately

## Dependencies

- Sprint 1 and Sprint 2 tests passing
- Existing e2e test infrastructure (test-helpers.mjs)
- Hermetic isolation via M5NV_HOME

## Out of Scope

- Performance testing
- Concurrent execution testing
- Network failure scenarios (registry unavailable)
