# Design Document

## Overview

This design document outlines the architectural changes needed to update the @m5nv/create CLI tool for full specification compliance, enhanced security, and zero external dependencies. The design focuses on replacing minimist with native Node.js argument parsing, implementing comprehensive input validation, and ensuring secure file operations.

## Architecture

### Core Components

1. **Argument Parser Module** - Native util.parseArgs implementation
2. **Input Validator Module** - Comprehensive input sanitization and validation
3. **Security Module** - Path traversal prevention and secure operations
4. **Git Operations Module** - Secure git command execution
5. **File Operations Module** - Safe file system operations with proper cleanup
6. **Setup Script Executor** - Secure template setup script execution

### Data Flow

```
CLI Input → Argument Parsing → Input Validation → Preflight Checks → 
Git Clone → Template Verification → File Copy → Setup Execution → Cleanup
```

## Components and Interfaces

### 1. Argument Parser (`parseArguments`)

**Purpose:** Replace minimist with native Node.js argument parsing

**Interface:**
```javascript
function parseArguments(argv) {
  // Returns: { projectDirectory, template, repo, branch, help }
}
```

**Implementation Details:**
- Use `util.parseArgs` with proper configuration
- Support positional arguments for project directory
- Handle --help flag with comprehensive usage information
- Maintain backward compatibility with existing flag names and aliases
- Validate argument types and combinations

### 2. Input Validator (`validateInputs`)

**Purpose:** Comprehensive input sanitization and security validation

**Interface:**
```javascript
function validateInputs({ projectDirectory, template, repo, branch }) {
  // Returns: validated and sanitized inputs
  // Throws: ValidationError for invalid inputs
}
```

**Security Measures:**
- Path traversal prevention using path.resolve() and boundary checks
- Repository URL validation against malicious patterns
- Branch name sanitization against injection attacks
- Template name validation to prevent directory traversal
- Project directory name validation

### 3. Security Module (`security.js`)

**Purpose:** Centralized security utilities and validation functions

**Functions:**
- `sanitizePath(inputPath, allowedBase)` - Prevent path traversal
- `validateRepoUrl(url)` - Validate repository URL format
- `sanitizeBranchName(branch)` - Validate git branch names
- `createSecureTempDir()` - Create secure temporary directories
- `sanitizeErrorMessage(error)` - Remove sensitive info from errors

### 4. Git Operations (`gitOperations.js`)

**Purpose:** Secure git command execution with proper error handling

**Interface:**
```javascript
async function cloneRepository({ repoUrl, branch, tempDir }) {
  // Returns: path to cloned repository
}

async function checkGitInstallation() {
  // Throws: Error if git not available
}
```

**Security Features:**
- Command injection prevention
- Timeout handling for git operations
- Secure temporary directory usage
- Comprehensive error message sanitization

### 5. File Operations (`fileOperations.js`)

**Purpose:** Safe file system operations with security boundaries

**Interface:**
```javascript
async function copyTemplate(sourcePath, destPath) {
  // Secure recursive copy with validation
}

async function checkProjectDirectory(projectDir) {
  // Validate target directory status
}

async function cleanupTempDirectory(tempDir) {
  // Secure cleanup with error handling
}
```

**Security Features:**
- Boundary validation for all file operations
- Symlink attack prevention
- Proper error handling and cleanup
- Permission validation

### 6. Setup Script Executor (`setupExecutor.js`)

**Purpose:** Secure execution of template setup scripts

**Interface:**
```javascript
async function executeSetupScript(projectDir, context) {
  // Execute _setup.mjs with proper isolation
}
```

**Security Features:**
- Script execution in project context only
- Proper context passing
- Error isolation and handling
- Automatic cleanup after execution

## Data Models

### Configuration Object
```javascript
{
  projectDirectory: string,    // Validated project directory name
  template: string,           // Validated template name
  repo: string,              // Sanitized repository URL/path
  branch?: string,           // Validated branch name
  tempDir: string,           // Secure temporary directory path
  setupContext: {            // Context for setup scripts
    projectDirectory: string,
    projectName: string,
    cwd: string
  }
}
```

### Validation Result
```javascript
{
  isValid: boolean,
  errors: string[],          // Array of validation error messages
  sanitizedInputs: object    // Cleaned and validated inputs
}
```

## Error Handling

### Error Categories

1. **Validation Errors** - Invalid user input
2. **System Errors** - Git not found, permission issues
3. **Network Errors** - Repository access, authentication
4. **File System Errors** - Directory conflicts, permission issues
5. **Setup Script Errors** - Template setup failures

### Error Response Strategy

- **Fail Fast:** Exit immediately on critical errors
- **Clear Messages:** Provide actionable error information
- **Security:** Sanitize error messages to prevent information disclosure
- **Cleanup:** Ensure temporary resources are cleaned up on failure
- **Exit Codes:** Use appropriate exit codes (0 success, 1 error)

### Error Message Format
```
❌ Error: [Brief description]

[Detailed explanation]

Suggested actions:
  1. [First action]
  2. [Second action]

For more help: [relevant documentation link]
```

## Testing Strategy

### Unit Tests
- Argument parsing with various input combinations
- Input validation with malicious inputs
- Security function validation
- File operation boundary testing
- Error handling scenarios

### Integration Tests
- End-to-end CLI execution with valid inputs
- Git repository cloning with different scenarios
- Template copying and setup script execution
- Error scenarios with proper cleanup

### Security Tests
- Path traversal attack prevention
- Repository URL injection attempts
- Branch name injection testing
- File system boundary validation
- Temporary directory security

### Performance Tests
- Large template repository handling
- Concurrent execution scenarios
- Memory usage during operations
- Cleanup efficiency testing

## Implementation Considerations

### Backward Compatibility
- Maintain existing CLI interface
- Support current flag names and aliases
- Preserve existing behavior for valid use cases
- Provide migration path for any breaking changes

### Security Hardening
- Input validation at every boundary
- Secure defaults for all operations
- Minimal privilege principle
- Comprehensive audit logging

### Error Recovery
- Graceful degradation on non-critical failures
- Automatic cleanup on interruption
- Clear recovery instructions
- State consistency maintenance

### Performance Optimization
- Efficient file operations
- Minimal memory footprint
- Fast startup time
- Optimized git operations