---
inclusion: always
---

# Sprint Orchestration for Monorepos

## Core Principle: Coordinated Multi-Project Sprint Cycles

In monorepo environments, sprints must coordinate work across multiple teams and packages while maintaining the rigorous 3-phase spec-driven process.

## Sprint Structure

### Sprint Phases
- **Planning Phase**: Identify cross-package dependencies and coordination needs
- **Execution Phase**: Parallel development with explicit integration points
- **Integration Phase**: Merge and validate cross-package changes
- **Validation Phase**: End-to-end testing and release preparation

### Sprint Types
- **Feature Sprints**: New functionality spanning multiple packages
- **Refactoring Sprints**: Cross-package architectural improvements
- **Infrastructure Sprints**: Shared tooling and CI/CD enhancements
- **Maintenance Sprints**: Bug fixes and security updates across packages

## Sprint Planning Process

### 1. Dependency Analysis
- **Package Impact Assessment**: Identify all packages affected by sprint goals
- **Team Coordination**: Assign package ownership and integration responsibilities
- **Timeline Planning**: Establish sprint phases with clear milestones

### 2. Spec Organization
- **Global Specs**: Requirements spanning multiple packages
- **Package Specs**: Package-specific implementation details
- **Integration Specs**: Cross-package integration requirements

### 3. Risk Assessment
- **Dependency Risks**: Identify critical path dependencies
- **Integration Risks**: Plan for merge conflicts and API changes
- **Rollback Planning**: Define rollback procedures for failed integrations

## Execution Coordination

### Daily Standups
- **Cross-Team Sync**: Daily coordination across package teams
- **Dependency Updates**: Report on prerequisite task completion
- **Blocker Resolution**: Immediate escalation of cross-package blockers

### Integration Points
- **Phase Gates**: Clear integration milestones within the sprint
- **Merge Windows**: Scheduled integration periods for cross-package changes
- **Validation Gates**: Automated and manual validation checkpoints

### Progress Tracking
- **Sprint Board**: Visual tracking of tasks across packages
- **Dependency Chains**: Clear visibility of task interdependencies
- **Milestone Tracking**: Progress against sprint phase goals

## Quality Assurance

### Sprint Checkpoints
- **Phase Reviews**: Formal reviews at end of each sprint phase
- **Integration Testing**: Cross-package integration validation
- **Security Reviews**: Security assessment of all changes
- **Performance Validation**: Performance impact assessment

### Sprint Retrospective
- **Success Metrics**: Measure sprint goal achievement
- **Process Improvements**: Identify coordination bottlenecks
- **Team Feedback**: Gather insights for future sprint planning

## Sprint Lifecycle

### Sprint Initiation
1. **Goal Definition**: Clear, measurable sprint objectives
2. **Scope Planning**: Define included packages and features
3. **Team Assignment**: Assign responsibilities and ownership
4. **Timeline Establishment**: Set sprint phase deadlines

### Sprint Execution
1. **Parallel Development**: Teams work on assigned packages
2. **Regular Sync**: Daily standups and weekly planning updates
3. **Integration Windows**: Scheduled cross-package integration
4. **Quality Gates**: Continuous validation and testing

### Sprint Completion
1. **Final Integration**: Merge all package changes
2. **End-to-End Testing**: Validate complete feature functionality
3. **Documentation Update**: Update all relevant documentation
4. **Release Preparation**: Prepare for coordinated package releases

## Team Coordination Patterns

### Cross-Team Communication
- **Shared Slack Channels**: Real-time coordination across teams
- **Weekly Planning Meetings**: Cross-team sprint planning and review
- **Integration War Rooms**: Focused sessions for complex integrations

### Conflict Resolution
- **Technical Disputes**: Architecture decision records for resolution
- **Priority Conflicts**: Product owner arbitration for competing priorities
- **Resource Conflicts**: Team lead coordination for shared resources

### Knowledge Sharing
- **Sprint Demos**: Cross-team feature demonstrations
- **Documentation Updates**: Shared knowledge base maintenance
- **Pair Programming**: Cross-team pairing for complex integrations

## Success Metrics

### Delivery Metrics
- **Sprint Goal Achievement**: Percentage of planned features delivered
- **Quality Metrics**: Defect rates and test coverage maintained
- **Integration Success**: Percentage of successful cross-package integrations

### Process Metrics
- **Coordination Efficiency**: Time spent on cross-team coordination
- **Blocker Resolution Time**: Average time to resolve cross-package blockers
- **Integration Frequency**: Number of successful integration events

This orchestration ensures coordinated development across monorepo teams while maintaining quality and delivery predictability.