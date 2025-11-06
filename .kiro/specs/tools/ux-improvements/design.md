# UX Improvements Sprint 1: Schema Implementation - Design

**Sprint:** Phase 1 (Week 1)
**Focus:** Technical design for schema separation and validation architecture

---

## Architecture Overview

### Schema Separation Strategy

The new architecture separates authoring concerns from selection concerns through two distinct schemas:

```
template.v1.json (Authoring Schema)
├── Header metadata (id, name, description, etc.)
├── Setup configuration (policy, constants)
├── Dimensions (deployment_target, features, database, etc.)
├── Gates (platform capability constraints)
├── Feature specifications (needs, descriptions)
├── Hints catalog (advisory features)
└── Scaffold steps (copy, render, json-edit, shell)

selection.v1.json (Selection Schema)
├── Template reference (id, version)
├── User choices (all dimension selections)
├── Derived flags (needAuth, needDb, etc.)
└── Project metadata (name, packageManager)
```

### Validation Architecture

Three-tier validation system:

1. **Schema Validation** (JSON Schema Draft 2020-12)
   - Structural validation of JSON documents
   - Type checking and format validation
   - Required field enforcement

2. **Domain Validation** (Business Logic)
   - Values exist in declared dimensions
   - Feature references are valid
   - Platform constraints respected

3. **Compatibility Validation** (Cross-Reference)
   - Gates enforced against selections
   - Feature needs satisfied
   - Platform capabilities verified

---

## Design Decisions

### Schema Versioning Strategy

**Decision:** Adopt semantic versioning for schemas with backward compatibility guarantees

**Rationale:**
- Template authors need stability and predictability
- CLI users need consistent behavior across versions
- Enables gradual migration and deprecation warnings

**Implementation:**
- `schemaVersion: "1.0.0"` field in all schemas
- Major version changes require migration
- Minor versions add optional fields
- Patch versions fix validation bugs

### Validation Policy Modes

**Decision:** Support strict vs lenient validation policies

**Rationale:**
- Template authors need flexibility during development
- Production templates require strict validation
- Enables progressive hardening of templates

**Implementation:**
```json
{
  "setup": {
    "policy": "strict" | "lenient"
  }
}
```

- **Strict:** All validations enforced, warnings become errors
- **Lenient:** Best-effort validation, warnings logged but not fatal

### Hints Catalog Design

**Decision:** Implement hints as advisory-only feature catalog

**Rationale:**
- Avoids global restrictions on template authors
- Provides DX benefits without enforcement overhead
- Enables autocomplete and suggestions in authoring tools

**Implementation:**
```json
{
  "hints": {
    "features": {
      "auth": {
        "label": "Authentication",
        "description": "User authentication and authorization",
        "tags": ["security", "users"]
      }
    }
  }
}
```

### Gates vs Dimensions

**Decision:** Separate capability constraints (gates) from user choices (dimensions)

**Rationale:**
- Gates represent platform limitations (enforced)
- Dimensions represent user preferences (flexible)
- Clear separation of concerns for validation logic

**Implementation:**
- Gates: Platform capability constraints (e.g., "vercel doesn't support websockets")
- Dimensions: User-selectable options (e.g., "choose database: postgres, mysql, sqlite")

---

## Component Design

### Template Validation Engine

**Location:** `lib/validation/template-validator.mjs`

**Responsibilities:**
- Load and validate template.v1.json schemas
- Perform schema validation using JSON Schema library
- Execute domain validation (dimension values, feature references)
- Apply policy-based validation (strict vs lenient)

**Interface:**
```javascript
class TemplateValidator {
  async validate(templateJson, policy = 'strict') {
    // Returns { valid: boolean, errors: [], warnings: [] }
  }
}
```

### Selection Validation Engine

**Location:** `lib/validation/selection-validator.mjs`

**Responsibilities:**
- Validate selection.json against selection.v1.json schema
- Cross-reference with template.json for compatibility
- Enforce gates and feature needs
- Generate derived flags (needAuth, needDb, etc.)

