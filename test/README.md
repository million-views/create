# CLI Test Suite Documentation

This directory contains comprehensive functional tests for the @m5nv/create CLI tool. The tests follow a Test-First Development approach and cover all specified functionality.

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

```bash
# Run all tests
npm test

# Run with verbose output
node test/cli.test.mjs

# Run specific test (modify the test file to comment out others)
# Edit test/cli.test.mjs and comment out unwanted tests
```

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

1. Maintain backward compatibility
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
- Total suite runtime: ~2-5 minutes (depending on network)
- Parallel execution where possible
- Efficient cleanup and resource management
