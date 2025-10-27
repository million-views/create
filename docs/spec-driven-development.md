---
title: "Spec-Driven Development Workflow"
type: "explanation"
audience: "advanced"
estimated_time: "15 minutes read"
prerequisites: 
  - "Software development experience"
  - "Understanding of requirements engineering"
related_docs: 
  - "development.md"
  - "../CONTRIBUTING.md"
  - "guides/troubleshooting.md"
last_updated: "2024-10-26"
---

# Spec-Driven Development Workflow

Complete guide to the specification-driven development methodology used in @m5nv/create-scaffold.

## Overview

This project follows a rigorous spec-driven development approach where all features are designed through a structured three-phase process: Requirements → Design → Implementation. This methodology ensures features are well-planned, thoroughly documented, and meet user needs before any code is written.

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
1. **Architecture Design**: High-level system structure and component relationships
2. **Component Interfaces**: Detailed API specifications for each module
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

## Components and Interfaces
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

## Implementation Workflow

### 1. Spec Creation Process

```bash
# Create new spec directory
mkdir -p .kiro/specs/feature-name

# Follow the three-phase process:
# 1. Write requirements.md with EARS patterns
# 2. Create design.md based on requirements
# 3. Generate tasks.md from design
```

### 2. Task Execution Process

```bash
# Execute tasks in order
# Mark tasks as complete in tasks.md
# Update documentation as implementation progresses
```

### 3. Validation Process

```bash
# Verify implementation meets requirements
npm test                    # Run all test suites
npm run test:spec          # Verify spec compliance
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
- [ ] Component interfaces are well-defined
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
## Components and Interfaces

### Cache Manager (`bin/cacheManager.mjs`)
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

This spec-driven approach ensures that @m5nv/create-scaffold maintains high quality, security, and user focus while enabling efficient development and maintenance.

## What's Next

Now that you understand the spec-driven development workflow, you might want to:

- 🛠️ **Start developing**: [Development Guide](development.md) - Set up your development environment and contribute
- 🤝 **Contribute to the project**: [Contributing Guidelines](../CONTRIBUTING.md) - How to contribute following our standards
- 🚨 **Handle development issues**: [Troubleshooting Guide](guides/troubleshooting.md) - Resolve common development problems