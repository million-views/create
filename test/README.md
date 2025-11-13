# CLI Test Suite Documentation

This directory contains comprehensive functional tests for the @m5nv/create-scaffold CLI tool. The tests follow a Test-First Development approach and cover all specified functionality.

## Directory Structure

The test suite is organized to support monorepo development with clear tool boundaries:

```text
test/
├── create-scaffold/     # Tests specific to create-scaffold tool
│   ├── argument-parser.test.mjs
│   ├── cache-manager.test.mjs
│   ├── cli-integration.test.mjs
│   ├── cli.test.mjs
│   ├── config-loader.test.mjs
│   ├── dry-run-engine.test.mjs
│   ├── environment-factory.test.mjs
│   ├── interactive-session.test.mjs
│   ├── logger.test.mjs
│   ├── placeholder-resolver.test.mjs
│   ├── resource-leak-test.mjs
│   ├── setup-runtime.test.mjs
│   ├── spec-compliance-verification.mjs
│   └── template-discovery.test.mjs
├── shared/              # Tests for shared utilities and libraries
│   ├── canonical-variables.test.mjs
│   ├── interactive-utils.test.mjs
│   ├── options-processor.test.mjs
│   ├── placeholder-schema.test.mjs
│   ├── schema-build.test.mjs
│   ├── security.test.mjs
│   ├── template-metadata-placeholders.test.mjs
│   └── template-validator.test.mjs
├── fixtures/            # Test fixtures and mock data
├── utils/               # Test utilities and helpers
│   ├── cli.js
│   ├── resources.js
│   └── temp.js
└── README.md           # This documentation
```

### Tool-Specific Organization

- **`create-scaffold/`**: Contains all tests specific to the create-scaffold CLI tool functionality
- **`shared/`**: Contains tests for utilities and libraries shared across multiple tools in the monorepo
- **`fixtures/`**: Mock repositories, templates, and test data used by multiple test suites
- **`utils/`**: Helper functions and utilities for test execution and resource management

This structure prevents test collisions when additional tools (like `make-template`) are added to the monorepo.

## Test Coverage

### Argument Parsing Tests

- **Help flag functionality**: Verifies `--help` and `-h` flags display usage information
- **Missing arguments**: Tests error handling for missing project directory and template
- **Argument aliases**: Validates short flag aliases work correctly
- **Long arguments**: Tests handling of overly long argument values

### Input Validation and Security Tests

- **Path traversal prevention**: Tests blocking of `../` sequences in project directories and template names
- **Invalid characters**: Validates rejection of path separators and special characters
- **Reserved names**: Tests rejection of reserved directory names like `node_modules`
- **Empty values**: Validates handling of empty template names
- **Null byte protection**: Verifies system-level protection against null bytes

### Repository and URL Validation Tests

- **Invalid repository formats**: Tests rejection of malformed repository URLs
- **Repository accessibility**: Validates detection of nonexistent repositories
- **Branch validation**: Tests detection of nonexistent branches
- **Local repository support**: Verifies local repository path handling

### Security and Injection Prevention Tests

- **Branch name injection**: Tests blocking of command injection in branch names
- **URL validation**: Validates repository URL format and security checks
- **Error message sanitization**: Verifies error messages don't leak sensitive information

### Preflight Checks Tests

- **Git installation**: Verifies git availability and configuration
- **Directory conflicts**: Tests detection of existing directories
- **Permission checks**: Validates write permissions and access rights
- **Multiple validation errors**: Tests reporting of multiple issues together

### File Operations Tests

- **Template copying**: Tests secure file copying with boundary validation
- **Symlink protection**: Verifies protection against symlink attacks
- **Cleanup on failure**: Tests proper cleanup of temporary directories
- **Permission handling**: Validates file operation security

### Setup Script Tests

- **Script discovery**: Tests finding `_setup.mjs` in template root
- **Script execution**: Validates dynamic import execution with proper context
- **Context passing**: Tests correct context object (projectDirectory, projectName, cwd)
- **Script cleanup**: Verifies automatic removal after successful execution
- **Error handling**: Tests graceful handling of setup script failures

### End-to-End Integration Tests

- **Successful creation**: Tests complete workflow with local repository
- **Template validation**: Verifies template existence checking
- **Git operations**: Tests cloning, branch handling, and error scenarios
- **User experience**: Validates progress indicators and success messages

