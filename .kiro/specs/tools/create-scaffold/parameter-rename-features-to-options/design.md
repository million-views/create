# Design Document

## Overview

This design outlines the complete replacement of the `--features` parameter with `--options` throughout the CLI tool. The change involves updating argument parsing, validation logic, Environment_Object construction, help text, and all related tests. The design emphasizes clean implementation without backward compatibility concerns, treating this as if `--options` was always the intended parameter name.

## Architecture

### Parameter Flow Architecture

```text
User Input (--options a,b,c)
    ↓
Argument Parser (util.parseArgs)
    ↓
Security Validation (validateOptionsParameter)
    ↓
Environment_Object Construction
    ↓
Template Setup Script Execution
```

### Affected Components

- **argumentParser.mjs**: Update parseArgs configuration and validation calls
- **security.mjs**: Rename validation function and update references
- **environmentFactory.mjs**: Update Environment_Object property name
- **Help text**: Update all documentation and examples
- **Test suites**: Update all test cases and assertions

## Components and Interfaces

### Argument Parser Updates

**Current State:**

```javascript
features: {
  type: 'string',
  short: 'f'
}
```

**New State:**

```javascript
options: {
  type: 'string',
  short: 'o'
}
```

### Security Validation Updates

**Function Rename:**

- `validateFeaturesParameter()` → `validateOptionsParameter()`
- Update all internal references and error messages
- Maintain identical validation logic (security rules remain the same)

### Environment_Object Updates

**Current Structure:**

```javascript
{
  projectDirectory: string,
  templateName: string,
  repositoryUrl: string,
  branchName: string,
  ide: string | null,
  features: string[]  // ← Remove this
}
```

**New Structure:**

```javascript
{
  projectDirectory: string,
  templateName: string,
  repositoryUrl: string,
  branchName: string,
  ide: string | null,
  options: string[]   // ← Add this
}
```

## Data Models

### Options Parameter Validation

The validation logic remains functionally identical to the current features validation:

```javascript
export function validateOptionsParameter(optionsString) {
  // Same validation rules as validateFeaturesParameter:
  // - Parse comma-separated values
  // - Trim whitespace
  // - Validate individual option format
  // - Check for path traversal attempts
  // - Check for injection patterns
  // - Limit option length
  // - Filter empty values
}
```

### Environment_Object Schema

```javascript
const EnvironmentObjectSchema = {
  projectDirectory: "string (required)",
  templateName: "string (required)",
  repositoryUrl: "string (required)",
  branchName: "string (required)",
  ide: "string | null (optional)",
  options: "string[] (required, empty array if not provided)",
};
```

## Error Handling

### Validation Error Messages

Update all error messages to reference "options" instead of "features":

**Before:**

- "Features parameter validation failed"
- "Invalid feature name format"
- "Feature name too long"

**After:**

- "Options parameter validation failed"
- "Invalid option name format"
- "Option name too long"

### Help Text Error Context

Update help text and usage examples to demonstrate options parameter:

```bash
# Examples in help text:
npm create @m5nv/scaffold my-app --template react --options typescript,strict
npx @m5nv/create-scaffold my-api --template fastify --options monorepo,no-git
```

## Testing Strategy

### Test File Updates Required

1. **Functional Tests (test/functional.test.mjs)**

   - Update all `--features` references to `--options`
   - Update short flag tests from `-f` to `-o`
   - Update Environment_Object assertions
   - Update error message expectations

2. **Security Tests (test/security.test.mjs)**

   - Rename test descriptions and function calls
   - Update validation error message expectations
   - Maintain all security test scenarios

3. **Environment Factory Tests (test/environment-factory.test.mjs)**

   - Update Environment_Object property assertions
   - Update validation function calls
   - Update test data and expectations

4. **Spec Compliance Tests (test/specCompliance.test.mjs)**
   - Update requirement validation tests
   - Update help text validation
   - Update argument parsing tests

### Test Data Updates

Update all test fixtures and mock data:

```javascript
// Before:
const mockArgs = { features: "typescript,react" };

// After:
const mockArgs = { options: "typescript,react" };
```

## Implementation Approach

### Phase 1: Core Parameter Rename

1. Update argumentParser.mjs configuration
2. Rename security validation function
3. Update Environment_Object construction
4. Update help text and usage examples

### Phase 2: Test Suite Updates

1. Update all test files systematically
2. Update test assertions and expectations
3. Update mock data and fixtures
4. Verify all tests pass

### Phase 3: Documentation Updates

1. Update README.md examples
2. Update inline code comments
3. Update error message text
4. Update help text descriptions

## Common Option Patterns

### Contextual Options Examples

**Project Stage:**

- `poc` - Proof of concept setup
- `prototype` - Prototype development setup
- `mvp` - Minimum viable product setup
- `production` - Production-ready setup

**Environment Context:**

- `monorepo` - Part of a monorepo structure
- `standalone` - Standalone project
- `existing-project` - Adding to existing codebase

**Preference Indicators:**

- `no-git` - Skip git initialization
- `minimal` - Minimal dependencies/setup
- `full-featured` - Include all available features
- `typescript-strict` - Strict TypeScript configuration

**Development Preferences:**

- `testing-focused` - Include comprehensive test setup
- `ci-ready` - Include CI/CD configuration
- `docker-ready` - Include Docker configuration

These examples will be included in help text to guide users and template authors on effective option usage patterns.
