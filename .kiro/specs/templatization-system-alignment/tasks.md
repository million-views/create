# Templatization System Alignment - Implementation Tasks

## Overview

This sprint addresses the critical architectural violation where the implementation deviated from the approved design specification. The templatization system must be aligned with the configurable `.templatize.json` approach specified in the design document.

**STATUS: ✅ PHASE 5 COMPLETE - ALL PHASES SUCCESSFULLY IMPLEMENTED**
- Implementation matches design specifications ✅
- Configurable templatization system fully implemented ✅
- Comprehensive testing and validation completed ✅
- Documentation and cleanup in progress

## Phase 1: Foundation - Configuration Integration

- [x] **Task 1.1: Add Config Loading to Converter**
  - Import `loadConfig` from `lib/templatize-config.mjs` in converter.js
  - Add config loading logic in `detectAndReplacePlaceholders()` method
  - Add error handling for missing/invalid config files
  - **Acceptance Criteria**: Config loads successfully, falls back gracefully on errors

- [x] **Task 1.2: Implement Pattern Translation Layer**
  - Create `translatePattern()` function to convert design patterns to implementation format
  - Handle all design pattern types: `json-value`, `markdown-heading`, `string-literal`, etc.
  - Add validation for unknown pattern types
  - **Acceptance Criteria**: All design patterns translate correctly to processor expectations

- [x] **Task 1.3: Add Config Validation**
  - Implement pre-processing validation of loaded config
  - Add clear error messages for invalid configurations
  - Validate pattern syntax and required fields
  - **Acceptance Criteria**: Invalid configs fail fast with helpful error messages

- [x] **Task 1.4: Maintain Hardcoded Fallback**
  - Keep existing hardcoded patterns as fallback during transition
  - Add logic to prefer config over hardcoded when available
  - Add deprecation warnings for hardcoded usage
  - **Acceptance Criteria**: System works with or without config file

## Phase 2: Core Logic - Dynamic File Processing

- [x] **Task 2.1: Replace Hardcoded File List**
  - Remove static `filesToProcess` array from converter
  - Implement `generateFileConfigs()` method to create file list from config
  - Map config rules to processor functions dynamically
  - **Acceptance Criteria**: File processing driven entirely by config rules

- [x] **Task 2.2: Implement Extension-to-Processor Mapping**
  - Create `getProcessorForExtension()` function
  - Map file extensions (.jsx, .html, .json, .md) to appropriate processors
  - Handle special cases (package.json, README.md, etc.)
  - **Acceptance Criteria**: All supported file types map to correct processors

- [x] **Task 2.3: Add Dynamic File Discovery**
  - Implement logic to find files based on config rules
  - Add file existence checking before processing
  - Handle multiple files per extension pattern
  - **Acceptance Criteria**: Files discovered dynamically, not hardcoded

- [x] **Task 2.4: Update Pattern Filtering Logic**
  - Modify pattern filtering to work with translated patterns
  - Ensure processors receive correctly formatted patterns
  - Test pattern matching across all processor types
  - **Acceptance Criteria**: All processors work with design-compliant patterns

## Phase 3: Processor Compatibility Updates

- [x] **Task 3.1: Update Markdown Processor**
  - Modify `processMarkdownFile()` to handle design pattern types
  - Add support for `markdown-heading` and `markdown-paragraph` patterns
  - Maintain backwards compatibility with existing selector-based patterns
  - **Acceptance Criteria**: Markdown processor accepts both design and implementation patterns

- [x] **Task 3.2: Standardize JSON Processor**
  - Update `processJSONFile()` to handle `json-value` pattern type
  - Ensure `path` property maps correctly to `selector`
  - Add validation for JSONPath expressions
  - **Acceptance Criteria**: JSON processor works with design pattern format

- [x] **Task 3.3: Update JSX Processor**
  - Ensure `string-literal` patterns work with design format
  - Validate `context` property handling (`jsx-text`, `jsx-attribute`)
  - Test CSS selector integration
  - **Acceptance Criteria**: JSX processor fully compatible with design patterns

- [x] **Task 3.4: Update HTML Processor**
  - Ensure `html-text` and `html-attribute` pattern types work
  - Validate selector and attribute property handling
  - Test DOM-based processing
  - **Acceptance Criteria**: HTML processor compatible with design patterns

## Phase 4: Quality Assurance & Testing

