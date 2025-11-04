---
inclusion: always
---

# Monorepo Coordination Guidelines

## Core Principle: Coordinated Multi-Package Development

In monorepo environments, features often span multiple packages with complex interdependencies. All packages must be developed coordinately with explicit dependency mapping and shared library management.

## Spec Organization for Monorepos

### Hierarchical Spec Structure
```
.kiro/specs/
├── apps/
│   ├── frontend-app/
│   │   ├── user-auth-feature/
│   │   │   ├── requirements.md
│   │   │   ├── design.md
│   │   │   └── tasks.md
│   │   └── payment-feature/
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   └── backend-api/
│       ├── user-management/
│       └── payment-processing/
├── libs/
│   ├── shared-auth-lib/
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   └── shared-db-lib/
├── services/
│   ├── auth-service/
│   └── payment-service/
└── tools/
    ├── deployment-tool/
    └── monitoring-tool/
```

### Cross-Component References
- **Dependency Declaration**: Each spec must declare package dependencies in requirements.md
- **Interface Contracts**: Shared libs must define stable interfaces in design.md
- **Integration Tasks**: Tasks that span packages must be clearly marked and coordinated

## Development Workflow

### 1. Dependency Analysis
- **Identify Impact**: Determine which packages are affected by the change
- **Version Planning**: Plan version bumps for shared libs
- **Breaking Change Assessment**: Evaluate if changes break existing contracts

### 2. Coordinated Implementation
- **Parallel Development**: Develop independent packages in parallel
- **Integration Points**: Define clear integration tasks with prerequisites
- **Testing Coordination**: Ensure cross-package tests are included

### 3. Release Orchestration
- **Version Alignment**: Coordinate version numbers across dependent packages
- **Release Order**: Determine correct package release sequence
- **Rollback Planning**: Plan rollback strategies for multi-package failures

## Shared Library Management

### Interface Stability
- **Semantic Versioning**: Use semver for shared lib APIs
- **Breaking Change Process**: Require explicit approval for breaking changes
- **Deprecation Warnings**: Provide migration guidance for deprecated features
- **Support Timeline**: Define support periods for each version

### Testing Strategy
- **Unit Tests**: Test individual packages in isolation
- **Integration Tests**: Test cross-package interactions
- **End-to-End Tests**: Validate complete application flows

## Quality Assurance

### Coordination Checklist
- [ ] All affected packages identified in requirements
- [ ] Cross-package dependencies explicitly declared
- [ ] Interface contracts defined and stable
- [ ] Integration tasks clearly marked
- [ ] Version coordination planned
- [ ] Rollback strategy documented

### Common Pitfalls
- ❌ Changing shared lib without updating dependents
- ❌ Breaking API contracts without coordination
- ❌ Releasing packages out of dependency order
- ❌ Missing cross-package integration tests

## Implementation Guidelines

### Task Structure for Multi-Package Features
```markdown
- [ ] 1. Update shared-auth-lib API
  - Add new authentication method to interface
  - Update version to 2.1.0
  - _Requirements: 1.1, 1.2, 2.1_
  - _Packages: shared-auth-lib_

- [ ] 2. Update frontend-app integration
  - Implement new auth method usage
  - Update dependency references
  - _Requirements: 1.1, 1.2, 2.1_
  - _Packages: frontend-app_
  - _Depends on: Task 1_

- [ ] 3. Update backend-api integration
  - Implement server-side auth validation
  - Update dependency references
  - _Requirements: 1.1, 1.2, 2.1_
  - _Packages: backend-api_
  - _Depends on: Task 1_
```

This ensures coordinated development across the monorepo while maintaining clear dependencies and integration points.