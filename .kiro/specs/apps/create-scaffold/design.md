# Phase 3: Advanced Workflows - Design

## Overview
Phase 3 introduces advanced workflow capabilities through multi-template orchestration and enhanced manifest hooks. This design specification outlines the technical architecture for composing complex projects from multiple templates while maintaining simplicity and reliability.

## Design Principles

### 1. Composable Architecture
**Pattern**: Template composition through declarative relationships
**Benefits**: Flexible project assembly, reusable template components, predictable orchestration
**Implementation**: Composition schema with dependency management and conflict resolution

### 2. Workflow Extensibility
**Pattern**: Manifest-driven hooks and post-processing
**Benefits**: Customizable workflows, integration capabilities, automation support
**Implementation**: Rich hook system with event-driven processing and state management

### 3. Progressive Complexity
**Pattern**: Simple features remain simple, complexity added opt-in
**Benefits**: Backward compatibility, learning curve management, feature discoverability
**Implementation**: Feature flags and progressive disclosure for advanced capabilities

### 4. Operational Safety
**Pattern**: Atomic operations with comprehensive rollback
**Benefits**: Reliable complex operations, error recovery, system stability
**Implementation**: Transaction-like semantics with state tracking and cleanup

## Architectural Components

### Core Orchestration Engine
```
lib/orchestration/
├── composition-engine.mjs     # Multi-template coordination
├── dependency-resolver.mjs    # Template dependency management
├── conflict-resolver.mjs      # File and variable conflict handling
├── state-manager.mjs         # Workflow state persistence
├── hook-executor.mjs         # Manifest hook processing
└── rollback-engine.mjs       # Failure recovery and cleanup
```

### Template Composition Schema
```
schema/
├── composition.v1.json        # Template relationship schema
├── hooks.v1.json             # Manifest hooks schema
└── workflow.v1.json          # Workflow orchestration schema
```

### Enhanced CLI Commands
```
bin/create-scaffold/commands/
├── compose.mjs               # Multi-template orchestration
├── workflow.mjs              # Workflow management
└── hooks.mjs                 # Hook management utilities
```

## Multi-Template Orchestration Design

### Composition Engine Architecture
```javascript
class CompositionEngine {
  constructor(options = {}) {
    this.templates = [];
    this.sharedContext = new SharedContext();
    this.dependencyGraph = new DependencyGraph();
    this.stateManager = new StateManager();
  }

  async orchestrate(templates, options = {}) {
    // Phase 1: Template Resolution
    const resolvedTemplates = await this.resolveTemplates(templates);

    // Phase 2: Dependency Analysis
    const executionOrder = await this.analyzeDependencies(resolvedTemplates);

    // Phase 3: Conflict Detection
    const conflicts = await this.detectConflicts(executionOrder);

    // Phase 4: Orchestrated Execution
    return await this.executeOrchestrated(executionOrder, conflicts, options);
  }
}
```

### Template Resolution Process
```javascript
class TemplateResolver {
  async resolveTemplates(templateSpecs) {
    const resolved = [];

    for (const spec of templateSpecs) {
      const template = await this.resolveTemplate(spec);

      // Validate composition compatibility
      await this.validateCompositionCompatibility(template);

      // Extract composition metadata
      const composition = await this.extractCompositionMetadata(template);

      resolved.push({ template, composition });
    }

    return resolved;
  }
}
```

### Dependency Resolution Algorithm
```javascript
class DependencyResolver {
  async resolveDependencies(templates) {
    const graph = new DependencyGraph();

    // Build dependency graph
    for (const template of templates) {
      graph.addNode(template.id, template);

      for (const dependency of template.composition.dependencies) {
        graph.addDependency(template.id, dependency.templateId);
      }
    }

    // Detect cycles
    if (graph.hasCycles()) {
      throw new CompositionError('Circular dependencies detected');
    }

    // Topological sort for execution order
    return graph.topologicalSort();
  }
}
```

### Conflict Resolution Strategy
```javascript
class ConflictResolver {
  async resolveConflicts(templates, executionOrder) {
    const conflicts = {
      files: [],
      variables: [],
      hooks: []
    };

    // Analyze file conflicts
    conflicts.files = await this.analyzeFileConflicts(templates);

    // Analyze variable conflicts
    conflicts.variables = await this.analyzeVariableConflicts(templates);

    // Analyze hook conflicts
    conflicts.hooks = await this.analyzeHookConflicts(templates);

    // Apply resolution strategies
    return await this.applyResolutionStrategies(conflicts, executionOrder);
  }
}
```

