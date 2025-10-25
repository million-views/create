# Development Guide

Complete guide for developing and testing @m5nv/create locally.

## Setup

```bash
# Clone the repository
git clone https://github.com/million-views/create.git
cd create

# Install development dependencies
npm install
```

## Testing the CLI Locally

### 1. npm link (Recommended)

Creates a global symlink for testing the full user experience:

```bash
# Link your local package globally
npm link

# Test as users would use it
npm create @m5nv/create my-test-app -- --template react-vite
npm create @m5nv/create@1.0.0 my-api -- --template express --repo myorg/templates

# Cleanup when done
npm unlink -g @m5nv/create
```

### 2. Local npm Install

Install your local version globally:

```bash
# Install from current directory
npm install -g .

# Use normally
npm create @m5nv/create my-app -- --template some-template

# Uninstall when done
npm uninstall -g @m5nv/create
```

## Running Tests

### Test Suites

```bash
# Run all test suites with unified reporting
npm test

# Run all test suites (same as above)
npm run test:all

# Run quick validation (functional + smoke tests only)
npm run test:quick

# Run individual test suites
npm run test:functional    # 36 end-to-end CLI behavior tests
npm run test:spec         # 32 specification compliance tests
npm run test:leaks        # 4 resource management tests
npm run test:smoke        # 6 production readiness tests
```

### Test Coverage

- **78 total tests** across 4 specialized test suites
- **Functional Tests**: CLI argument parsing, validation, security, git operations
- **Spec Compliance Tests**: Verification against all specification requirements
- **Resource Leak Tests**: Temporary directory cleanup, resource management
- **Smoke Tests**: End-to-end integration and production readiness

### Development Testing

```bash
# Quick validation during development
npm run test:quick

# Lint code
npm run lint

# Run specific test file
node test/cli.test.mjs
node test/spec-compliance-verification.mjs
```

## Code Quality

### Linting

```bash
# Check for lint issues
npm run lint

# The project maintains zero lint warnings
# All code follows strict ESLint rules
```

### Security Standards

- **Zero external dependencies** - Only Node.js built-ins allowed
- **Comprehensive input validation** - All user inputs sanitized
- **Security-first error handling** - No information disclosure
- **Path traversal prevention** - All file operations bounded

## Project Structure

```
create/
├── bin/
│   ├── index.mjs              # Main CLI entry point
│   ├── argumentParser.mjs     # Native argument parsing
│   ├── preflightChecks.mjs    # Validation and checks
│   └── security.mjs           # Input validation and security
├── docs/                      # User documentation
├── scripts/
│   ├── test-runner.mjs        # Unified test coordinator
│   └── smoke-test.mjs         # Production readiness tests
├── test/
│   ├── cli.test.mjs           # Functional tests
│   ├── spec-compliance-verification.mjs
│   └── resource-leak-test.mjs
└── .kiro/specs/               # Development specifications
```

## Development Workflow

### Making Changes

1. **Write tests first** - Add tests for new functionality
2. **Implement changes** - Modify code to pass tests
3. **Run test suite** - Ensure all tests pass
4. **Test locally** - Use `node bin/index.mjs` or `npm link`
5. **Lint code** - Fix any linting issues
6. **Update docs** - Keep documentation current

### Testing Changes

```bash
# Full validation workflow
npm run lint          # Check code quality
npm test             # Run all tests
node bin/index.mjs --help  # Test CLI directly
```

### Debugging

```bash
# Enable debug output (if implemented)
DEBUG=* node bin/index.mjs my-app --template test

# Test specific scenarios
node bin/index.mjs test-debug --template nonexistent  # Error handling
node bin/index.mjs ../test --template hack            # Security validation
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed contribution guidelines, code standards, and pull request process.

## Release Process

### Pre-release Validation

```bash
# Complete validation before release
npm run lint                    # Zero warnings required
npm test                       # All tests must pass
npm run test:spec              # 100% spec compliance required
node bin/index.mjs --help      # Manual CLI validation
```

### Version Management

```bash
# Update version
npm version patch|minor|major

# Tag release
git tag v1.0.0
git push origin v1.0.0
```

## Troubleshooting Development Issues

### Common Development Problems

**Tests failing after changes:**

- Run `npm run test:quick` for faster feedback
- Check specific test output for details
- Ensure all security validations still pass

**CLI not working with npm link:**

- Unlink and relink: `npm unlink -g @m5nv/create && npm link`
- Check global npm modules: `npm list -g --depth=0`

**Permission issues:**

- Ensure bin file is executable: `chmod +x bin/index.mjs`
- Check file permissions in test scenarios

**Git authentication in tests:**

- Tests use mock repositories, not real git operations
- For manual testing, ensure git credentials are configured
