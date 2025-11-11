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

---

## Phase 2 Implementation Details

### Progressive Disclosure Pattern

#### Help System Architecture
```javascript
class ProgressiveHelpGenerator {
  constructor(level = 'basic') {
    this.level = level;
    this.context = null;
  }

  generate(command, context) {
    this.context = context;
    switch(this.level) {
      case 'basic': return this.generateBasic(command);
      case 'intermediate': return this.generateIntermediate(command);
      case 'advanced': return this.generateAdvanced(command);
    }
  }

  generateBasic(command) {
    // Essential commands, common options, basic examples
    return {
      usage: command.usage,
      commonOptions: this.getCommonOptions(command),
      examples: this.getBasicExamples(command)
    };
  }

  generateIntermediate(command) {
    // Basic + advanced options, detailed examples
    const basic = this.generateBasic(command);
    return {
      ...basic,
      advancedOptions: this.getAdvancedOptions(command),
      detailedExamples: this.getDetailedExamples(command)
    };
  }

  generateAdvanced(command) {
    // Complete reference with all options, edge cases
    const intermediate = this.generateIntermediate(command);
    return {
      ...intermediate,
      allOptions: this.getAllOptions(command),
      edgeCases: this.getEdgeCases(command),
      apiReference: this.getApiReference(command)
    };
  }
}
```

#### Context-Aware Help
- **Command Context**: Shows relevant subcommands and options
- **Error Context**: Provides help specific to current error state
- **Interactive Mode**: Guided help exploration

### Enhanced Error Message System

#### Error Classification
```javascript
const ErrorTypes = {
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  NETWORK: 'network',
  CONFIGURATION: 'configuration',
  TEMPLATE: 'template',
  SYSTEM: 'system'
};

class EnhancedError extends Error {
  constructor(type, code, message, suggestions = [], context = {}) {
    super(message);
    this.type = type;
    this.code = code;
    this.suggestions = suggestions;
    this.context = context;
    this.userMessage = this.generateUserMessage();
  }

  generateUserMessage() {
    const template = ErrorTemplates[this.type];
    return template ? template(this) : this.message;
  }

  toUserFormat() {
    return {
      error: this.userMessage,
      suggestions: this.suggestions,
      documentation: this.getDocumentationLink(),
      context: this.context
    };
  }
}
```

#### Error Templates
```javascript
const ErrorTemplates = {
  [ErrorTypes.VALIDATION]: (error) => `Invalid ${error.context.field}: ${error.message}`,
  [ErrorTypes.TEMPLATE]: (error) => `Template issue: ${error.message}`,
  [ErrorTypes.CONFIGURATION]: (error) => `Configuration problem: ${error.message}`
};
```

### Cross-Tool Integration Design

#### Template Testing Service
```javascript
class TemplateTestingService {
  constructor(registry, scaffoldCommand) {
    this.registry = registry;
    this.scaffoldCommand = scaffoldCommand;
  }

  async testTemplate(templatePath, options = {}) {
    const testProject = await this.createTestProject(templatePath);
    const results = await this.runTestSuite(testProject, options);
    await this.cleanupTestProject(testProject);
    return results;
  }

  async createTestProject(templatePath) {
    const testDir = this.generateTestDirectory();
    const command = new this.scaffoldCommand.constructor({
      template: templatePath,
      projectDirectory: testDir,
      interactive: false,
      // Test-specific options
    });
    await command.execute();
    return testDir;
  }
}
```

#### Shared Configuration Manager
```javascript
class ConfigurationManager {
  constructor() {
    this.sources = [
      { type: 'env', priority: 1 },
      { type: 'user', priority: 2, path: '~/.config/m5nv/config.json' },
      { type: 'project', priority: 3, path: './.m5nv/config.json' },
      { type: 'tool', priority: 4, path: './tool-config.json' }
    ];
  }

  async loadConfiguration(toolName) {
    const configs = await Promise.all(
      this.sources.map(source => this.loadSource(source, toolName))
    );

    return this.mergeConfigurations(configs);
  }

  mergeConfigurations(configs) {
    // Higher priority sources override lower priority
    return configs.reduce((merged, config, index) => {
      const priority = this.sources[index].priority;
      return this.deepMerge(merged, config, priority);
    }, {});
  }
}
```

### Implementation Strategy

#### Phase 2A: Core Infrastructure (Weeks 1-2)

##### Week 1: Progressive Disclosure Foundation
1. **Help Generator Enhancement**
   - Extend existing help generator with disclosure levels
   - Implement context-aware help logic
   - Add help level detection from command line flags

2. **Error Handler Upgrade**
   - Create enhanced error classes
   - Implement error classification system
   - Add suggestion generation logic

##### Week 2: Basic Cross-Tool Integration
1. **Template Testing Service**
   - Create testing service interface
   - Implement basic test project creation
   - Add test result reporting

