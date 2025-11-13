# Requirements Document

## Introduction

The @m5nv/create CLI tool needs to be updated to fully comply with the specification requirements and security guidelines. The current implementation uses minimist for argument parsing (against spec requirements), lacks comprehensive input validation, has incorrect package.json bin entry, and needs enhanced security measures and error handling.

## Glossary

- **CLI Tool**: The @m5nv/create command-line interface application
- **Template Repository**: A git repository containing project templates in subdirectories
- **Setup Script**: An optional _setup.mjs file within templates for post-copy customization
- **Preflight Checks**: Validation steps performed before main operations
- **Input Sanitization**: Process of validating and cleaning user-provided input
- **Path Traversal**: Security vulnerability allowing access to files outside intended directories

## Requirements

### Requirement 1

**User Story:** As a developer, I want the CLI tool to use native Node.js argument parsing instead of external dependencies, so that the tool has minimal dependencies and follows the specification requirements.

#### Acceptance Criteria

1. THE CLI_Tool SHALL replace minimist with util.parseArgs for argument parsing
2. THE CLI_Tool SHALL maintain backward compatibility with existing argument formats
3. THE CLI_Tool SHALL support all current flags (--template, --repo, --branch) with their aliases
4. THE CLI_Tool SHALL validate argument types and provide clear error messages for invalid inputs
5. THE CLI_Tool SHALL handle both positional and named arguments correctly

### Requirement 2

**User Story:** As a security-conscious user, I want comprehensive input validation and sanitization, so that the tool is protected against malicious inputs and path traversal attacks.

#### Acceptance Criteria

1. THE CLI_Tool SHALL validate all user-provided file paths to prevent directory traversal attacks
2. THE CLI_Tool SHALL sanitize repository URLs to prevent malicious redirects
3. THE CLI_Tool SHALL validate branch names against injection attacks
4. THE CLI_Tool SHALL restrict write operations to intended project directories only
5. THE CLI_Tool SHALL validate template names to prevent path traversal

### Requirement 3

**User Story:** As a user, I want the package.json bin entry to point to the correct file, so that the CLI tool can be executed properly when installed.

#### Acceptance Criteria

1. THE CLI_Tool SHALL update package.json bin entry to point to "./bin/index.mjs"
2. THE CLI_Tool SHALL ensure the bin file has proper executable permissions
3. THE CLI_Tool SHALL maintain the correct shebang line for Node.js execution
4. THE CLI_Tool SHALL work correctly with both npm create and npx invocation methods

### Requirement 4

**User Story:** As a user, I want comprehensive preflight checks before operations begin, so that I receive clear feedback about any issues that would prevent successful execution.

#### Acceptance Criteria

1. THE CLI_Tool SHALL verify git installation and availability in PATH
2. THE CLI_Tool SHALL validate all required arguments are provided
3. THE CLI_Tool SHALL check target directory existence and handle conflicts appropriately
4. THE CLI_Tool SHALL validate repository URL format and accessibility
5. THE CLI_Tool SHALL verify branch existence when specified

### Requirement 5

**User Story:** As a user, I want clear help text and error messages, so that I can understand how to use the tool correctly and resolve any issues.

#### Acceptance Criteria

1. THE CLI_Tool SHALL provide comprehensive help text when --help flag is used
2. THE CLI_Tool SHALL display usage examples for both npm create and npx methods
3. THE CLI_Tool SHALL provide specific error messages for each type of failure
4. THE CLI_Tool SHALL include actionable instructions in error messages
5. THE CLI_Tool SHALL use consistent formatting and visual cues in output

### Requirement 6

**User Story:** As a template author, I want setup script execution to match the specification exactly, so that templates can perform post-copy customization reliably.

#### Acceptance Criteria

1. THE CLI_Tool SHALL look for `_setup.mjs` in the root of the copied template directory
2. THE CLI_Tool SHALL execute setup scripts using dynamic import() method
3. THE CLI_Tool SHALL pass correct context (projectDirectory, projectName) to setup scripts
4. THE CLI_Tool SHALL handle setup script failures gracefully with warnings
5. THE CLI_Tool SHALL remove setup scripts after successful execution

### Requirement 7

**User Story:** As a security administrator, I want the tool to follow secure coding practices, so that it doesn't introduce security vulnerabilities in user environments.

#### Acceptance Criteria

1. THE CLI_Tool SHALL use secure temporary directory creation with proper cleanup
2. THE CLI_Tool SHALL sanitize error messages to prevent information disclosure
3. THE CLI_Tool SHALL validate all file operations to prevent unauthorized access
4. THE CLI_Tool SHALL use appropriate exit codes without leaking sensitive information
5. THE CLI_Tool SHALL implement fail-secure patterns for all error conditions

### Requirement 8

**User Story:** As a developer, I want the tool to have zero external runtime dependencies, so that it has minimal attack surface and faster installation.

#### Acceptance Criteria

1. THE CLI_Tool SHALL remove minimist dependency from package.json
2. THE CLI_Tool SHALL use only Node.js built-in modules for all functionality
3. THE CLI_Tool SHALL maintain all current functionality without external dependencies
4. THE CLI_Tool SHALL use fs/promises for async file operations
5. THE CLI_Tool SHALL use child_process for git command execution