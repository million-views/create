# Tasks: make-template V1 Implementation - Phase 1

## Phase 1: Schema Implementation & Core Infrastructure (Weeks 1-2)

### Week 1: Schema Alignment

#### 1.1 Schema File Updates
- [x] **Update template.v1.json schema** - Ensure gates, hints, featureSpecs, and constants sections match architecture memos
- [x] **Update selection.v1.json schema** - Align with user selection workflow requirements
- [x] **Validate schema compliance** - Ensure all schemas pass JSON Schema Draft 2020-12 validation
- [x] **Add schema documentation** - Document all fields, constraints, and usage patterns

#### 1.2 Template Generation Enhancement
- [x] **Modify generateSkeletonTemplate()** - Update to generate V1-compliant skeleton with all required sections
- [x] **Add constants section** - Include language, framework, styling, CI, and other fixed attributes
- [x] **Implement gates structure** - Add platform compatibility constraints for deployment targets
- [x] **Include hints catalog** - Add advisory feature definitions for UI seeding
- [x] **Add featureSpecs section** - Include detailed feature specifications with needs declarations

#### 1.3 Core Validation Infrastructure
- [x] **Extend TemplateValidator** - Add V1 schema support and version detection
- [x] **Implement gates validation logic** - Platform constraint enforcement (Cloudflare Workers, Linode, etc.)
- [x] **Add featureSpecs validation** - Validate feature requirements and compatibility
- [x] **Support constants vs dimensions separation** - Ensure proper distinction in validation

### Week 2: Core Infrastructure

#### 2.1 CLI Integration
- [x] **Update --init command** - Use enhanced generateSkeletonTemplate() for V1 compliance
- [x] **Add version detection** - Support both legacy and V1 schema versions
- [x] **Enhance --lint command** - V1-specific validation checks and error messages
- [x] **Update CLI help text** - Document new V1 features and schema requirements

#### 2.2 Testing & Validation
- [x] **Create V1 template test fixtures** - Valid and invalid V1 template examples
- [x] **Add TemplateValidator V1 tests** - Comprehensive test coverage for new validation logic
- [x] **Test gates enforcement** - Verify platform constraints are properly validated
- [x] **Test featureSpecs validation** - Ensure needs declarations work correctly
- [x] **Integration testing** - End-to-end testing with create-scaffold compatibility

#### 2.3 Documentation Updates
- [x] **Update README** - Document V1 schema features and authoring workflow
- [x] **Update CLI documentation** - New command options and V1-specific features
- [x] **Add schema field documentation** - Detailed explanations of all V1 schema fields

### Success Criteria Verification
- [x] Generated templates pass V1 schema validation
- [x] Basic gates system functional with platform constraints
- [x] Hints catalog included in generated skeletons
- [x] Hints display system implemented in guided workflow
- [x] Core validation working correctly for all V1 features
- [x] All tests passing with good coverage
- [x] Documentation updated and accurate

### Risk Mitigation Tasks
- [ ] **Incremental implementation** - Test each schema component individually before integration
- [ ] **Comprehensive validation** - Extensive testing at each step with edge cases
- [ ] **Clear specifications** - Well-defined requirements from architecture memos

## Dependencies
- Architecture memos (memo-01.md, memo-02.md) for schema specifications
- Existing TemplateValidator infrastructure
- Current make-template CLI structure
- JSON Schema validation libraries

## Next Phase Preparation
- [x] **Phase 2 planning** - CLI enhancement and advanced features (Weeks 3-4)
- [ ] **Stakeholder coordination** - Align with create-scaffold team on integration requirements
- [ ] **Testing environment setup** - Prepare for more comprehensive integration testing

## Phase 2: CLI Enhancement & Advanced Features (Weeks 3-4)

### Objectives
- Provide advanced CLI tools for template authoring
- Implement sophisticated validation and management features
- Enable full template ecosystem participation

### Week 3: New CLI Commands

#### 2.1 New CLI Commands Implementation
- [x] **`add-dimension` command** - Add configurable dimensions to existing templates
- [x] **`set-compat` command** - Define platform compatibility gates for deployment targets
- [x] **`set-needs` command** - Configure feature requirements and dependencies
- [x] **`preview` command** - Render UI preview based on hints catalog
- [x] **Command argument parsing** - Add new CLI options and validation
- [x] **Command help documentation** - Update help text for new commands

#### 2.2 Enhanced Validation Features
- [x] **Gates enforcement validation** - Validate deployment target compatibility at runtime
- [x] **Feature needs checking** - Ensure feature requirements are met before enabling
- [x] **Cross-dimension validation** - Verify dimension combinations are compatible
- [x] **Hints validation** - Ensure hints align with featureSpecs definitions
- [x] **Advanced error reporting** - Detailed validation messages with suggestions

#### 2.3 Template Management Tools
- [x] **Bulk operations support** - Manage multiple dimensions/features at once
- [ ] **Template diffing** - Compare template versions and changes (defer - git handles this well)
- [ ] **Intelligent validation reporting** - Schema-aware error analysis with fix suggestions

##### Bulk Operations Implementation Plan
- [x] **Design bulk command interface** - Define CLI patterns for batch operations
- [x] **Implement bulk-add-dimension** - Add multiple dimensions in one command
- [x] **Implement bulk-set-compat** - Set compatibility gates for multiple deployment targets
- [x] **Implement bulk-set-needs** - Configure feature dependencies in batch
- [x] **Add validation for bulk operations** - Ensure batch operations are safe
- [x] **Update help documentation** - Document new bulk command syntax

### Week 4: Integration & Ecosystem Features

#### 2.4 Ecosystem Participation
- [ ] **Template marketplace integration** - Compatibility with template registries
- [ ] **UI integration support** - Hints catalog consumption by authoring UIs
- [ ] **Cross-template validation** - Validate templates against ecosystem standards
- [ ] **Template sharing features** - Export/import templates with metadata

#### 2.5 Advanced Features
- [ ] **Template composition** - Combine multiple templates into complex projects
- [ ] **Conditional logic** - Support for conditional feature/dimension enabling
- [ ] **Template inheritance** - Base templates with customization layers

#### 2.6 Testing & Documentation
- [ ] **CLI command tests** - Comprehensive testing for all new commands
- [ ] **Integration tests** - End-to-end workflow testing with create-scaffold
- [ ] **User documentation** - CLI usage guides and examples
- [ ] **API documentation** - Programmatic usage documentation

### Phase 2 Success Criteria
- [x] All required CLI commands implemented and tested
- [x] Advanced validation catches architectural violations
- [ ] Template migration tools functional
- [ ] CLI provides clear feedback for all operations
- [ ] Integration with create-scaffold team successful
- [ ] Template authoring workflow significantly improved