## Template Composition Schema

### Composition Metadata Structure
```json
{
  "$schema": "https://m5nv.dev/schema/composition.v1.json",
  "template": {
    "id": "frontend-react",
    "version": "1.0.0",
    "description": "React frontend application template"
  },
  "composition": {
    "dependencies": [
      {
        "templateId": "shared-config",
        "version": ">=1.0.0",
        "purpose": "Shared configuration and environment setup"
      }
    ],
    "provides": [
      {
        "name": "frontend-url",
        "type": "variable",
        "description": "Frontend application URL"
      }
    ],
    "conflicts": [
      {
        "type": "file",
        "pattern": "package.json",
        "strategy": "merge",
        "mergeConfig": {
          "dependencies": "combine",
          "scripts": "combine"
        }
      }
    ],
    "variables": {
      "shared": [
        "DATABASE_URL",
        "REDIS_URL"
      ],
      "mappings": {
        "frontend-port": "{{BACKEND_PORT}} + 1"
      }
    }
  }
}
```

### Hook System Architecture
```json
{
  "hooks": {
    "preComposition": [
      {
        "name": "validate-environment",
        "script": "scripts/validate-env.mjs",
        "condition": "node --version >= 18"
      }
    ],
    "postSetup": [
      {
        "name": "generate-readme",
        "template": "templates/README.md.hbs",
        "output": "README.md",
        "variables": {
          "projectName": "{{PROJECT_NAME}}",
          "templates": "{{COMPOSED_TEMPLATES}}"
        }
      },
      {
        "name": "install-dependencies",
        "command": "npm install",
        "cwd": "{{PROJECT_ROOT}}"
      }
    ],
    "onConflict": [
      {
        "name": "resolve-package-conflicts",
        "script": "scripts/resolve-conflicts.mjs",
        "triggers": ["file-conflict:package.json"]
      }
    ]
  }
}
```

## Workflow State Management

### State Persistence Design
```javascript
class StateManager {
  constructor(storagePath = './.m5nv/workflow-state.json') {
    this.storagePath = storagePath;
    this.state = {
      workflowId: null,
      templates: [],
      executionOrder: [],
      completedSteps: [],
      variables: {},
      errors: [],
      createdAt: null,
      updatedAt: null
    };
  }

  async saveState() {
    const stateWithTimestamp = {
      ...this.state,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(
      this.storagePath,
      JSON.stringify(stateWithTimestamp, null, 2)
    );
  }

  async loadState(workflowId) {
    try {
      const data = await fs.readFile(this.storagePath, 'utf8');
      const savedState = JSON.parse(data);

      if (savedState.workflowId === workflowId) {
        this.state = savedState;
        return true;
      }
    } catch (error) {
      // State file doesn't exist or is invalid
    }

    return false;
  }
}
```

### Rollback Engine
```javascript
class RollbackEngine {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.rollbackSteps = [];
  }

  async prepareRollback(template, step) {
    // Record rollback actions in reverse order
    this.rollbackSteps.unshift({
      templateId: template.id,
      step: step,
      actions: await this.generateRollbackActions(template, step)
    });
  }

  async executeRollback() {
    for (const rollbackStep of this.rollbackSteps) {
      try {
        await this.executeRollbackStep(rollbackStep);
        this.stateManager.markStepRolledBack(rollbackStep);
      } catch (rollbackError) {
        // Log rollback failure but continue with other steps
        console.error(`Rollback failed for ${rollbackStep.templateId}:`, rollbackError);
      }
    }
  }

  async generateRollbackActions(template, step) {
    const actions = [];

    // Generate cleanup actions based on step type
    switch (step.type) {
      case 'file-copy':
        actions.push({
          type: 'delete-files',
          files: step.copiedFiles
        });
        break;

      case 'command-execution':
        actions.push({
          type: 'run-cleanup',
          command: step.cleanupCommand
        });
        break;
    }

    return actions;
  }
}
```

## CLI Integration

### Enhanced Command Structure
```bash
# Multi-template orchestration
create-scaffold compose --from-templates frontend,backend,database \
  --project-name my-fullstack-app \
  --variables DATABASE_URL=postgres://localhost:5432/myapp

# Workflow management
create-scaffold workflow status <workflow-id>
create-scaffold workflow resume <workflow-id>
create-scaffold workflow rollback <workflow-id>

# Hook management
create-scaffold hooks list --template <template>
create-scaffold hooks validate --template <template>
```

