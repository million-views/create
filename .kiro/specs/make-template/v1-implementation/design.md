# Design: make-template V1 Implementation

## Architecture Overview

### Dual Schema System
Following the architectural vision from systems architecture group memos:

**template.v1.json (Authoring Schema)**:
- Defines what template authors can configure
- Includes gates, hints, featureSpecs, constants, and dimensions
- Used by make-template CLI for validation and generation

**selection.v1.json (User Selection Schema)**:
- Captures final user choices from template dimensions
- Contains resolved configuration for scaffolding
- Consumed by create-scaffold for project generation

### Tri-Gated Capability Flow
```text
Deployment → Features → Capabilities
    ↓         ↓         ↓
Platform  Needs    Choices
Gating   Validation Selection
```

## Schema Design

### template.v1.json Structure
```json
{
  "schemaVersion": "1.0.0",
  "id": "author/template-name",
  "name": "Template Name",
  "description": "Template description",
  "constants": {
    "language": "typescript",
    "framework": "nextjs",
    "styling": "tailwind"
  },
  "dimensions": {
    "deployment_target": { "values": ["vercel", "netlify"] },
    "features": { "values": ["auth", "database"] }
  },
  "gates": {
    "cloudflare-workers": {
      "platform": "edge",
      "constraint": "Limited runtime capabilities",
      "allowed": { "database": ["d1", "tursodb", "none"] }
    }
  },
  "featureSpecs": {
    "auth": {
      "label": "Authentication",
      "description": "User authentication system",
      "needs": { "database": "required" }
    }
  },
  "hints": {
    "features": {
      "auth": {
        "label": "Authentication",
        "description": "Add secure user authentication...",
        "category": "authentication"
      }
    }
  }
}
```

### selection.v1.json Structure
```json
{
  "templateId": "author/template-name",
  "version": "1.0.0",
  "selections": {
    "deployment_target": "vercel",
    "features": ["auth", "database"],
    "database": "postgresql"
  },
  "metadata": {
    "generatedAt": "2025-11-08T...",
    "templateVersion": "1.0.0"
  }
}
```

## Component Design

### TemplateValidator Extensions
- **Schema Validation**: JSON Schema Draft 2020-12 validation
- **Gates Validation**: Platform constraint enforcement
- **FeatureSpecs Validation**: Needs declaration checking
- **Cross-Dimension Validation**: Dimension combination compatibility

### CLI Enhancements
- **--init Command**: Generate V1-compliant skeleton with all required sections
- **Version Detection**: Support both legacy and V1 schema versions
- **Validation Commands**: Enhanced --lint with V1-specific checks

### Gates System Implementation
Platform-specific constraints:
- **Cloudflare Workers**: `database = [d1, tursodb, none]`, `storage = [r2, none]`
- **Linode/Droplet**: `database = [sqlite3, tursodb, none]`, `storage = [file, s3, none]`
- **Deno Deploy**: `database = [sqlite3, tursodb, none]`, `storage = [none]`

### FeatureSpecs with Needs
Declarative feature requirements:
```json
"featureSpecs": {
  "auth": {
    "needs": {
      "database": "required",
      "auth": "none",
      "storage": "optional"
    }
  }
}
```

## Implementation Strategy

### Phase 1 Focus Areas
1. **Schema Definition**: Complete template.v1.json and selection.v1.json
2. **Template Generation**: Update --init to generate V1 skeletons
3. **Core Validation**: Implement gates and featureSpecs validation
4. **Testing**: Comprehensive test coverage for new functionality

### Backward Compatibility
- Version detection based on schemaVersion field
- Legacy templates continue to work with existing validation
- V1 features only apply to V1 templates

### Error Handling
- Clear validation error messages with specific field references
- Warnings for deprecated patterns
- Structured error objects for programmatic handling

## Integration Points

### create-scaffold Integration
- TemplateValidator used by both make-template and create-scaffold
- Shared schema definitions
- Consistent validation behavior

### UI Integration
- Hints catalog consumed by template authoring UIs
- Feature suggestions based on hints
- Platform constraint visualization

## Testing Strategy

### Unit Tests
- Schema validation edge cases
- Gates logic correctness
- FeatureSpecs needs validation
- Template generation accuracy

### Integration Tests
- End-to-end template authoring workflow
- create-scaffold compatibility
- Cross-platform validation

### Performance Tests
- Large template validation performance
- Memory usage with complex schemas
- Concurrent validation handling
