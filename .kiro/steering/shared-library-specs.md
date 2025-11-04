---
inclusion: always
---

# Shared Library Specifications

## Core Principle: Stable, Versioned Shared Interfaces

Shared libraries in monorepos must have stable, well-documented interfaces with explicit versioning and change management processes.

## Library Types

### Internal Shared Libraries
- **Utility Libraries**: Common functions, helpers, and utilities
- **Data Models**: Shared type definitions and data structures
- **Service Clients**: API clients for internal services
- **UI Libraries**: Reusable UI elements and patterns

### External Shared Libraries
- **Published Packages**: Libraries published to package registries
- **Service APIs**: Internal APIs consumed by multiple applications
- **Infrastructure Libraries**: Shared infrastructure and deployment tools

## Specification Structure

### Requirements Definition
- **Usage Context**: Define which applications/services will use the library
- **Functional Requirements**: Specify what the library must do
- **Performance Requirements**: Define performance expectations
- **Compatibility Requirements**: Specify supported environments and versions

### Interface Design
- **API Surface**: Define all public methods, properties, and types
- **Data Contracts**: Specify input/output formats and validation rules
- **Error Handling**: Define error types and handling patterns
- **Configuration Options**: Specify configuration parameters and defaults

### Versioning Strategy
- **Semantic Versioning**: Follow semver for API changes
- **Breaking Changes**: Require major version bumps
- **Deprecation Process**: Provide migration path for deprecated features
- **Support Timeline**: Define support periods for each version

## Development Guidelines

### Interface Stability
- **Backward Compatibility**: Maintain compatibility within major versions
- **Additive Changes**: Prefer adding new features over changing existing ones
- **Deprecation Warnings**: Warn users before removing features
- **Migration Guides**: Provide clear migration instructions

### Testing Strategy
- **Unit Tests**: Test library functionality in isolation
- **Integration Tests**: Test with consuming applications
- **Compatibility Tests**: Test across supported environments
- **Performance Tests**: Validate performance requirements

### Documentation Standards
- **API Documentation**: Complete API reference with examples
- **Usage Guides**: How-to guides for common use cases
- **Migration Guides**: Instructions for upgrading between versions
- **Troubleshooting**: Common issues and solutions

## Change Management

### Change Request Process
1. **Impact Assessment**: Evaluate impact on all consuming applications
2. **Compatibility Check**: Determine if change is breaking or additive
3. **Migration Planning**: Plan migration strategy if needed
4. **Approval Process**: Get approval from all affected teams

### Breaking Change Process
1. **Deprecation Phase**: Mark feature as deprecated with warnings
2. **Migration Period**: Provide migration tools and documentation
3. **Removal Phase**: Remove deprecated feature in next major version
4. **Support Period**: Provide extended support for critical migrations

## Quality Assurance

### Library Checklist
- [ ] Interface clearly defined and documented
- [ ] Versioning strategy established
- [ ] Backward compatibility maintained
- [ ] Comprehensive test coverage
- [ ] Performance requirements met
- [ ] Security requirements addressed

### Consumer Checklist
- [ ] Dependencies properly declared
- [ ] Version constraints specified
- [ ] Integration tests included
- [ ] Migration plans documented
- [ ] Breaking change monitoring

## Example Shared Library Spec

### Library: Authentication Library

**Requirements:**
- Support OAuth2, JWT, and API key authentication
- Handle token refresh automatically
- Provide user session management
- Support multiple identity providers

**Interface:**
```typescript
class AuthManager {
  async authenticate(credentials: Credentials): Promise<UserSession>
  async refreshToken(session: UserSession): Promise<UserSession>
  async validateToken(token: string): Promise<boolean>
  async logout(session: UserSession): Promise<void>
}
```

**Versioning:**
- v1.0.0: Initial OAuth2 support
- v1.1.0: Added JWT support (backward compatible)
- v2.0.0: Breaking change - new token format (migration required)

This approach ensures shared libraries remain stable and reliable across the monorepo ecosystem.