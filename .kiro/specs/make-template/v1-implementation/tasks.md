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
- [x] **Create migration guide** - Help existing template authors migrate to V1
- [x] **Update CLI documentation** - New command options and V1-specific features
- [x] **Add schema field documentation** - Detailed explanations of all V1 schema fields

### Success Criteria Verification
- [x] Generated templates pass V1 schema validation
- [x] Basic gates system functional with platform constraints
- [x] Hints catalog included in generated skeletons
- [x] Core validation working correctly for all V1 features
- [x] All tests passing with good coverage
- [x] Documentation updated and accurate

### Risk Mitigation Tasks
- [ ] **Incremental implementation** - Test each schema component individually before integration
- [ ] **Comprehensive validation** - Extensive testing at each step with edge cases
- [ ] **Clear specifications** - Well-defined requirements from architecture memos
- [ ] **Backward compatibility** - Ensure existing functionality remains unaffected

## Dependencies
- Architecture memos (memo-01.md, memo-02.md) for schema specifications
- Existing TemplateValidator infrastructure
- Current make-template CLI structure
- JSON Schema validation libraries

## Next Phase Preparation
- [ ] **Phase 2 planning** - CLI enhancement and advanced features (Weeks 3-4)
- [ ] **Stakeholder coordination** - Align with create-scaffold team on integration requirements
- [ ] **Testing environment setup** - Prepare for more comprehensive integration testing</content>
<parameter name="filePath">/Users/vijay/workspaces/ws-million-views/create/.kiro/specs/make-template/v1-implementation/tasks.md