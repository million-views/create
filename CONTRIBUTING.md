# Contributing to @m5nv/create

Hi there! We're thrilled that you'd like to contribute to @m5nv/create. Your contributions help make project scaffolding more secure and accessible for everyone.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Prerequisites

These are one-time installations required to test your changes locally:

1. **Node.js 22+** - [Download from nodejs.org](https://nodejs.org/)
2. **Git** - [Install Git](https://git-scm.com/downloads)
3. **A git provider account** - For testing with template repositories

## Quick Start

```bash
# Fork and clone the repository
git clone https://github.com/million-views/create.git
cd create

# Install development dependencies
npm install

# Run tests to ensure everything works
npm test

# Test the CLI locally
npm link
npm create @m5nv/create my-test-app -- --template react-vite
npm unlink -g @m5nv/create
```

## Development Standards

This project follows strict security and quality standards:

### Code Requirements

- **Zero Dependencies**: No external runtime dependencies allowed
- **ES Modules Only**: Use modern JavaScript patterns and Node.js built-ins
- **Security First**: All code changes undergo security review
- **Comprehensive Testing**: All changes must pass 78+ tests across 4 test suites

### Testing Requirements

```bash
# All tests must pass
npm test                    # Run all 78 tests
npm run test:quick         # Quick validation (42 tests)
npm run lint              # Zero warnings required
```

### Security Standards

- **Input Validation**: All user inputs must be validated and sanitized
- **Path Traversal Prevention**: File operations must be bounded
- **Error Message Sanitization**: No information disclosure
- **Command Injection Prevention**: Safe argument passing only

## Submitting a Pull Request

> **Note:** For large changes that materially impact the CLI functionality, please discuss with maintainers first by opening an issue.

1. **Fork and clone** the repository
2. **Create a branch**: `git checkout -b feature/description`
3. **Make your changes** with tests
4. **Ensure quality**:
   ```bash
   npm run lint          # Fix any linting issues
   npm test             # All tests must pass
   ```
5. **Test locally**:
   ```bash
   npm link
   npm create @m5nv/create test-project -- --template some-template
   npm unlink -g @m5nv/create
   ```
6. **Update documentation** if needed
7. **Submit pull request** with clear description

### What increases acceptance likelihood:

- **Follow project conventions** - Security-first, zero dependencies
- **Write comprehensive tests** - Cover new functionality thoroughly
- **Update documentation** - Keep docs current with changes
- **Keep changes focused** - One feature per PR when possible
- **Write good commit messages** - Clear, descriptive commits
- **Test with real scenarios** - Verify CLI works with actual repositories

## Development Workflow

### Making Changes

1. **Write tests first** - Add tests for new functionality
2. **Implement changes** - Modify code to pass tests
3. **Run full test suite** - Ensure nothing breaks
4. **Test locally** - Use npm link for realistic testing
5. **Update documentation** - Keep all docs current

### Testing Changes

```bash
# Development testing workflow
npm run test:quick        # Fast feedback during development
npm run lint             # Check code quality
npm test                # Full validation before PR

# Local CLI testing
npm link                 # Install locally
npm create @m5nv/create my-test -- --template test-template
npm unlink -g @m5nv/create  # Cleanup
```

### Code Organization

```
create/
├── bin/                 # CLI entry points and core modules
├── docs/               # User documentation
├── test/               # Test suites (functional, spec, leaks, smoke)
├── scripts/            # Development and testing utilities
└── .kiro/specs/        # Development specifications
```

## Types of Contributions

### Bug Fixes
- Security vulnerabilities (report privately first)
- CLI functionality issues
- Documentation errors
- Test failures or gaps

### Features
- New CLI options or functionality
- Enhanced security measures
- Improved error handling
- Better user experience

### Documentation
- Usage examples and guides
- API documentation
- Development guides
- Security best practices

## Testing Your Contributions

### Required Tests

All contributions must maintain:
- **36 functional tests** - CLI behavior validation
- **32 spec compliance tests** - Requirements verification
- **4 resource leak tests** - Resource management
- **6 smoke tests** - Integration validation

### Security Testing

For security-related changes:
- Test path traversal prevention
- Verify input validation
- Check error message sanitization
- Validate command injection prevention

### Manual Testing

Test your changes with real scenarios:
```bash
# Test with public repository
npm create @m5nv/create test-app -- --template react-vite

# Test with custom repository
npm create @m5nv/create test-app -- --template custom --repo your-org/templates

# Test error scenarios
npm create @m5nv/create ../evil -- --template hack  # Should be blocked
```

## Release Process

Maintainers handle releases, but contributors should:
- Ensure all tests pass
- Update version in package.json if needed
- Update CHANGELOG.md for significant changes
- Verify documentation is current

## Getting Help

- **Issues**: Open an issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Email security issues privately
- **Documentation**: Check [docs/](docs/) for detailed guides

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Please be respectful and inclusive in all interactions.

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.