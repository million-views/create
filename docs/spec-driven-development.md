---
title: "Spec-Driven Development Workflow"
description: "Complete guide to the 3-phase spec-driven development process used in the Kiro Methodology"
type: "explanation"
audience: "advanced"
estimated_time: "15 minutes read"
prerequisites:
  - "Software development experience"
  - "Understanding of requirements engineering"
---

# Spec-Driven Development Workflow

Complete guide to the specification-driven development methodology.

## Overview

This project follows a rigorous spec-driven development approach where **features are designed through a structured three-phase process: Requirements → Design → Implementation**. This methodology ensures features are well-planned, thoroughly documented, and meet user needs before any code is written.

**Note**: Not all work requires full 3-phase specifications. See `AGENTS.md` Task Type Recognition for guidance on when to use different approaches for migrations, chores, and infrastructure work.

## When to Use 3-Phase Specs

Use the full 3-phase specification process for:
- New user-facing features
- API changes affecting external consumers
- Complex business logic changes
- UI/UX modifications
- Any work with unclear requirements or high risk

## Alternative Approaches

For other types of work:
- **Migrations/Integrations**: Use lightweight planning with clear success criteria and rollback plans
- **Chores/Maintenance**: Use task-based tracking with acceptance criteria
- **Infrastructure**: Use infrastructure-as-code principles with change management
- **Exploratory**: Skip formal specs, use rapid prototyping

## The Three-Phase Process

### Phase 1: Requirements Specification

**Purpose**: Transform rough feature ideas into precise, testable requirements using industry standards.

**Process**:
1. **EARS Pattern Compliance**: Every requirement follows one of six EARS (Easy Approach to Requirements Syntax) patterns:
   - Ubiquitous: `THE <system> SHALL <response>`
   - Event-driven: `WHEN <trigger>, THE <system> SHALL <response>`
   - State-driven: `WHILE <condition>, THE <system> SHALL <response>`
   - Unwanted event: `IF <condition>, THEN THE <system> SHALL <response>`
   - Optional feature: `WHERE <option>, THE <system> SHALL <response>`
   - Complex: `[WHERE] [WHILE] [WHEN/IF] THE <system> SHALL <response>`

2. **INCOSE Quality Rules**: All requirements must be:
   - Active voice (who does what)
   - Free of vague terms ("quickly", "adequate")
   - Free of escape clauses ("where possible")
   - Positive statements (no "SHALL not...")
   - One thought per requirement
   - Explicit and measurable
   - Solution-free (focus on what, not how)

3. **User Story Structure**: Each requirement includes:
   - User story: "As a [role], I want [feature], so that [benefit]"
   - 2-5 acceptance criteria as EARS-compliant requirements

**Example Requirements Document Structure**:
```markdown
# Requirements Document

## Introduction
[Summary of the feature/system]

## Glossary
- **System_Name**: [Definition]
- **Technical_Term**: [Definition]

## Requirements

### Requirement 1
**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria
1. WHEN [event], THE System_Name SHALL [response]
2. WHILE [state], THE System_Name SHALL [response]
3. IF [condition], THEN THE System_Name SHALL [response]
```

### Phase 2: Design Specification

**Purpose**: Create comprehensive technical design based on validated requirements.

**Process**:
1. **Architecture Design**: High-level system structure and module relationships
2. **Module Interfaces**: Detailed API specifications for each module
3. **Data Models**: Structure and validation rules for all data
4. **Error Handling**: Comprehensive error scenarios and responses
5. **Testing Strategy**: Approach for validating the implementation

**Key Design Principles**:
- **Zero Dependencies**: Maintain Node.js built-ins only approach
- **Security First**: All inputs validated, no information disclosure
- **ES Modules**: Modern JavaScript patterns throughout
- **Testability**: Design for comprehensive test coverage

**Example Design Document Structure**:
```markdown
# Design Document

## Overview
[High-level design summary]

## Architecture
[System structure with diagrams]

## Modules and Interfaces
[Detailed module specifications]

## Data Models
[Data structures and validation]

## Error Handling
[Error scenarios and responses]

## Testing Strategy
[Validation approach]
```

