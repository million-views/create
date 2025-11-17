# Design: Make-Template Authoring Sprint

## Executive Summary

This design outlines a focused sprint to make `make-template` production-ready for template authors. The approach emphasizes code reuse, technical debt elimination, and incremental improvement while maintaining architectural consistency.

## Design Philosophy

### Core Principles
1. **Code Reuse First** - Leverage existing shared utilities and infrastructure
2. **Incremental Enhancement** - Build upon current implementation without breaking changes
3. **Quality over Features** - Focus on reliability and usability over new functionality
4. **Template Author Centric** - Optimize for the template authoring workflow

### Architectural Alignment
- Maintain compatibility with existing template schema V1.0.0
- Use established CLI patterns and shared components
- Follow security and validation best practices
- Preserve backward compatibility

## System Architecture

### Current Architecture Review

```text
make-template/
├── index.mjs              # Main CLI entry point
├── command-router.mjs     # Command routing logic
└── commands/
    ├── convert.mjs        # Project → Template conversion
    ├── restore.mjs        # Template → Project restoration
    ├── init.mjs          # Skeleton template generation
    ├── validate.mjs      # Template validation
    ├── hints.mjs         # Authoring guidance
    └── test.mjs          # Cross-tool testing (NOT REGISTERED)
```

### Shared Infrastructure Leverage

#### CLI Framework Components (`lib/cli/`)
- **help-generator.mjs** - Progressive disclosure help system
- **config-manager.mjs** - Unified configuration management
- **error-handler.mjs** - Consistent error formatting
- **argument-parser.mjs** - Standardized argument parsing

#### Shared Utilities (`lib/shared/`)
- **ontology.mjs** - Unified terminology and constants
- **template-testing-service.mjs** - Cross-tool testing infrastructure
- **error-handler.mjs** - Enhanced error classification

### Proposed Architecture Enhancements

```text
make-template/ (Enhanced)
├── index.mjs              # Main CLI entry point
├── command-router.mjs     # Command routing logic (ADD test.mjs)
└── commands/
    ├── convert.mjs        # Project → Template conversion
    ├── restore.mjs        # Template → Project restoration
    ├── init.mjs          # Skeleton template generation
    ├── validate.mjs      # Template validation (ENHANCED)
    ├── hints.mjs         # Authoring guidance
    └── test.mjs          # Cross-tool testing (REGISTER)
```

## Component Design

### 1. Command Router Enhancement

#### Current Issue
The `test.mjs` command exists but is not registered in `command-router.mjs`.

#### Solution
```javascript
// command-router.mjs - Add test command registration
this.commands = {
  [TERMINOLOGY.COMMAND.CONVERT]: () => import('./commands/convert.mjs'),
  [TERMINOLOGY.COMMAND.RESTORE]: () => import('./commands/restore.mjs'),
  [TERMINOLOGY.COMMAND.INIT]: () => import('./commands/init.mjs'),
  [TERMINOLOGY.COMMAND.VALIDATE]: () => import('./commands/validate.mjs'),
  [TERMINOLOGY.COMMAND.HINTS]: () => import('./commands/hints.mjs'),
  [TERMINOLOGY.COMMAND.TEST]: () => import('./commands/test.mjs'),  // ADD THIS
};
```

### 2. Test Command Integration

#### Current State
- `test.mjs` implements `TemplateTestingService` integration
- Provides cross-tool validation workflow
- Supports verbose output and temporary directory management

#### Enhancement Plan
- Register command in router
- Add comprehensive error handling
- Improve user feedback and progress reporting
- Ensure proper cleanup of test artifacts

### 3. Test Coverage Expansion

#### Current Coverage Analysis
- `validate` command: Comprehensive test suite ✅
- `init` command: Basic functionality tested ⚠️
- `convert` command: Limited integration tests ⚠️
- `restore` command: Limited integration tests ⚠️
- `hints` command: Not tested ❌
- `test` command: Not registered, no tests ❌

#### Test Infrastructure Enhancement
```javascript
// Enhanced test structure
test/
├── make-template/
│   ├── cli-integration.test.mjs    # Existing validate tests
│   ├── convert-integration.test.mjs    # NEW: Convert workflow tests
│   ├── restore-integration.test.mjs    # NEW: Restore workflow tests
│   ├── init-integration.test.mjs       # NEW: Init command tests
│   ├── hints-integration.test.mjs      # NEW: Hints command tests
│   └── test-integration.test.mjs       # NEW: Test command tests
└── fixtures/
    ├── template-projects/           # Sample projects for conversion testing
    ├── valid-templates/             # Valid template examples
    └── invalid-templates/           # Invalid template examples for validation testing
```

### 4. Code Reuse Opportunities

#### Shared Validation Logic
```javascript
// Consolidate validation patterns
import { validateTemplateManifest } from '../../../lib/shared/template-validator.mjs';

// Use shared validation instead of command-specific logic
const validationResult = await validateTemplateManifest(templatePath, {
  strict: true,
  schemaVersion: '1.0.0'
});
```