2. **Configuration Foundation**
   - Design configuration schema
   - Implement basic configuration loading
   - Add environment variable support

#### Phase 2B: Advanced Features (Weeks 3-4)

##### Week 3: Advanced Help & Error Features
1. **Interactive Help Mode**
   - Implement interactive help navigation
   - Add context-sensitive suggestions
   - Create help topic browsing

2. **Advanced Error Handling**
   - Implement error correlation across tools
   - Add documentation linking
   - Enhance suggestion algorithms

##### Week 4: Unified Configuration
1. **Configuration Manager**
   - Complete configuration schema
   - Implement migration from old formats
   - Add configuration validation

2. **Cross-Tool Integration**
   - Enhance template testing service
   - Implement shared registry integration
   - Add cross-tool command suggestions

#### Phase 2C: Polish & Validation (Weeks 5-6)

##### Week 5: Performance & Polish
1. **Performance Optimization**
   - Profile and optimize startup time
   - Implement lazy loading where beneficial
   - Add performance monitoring

2. **User Experience Polish**
   - Refine help text and messaging
   - Improve error message clarity
   - Enhance interactive modes

##### Week 6: Testing & Documentation
1. **Comprehensive Testing**
   - End-to-end workflow testing
   - Cross-tool integration testing
   - Performance regression testing

2. **Documentation Completion**
   - User guide updates
   - API documentation
   - Migration guides

### Technical Specifications

#### Performance Requirements
- **Startup Time**: < 500ms cold, < 200ms warm
- **Memory Usage**: < 50MB peak for typical operations
- **Help Generation**: < 100ms for basic help, < 500ms for advanced

#### Compatibility Requirements
- **Node.js**: ESM-only, Node 18+
- **Platforms**: Windows, macOS, Linux
- **Shells**: bash, zsh, PowerShell, cmd

#### Security Considerations
- **Input Validation**: Comprehensive sanitization
- **Path Security**: Prevent traversal attacks
- **Command Injection**: Safe shell execution
- **Configuration Security**: Secure credential handling

### Risk Mitigation

#### Technical Risks
1. **Performance Regression**
   - **Detection**: Automated performance tests
   - **Mitigation**: Incremental changes with profiling
   - **Recovery**: Feature flags for rollback

2. **Cross-Tool Complexity**
   - **Detection**: Integration tests
   - **Mitigation**: Clear interface contracts
   - **Recovery**: Isolated feature development

3. **Configuration Conflicts**
   - **Detection**: Configuration validation
   - **Mitigation**: Clear precedence rules
   - **Recovery**: Configuration reset options

#### Operational Risks
1. **Backward Compatibility**
   - **Detection**: Comprehensive compatibility testing
   - **Mitigation**: Deprecation warnings and migration guides
   - **Recovery**: Feature flags for legacy support

2. **User Adoption**
   - **Detection**: Usage analytics and feedback
   - **Mitigation**: Clear documentation and examples
   - **Recovery**: Iterative improvements based on feedback

### Testing Strategy

#### Unit Testing
- **Coverage Target**: > 90% for new components
- **Focus Areas**: Error handling, configuration, help generation
- **Tools**: Node.js test runner with coverage reporting

#### Integration Testing
- **Cross-Tool Workflows**: Template testing, configuration sync
- **End-to-End Scenarios**: Complete user journeys
- **Performance Testing**: Startup time and memory usage

#### User Acceptance Testing
- **Workflow Validation**: Real user scenarios
- **Error Message Testing**: Clarity and helpfulness
- **Help System Testing**: Discoverability and usability

### Deployment Strategy

#### Incremental Rollout
1. **Feature Flags**: Enable new features gradually
2. **Backward Compatibility**: Maintain legacy support
3. **Monitoring**: Track usage and performance metrics
4. **Rollback Plan**: Quick reversion capability

#### Migration Support
1. **Deprecation Warnings**: Guide users to new patterns
2. **Migration Tools**: Automated configuration updates
3. **Documentation**: Clear migration guides
4. **Support**: Help for complex migrations

### Success Metrics

#### Technical Metrics
- Performance benchmarks met
- Test coverage > 90%
- Zero critical security issues
- Backward compatibility maintained

#### User Experience Metrics
- Help discoverability score > 85%
- Error message clarity score > 90%
- User satisfaction > 4.0/5.0
- Support ticket reduction > 50%

#### Business Metrics
- Feature adoption rate > 70%
- Development velocity maintained
- Maintenance cost reduction
- Ecosystem cohesion improved

### Approval Criteria

#### Technical Review
- Architecture approved by engineering leads
- Performance benchmarks validated
- Security review completed
- Testing strategy approved

#### Product Review
- Requirements traceability confirmed
- User experience validated
- Success metrics approved
- Risk assessment accepted

#### Implementation Ready
- Development environment prepared
- Team capacity allocated
- Timeline approved
- Success criteria measurable