**Interface:**
```javascript
class SelectionValidator {
  async validate(selectionJson, templateJson) {
    // Returns { valid: boolean, errors: [], warnings: [] }
  }
}
```

### CLI Integration Points

**make-template CLI Updates:**
- `bin/make-template.mjs` → Add `--lint` command
- Integrate TemplateValidator for authoring validation
- Expose hints catalog for autocomplete/suggestions
- Generate skeleton template.json with proper structure

**create-scaffold CLI Updates:**
- `bin/create-scaffold.mjs` → Add template validation
- Integrate SelectionValidator for user choices
- Generate selection.json output
- Provide clear error messages for violations

---

## Data Flow Diagrams

### Template Authoring Flow
```
Author → make-template init → skeleton template.json
       ↓
Author → make-template lint → TemplateValidator → validation results
       ↓
Author → hints catalog → autocomplete suggestions
```

### Template Selection Flow
```
User → create-scaffold → load template.json
       ↓
TemplateValidator → validate template
       ↓
User selections → SelectionValidator → validate choices
       ↓
Generate selection.json → scaffold execution
```

### Validation Pipeline
```
Input Document → Schema Validation → Domain Validation → Compatibility Validation → Result
                      ↓                        ↓                        ↓
                JSON Schema            Business Rules            Cross-References
                Draft 2020-12          (dimensions, features)     (gates, needs)
```

---

## Error Handling Strategy

### Error Classification

**Schema Errors:** Invalid JSON structure, missing required fields, type mismatches
- **Severity:** Critical (blocks processing)
- **Response:** Clear, actionable error messages with field paths

**Domain Errors:** Invalid dimension values, undefined features, constraint violations
- **Severity:** High (blocks valid execution)
- **Response:** Contextual error messages with suggestions

**Compatibility Errors:** Gate violations, unsatisfied needs, platform conflicts
- **Severity:** Medium (blocks deployment but may scaffold)
- **Response:** Warnings with mitigation suggestions

### Error Message Format

**Standard Format:**
```
[LEVEL] [CATEGORY] [FIELD]: Message
Suggestion: Actionable guidance
Context: Additional information
```

**Examples:**
```
ERROR SCHEMA name: Required field 'name' is missing
Suggestion: Add "name": "My Template" to the template header

WARN COMPAT deployment_target: Vercel deployment selected but template requires websockets
Suggestion: Choose 'netlify' or 'railway' deployment target instead
Context: Template gates prohibit websockets on Vercel platform
```

---

## Testing Strategy

### Unit Testing
- Schema validation edge cases
- Domain validation logic
- Error message generation
- Policy mode behavior

### Integration Testing
- CLI command workflows
- Template loading and validation
- Selection generation and validation
- Backward compatibility scenarios

### Performance Testing
- Schema validation timing (<100ms target)
- Memory usage profiling
- Large template handling

---

## Migration Strategy

### Backward Compatibility
- Existing template.json files continue to work
- Automatic schema version detection
- Graceful degradation for missing fields

### Migration Path
1. **Phase 1:** Implement new schemas alongside existing
2. **Phase 2:** Add migration warnings for old schemas
3. **Phase 3:** Deprecation notices and migration guides
4. **Phase 4:** Remove old schema support (future release)

### Migration Tools
- `migrate-template.mjs` script for automatic conversion
- Validation reports showing required changes
- Documentation for manual migration steps

---

## Security Considerations

### Input Validation
- JSON Schema prevents malicious payload injection
- Path traversal protection in file operations
- Command injection prevention in shell steps

### Schema Security
- No executable code in schemas (pure data structures)
- Input sanitization for user-provided values
- Principle of least privilege for validation operations

---

## Performance Considerations

### Validation Optimization
- Schema compilation caching
- Lazy validation for large templates
- Parallel validation for multiple files

### Memory Management
- Streaming validation for large JSON files
- Garbage collection monitoring
- Memory leak prevention in validation loops

---

## Monitoring & Observability

### Validation Metrics
- Validation success/failure rates
- Error type distribution
- Performance timing histograms

### Logging Strategy
- Structured logging for validation events
- Error correlation IDs for debugging
- Audit trail for security events