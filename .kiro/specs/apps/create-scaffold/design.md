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

### Enhanced Template Schema Extensions
```
schema/
├── template.v2.json        # Extended schema with dependency support
├── setup-hooks.v1.json     # Enhanced setup script capabilities
└── composition.v1.json     # Template composition metadata
```

### Template Dependency System
```
lib/template/
├── dependency-resolver.mjs     # Template dependency management
├── composition-engine.mjs      # Multi-template orchestration
├── conflict-resolver.mjs       # File and variable conflict handling
├── setup-orchestrator.mjs      # Enhanced _setup.mjs capabilities
└── template-composer.mjs       # Template composition utilities
```

### Enhanced Setup Runtime
```
lib/setup/
├── multi-template-runner.mjs   # Orchestrate multiple template setups
├── context-manager.mjs         # Shared context across templates
├── rollback-engine.mjs         # Atomic operations with cleanup
├── progress-tracker.mjs        # Setup progress reporting
└── hook-executor.mjs           # Enhanced setup hooks
```

## Template Dependency System Design

### Enhanced Template Schema
```json
{
  "$schema": "https://schemas.million-views.dev/create/template.v2.json",
  "schemaVersion": "2.0.0",
  "id": "acme/fullstack-app",
  "name": "Full Stack Application",
  "description": "Complete full-stack application with frontend, backend, and database",
  "dependencies": [
    {
      "template": "acme/react-frontend",
      "version": ">=1.0.0",
      "purpose": "Frontend application component",
      "variables": {
        "API_URL": "{{BACKEND_URL}}",
        "DATABASE_URL": "{{DATABASE_URL}}"
      }
    },
    {
      "template": "acme/express-backend",
      "version": ">=2.0.0",
      "purpose": "Backend API component"
    },
    {
      "template": "acme/postgres-database",
      "version": ">=1.5.0",
      "purpose": "Database setup and migrations"
    }
  ],
  "composition": {
    "orchestration": "parallel",
    "failureMode": "rollback",
    "sharedVariables": [
      "PROJECT_NAME",
      "DATABASE_URL",
      "API_PORT",
      "FRONTEND_PORT"
    ]
  }
}
```

### Setup Script Orchestration
```javascript
// _setup.mjs with multi-template capabilities
export async function setup(ctx) {
  const { tools, inputs } = ctx;

  // Check for template dependencies
  const dependencies = await tools.templates.resolveDependencies(inputs.template);

  // Orchestrate setup of dependent templates
  for (const dep of dependencies) {
    await tools.templates.setup(dep.template, {
      variables: dep.variables,
      context: 'dependency'
    });
  }

  // Continue with main template setup
  await tools.files.copy('src/', inputs.projectDirectory);
  await tools.placeholders.apply(inputs.variables);

  // Post-setup orchestration
  await tools.templates.finalize(dependencies);
}
```

### Dependency Resolution Algorithm
```javascript
class DependencyResolver {
  async resolveDependencies(templateId, registry) {
    const template = await registry.get(templateId);
    const resolved = new Set();
    const visiting = new Set();

    const resolve = async (id) => {
      if (resolved.has(id)) return;
      if (visiting.has(id)) throw new Error(`Circular dependency: ${id}`);

      visiting.add(id);
      const tpl = await registry.get(id);

      for (const dep of tpl.dependencies || []) {
        await resolve(dep.template);
      }

      visiting.delete(id);
      resolved.add(id);
    };

    await resolve(templateId);
    return Array.from(resolved);
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

## CLI Integration

### Enhanced New Command
The existing `create-scaffold new` command is enhanced to support template dependencies and composition:

```bash
# Single template (existing functionality)
create-scaffold new my-app --template acme/react-app

# Template with dependencies (new capability)
create-scaffold new my-fullstack-app --template acme/fullstack-app
# Automatically resolves and sets up: react-frontend, express-backend, postgres-database

# Explicit dependency override
create-scaffold new my-app --template acme/fullstack-app \
  --dependency acme/express-backend=2.1.0 \
  --dependency acme/postgres-database=latest
```

### Template Validation Enhancements
```bash
# Validate template and its dependencies
create-scaffold validate acme/fullstack-app --recursive

# Check for conflicts before setup
create-scaffold validate acme/fullstack-app --check-conflicts \
  --project-name my-app
```

### Setup Runtime Extensions
The setup runtime is enhanced to support multi-template orchestration:

```javascript
// Enhanced setup context
const ctx = {
  tools: {
    templates: {
      resolveDependencies: async (templateId) => { /* ... */ },
      setup: async (templateId, options) => { /* ... */ },
      finalize: async (dependencies) => { /* ... */ }
    },
    files: { /* existing file operations */ },
    placeholders: { /* existing placeholder operations */ },
    commands: { /* existing command execution */ }
  },
  inputs: { /* user inputs and resolved variables */ },
  dependencies: [ /* resolved template dependencies */ ]
};
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