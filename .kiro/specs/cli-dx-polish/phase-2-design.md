# CLI DX Polish - Phase 2 Design

## Overview
Phase 2 design builds on the Phase 1 foundation to implement progressive disclosure, enhanced error messages, and cross-tool integration. This document outlines the technical architecture and implementation approach.

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Ecosystem                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ create-scaffold │  │ make-template   │  │ shared-libs │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           │                     │                 │         │
│           └─────────────────────┼─────────────────┘         │
│                                 │                           │
│                    ┌────────────┴────────────┐              │
│                    │   Cross-Tool Services   │              │
│                    │                         │              │
│                    │ • Template Registry     │              │
│                    │ • Configuration Manager │              │
│                    │ • Error Handler         │              │
│                    │ • Help Generator        │              │
│                    └─────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### Shared Libraries (`lib/shared/`)
- **Error Handler**: Centralized error processing and user-friendly messaging
- **Help Generator**: Progressive disclosure help system
- **Configuration Manager**: Unified configuration across tools
- **Template Registry**: Cross-tool template discovery and management

#### Cross-Tool Services
- **Template Testing Service**: Enables make-template to test with create-scaffold
- **Configuration Sync**: Shared configuration management
- **Error Correlation**: Consistent error handling across tools

## Design Decisions

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

## Implementation Strategy

### Phase 2A: Core Infrastructure (Weeks 1-2)

#### Week 1: Progressive Disclosure Foundation
1. **Help Generator Enhancement**
   - Extend existing help generator with disclosure levels
   - Implement context-aware help logic
   - Add help level detection from command line flags

2. **Error Handler Upgrade**
   - Create enhanced error classes
   - Implement error classification system
   - Add suggestion generation logic

#### Week 2: Basic Cross-Tool Integration
1. **Template Testing Service**
   - Create testing service interface
   - Implement basic test project creation
   - Add test result reporting

2. **Configuration Foundation**
   - Design configuration schema
   - Implement basic configuration loading
   - Add environment variable support

### Phase 2B: Advanced Features (Weeks 3-4)

#### Week 3: Advanced Help & Error Features
1. **Interactive Help Mode**
   - Implement interactive help navigation
   - Add context-sensitive suggestions
   - Create help topic browsing

2. **Advanced Error Handling**
   - Implement error correlation across tools
   - Add documentation linking
   - Enhance suggestion algorithms

#### Week 4: Unified Configuration
1. **Configuration Manager**
   - Complete configuration schema
   - Implement migration from old formats
   - Add configuration validation

2. **Cross-Tool Integration**
   - Enhance template testing service
   - Implement shared registry integration
   - Add cross-tool command suggestions

### Phase 2C: Polish & Validation (Weeks 5-6)

#### Week 5: Performance & Polish
1. **Performance Optimization**
   - Profile and optimize startup time
   - Implement lazy loading where beneficial
   - Add performance monitoring

2. **User Experience Polish**
   - Refine help text and messaging
   - Improve error message clarity
   - Enhance interactive modes

#### Week 6: Testing & Documentation
1. **Comprehensive Testing**
   - End-to-end workflow testing
   - Cross-tool integration testing
   - Performance regression testing

2. **Documentation Completion**
   - User guide updates
   - API documentation
   - Migration guides

## Technical Specifications

### Performance Requirements
- **Startup Time**: < 500ms cold, < 200ms warm
- **Memory Usage**: < 50MB peak for typical operations
- **Help Generation**: < 100ms for basic help, < 500ms for advanced

### Compatibility Requirements
- **Node.js**: ESM-only, Node 18+
- **Platforms**: Windows, macOS, Linux
- **Shells**: bash, zsh, PowerShell, cmd

### Security Considerations
- **Input Validation**: Comprehensive sanitization
- **Path Security**: Prevent traversal attacks
- **Command Injection**: Safe shell execution
- **Configuration Security**: Secure credential handling

## Risk Mitigation

### Technical Risks
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

### Operational Risks
1. **Backward Compatibility**
   - **Detection**: Comprehensive compatibility testing
   - **Mitigation**: Deprecation warnings and migration guides
   - **Recovery**: Feature flags for legacy support

2. **User Adoption**
   - **Detection**: Usage analytics and feedback
   - **Mitigation**: Clear documentation and examples
   - **Recovery**: Iterative improvements based on feedback

## Testing Strategy

### Unit Testing
- **Coverage Target**: > 90% for new components
- **Focus Areas**: Error handling, configuration, help generation
- **Tools**: Node.js test runner with coverage reporting

### Integration Testing
- **Cross-Tool Workflows**: Template testing, configuration sync
- **End-to-End Scenarios**: Complete user journeys
- **Performance Testing**: Startup time and memory usage

### User Acceptance Testing
- **Workflow Validation**: Real user scenarios
- **Error Message Testing**: Clarity and helpfulness
- **Help System Testing**: Discoverability and usability

## Deployment Strategy

### Incremental Rollout
1. **Feature Flags**: Enable new features gradually
2. **Backward Compatibility**: Maintain legacy support
3. **Monitoring**: Track usage and performance metrics
4. **Rollback Plan**: Quick reversion capability

### Migration Support
1. **Deprecation Warnings**: Guide users to new patterns
2. **Migration Tools**: Automated configuration updates
3. **Documentation**: Clear migration guides
4. **Support**: Help for complex migrations

## Success Metrics

### Technical Metrics
- Performance benchmarks met
- Test coverage > 90%
- Zero critical security issues
- Backward compatibility maintained

### User Experience Metrics
- Help discoverability score > 85%
- Error message clarity score > 90%
- User satisfaction > 4.0/5.0
- Support ticket reduction > 50%

### Business Metrics
- Feature adoption rate > 70%
- Development velocity maintained
- Maintenance cost reduction
- Ecosystem cohesion improved

## Approval Criteria

### Technical Review
- Architecture approved by engineering leads
- Performance benchmarks validated
- Security review completed
- Testing strategy approved

### Product Review
- Requirements traceability confirmed
- User experience validated
- Success metrics approved
- Risk assessment accepted

### Implementation Ready
- Development environment prepared
- Team capacity allocated
- Timeline approved
- Success criteria measurable