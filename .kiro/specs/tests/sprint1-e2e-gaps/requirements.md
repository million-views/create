# Sprint 1: Critical E2E Test Gaps

## Overview

This sprint addresses the critical e2e test gaps identified during the tutorial coverage analysis. These tests ensure the primary user-facing workflows documented in the tutorials actually work.

## User Stories

### US-1: Selection Files via CLI
**As a** template consumer  
**I want to** scaffold projects using a selection.json file via CLI  
**So that** I can reproduce consistent configurations and share them with my team

**Acceptance Criteria:**
- [ ] AC-1.1: Can scaffold with `--selection file.json` that contains dimension choices
- [ ] AC-1.2: Can scaffold with `--selection file.json` that contains placeholder values
- [ ] AC-1.3: Selection file dimension choices are applied correctly
- [ ] AC-1.4: Selection file placeholder values are applied correctly
- [ ] AC-1.5: CLI `--placeholder` flags override selection file values

### US-2: Gates Validation
**As a** template consumer  
**I want to** receive clear error messages when selecting invalid dimension combinations  
**So that** I don't create broken projects from incompatible configurations

**Acceptance Criteria:**
- [ ] AC-2.1: Gates reject invalid dimension combinations
- [ ] AC-2.2: Error message identifies which gate was violated
- [ ] AC-2.3: Error message shows which dimensions conflict
- [ ] AC-2.4: Error message shows allowed values
- [ ] AC-2.5: Scaffolding fails with non-zero exit code

### US-3: Template Validation Command
**As a** template author  
**I want to** validate my template structure before distributing it  
**So that** consumers don't encounter errors when using my template

**Acceptance Criteria:**
- [ ] AC-3.1: `create-scaffold validate <path>` validates template.json
- [ ] AC-3.2: Validation checks required fields (schemaVersion, id, name)
- [ ] AC-3.3: Validation checks placeholder definitions
- [ ] AC-3.4: Valid templates exit with code 0
- [ ] AC-3.5: Invalid templates exit with non-zero code and show errors

## Technical Requirements

### Test Infrastructure
- Tests must use hermetic M5NV_HOME isolation
- Tests must clean up all artifacts in tmp/e2e-tests/
- Tests must not pollute user's home directory
- Tests must work without network access (local templates only)

### Test File Location
- New test file: `tests/e2e/sprint1-tutorial-gaps.test.mjs`

## Dependencies

- Existing test helpers in `tests/e2e/test-helpers.mjs`
- GuidedSetupWorkflow with selection file support
- Gate enforcement logic in guided-setup-workflow.mjs
- ValidateCommand in bin/create-scaffold/commands/validate/

## Out of Scope

- Hints validation (Priority 3)
- Environment variable configuration (Priority 3)
- .m5nvrc configuration (Priority 4)
- Cloudflare Workers auto-detection (Priority 4)