### Error Handling Tests

- **Exit codes**: Tests appropriate exit codes for different scenarios
- **Error categorization**: Validates different error types and messages
- **Graceful degradation**: Tests handling of various failure modes
- **User guidance**: Verifies actionable error messages and instructions

## Test Structure

### Test Utilities (`TestUtils` class)

- `createTempDir()`: Creates secure temporary directories for testing
- `cleanup()`: Removes temporary files and directories
- `execCLI()`: Executes CLI with timeout and error handling
- `createMockRepo()`: Creates mock git repositories with templates
- `execCommand()`: Executes system commands with proper error handling

### Test Runner (`TestRunner` class)

- Manages test execution and reporting
- Handles cleanup of temporary resources
- Provides detailed pass/fail reporting
- Manages test timeouts and error handling

## Running Tests

For complete testing commands and workflows, see the [Testing Reference](../docs/reference/testing.md).

### Quick Reference

```bash
# Run all tests
npm test

# Run quick test suite (recommended for development)
npm run test:quick

# Run specific test suites in isolation
npm run test:smoke          # Run only smoke tests
npm run test:functional     # Run only functional tests
npm run test:integration    # Run only CLI integration tests
npm run test:spec           # Run only spec compliance tests

# Run any test suite by name
npm run test:suite "Security Tests"
npm run test:suite "Template Validator Tests"
```

See the [Testing Reference](../docs/reference/testing.md) for the complete list of available test suites and detailed usage instructions.

### Available Test Suites

The test runner supports running individual test suites for focused development and debugging:

- **Environment Factory Tests** - Environment creation and metadata validation
- **Argument Parser Tests** - CLI argument parsing and validation
- **Interactive Utils Tests** - Interactive trigger heuristics and environment control
- **Options Processor Tests** - Normalization of CLI options against template dimensions
- **Setup Runtime Tests** - Sandbox and tools runtime verification
- **Security Tests** - Security validation for new IDE and features parameters
- **Functional Tests** - Comprehensive end-to-end CLI behavior validation
- **Template Schema Build Tests** - Deterministic generation of schema types and runtime stubs
- **Template Validator Tests** - Runtime manifest validation aligned with schema constraints
- **CLI Integration Tests** - Phase 1 feature integration coverage for CLI flags
- **Spec Compliance Tests** - Verification against all specification requirements
- **Resource Leak Tests** - Resource management and cleanup validation
- **Smoke Tests** - Production readiness and integration validation

## Test Requirements

### Prerequisites

- Node.js 22+ (ESM support)
- Git installed and configured
- Write permissions in current directory
- Network access for repository validation tests

### Test Environment

- Tests create temporary directories with predictable names
- All temporary resources are cleaned up automatically
- Tests are isolated and can run in any order
- No external dependencies beyond git and Node.js built-ins

## Test Patterns

### Security Testing

All security tests follow the pattern:

1. Attempt malicious input
2. Verify rejection with appropriate error
3. Ensure no system compromise
4. Validate error message safety

### Integration Testing

End-to-end tests follow the pattern:

1. Create isolated test environment
2. Execute complete CLI workflow
3. Verify expected outcomes
4. Clean up all resources

### Error Testing

Error handling tests follow the pattern:

1. Trigger specific error condition
2. Verify appropriate exit code
3. Check error message content
4. Ensure graceful failure

## Maintenance

### Adding New Tests

1. Follow existing naming conventions
2. Use `TestUtils` for common operations
3. Always clean up temporary resources
4. Include both positive and negative test cases
5. Document test purpose and coverage

### Updating Tests

1. Implement optimal test design
2. Update documentation when changing behavior
3. Ensure all edge cases are covered
4. Verify tests pass in clean environment

## Security Considerations

The test suite itself follows security best practices:

- No hardcoded credentials or sensitive data
- Temporary files use secure random names
- All network operations use safe, public repositories
- Error messages are validated for information disclosure
- File operations are bounded to test directories

## Performance

Tests are designed to complete within reasonable time limits:

- Individual test timeout: 30 seconds
- Quick test suite runtime: ~10-15 seconds
- Full test suite runtime: ~2-5 minutes (depending on network)
- Parallel execution where possible
- Efficient cleanup and resource management
