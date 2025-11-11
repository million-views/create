# CLI DX Polish - Design

## Overview
This design specification outlines the architectural approach for implementing comprehensive CLI DX improvements to the create-scaffold and make-template tools. The design focuses on hierarchical command structures, shared infrastructure, integration features, and unified terminology while maintaining backward compatibility.

## Design Principles

### 1. Hierarchical Command Structure
**Pattern**: Git/npm-style subcommands for logical grouping and discoverability
**Benefits**: Clear command hierarchy, progressive disclosure, consistent patterns
**Implementation**: Primary commands become subcommands with logical grouping

### 2. Progressive Disclosure
**Pattern**: Show basic options first, reveal advanced options on demand
**Benefits**: Reduced cognitive load, better discoverability, improved UX
**Implementation**: Default help shows essentials, `--help advanced` reveals full options

### 3. Shared Infrastructure
**Pattern**: Extract common components into reusable libraries
**Benefits**: Code reuse, consistency, easier maintenance, unified behavior
**Implementation**: Shared libraries for argument parsing, help generation, configuration

### 4. Ecosystem Integration
**Pattern**: Tools work together as a cohesive ecosystem
**Benefits**: Seamless workflows, shared concepts, unified user experience
**Implementation**: Cross-tool integration features, shared terminology, unified help

## Architectural Components

### Core CLI Framework
```
lib/cli/
├── argument-parser.mjs      # Unified argument parsing with subcommand support
├── help-generator.mjs       # Context-aware help generation
├── command-router.mjs       # Hierarchical command routing
├── config-manager.mjs       # Shared configuration management
├── error-handler.mjs        # Consistent error handling and messaging
├── logger.mjs              # Unified logging framework
└── validator.mjs           # Shared validation utilities
```

### Tool-Specific Components
```
bin/create-scaffold/
├── commands/
│   ├── new.mjs             # create-scaffold new <template>
│   ├── list.mjs            # create-scaffold list
│   ├── info.mjs            # create-scaffold info <template>
│   └── validate.mjs        # create-scaffold validate <template>
└── index.mjs               # Main entry point with command routing

bin/make-template/
├── commands/
│   ├── convert.mjs         # make-template convert <project>
│   ├── restore.mjs         # make-template restore <template>
│   ├── validate.mjs        # make-template validate <template>
│   └── test.mjs            # make-template test <template>
└── index.mjs               # Main entry point with command routing
```

### Shared Infrastructure
```
lib/shared/
├── cli-framework.mjs       # Core CLI utilities and patterns
├── template-registry.mjs   # Shared template discovery and management
├── config-schema.mjs       # Unified configuration schema
├── integration-api.mjs     # Cross-tool integration interfaces
└── ontology.mjs            # Shared terminology and concepts
```

## Command Structure Design

### Create-Scaffold Commands
```bash
create-scaffold [global-options] <command> [command-options]

Commands:
  new <template> [target]    Create new project from template
  list [filter]              List available templates
  info <template>            Show template information
  validate <template>        Validate template structure
  help [command]             Show help information

Global Options:
  --dry-run                  Show what would be done
  --verbose                  Enable verbose output
  --config <file>            Use specific config file
  --help                     Show help information
```

### Make-Template Commands
```bash
make-template [global-options] <command> [command-options]

Commands:
  convert <project> [output]  Convert project to template
  restore <template> [target] Restore template to project
  validate <template>        Validate template structure
  test <template>            Test template with create-scaffold
  help [command]             Show help information

Global Options:
  --dry-run                  Show what would be done
  --verbose                  Enable verbose output
  --config <file>            Use specific config file
  --help                     Show help information
```

## Progressive Disclosure Implementation

### Help System Architecture
```
Help Generation Flow:
1. Parse command context
2. Determine disclosure level (basic/advanced)
3. Generate context-aware help
4. Include relevant examples
5. Show related commands
```

### Disclosure Levels
- **Basic**: Essential commands and options only
- **Intermediate**: Common use cases and options
- **Advanced**: All options, flags, and edge cases
- **Expert**: Internal options, debugging flags, experimental features

## Shared Infrastructure Design

### Argument Parser
```javascript
class ArgumentParser {
  parse(args) {
    // Unified parsing logic for both tools
    const { command, options, globalOptions } = this.parseHierarchical(args);
    return this.validateAndNormalize(command, options, globalOptions);
  }

  generateHelp(command, level = 'basic') {
    // Context-aware help generation
    return this.helpGenerator.generate(command, level);
  }
}
```

