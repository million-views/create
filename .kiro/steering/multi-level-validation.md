---
inclusion: always
---

# Multi-Level Validation Framework

## Core Principle: Comprehensive Validation Across Package Boundaries

Monorepo validation requires multiple levels of testing to ensure quality across individual packages, package interactions, and end-to-end system behavior.

## Validation Levels

### Level 1: Unit Validation
- **Scope**: Individual functions, modules, and units within a package
- **Ownership**: Package maintainers
- **Execution**: Continuous integration on every commit
- **Coverage**: 100% code coverage requirement

### Level 2: Package Validation
- **Scope**: Complete package functionality and API contracts
- **Ownership**: Package teams
- **Execution**: Pre-merge validation and nightly builds
- **Coverage**: All package features and error scenarios

### Level 3: Integration Validation
- **Scope**: Interactions between packages within the monorepo
- **Ownership**: Integration team or rotating responsibility
- **Execution**: Daily integration builds and pre-release validation
- **Coverage**: Cross-package API calls and data flows

### Level 4: System Validation
- **Scope**: End-to-end application behavior across all packages
- **Ownership**: QA team or product team
- **Execution**: Sprint completion and pre-release validation
- **Coverage**: Complete user journeys and system workflows

### Level 5: Production Validation
- **Scope**: Production environment behavior and monitoring
- **Ownership**: SRE/DevOps team
- **Execution**: Post-release monitoring and canary deployments
- **Coverage**: Real-world usage patterns and performance

## Validation Strategy

### Automated Validation
- **Unit Tests**: Run on every commit for immediate feedback
- **Integration Tests**: Run daily to catch cross-package issues early
- **System Tests**: Run on sprint completion for end-to-end validation
- **Performance Tests**: Run regularly to monitor system performance

### Manual Validation
- **Exploratory Testing**: Manual testing of complex user scenarios
- **Usability Testing**: User experience validation for new features
- **Compatibility Testing**: Testing across supported platforms and versions
- **Security Testing**: Manual security assessment and penetration testing

### Continuous Validation
- **Health Checks**: Automated monitoring of system health
- **Synthetic Monitoring**: Automated user journey simulation
- **Performance Monitoring**: Real-time performance tracking
- **Error Tracking**: Automated error detection and alerting

## Test Organization

### Test Directory Structure
```
tests/
├── unit/                    # Level 1: Unit tests
│   ├── package-a/
│   └── package-b/
├── integration/            # Level 3: Cross-package integration
│   ├── api-integration/
│   └── data-flow/
├── system/                 # Level 4: End-to-end system tests
│   ├── user-journeys/
│   └── performance/
└── shared/                 # Shared test utilities
    ├── fixtures/
    └── helpers/
```

### Test Naming Conventions
- **Unit Tests**: `*.unit.test.mjs`
- **Integration Tests**: `*.integration.test.mjs`
- **System Tests**: `*.system.test.mjs`
- **Performance Tests**: `*.performance.test.mjs`

## Validation Gates

### Commit Gates
- **Unit Test Execution**: All unit tests must pass
- **Code Quality Checks**: Linting, formatting, and static analysis
- **Security Scanning**: Automated security vulnerability detection

### Merge Gates
- **Package Validation**: All package tests must pass
- **Integration Validation**: Cross-package integration tests must pass
- **Documentation Review**: Code changes must be documented

### Release Gates
- **System Validation**: End-to-end system tests must pass
- **Performance Validation**: Performance benchmarks must be met
- **Security Review**: Security assessment must be completed
- **Stakeholder Approval**: Product and engineering approval required

## Quality Metrics

### Coverage Metrics
- **Unit Coverage**: Minimum 90% code coverage per package
- **Integration Coverage**: All cross-package interfaces tested
- **System Coverage**: All critical user journeys covered
- **Performance Coverage**: Key performance scenarios benchmarked

### Quality Metrics
- **Defect Density**: Bugs per line of code
- **Test Reliability**: Percentage of tests that pass consistently
- **Time to Detection**: Average time to detect issues
- **Time to Resolution**: Average time to fix detected issues

## Validation Automation

### CI/CD Pipeline Stages
1. **Build**: Compile and package all packages
2. **Unit Test**: Run all unit tests in parallel
3. **Integration Test**: Run cross-package integration tests
4. **System Test**: Run end-to-end system validation
5. **Performance Test**: Run performance benchmarks
6. **Security Scan**: Run security vulnerability assessment
7. **Deploy**: Deploy to staging environment
8. **Monitor**: Monitor system health and performance

### Test Execution Strategy
- **Parallel Execution**: Run independent tests in parallel
- **Fail Fast**: Stop pipeline on critical failures
- **Retry Logic**: Retry flaky tests with backoff
- **Quarantine**: Isolate failing tests for investigation

## Validation Documentation

### Test Documentation
- **Test Plans**: Detailed test strategies for each validation level
- **Test Cases**: Documented test scenarios and expected outcomes
- **Test Data**: Documented test data and fixture management
- **Test Environments**: Documented test environment setup and configuration

### Validation Reports
- **Test Results**: Automated test execution reports
- **Coverage Reports**: Code and test coverage analysis
- **Performance Reports**: Performance benchmark results
- **Quality Reports**: Quality metric dashboards and trends

This multi-level validation framework ensures comprehensive quality assurance across the entire monorepo ecosystem.