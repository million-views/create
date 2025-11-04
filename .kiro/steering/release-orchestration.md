---
inclusion: always
---

# Release Orchestration for Monorepos

## Core Principle: Atomic Multi-Package Releases

Monorepo releases must be orchestrated to ensure all dependent packages are released together with correct version coordination and rollback capabilities.

## Release Planning

### Dependency Graph Analysis
- **Build Dependency Tree**: Map all package relationships and dependencies
- **Identify Release Groups**: Group packages that must be released together
- **Version Coordination**: Plan version numbers ensuring compatibility

### Release Strategy Types
- **Independent Releases**: Packages with no dependents can release independently
- **Coordinated Releases**: Interdependent packages release together
- **Breaking Change Releases**: Major version bumps with migration coordination

## Release Process

### 1. Pre-Release Validation
- **Cross-Package Tests**: Run all integration tests across affected packages
- **Version Consistency**: Verify all package.json versions are correct
- **Changelog Review**: Ensure all changes are documented
- **Security Audit**: Run security checks on all packages

### 2. Release Execution
- **Build Order**: Release packages in dependency order (dependencies first)
- **Version Publishing**: Publish to registry with correct version numbers
- **Tag Creation**: Create git tags for the release point
- **Documentation Update**: Update release notes and changelogs

### 3. Post-Release Validation
- **Installation Tests**: Verify packages can be installed correctly
- **Integration Verification**: Test real-world usage scenarios
- **Monitoring Setup**: Ensure monitoring covers new releases
- **Rollback Readiness**: Prepare rollback procedures

## Version Management

### Semantic Versioning Strategy
- **Patch Releases (1.0.0 → 1.0.1)**: Bug fixes, no API changes
- **Minor Releases (1.0.0 → 1.1.0)**: New features, backward compatible
- **Major Releases (1.0.0 → 2.0.0)**: Breaking changes, migration required

### Monorepo Version Coordination
- **Shared Version Numbers**: Use consistent versions across related packages
- **Independent Versioning**: Allow independent versioning for isolated packages
- **Release Trains**: Coordinate releases on regular schedules

## Rollback Procedures

### Immediate Rollback (< 1 hour)
- **Registry Unpublishing**: Remove packages from registry if supported
- **Git Revert**: Revert to previous commit and re-release
- **Communication**: Notify users of temporary unavailability

### Extended Rollback (1-24 hours)
- **Patch Release**: Release fixed versions with incremented patch numbers
- **Hotfix Process**: Expedited release process for critical fixes
- **User Migration**: Provide migration guides for affected users

### Long-term Rollback (> 24 hours)
- **Major Version Rollback**: Deprecate broken version, release new major
- **Migration Support**: Provide tools and documentation for migration
- **Support Coordination**: Coordinate with users for complex migrations

## Quality Gates

### Release Readiness Checklist
- [ ] All cross-package tests passing
- [ ] Version numbers coordinated correctly
- [ ] Changelogs updated and accurate
- [ ] Security audit completed
- [ ] Rollback plan documented
- [ ] Stakeholder approval obtained

### Automated Validation
- **CI/CD Pipelines**: Automated testing and building for all packages
- **Dependency Checks**: Automated verification of dependency relationships
- **Version Validation**: Automated checking of version consistency
- **Security Scanning**: Automated security vulnerability detection

## Common Release Patterns

### Feature Release
1. Develop feature across multiple packages
2. Test integration across all affected packages
3. Update documentation
4. Release all packages together

### Hotfix Release
1. Identify critical bug
2. Develop fix in affected packages
3. Bypass normal testing for speed
4. Release with patch version bump
5. Communicate fix to users

### Breaking Change Release
1. Plan migration strategy
2. Update all dependent packages
3. Provide migration guides
4. Release with major version bump
5. Monitor adoption and support migration

This orchestration ensures reliable, coordinated releases across complex monorepo structures.