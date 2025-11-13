---
inclusion: always
---

# Steering Document Hierarchy

## Core Principle: Contextual Guidance for Different Scopes

Monorepo environments require different levels of guidance depending on whether standards apply universally across all packages or are specific to particular package types.

## Hierarchy Levels

### Level 1: Universal Standards (All Packages)
**Scope**: Applies to every package in the monorepo without exception
**Documents**:
- `greenfield-development.md` - Development philosophy
- `nodejs-runtime-focus.md` - Core Node.js runtime requirements
- `workspace-safety.md` - File operation safety
- `security-guidelines.md` - Security requirements
- `multi-level-validation.md` - Validation framework
- `diataxis-documentation.md` - Documentation framework
- `templates/` - Documentation templates (content-guidelines.md, explanation-template.md, etc.)

**Enforcement**: Mandatory for all packages, no exceptions allowed

### Level 2: Package-Type Standards (Package Categories)
**Scope**: Applies to packages of specific types (CLI, web, service, library)
**Documents**:
- `cli-development-focus.md` - CLI-specific patterns
- `web-development-focus.md` - Web application patterns (future)
- `service-development-focus.md` - Service/API patterns (future)
- `library-development-focus.md` - Library/API design patterns (future)

**Enforcement**: Mandatory for packages matching the type, optional otherwise

### Level 3: Package-Specific Standards (Individual Packages)
**Scope**: Custom standards for specific packages with unique requirements
**Location**: `.kiro/steering/packages/{package-name}/`
**Examples**:
- `.kiro/steering/packages/auth-service/security.md`
- `.kiro/steering/packages/frontend-app/ui.md`
- `.kiro/steering/packages/shared-lib/api.md`

**Enforcement**: Mandatory only for the specific package

### Level 4: Project-Specific Standards (Entire Monorepo)
**Scope**: Standards specific to this monorepo's architecture and business domain
**Documents**:
- `monorepo-coordination.md` - Cross-package coordination
- `release-orchestration.md` - Release management
- `shared-library-specs.md` - Shared library management
- `sprint-orchestration.md` - Sprint planning

**Enforcement**: Mandatory for all monorepo activities

## Document Organization

### Steering Directory Structure
```text
.kiro/steering/
├── universal/           # Level 1: Universal standards
│   ├── greenfield-development.md
│   ├── nodejs-runtime-focus.md
│   ├── workspace-safety.md
│   ├── security-guidelines.md
│   └── multi-level-validation.md
├── package-types/       # Level 2: Package-type standards
│   ├── cli-development-focus.md
│   ├── web-development-focus.md
│   └── service-development-focus.md
├── packages/            # Level 3: Package-specific standards
│   ├── auth-service/
│   ├── frontend-app/
│   └── shared-lib/
└── project/             # Level 4: Project-specific standards
    ├── monorepo-coordination.md
    ├── release-orchestration.md
    ├── shared-library-specs.md
    └── sprint-orchestration.md
```

## Implementation Guidelines

### When to Create Package-Specific Standards
- **Unique Architecture**: Package has architectural patterns not covered by universal standards
- **Domain Constraints**: Package operates in a specialized business domain
- **Regulatory Requirements**: Package must comply with specific regulations
- **Performance Requirements**: Package has unique performance or scalability needs

### Standard Prioritization
1. **Package-Specific** standards take precedence over universal standards
2. **Package-Type** standards take precedence over universal standards
3. **Universal** standards apply when no more specific standard exists
4. **Project** standards coordinate across all levels

### Standard Evolution
- **Universal Standards**: Changed rarely, require broad consensus
- **Package-Type Standards**: Updated when new package types are added
- **Package-Specific Standards**: Evolve with package requirements
- **Project Standards**: Updated as monorepo architecture evolves

## Quality Assurance

### Standard Compliance Checklist
- [ ] Universal standards applied to all packages
- [ ] Package-type standards applied to matching packages
- [ ] Package-specific standards documented and followed
- [ ] Project standards understood by all teams
- [ ] Conflicts between standards resolved appropriately

### Standard Review Process
- **Regular Audits**: Quarterly review of standard compliance
- **Evolution Planning**: Annual review of standard relevance
- **New Package Assessment**: Standards review for new package types
- **Conflict Resolution**: Clear process for resolving standard conflicts

## Tooling Support

### Validation Scripts
- **Universal Compliance**: Automated checking of universal standards
- **Package-Type Validation**: Automated assignment of package-type standards
- **Conflict Detection**: Automated detection of standard conflicts
- **Compliance Reporting**: Automated compliance status reporting

### Documentation Integration
- **Standard References**: Automated linking between standards and specs
- **Compliance Tracking**: Integration with task tracking for standard compliance
- **Review Reminders**: Automated reminders for standard reviews

This hierarchical structure ensures appropriate levels of guidance while maintaining flexibility for package-specific needs.