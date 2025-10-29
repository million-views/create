---
title: "Contributing Guidelines"
type: "guide"
audience: "advanced"
estimated_time: "30 minutes setup, reference thereafter"
prerequisites:
  - "Modern Node.js development experience (latest LTS)"
  - "Git and GitHub familiarity"
  - "Understanding of open source contribution workflow"
related_docs:
  - "docs/how-to/development.md"
  - "docs/spec-driven-development.md"
  - "docs/guides/troubleshooting.md"
last_updated: "2024-10-26"
---

# Contributing to @m5nv/create-scaffold

If you care about craft then our code base may interest you enough to contribute. Zero dependencies, security-first design, and clean architecture are some of the dimensions we have strived hard to remain true to. If these interest you and align with your own principles then your contributions are welcome.


## Prerequisites

These are one-time installations required to test your changes locally:

1. **Node.js (latest LTS)** - [Download from nodejs.org](https://nodejs.org/)
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
npm create @m5nv/scaffold my-test-app -- --from-template react-vite
npm unlink -g @m5nv/create-scaffold
```

## Development Standards

This project follows strict security and quality standards based on a spec-driven development methodology.

### Spec-Driven Development

All features follow a three-phase development process:

1. **Requirements Phase**: Write EARS-compliant requirements with user stories
2. **Design Phase**: Create comprehensive technical design documents
3. **Implementation Phase**: Break design into actionable coding tasks

See [docs/spec-driven-development.md](docs/spec-driven-development.md) for complete details.

### Code Requirements

- **Zero Dependencies**: No external runtime dependencies allowed (Node.js built-ins only)
- **ES Modules Only**: Use modern JavaScript patterns, no CommonJS
- **Test-First Development**: Write failing tests before implementation (mandatory)
- **Security First**: All code changes undergo comprehensive security review
- **Comprehensive Testing**: All changes must pass our complete test suite across multiple specialized test categories

### Testing Requirements

```bash
# All tests must pass before any contribution
npm test                    # Run complete test suite across all test categories
npm run test:quick         # Quick validation (functional + smoke tests)
npm run lint              # Zero warnings required (strict ESLint rules)

# Individual test suites
npm run test:functional    # End-to-end CLI behavior tests
npm run test:spec         # Specification compliance tests
npm run test:leaks        # Resource management tests
npm run test:smoke        # Production readiness tests
```

### Security Standards

All contributions must maintain these security requirements:

- **Input Validation**: All user inputs must be validated and sanitized
- **Path Traversal Prevention**: File operations must be bounded to safe directories
- **Error Message Sanitization**: No information disclosure in error messages
- **Command Injection Prevention**: Safe argument passing to child processes only
- **Setup Script Isolation**: User scripts run in project context, not CLI context
- **Zero Information Leakage**: No sensitive data in logs, errors, or debug output

### Code Quality Standards

- **ESLint Compliance**: Zero warnings required with strict rules
- **Modern JavaScript**: ES2022+ features, async/await patterns
- **Comprehensive Documentation**: All public APIs and complex logic documented
- **Performance Conscious**: No blocking operations, efficient resource usage
- **Cross-Platform Compatibility**: Must work on supported Node.js versions across all platforms

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
   npm create @m5nv/scaffold test-project -- --from-template some-template
   npm unlink -g @m5nv/create-scaffold
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

### Test-First Development (Mandatory)

This project requires strict Test-Driven Development (TDD):

```bash
# 1. Search existing codebase for similar functionality
grep -r "similar_function" bin/ test/

# 2. Write failing tests that define expected behavior
# Edit appropriate test file in test/

# 3. Run tests to confirm they fail (RED phase)
npm run test:functional

# 4. Implement minimal code to make tests pass (GREEN phase)
# Edit implementation files in bin/

# 5. Run tests to confirm they pass
npm run test:functional

# 6. Refactor if needed while keeping tests green
npm test  # Full validation
```

### Making Changes

1. **Follow Spec-Driven Process** - For new features, create requirements, design, and tasks
2. **Write Tests First** - Always write failing tests before implementation
3. **Implement Minimally** - Write only enough code to make tests pass
4. **Run Full Test Suite** - Ensure nothing breaks (`npm test`)
5. **Test Locally** - Use `npm link` for realistic user experience testing
6. **Update Documentation** - Keep all docs current with changes

### Testing Changes

```bash
# Development testing workflow
npm run test:quick        # Fast feedback during development (functional + smoke)
npm run lint             # Check code quality (zero warnings required)
npm test                # Full validation before PR (complete test suite)

# Local CLI testing
npm link                 # Install locally for testing
npm create @m5nv/scaffold my-test -- --from-template react-vite
npm create @m5nv/scaffold test-app -- --dry-run --from-template express
npm unlink -g @m5nv/create-scaffold  # Cleanup when done

# Test specific scenarios
node bin/index.mjs --help                    # Help output
node bin/index.mjs test --from-template nonexistent  # Error handling
node bin/index.mjs ../evil --from-template hack      # Security validation
```

### Codebase Architecture

```
create/
├── bin/                           # Core CLI modules
│   ├── index.mjs                 # Main entry point and orchestration
│   ├── argumentParser.mjs        # Native argument parsing
│   ├── security.mjs              # Input validation and security
│   ├── cacheManager.mjs          # Template repository caching
│   ├── logger.mjs                # Structured logging system
│   ├── templateDiscovery.mjs     # Template listing and metadata
│   ├── dryRunEngine.mjs          # Preview mode functionality
│   └── utils/                    # Shared utility modules
├── docs/                         # User and developer documentation
├── test/                         # Comprehensive test suites
├── scripts/                      # Development and testing utilities
└── .kiro/specs/                  # Feature specifications and design docs
```

### Feature Development Process

For new features, follow the spec-driven methodology:

```bash
# 1. Create feature specification
mkdir -p .kiro/specs/feature-name

# 2. Write requirements.md (EARS-compliant requirements)
# 3. Write design.md (comprehensive technical design)
# 4. Write tasks.md (actionable implementation tasks)

# 5. Implement following tasks.md order
# Mark tasks complete as you implement them

# 6. Validate implementation against specifications
npm run test:spec    # Verify spec compliance
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

- **Functional tests** - CLI behavior validation
- **Spec compliance tests** - Requirements verification
- **Resource leak tests** - Resource management
- **Smoke tests** - Integration validation

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
npm create @m5nv/scaffold test-app -- --from-template react-vite

# Test with custom repository
npm create @m5nv/scaffold test-app -- --from-template custom --repo your-org/templates

# Test error scenarios
npm create @m5nv/scaffold ../evil -- --from-template hack  # Should be blocked
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

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). We focus on the work, the code, and making things better.

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.