### Phase 3: Implementation Planning

**Purpose**: Break down design into actionable coding tasks with clear dependencies.

**Process**:
1. **Task Decomposition**: Convert design into discrete coding steps
2. **Dependency Mapping**: Ensure tasks build incrementally
3. **Requirement Traceability**: Link each task to specific requirements
4. **Test Integration**: Include testing as part of implementation flow

**Task Structure Requirements**:
- Maximum two levels of hierarchy (tasks and sub-tasks)
- Each task must involve writing, modifying, or testing code
- Sub-tasks numbered with decimal notation (1.1, 1.2, 2.1)
- Optional tasks marked with "*" (typically tests and documentation)
- Clear requirement references for traceability

**Example Implementation Plan Structure**:
```markdown
# Implementation Plan

- [ ] 1. Core infrastructure setup
  - Create module structure and interfaces
  - Set up validation framework
  - _Requirements: 1.1, 1.2_

- [ ] 1.1 Implement data models
  - Write TypeScript interfaces for all data structures
  - Add validation functions for data integrity
  - _Requirements: 2.1, 3.3_

- [ ]* 1.2 Write unit tests for data models
  - Create comprehensive test coverage for validation
  - _Requirements: 2.1, 3.3_
```

## Spec Directory Structure

### For Single-Project Repositories

All specifications are stored in `.kiro/specs/{feature-name}/`:

```
.kiro/specs/
├── feature-name/
│   ├── requirements.md    # EARS-compliant requirements
│   ├── design.md         # Technical design document
│   └── tasks.md          # Implementation task list
└── another-feature/
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

### For Monorepo Environments

Use hierarchical organization to group related features and modules:

```
.kiro/specs/
├── apps/
│   ├── frontend-app/
│   │   └── user-auth-feature/
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
    ├── deployment/
    └── monitoring/
```

**Recommendation**: Use hierarchical structure for monorepos, flat structure for single projects.

## Determining Repository Type

### How to Identify Your Repository Type

**Single-Project Repository**:
- Contains one main application, service, tool, or library
- No `package.json` files in subdirectories (except possibly `node_modules/`)
- Single deployment artifact
- Examples: CLI tool, web application, API service

**Monorepo Environment**:
- Contains multiple deployable packages/applications
- Multiple `package.json` files in different subdirectories
- Multiple deployment artifacts from same repository
- Shared libraries used across packages
- Examples: Platform with frontend/backend/shared-libs, microservices

### Repository Type Detection Script

```bash
# Quick check for monorepo indicators
find . -name "package.json" -not -path "./node_modules/*" | wc -l
# If > 1, likely a monorepo

# Check for npm/pnpm workspace configuration
grep -E '"workspaces"' package.json
ls -la | grep -E "pnpm-workspace\.yaml"
```

## Workflow by Repository Type

### Single-Project Workflow

**Spec Creation**:
```bash
# Create spec in flat structure
mkdir -p .kiro/specs/my-feature
cd .kiro/specs/my-feature

# Create the three documents
touch requirements.md design.md tasks.md
```

**Task Execution**:
- Work on tasks sequentially within the single codebase
- All changes affect one deployable unit
- Standard git workflow for commits and PRs

**Validation**:
```bash
# Run all tests for the single project
npm test

# Validate spec compliance
node scripts/validate-spec-compliance.mjs
```

### Monorepo Workflow

**Spec Creation**:
```bash
# Determine appropriate category path
# Choose from: apps/, libs/, services/, tools/

# Example: New feature for frontend app
mkdir -p .kiro/specs/apps/frontend-app/user-auth-feature
cd .kiro/specs/apps/frontend-app/user-auth-feature

# Create the three documents
touch requirements.md design.md tasks.md
```

**Task Execution**:
- Tasks may span multiple packages with dependencies
- Coordinate changes across packages using cross-references
- Use monorepo coordination practices (see `monorepo-coordination.md`)
- Consider package release order and version coordination

**Validation**:
```bash
# Run tests across all affected packages
npm run test:workspaces  # If using npm workspaces
pnpm test --filter ...   # If using pnpm workspaces

