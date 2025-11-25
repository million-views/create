# Sprint 2: High Priority E2E Test Gaps

## Overview

This sprint addresses high priority e2e test gaps that complete tutorial coverage:
1. Dimension-based scaffolding via CLI
2. Selection file + placeholder override precedence
3. make-template test command

## User Stories

### US-1: Dimension-Based Scaffolding via CLI
**As a** template consumer  
**I want to** scaffold projects with specific dimension choices via selection files  
**So that** I can create projects with the exact feature combinations I need

**Acceptance Criteria:**
- [ ] AC-1.1: Selection file dimension choices are loaded and applied
- [ ] AC-1.2: Multi-select dimensions (features) work correctly
- [ ] AC-1.3: Single-select dimensions (deployment) work correctly
- [ ] AC-1.4: Dimension selections persist in workflow state

### US-2: Placeholder Override Precedence
**As a** template consumer  
**I want to** CLI placeholder flags to take precedence over other sources  
**So that** I can customize specific values while using a base configuration

**Acceptance Criteria:**
- [ ] AC-2.1: CLI `--placeholder` overrides template defaults
- [ ] AC-2.2: CLI `--placeholder` overrides config file values
- [ ] AC-2.3: Multiple CLI `--placeholder` flags work together

### US-3: Template Testing Command
**As a** template author  
**I want to** validate my templates work correctly before distribution  
**So that** consumers don't encounter errors when using my template

**Acceptance Criteria:**
- [ ] AC-3.1: `make-template test <path>` scaffolds a test project
- [ ] AC-3.2: Test validates template.json exists
- [ ] AC-3.3: Test cleans up temporary project after completion
- [ ] AC-3.4: `--verbose` flag shows detailed output
- [ ] AC-3.5: `--keep-temp` flag preserves test project

## Technical Requirements

### Test Infrastructure
- Tests must use hermetic M5NV_HOME isolation
- Tests must clean up all artifacts in tmp/e2e-tests/
- Tests must work without network access (local templates only)

### Test File Location
- Add tests to existing `tests/e2e/sprint1-tutorial-gaps.test.mjs` or create new file

## Dependencies

- Sprint 1 tests passing
- Existing test helpers in `tests/e2e/test-helpers.mjs`
- make-template test command in `bin/make-template/commands/test/`

## Out of Scope

- Environment variable configuration (Priority 3)
- .m5nvrc configuration (Priority 4)
- Cloudflare Workers auto-detection (Priority 4)