### Progressive Help System Extension
```javascript
class AdvancedHelpGenerator extends ProgressiveHelpGenerator {
  generateCompositionHelp() {
    return {
      basic: this.generateBasicCompositionHelp(),
      intermediate: this.generateIntermediateCompositionHelp(),
      advanced: this.generateAdvancedCompositionHelp()
    };
  }

  generateBasicCompositionHelp() {
    return {
      usage: 'create-scaffold compose --from-templates <templates>',
      examples: [
        'create-scaffold compose --from-templates frontend,backend',
        'create-scaffold compose --from-templates react,express,postgres'
      ],
      description: 'Create projects from multiple templates'
    };
  }
}
```

## Error Handling and Recovery

### Composition-Specific Errors
```javascript
class CompositionError extends Error {
  constructor(type, message, context = {}) {
    super(message);
    this.type = type;
    this.context = context;
    this.suggestions = this.generateSuggestions();
  }

  generateSuggestions() {
    switch (this.type) {
      case 'circular-dependency':
        return [
          'Review template dependencies in composition metadata',
          'Consider breaking circular dependencies with configuration templates'
        ];

      case 'file-conflict':
        return [
          'Use conflict resolution strategies in template composition',
          'Consider template specialization to avoid conflicts'
        ];

      case 'missing-dependency':
        return [
          'Ensure all dependent templates are included in --from-templates',
          'Check template compatibility requirements'
        ];
    }
  }
}
```

### Recovery Mechanisms
- **Automatic Rollback**: Failed compositions automatically rollback completed steps
- **Resume Capability**: Interrupted workflows can resume from last successful step
- **Partial Success**: Successful template setups preserved when possible
- **State Persistence**: Workflow state saved for recovery and auditing

## Performance Considerations

### Optimization Strategies
- **Parallel Processing**: Independent templates processed concurrently
- **Caching Leverage**: Shared template cache across composition
- **Incremental Execution**: Failed steps don't re-execute successful ones
- **Memory Management**: Streaming processing for large template sets

### Performance Targets
- **Composition Analysis**: < 2 seconds for typical compositions
- **Template Resolution**: < 5 seconds for cached repositories
- **Orchestrated Execution**: Linear scaling with template count
- **Memory Usage**: < 200MB for complex 10-template compositions

## Security Considerations

### Composition Security
- **Template Validation**: All templates validated before composition
- **Path Security**: Prevent directory traversal in composition paths
- **Hook Sandboxing**: Hook scripts executed in restricted environments
- **Variable Sanitization**: Template variables validated and sanitized

### Operational Security
- **State Encryption**: Sensitive workflow state encrypted at rest
- **Audit Logging**: Comprehensive logging of composition operations
- **Access Control**: Template access controlled by repository permissions
- **Rollback Safety**: Rollback operations cannot introduce new vulnerabilities

## Testing Strategy

### Unit Testing Focus
- Dependency resolution algorithms
- Conflict detection and resolution
- Hook execution logic
- State management operations

### Integration Testing
- End-to-end composition workflows
- Cross-template variable sharing
- Hook execution in composition context
- Error recovery and rollback scenarios

### Performance Testing
- Large composition scalability
- Memory usage under load
- Concurrent template processing
- Caching effectiveness

## Deployment Strategy

### Feature Flags
```javascript
const FEATURE_FLAGS = {
  MULTI_TEMPLATE_COMPOSITION: 'multi-template-composition',
  ADVANCED_HOOKS: 'advanced-hooks',
  WORKFLOW_RESUME: 'workflow-resume'
};
```

### Gradual Rollout
1. **Alpha**: Core composition with basic templates
2. **Beta**: Advanced hooks and conflict resolution
3. **GA**: Full feature set with enterprise validation

### Backward Compatibility
- Existing single-template usage unchanged
- New flags are opt-in only
- Configuration files remain compatible
- API contracts preserved

## Success Metrics

### Technical Metrics
- Composition success rate > 95%
- Performance overhead < 20% for single templates
- Memory usage within bounds for complex operations
- Test coverage > 90% for new components

### User Experience Metrics
- Time to compose multi-template projects < 50% of manual approach
- Error recovery success rate > 90%
- User satisfaction with advanced workflows > 4.2/5.0
- Feature adoption rate > 30% among target users

### Business Impact
- Enterprise customer composition workflows enabled
- Platform engineering automation capabilities expanded
- Template ecosystem complexity support increased
- Competitive differentiation in advanced scenarios