#### Shared Error Handling
```javascript
// Use shared error handler for consistency
import { ErrorHandler } from '../../../lib/shared/error-handler.mjs';

try {
  await performOperation();
} catch (error) {
  ErrorHandler.handle(error, {
    context: ErrorContext.TEMPLATE_AUTHORING,
    command: commandName
  });
}
```

#### Shared CLI Utilities
```javascript
// Leverage shared CLI components
import { HelpGenerator } from '../../../lib/cli/help-generator.mjs';
import { ConfigManager } from '../../../lib/cli/config-manager.mjs';

// Use shared help generation
const helpText = HelpGenerator.generate({
  command: 'convert',
  level: 'intermediate',
  includeExamples: true
});
```

### 5. Documentation Enhancement

#### Template Author Documentation Structure
```text
docs/
├── template-authoring/
│   ├── getting-started.md          # Quick start guide
│   ├── convert-workflow.md         # Project conversion guide
│   ├── validation-guide.md         # Template validation
│   ├── testing-guide.md           # Cross-tool testing
│   ├── best-practices.md          # Authoring best practices
│   └── troubleshooting.md         # Common issues and solutions
└── cli-reference/
    └── make-template.md           # Complete command reference
```

#### Progressive Documentation Strategy
1. **Basic Level**: Essential commands and workflows
2. **Intermediate Level**: Advanced options and configuration
3. **Advanced Level**: API usage and customization

## Implementation Strategy

### Phase 1: Infrastructure Fixes (Week 1)
1. Register test command in command router
2. Fix any command registration issues
3. Ensure all commands are discoverable via help

### Phase 2: Test Coverage Expansion (Week 2)
1. Add integration tests for convert command
2. Add integration tests for restore command
3. Add integration tests for init command
4. Add integration tests for hints command
5. Add integration tests for test command

### Phase 3: Code Quality & Reuse (Week 3)
1. Audit for code duplication opportunities
2. Refactor to use shared utilities
3. Improve error handling consistency
4. Enhance user feedback and messaging

### Phase 4: Documentation & Validation (Week 4)
1. Update CLI help text and examples
2. Enhance template authoring documentation
3. Validate all functionality works end-to-end
4. Performance testing and optimization

## Quality Assurance Strategy

### Testing Approach
- **Unit Tests**: Individual function and module testing
- **Integration Tests**: End-to-end command workflows
- **Cross-tool Tests**: make-template ↔ create-scaffold integration
- **Performance Tests**: Command execution time validation

### Code Quality Gates
- **Test Coverage**: >90% for all commands
- **Linting**: Zero ESLint violations
- **Type Checking**: TypeScript validation passes
- **Security**: No new vulnerabilities introduced

### Validation Criteria
- All commands work reliably
- Error messages are clear and actionable
- Performance meets requirements
- Documentation is accurate and complete

## Risk Mitigation

### Technical Risks
1. **Command Registration Issues**
   - Mitigation: Test command registration immediately
   - Fallback: Manual command verification

2. **Test Coverage Gaps**
   - Mitigation: Write tests incrementally
   - Fallback: Focus on critical path coverage first

3. **Integration Complexity**
   - Mitigation: Test cross-tool workflows early
   - Fallback: Isolate integration points

### Schedule Risks
1. **Scope Creep**
   - Mitigation: Strict adherence to requirements
   - Fallback: Defer non-critical enhancements

2. **Technical Debt Discovery**
   - Mitigation: Allocate time for refactoring
   - Fallback: Prioritize critical fixes

## Success Metrics

### Functional Completeness
- [ ] All 5 core commands work reliably
- [ ] Test command provides cross-tool validation
- [ ] All commands have >90% test coverage
- [ ] Documentation covers all features

### Quality Metrics
- [ ] Zero critical bugs in production
- [ ] Performance requirements met
- [ ] Code follows established patterns
- [ ] Shared utilities used appropriately

### User Experience
- [ ] Clear error messages and help text
- [ ] Consistent CLI behavior
- [ ] Progressive feature discovery
- [ ] Template authoring workflow optimized

## Migration & Compatibility

### Backward Compatibility
- Maintain existing command interfaces
- Preserve current template schema support
- Keep existing configuration options
- Ensure cross-tool compatibility

### Migration Strategy
- No breaking changes to existing functionality
- Gradual enhancement of existing commands
- Optional adoption of new features
- Clear upgrade path for template authors

## Approval Criteria

This design is ready for approval when:
- [ ] All architectural decisions are documented
- [ ] Implementation strategy is clear and achievable
- [ ] Risk mitigation strategies are comprehensive
- [ ] Success metrics are measurable
- [ ] Code reuse opportunities are identified
- [ ] Quality assurance approach is defined