- [x] **Task 4.1: Add Config Loading Tests**
  - Create unit tests for config loading functionality
  - Test valid and invalid configuration scenarios
  - Validate error messages and fallback behavior
  - **Acceptance Criteria**: Config loading fully tested, edge cases covered

- [x] **Task 4.2: Add Pattern Translation Tests**
  - Create comprehensive tests for `translatePattern()` function
  - Test all design pattern types and edge cases
  - Validate translation accuracy and error handling
  - **Acceptance Criteria**: Pattern translation 100% reliable

- [x] **Task 4.3: Add Integration Tests**
  - Create end-to-end tests for config-driven conversion
  - Test complete workflow: init → config → convert
  - Validate results match hardcoded approach
  - **Acceptance Criteria**: Config-driven conversion works end-to-end

- [x] **Task 4.4: Performance Validation**
  - Benchmark config loading overhead
  - Measure pattern translation performance
  - Ensure < 50ms total overhead vs hardcoded approach
  - **Acceptance Criteria**: Performance requirements met, no regression

- [x] **Task 4.5: Comprehensive Quality Validation**
  - Test edge cases and error conditions thoroughly
  - Validate system robustness under various project structures
  - Test configuration file variations and validation
  - Perform security validation of config-driven patterns
  - **Acceptance Criteria**: System handles all edge cases gracefully, security validated

## Phase 5: Documentation & Migration

- [x] **Task 5.1: Update Reference Documentation**
  - Rewrite `docs/reference/templatization-patterns.md` to match design
  - Remove references to hardcoded implementation
  - Document all design pattern types and options
  - **Acceptance Criteria**: Documentation accurately reflects design specification

- [x] **Task 5.2: Create Configuration Guide**
  - Document how to create and customize .templatize.json config files
  - Provide comprehensive examples for all pattern types and file extensions
  - Explain benefits and capabilities of the configurable templatization system
  - Create getting-started guide for template authors
  - **Acceptance Criteria**: Complete guide for using config-driven templatization

- [x] **Task 5.3: Update Help Text and Examples**
  - Update `make-template convert --help` to mention config usage
  - Add examples showing config-driven customization
  - Update error messages to reference config file
  - **Acceptance Criteria**: User-facing text reflects new capabilities

- [x] **Task 5.4: Remove Hardcoded Fallback**
  - Once validation complete, remove hardcoded pattern fallback
  - Update error messages to require config file
  - Add final validation of config-driven-only operation
  - **Acceptance Criteria**: System fully config-driven, no hardcoded remnants

## Risk Mitigation Tasks

- [ ] **Task RM.1: Create Rollback Plan**
  - Document steps to revert to hardcoded approach if needed
  - Preserve backup of working hardcoded implementation
  - Test rollback procedure
  - **Acceptance Criteria**: Reliable rollback path available

- [ ] **Task RM.2: Incremental Validation**
  - Validate each phase before proceeding to next
  - Maintain working system throughout transition
  - Add feature flags for gradual rollout
  - **Acceptance Criteria**: Zero downtime during implementation

- [ ] **Task RM.3: Error Monitoring**
  - Add comprehensive error logging during transition
  - Monitor for config-related failures
  - Prepare incident response for configuration issues
  - **Acceptance Criteria**: All errors logged and actionable

## Success Validation

### Functional Validation
- [x] Config-driven conversion works end-to-end
- [x] All design pattern types supported
- [x] Dynamic file discovery functions correctly
- [x] Error handling is robust and user-friendly

### Quality Validation
- [x] All tests pass (existing + new)
- [x] Performance benchmarks maintained
- [x] Security validation passes
- [x] Code review completed

### Compatibility Validation
- [x] System works across different project types and structures
- [x] Configuration files are validated and provide clear error messages
- [x] Edge cases handled gracefully with appropriate user feedback
- [x] Security validation passes for all config-driven operations

## Sprint Completion Criteria

- **Functional**: Config-driven templatization works exactly as designed
- **Performance**: No degradation from current implementation
- **Quality**: Comprehensive test coverage, edge cases handled, security validated
- **Architecture**: Implementation matches design specification exactly
- **Robustness**: System handles error conditions gracefully and provides clear feedback

**Estimated Duration**: 8-11 days
**Priority**: CRITICAL - Architectural integrity must be restored
**Risk Level**: HIGH - Complex refactoring with potential breaking changes</content>
<parameter name="filePath">/Users/vijay/workspaces/ws-million-views/create/.kiro/specs/templatization-system-alignment/tasks.md