# Validate spec compliance
node scripts/validate-spec-compliance.mjs

# Check cross-package integration
npm run test:integration
```

## Implementation Workflow

### General Process (Applies to Both Repository Types)

1. **Spec Creation**: Follow the three-phase process (Requirements → Design → Tasks)
2. **Task Execution**: Work through tasks incrementally, marking completion
3. **Validation**: Ensure implementation meets requirements and passes all tests
4. **Documentation**: Update docs and maintain spec compliance

### Repository-Specific Considerations

**For Single-Project Repositories**:
- Focus on feature completeness within one codebase
- Standard branching and PR workflows
- All changes deploy as single unit

**For Monorepo Environments**:
- Consider cross-package dependencies and integration points
- Coordinate releases and version bumps across packages
- Plan for shared library API stability
- Use monorepo tooling for affected package detection

### 1. Spec Creation Process

```bash
# For single-project repos:
mkdir -p .kiro/specs/feature-name

# For monorepo environments:
mkdir -p .kiro/specs/{apps,libs,services,tools}/component-name/feature-name

# Follow the three-phase process:
# 1. Write requirements.md with EARS patterns
# 2. Create design.md based on requirements
# 3. Generate tasks.md from design
```

### 2. Task Execution Process

**Single-Project**:
```bash
# Execute tasks in order within single codebase
# Mark tasks as complete in tasks.md
# Update documentation as implementation progresses
```

**Monorepo**:
```bash
# Execute tasks across packages with coordination
# Mark tasks complete and note cross-package dependencies
# Update shared documentation and API contracts
# Coordinate with other teams working on dependent packages
```

### 3. Validation Process

```bash
# Basic validation (both repository types)
npm test                    # Run all test suites
node scripts/validate-spec-compliance.mjs  # Verify spec compliance

# Additional monorepo validation
npm run test:workspaces    # Test all workspace packages (npm)
pnpm test --filter ...     # Test affected packages (pnpm)
npm run test:integration   # Cross-package integration tests
```

## Quality Assurance

### Requirements Quality Checklist

- [ ] All requirements follow EARS patterns exactly
- [ ] All technical terms defined in glossary
- [ ] No vague or unmeasurable language
- [ ] Each requirement has clear acceptance criteria
- [ ] User stories provide clear context and benefit

### Design Quality Checklist

- [ ] Architecture addresses all requirements
- [ ] Module interfaces are well-defined
- [ ] Error handling is comprehensive
- [ ] Security considerations are addressed
- [ ] Testing strategy is complete

### Implementation Quality Checklist

- [ ] All tasks are actionable coding steps
- [ ] Task dependencies are clear and correct
- [ ] Each task references specific requirements
- [ ] Optional tasks are properly marked
- [ ] Implementation builds incrementally

## Examples from the Project

### Excellent Spec Example: Phase 1 Core UX

**Requirements**: Uses perfect EARS patterns with comprehensive glossary
```markdown
### Requirement 1
**User Story:** As a developer using templates repeatedly, I want template repositories to be cached locally, so that subsequent operations are fast and don't require network access.

#### Acceptance Criteria
1. WHEN the CLI_Tool clones a Template_Repository for the first time, THE CLI_Tool SHALL store the repository in the Cache_System at `~/.m5nv/cache/<repo-hash>`
2. WHEN the CLI_Tool needs to access a previously cached Template_Repository, THE CLI_Tool SHALL use the cached copy instead of cloning from the network
```

**Design**: Comprehensive architecture with clear interfaces
```markdown
## Modules and Interfaces

### Cache Manager (`bin/create-scaffold/cache-manager.mjs`)
**Interface**:
```javascript
class CacheManager {
  async getCachedRepo(repoUrl, branchName, options = {})
  async refreshCache(repoUrl, branchName)
}
```

