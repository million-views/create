---
title: "Testing Reference"
type: "reference"
audience: "developers"
estimated_time: "5 minutes read"
prerequisites:
  - "Node.js development environment"
related_docs:
  - "../../test/README.md"
  - "../how-to/development.md"
last_updated: "2025-11-12"
---

# Testing Reference

Complete reference for running and understanding the `@m5nv/create-scaffold` test suite.

## Test Suite Architecture

The project maintains comprehensive test coverage across multiple specialized test suites:

### 1. Environment Factory Tests
**File**: `test/create-scaffold/environment-factory.test.mjs`
**Purpose**: Environment creation and metadata validation
**Coverage**: Environment object construction, author metadata normalization, frozen objects

### 2. Argument Parser Tests
**File**: `test/create-scaffold/argument-parser.test.mjs`
**Purpose**: CLI argument parsing and validation smoke coverage
**Coverage**: Flag parsing, validation, help text generation

### 3. Interactive Utils Tests
**File**: `test/shared/interactive-utils.test.mjs`
**Purpose**: Interactive trigger heuristics and environment control
**Coverage**: TTY detection, environment variable overrides, interactive mode logic

### 4. Options Processor Tests
**File**: `test/shared/options-processor.test.mjs`
**Purpose**: Normalization of CLI options against template dimensions
**Coverage**: Dimension validation, dependency checking, value normalization

### 5. Setup Runtime Tests
**File**: `test/create-scaffold/setup-runtime.test.mjs`
**Purpose**: Sandbox and tools runtime verification
**Coverage**: Placeholder replacement, IDE presets, file operations

### 6. Security Tests
**File**: `test/shared/security.test.mjs`
**Purpose**: Security validation for new IDE and features parameters
**Coverage**: Input sanitization, injection prevention, environment variable isolation

### 7. Functional Tests
**File**: `test/create-scaffold/cli.test.mjs`
**Purpose**: Comprehensive end-to-end CLI behavior validation
**Coverage**: CLI workflows, error handling, git operations, setup scripts

### 8. Template Schema Build Tests
**File**: `test/shared/schema-build.test.mjs`
**Purpose**: Deterministic generation of schema types and runtime stubs
**Coverage**: TypeScript generation, schema validation

### 9. Template Validator Tests
**File**: `test/shared/template-validator.test.mjs`
**Purpose**: Runtime manifest validation aligned with schema constraints
**Coverage**: Template JSON validation, placeholder patterns, feature validation

### 10. CLI Integration Tests
**File**: `test/create-scaffold/cli-integration.test.mjs`
**Purpose**: Phase 1 feature integration coverage for CLI flags
**Coverage**: Flag combinations, caching, logging, template discovery

### 11. Spec Compliance Tests
**File**: `test/create-scaffold/spec-compliance-verification.mjs`
**Purpose**: Verification against all specification requirements
**Coverage**: Requirements validation, security standards, package structure

### 12. Resource Leak Tests
**File**: `test/create-scaffold/resource-leak-test.mjs`
**Purpose**: Resource management and cleanup validation
**Coverage**: Temporary directory cleanup, process termination, resource isolation

### 13. Smoke Tests
**File**: `scripts/smoke-test.mjs`
**Purpose**: Production readiness and integration validation
**Coverage**: End-to-end workflows, error scenarios, basic functionality

## Running Tests

### Complete Test Suite
```bash
npm test                    # Run all test suites with unified reporting
npm run test:all           # Same as npm test
```

### Quick Test Suite
```bash
npm run test:quick         # Run functional + smoke tests only (recommended for development)
```

### Individual Test Suites
```bash
# Run specific test suites in isolation
npm run test:smoke         # Production readiness tests
npm run test:functional    # End-to-end CLI behavior tests
npm run test:integration   # CLI integration tests
npm run test:spec          # Specification compliance tests

# Run any test suite by name
npm run test:suite "Security Tests"
npm run test:suite "Template Validator Tests"
npm run test:suite "CLI Integration Tests"
```

### Individual Test Files
```bash
# For deep debugging of specific functionality
npm run test:functional:file    # Direct functional test execution
npm run test:spec:file         # Direct spec compliance test execution
npm run test:smoke:file        # Direct smoke test execution

# Direct node execution (for debugging)
node test/create-scaffold/cli.test.mjs
node test/shared/security.test.mjs
node test/create-scaffold/spec-compliance-verification.mjs
```

## Test Runner Options

The test runner supports additional command-line options:

```bash
# Run specific test suite
node scripts/test-runner.mjs --suite "Suite Name"

# Run quick test suite
node scripts/test-runner.mjs --quick

# Run all tests (default)
node scripts/test-runner.mjs
```

## Available Test Suites

- **Environment Factory Tests** - Environment creation and metadata validation
- **Argument Parser Tests** - CLI argument parsing and validation
- **Interactive Utils Tests** - Interactive trigger heuristics and environment control
- **Options Processor Tests** - CLI options normalization
- **Setup Runtime Tests** - Sandbox and tools runtime verification
- **Security Tests** - Security validation and injection prevention
- **Functional Tests** - Comprehensive end-to-end CLI behavior validation
- **Template Schema Build Tests** - Schema type generation
- **Template Validator Tests** - Template manifest validation
- **CLI Integration Tests** - CLI flag integration coverage
- **Spec Compliance Tests** - Specification requirements verification
- **Resource Leak Tests** - Resource management and cleanup validation
- **Smoke Tests** - Production readiness and integration validation

## Test Environment

### Prerequisites
- Node.js 22+ (ESM support)
- Git installed and configured
- Write permissions in current directory
- Network access for repository validation tests

### Test Isolation
- Tests create temporary directories with predictable names
- All temporary resources are cleaned up automatically
- Tests are isolated and can run in any order
- No external dependencies beyond git and Node.js built-ins

### Performance Characteristics
- Individual test timeout: 30 seconds
- Quick test suite runtime: ~10-15 seconds
- Full test suite runtime: ~2-5 minutes (depending on network)
- Parallel execution where possible
- Efficient cleanup and resource management

## Development Workflow

### During Development
```bash
# Quick validation during development
npm run test:quick

# Focused debugging
npm run test:smoke         # Fast feedback
npm run test:functional    # Debug end-to-end issues
npm run test:suite "Security Tests"  # Debug specific concerns
```

### Before Committing
```bash
# Full validation
npm test
npm run lint
```

### CI/CD Integration
```bash
# Smoke tests for deployment validation
npm run test:smoke

# Full compliance check
npm run test:spec
```

## Troubleshooting

### Common Issues

**Tests failing after changes**:
- Run `npm run test:quick` for faster feedback
- Use `npm run test:suite "Suite Name"` to isolate failing tests
- Check specific test output for validation failures

**Resource cleanup issues**:
- Tests automatically clean up temporary directories
- Check for lingering processes if tests hang
- Use `npm run test:leaks` to verify resource management

**Network-related failures**:
- Some tests require internet access for git operations
- Check git configuration and network connectivity
- Use `--offline` mode where supported

## Related Documentation

- [Test Suite Documentation](../../test/README.md) - Detailed test coverage and implementation
- [Development Guide](../how-to/development.md) - Development workflow and best practices
- [Contributing Guide](../../../CONTRIBUTING.md) - Contribution requirements and testing standards