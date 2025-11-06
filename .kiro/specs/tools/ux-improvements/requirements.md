# UX Improvements Sprint 1: Schema Implementation

**Sprint:** Phase 1 (Week 1)
**Start Date:** 5 November 2025
**End Date:** 12 November 2025
**Goal:** Implement template.v1.json and selection.v1.json schemas, update CLIs with validation

---

## Sprint Objectives

Implement the new schema architecture that separates authoring concerns (template.json) from user selection concerns (selection.json), enabling the tri-gated flow (Deployment → Features → Capabilities) and hints catalog system.

### Success Criteria
- [ ] `template.v1.json` and `selection.v1.json` schemas implemented and validated
- [ ] `make-template` validates against new authoring schema
- [ ] `create-scaffold` loads template.json and produces selection.json
- [ ] Comprehensive test coverage for validation logic

---

## Requirements

### Functional Requirements

**REQ-1: Schema Implementation**
- THE system SHALL implement `template.v1.json` schema for template authoring
- THE system SHALL implement `selection.v1.json` schema for user selections
- THE schemas SHALL validate using JSON Schema Draft 2020-12
- THE schemas SHALL be versioned and backward compatible

**REQ-2: Template Authoring Schema (template.json)**
- THE schema SHALL include header fields (schemaVersion, id, name, description, tags, author, license)
- THE schema SHALL include setup.policy (strict|lenient validation behavior)
- THE schema SHALL include dimensions with deployment_target, features, database, storage, auth_providers, payments, analytics
- THE schema SHALL include gates for platform capability constraints
- THE schema SHALL include featureSpecs with label, description, needs declarations
- THE schema SHALL include hints.features catalog (advisory, not enforced)
- THE schema SHALL include constants for fixed template attributes
- THE schema SHALL support scaffold steps (copy, render, json-edit, shell)

**REQ-3: Selection Schema (selection.json)**
- THE schema SHALL include templateId and version references
- THE schema SHALL include user choices for all dimensions
- THE schema SHALL include derived flags (needAuth, needDb, needPayments, needStorage)
- THE schema SHALL include project metadata (name, packageManager)

**REQ-4: make-template CLI Updates**
- THE CLI SHALL validate template.json against template.v1.json schema
- THE CLI SHALL expose hints.features for authoring autocomplete
- THE CLI SHALL generate skeleton template.json with proper structure
- THE CLI SHALL lint for undefined features and schema violations
- THE CLI SHALL ensure gates cover all deployment values

**REQ-5: create-scaffold CLI Updates**
- THE CLI SHALL load and validate template.json files
- THE CLI SHALL enforce gates and feature needs at selection time
- THE CLI SHALL generate selection.json from user choices
- THE CLI SHALL emit warnings for undefined selected features
- THE CLI SHALL provide clear, actionable error messages

**REQ-6: Validation Logic**
- THE system SHALL implement domain validation (values exist in dimension)
- THE system SHALL implement compat validation (platform gates respected)
- THE system SHALL implement needs validation (feature requirements satisfied)
- THE system SHALL support strict vs lenient policy modes
- THE system SHALL provide detailed error messages with violation context

### Non-Functional Requirements

**PERF-1: Performance**
- Schema validation SHALL complete in <100ms for typical templates
- CLI startup time SHALL not regress by >10%
- Memory usage SHALL remain under 50MB for CLI operations

**QUAL-1: Quality**
- Test coverage SHALL be >95% for new validation code
- All existing tests SHALL continue to pass
- No security vulnerabilities introduced (audit required)

---

## User Stories

**As a template author,** I want to publish templates with clear capability requirements so that users get valid, working applications.

**As a CLI user,** I want clear error messages when my selections violate template constraints so that I can fix issues quickly.

**As a developer,** I want the CLI to validate my choices before scaffolding so that I don't waste time on invalid configurations.

**As a template maintainer,** I want schema validation during authoring so that I catch issues before publishing.

---

## Acceptance Criteria

### Schema Implementation
- [ ] `schema/template.v1.json` exists and validates sample templates
- [ ] `schema/selection.v1.json` exists and validates sample selections
- [ ] Schemas include comprehensive examples and documentation
- [ ] Schema versioning strategy documented

### make-template Updates
- [ ] `make-template lint` validates against template.v1.json
- [ ] `make-template init` generates valid skeleton template.json
- [ ] Hints catalog exposed in authoring UI/autocomplete
- [ ] Clear error messages for schema violations

### create-scaffold Updates
- [ ] Loads and validates template.json files
- [ ] Enforces gates (platform constraints)
- [ ] Enforces needs (feature requirements)
- [ ] Generates valid selection.json output

### Testing & Quality
- [ ] Unit tests for all validation logic
- [ ] Integration tests for CLI workflows
- [ ] Performance benchmarks meet requirements
- [ ] Security audit completed

---

## Dependencies

### External Dependencies
- JSON Schema Draft 2020-12 validation library
- Existing CLI architecture (create-scaffold, make-template)
- Current template schema (for migration testing)

### Internal Dependencies
- Node.js 22+ ESM support
- Testing framework (existing)
- CI/CD pipeline for validation

---

## Risks & Mitigations

### Technical Risks
- **Schema complexity:** Start with working examples, iterate based on real usage
- **Validation performance:** Profile and optimize validation logic

### Timeline Risks
- **Unexpected complexity:** 20% buffer time allocated
- **Learning curve:** Pair programming for complex schema logic

### Quality Risks
- **Validation gaps:** Code review requirement for all validation logic
- **Error message quality:** User testing of error messages before completion