**Implementation**: Clear, actionable tasks with requirement traceability
```markdown
- [x] 2.1 Create cache directory structure and metadata handling
  - Write functions to create `~/.m5nv/cache` directory with proper permissions
  - Implement repository hashing algorithm for unique cache keys
  - _Requirements: 1.1, 1.5, 5.1_
```

## Best Practices

### Requirements Writing

1. **Start with user stories** - Always begin with "As a [role], I want [feature], so that [benefit]"
2. **Use precise language** - Avoid "should", "might", "usually" - use "SHALL"
3. **Define all terms** - Every technical term must be in the glossary
4. **One requirement per thought** - Don't combine multiple requirements
5. **Make it testable** - Each requirement must be verifiable

### Design Documentation

1. **Include diagrams** - Use Mermaid for architecture visualization
2. **Specify interfaces completely** - Include all method signatures and parameters
3. **Address error cases** - Document all failure scenarios
4. **Consider security** - Address validation and sanitization
5. **Plan for testing** - Include testing strategy in design

### Implementation Planning

1. **Build incrementally** - Each task should build on previous tasks
2. **Reference requirements** - Every task must trace to specific requirements
3. **Keep tasks focused** - One clear objective per task
4. **Mark optional work** - Use "*" for non-essential tasks
5. **Include integration** - Ensure all code gets wired together

## Common Pitfalls to Avoid

### Requirements Phase

- ❌ Vague language: "The system should be fast"
- ✅ Specific language: "THE CLI_Tool SHALL complete template listing within 2 seconds"

- ❌ Solution-focused: "The system shall use Redis for caching"
- ✅ Problem-focused: "THE CLI_Tool SHALL store template repositories locally"

### Design Phase

- ❌ Implementation details: "Use a for loop to iterate files"
- ✅ Interface design: "FileProcessor.processFiles(fileList) returns ProcessResult"

### Implementation Phase

- ❌ Vague tasks: "Implement caching"
- ✅ Specific tasks: "Write getCachedRepo() function with TTL checking"

## Maintaining Specs

### During Development

1. **Update specs when requirements change** - Keep all three documents in sync
2. **Mark tasks complete** - Update tasks.md as work progresses
3. **Document decisions** - Add design rationale for major choices
4. **Validate against specs** - Use spec compliance tests

### After Implementation

1. **Archive completed specs** - Keep for historical reference
2. **Extract lessons learned** - Document what worked well
3. **Update templates** - Improve spec templates based on experience
4. **Share knowledge** - Use specs for onboarding and knowledge transfer

## Tools and Automation

### Spec Validation

```bash
# Validate spec compliance
npm run test:spec

# Check requirements format
# (Custom tooling could be added here)
```

### Task Management

```bash
# View current tasks
cat .kiro/specs/feature-name/tasks.md

# Track progress
# (Integration with project management tools)
```

This spec-driven approach ensures high quality, security, and user focus while enabling efficient development and maintenance.

## Monorepo Considerations

For monorepo environments with multiple packages and shared libraries, the spec-driven approach extends with additional coordination requirements. Read `.kiro/steering/monorepo-coordination.md`, `.kiro/steering/sprint-orchestration.md`, `.kiro/steering/release-orchestration.md`, and `.kiro/steering/shared-library-specs.md` for comprehensive monorepo guidance.

### Cross-Package Coordination
- **Dependency Declaration**: Explicit package dependencies in requirements.md
- **Interface Contracts**: Stable APIs defined in design.md
- **Integration Tasks**: Tasks spanning multiple packages with clear prerequisites
- **Version Coordination**: Coordinated releases with rollback planning

### Shared Library Management
- **Interface Stability**: Semantic versioning for shared package APIs
- **Breaking Change Process**: Approval process for API changes
- **Testing Strategy**: Unit, integration, and end-to-end testing across packages

## What's Next

Now that you understand the spec-driven development workflow, you can apply it to @m5nv/create-scaffolds by:

- 🛠️ **Set up your development environment** - Configure your workspace following the steering documents
- 🤝 **Follow contribution standards** - Use the methodology's validation scripts and guidelines
- 🚨 **Validate your implementation** - Run the provided validation scripts to ensure compliance