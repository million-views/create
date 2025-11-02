---
inclusion: always
---

# Monorepo Organization & Team Boundaries

## Overview

This repository contains multiple related tools that form a cohesive template ecosystem. Clear boundaries prevent conflicts and ensure focused development.

## Tool Responsibilities

### @m5nv/create-scaffold (Template Consumer)
**Lead**: Template instantiation team
**Purpose**: Enable users to create projects from templates
**Scope**:
- Template discovery and selection
- User interaction and input collection
- Project instantiation and setup script execution
- Template validation during consumption

**Files**: `bin/create-scaffold.mjs`, `bin/interactiveSession.mjs`, `bin/templateDiscovery.mjs`, `bin/environmentFactory.mjs`, `bin/setupRuntime.mjs`

### Make-Template (Template Author)
**Lead**: Template authoring team
**Purpose**: Enable template authors to create and validate templates
**Scope**:
- Template structure creation and validation
- Metadata generation and schema compliance
- Author tooling and workflow optimization
- Template testing and quality assurance

**Files**: `bin/make-template.mjs`

## Shared Infrastructure

### Schema & Types
**Ownership**: Both teams (coordinated changes)
**Location**: `schema/`, `types/`
**Purpose**: Define template format standards
**Coordination**: Schema changes require both teams' approval

### Shared Libraries
**Ownership**: Both teams (coordinated changes)
**Location**: `lib/`, `utils/`
**Purpose**: Common utilities and runtime components
**Coordination**: API changes require both teams' review

### Testing Infrastructure
**Ownership**: Both teams
**Location**: `test/`
**Purpose**: Comprehensive test coverage
**Coordination**: Test naming follows tool prefixes (`create-scaffold-*`, `make-template-*`)

## Development Guidelines

### Code Changes
- **Single Tool Changes**: Can be made independently within tool boundaries
- **Shared Code Changes**: Require coordination between both teams
- **Schema Changes**: Require approval from both tool leads
- **Breaking Changes**: Must be communicated and scheduled across teams

### Pull Request Reviews
- **Tool-Specific PRs**: Reviewed by tool's primary team
- **Shared Infrastructure PRs**: Reviewed by both teams
- **Cross-Tool Impact**: Any change affecting other tools requires their review

### Issue Assignment
- **@m5nv/create-scaffold Issues**: Assigned to template consumer team
- **Make-Template Issues**: Assigned to template authoring team
- **Shared Issues**: Assigned based on primary impact, with secondary team CC'd

## Coding Assistant Instructions

When working on this repository, coding assistants must:

1. **Identify Context**: Determine which tool/team the request pertains to
2. **Respect Boundaries**: Only modify files within the appropriate territory
3. **Seek Approval**: For shared infrastructure changes, confirm with both teams
4. **Document Impact**: Note any cross-tool implications in PR descriptions
5. **Test Appropriately**: Run tests for affected tools and shared components

## Communication Protocols

- **Daily Standups**: Coordinate cross-team dependencies
- **Architecture Decisions**: Document in `.kiro/specs/` with both teams
- **Breaking Changes**: 2-week notice for major shared infrastructure changes
- **Emergency Fixes**: Can bypass coordination for critical bugs with post-hoc notification

## Migration Notes

When make-template migrates into this repository:
1. Update all steering documents with tool boundaries
2. Establish clear code ownership in PR templates
3. Set up automated checks for boundary violations
4. Document migration in repository README