### Configuration Manager
```javascript
class ConfigManager {
  load() {
    // Load from multiple sources with precedence
    const sources = [
      defaultConfig,
      globalConfigFile,
      projectConfigFile,
      environmentVariables,
      commandLineOptions
    ];
    return this.mergeWithPrecedence(sources);
  }

  save(config) {
    // Persist configuration changes
    return this.writeToFile(config);
  }
}
```

### Integration API
```javascript
class IntegrationAPI {
  // Cross-tool communication
  async callOtherTool(command, options) {
    const result = await this.spawnTool(command, options);
    return this.parseResult(result);
  }

  // Shared template registry
  async discoverTemplates() {
    return this.registry.list();
  }

  // Unified error handling
  handleError(error, context) {
    return this.errorHandler.process(error, context);
  }
}
```

## Unified Terminology Framework

### Core Terms
- **Source**: Input location (project to convert, template to use)
- **Target**: Output location (where to create project, where to save template)
- **Template**: Reusable project structure definition
- **Scaffold**: Process of creating project from template
- **Interactive**: Guided, question-based workflow
- **Dry-run**: Preview mode showing what would happen

### Command Patterns
- **Creation**: `new`, `create`, `init` (use `new` for consistency)
- **Discovery**: `list`, `find`, `search` (use `list` for consistency)
- **Information**: `info`, `show`, `display` (use `info` for consistency)
- **Validation**: `validate`, `check`, `verify` (use `validate` for consistency)

## Error Handling Design

### Error Classification
- **User Errors**: Invalid input, missing files, permission issues
- **System Errors**: Network issues, disk space, external tool failures
- **Validation Errors**: Schema violations, constraint failures
- **Integration Errors**: Cross-tool communication failures

### Error Response Format
```json
{
  "error": {
    "type": "user_error",
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Template 'my-template' not found in registry",
    "suggestions": [
      "Check template name spelling",
      "Run 'create-scaffold list' to see available templates",
      "Use 'create-scaffold info <template>' to check template details"
    ],
    "help_url": "https://docs.example.com/templates/not-found"
  }
}
```

## Integration Features Design

### Cross-Tool Workflows
1. **Author Testing**: `make-template test <template>` automatically calls `create-scaffold`
2. **Template Discovery**: Shared registry accessible by both tools
3. **Configuration Sync**: Changes in one tool reflected in the other
4. **Unified Help**: Help commands show relevant information from both tools

### Shared Registry
```javascript
class TemplateRegistry {
  async register(template) {
    // Add template to shared registry
  }

  async list(filter = {}) {
    // List templates with filtering
  }

  async get(templateName) {
    // Retrieve template information
  }
}
```

## Backward Compatibility Strategy

### Legacy Command Support
- Maintain old command formats with deprecation warnings
- Gradual migration path with clear upgrade guides
- Configuration file compatibility
- API compatibility for programmatic usage

### Migration Path
1. **Phase 1**: Add new commands alongside old ones
2. **Phase 2**: Mark old commands as deprecated with warnings
3. **Phase 3**: Remove deprecated commands in future major version

## Testing Strategy

### Unit Tests
- Test each CLI component in isolation
- Mock external dependencies
- Test error conditions and edge cases

### Integration Tests
- Test cross-tool workflows
- Test shared infrastructure components
- Test configuration management

### End-to-End Tests
- Test complete user workflows
- Test backward compatibility
- Test performance requirements

## Performance Considerations

### Startup Optimization
- Lazy loading of heavy dependencies
- Cached command parsing
- Minimal initial imports

### Memory Management
- Stream processing for large templates
- Efficient data structures
- Garbage collection optimization

## Security Considerations

### Input Validation
- Sanitize all user inputs
- Validate file paths and URLs
- Prevent command injection

### Permission Handling
- Clear permission requirements
- Graceful degradation for limited permissions
- Secure temporary file handling

## Deployment Strategy

### Incremental Rollout
1. Deploy shared infrastructure first
2. Update one tool at a time
3. Validate integration between versions
4. Full ecosystem rollout

### Rollback Plan
- Version pinning for dependencies
- Feature flags for new functionality
- Quick rollback procedures
- Data migration rollback support

## Success Metrics

### Technical Metrics
- Startup time < 500ms (cold), < 200ms (warm)
- Memory usage < 50MB peak
- Test coverage > 90%
- Error rate < 1%

### User Experience Metrics
- Command discovery time < 30 seconds
- Error resolution time < 5 minutes
- User satisfaction score > 4.5/5
- Feature adoption rate > 80%