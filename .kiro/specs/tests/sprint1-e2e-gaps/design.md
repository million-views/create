# Sprint 1: Design Document

## Overview

This document describes the technical design for Sprint 1 e2e tests covering critical tutorial workflow gaps.

## Test Architecture

### Test File Structure

```
tests/e2e/
├── sprint1-tutorial-gaps.test.mjs  # NEW - Sprint 1 tests
├── tutorial-workflows.test.mjs      # Existing tutorial tests
├── guided-workflow.test.mjs         # Existing guided workflow tests
├── hermetic-isolation.test.mjs      # Existing isolation tests
└── test-helpers.mjs                 # Shared test infrastructure
```

### Test Patterns

All tests follow the established hermetic pattern:

```javascript
test('Test description', async (t) => {
  const testEnv = await createTestEnvironment('test-name');
  
  t.after(async () => {
    await testEnv.cleanup();
  });
  
  // Test implementation
  
  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });
```

## Component Design

### Test 1: Selection File via CLI

**Purpose:** Validate that `--selection file.json` flag works correctly from CLI

**Template Fixture:**
```json
{
  "schemaVersion": "1.0.0",
  "id": "test/selection-test",
  "name": "selection-test",
  "placeholders": {
    "PACKAGE_NAME": { "description": "Package name", "required": true },
    "BUSINESS_NAME": { "description": "Business name", "required": false, "default": "Default Business" }
  },
  "dimensions": {
    "features": {
      "type": "multi",
      "values": ["auth", "payments", "analytics"],
      "default": []
    }
  }
}
```

**Selection File Fixture:**
```json
{
  "schemaVersion": "1.0.0",
  "templateId": "test/selection-test",
  "choices": {
    "features": ["auth", "payments"]
  },
  "placeholders": {
    "PACKAGE_NAME": "selection-app",
    "BUSINESS_NAME": "Selection Business"
  }
}
```

**Test Cases:**
1. Scaffold with selection file only
2. Scaffold with selection file + CLI placeholder override
3. Verify dimension choices applied
4. Verify placeholder values applied

### Test 2: Gates Validation

**Purpose:** Validate that invalid dimension combinations are rejected with clear errors

**Template Fixture:**
```json
{
  "schemaVersion": "1.0.0",
  "id": "test/gates-test",
  "name": "gates-test",
  "dimensions": {
    "deployment": {
      "type": "single",
      "values": ["cloudflare", "vercel", "node"],
      "default": "node"
    },
    "database": {
      "type": "single",
      "values": ["d1", "postgres", "sqlite", "none"],
      "default": "none"
    }
  },
  "gates": {
    "cloudflare": {
      "allowed": {
        "database": ["d1", "none"]
      }
    },
    "vercel": {
      "allowed": {
        "database": ["postgres", "none"]
      }
    }
  }
}
```

**Test Cases:**
1. Valid combination (cloudflare + d1) succeeds
2. Invalid combination (cloudflare + postgres) fails with gate error
3. Error message shows gate name, dimensions, and allowed values

### Test 3: Validate Command

**Purpose:** Validate template.json structure before distribution

**Test Cases:**
1. Valid template passes validation
2. Missing required fields fails with specific error
3. Invalid placeholder definitions fail
4. Directory path resolves to template.json
5. Direct template.json path works

## Data Flow

```
CLI Input                Selection File              Template
    │                         │                         │
    ▼                         ▼                         ▼
┌─────────┐            ┌─────────────┐           ┌──────────────┐
│ NewCmd  │───────────▶│GuidedSetup │───────────▶│ GateEnforce  │
│ --select│            │ Workflow   │            │ ment         │
└─────────┘            └─────────────┘           └──────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────┐           ┌──────────────┐
                       │ Placeholder │           │  Error or    │
                       │ Resolution  │           │  Success     │
                       └─────────────┘           └──────────────┘
```

## Error Handling

### Gate Violation Error Format
```
❌ Gate Enforcement Violations:
  • cloudflare constraint: database 'postgres' is not allowed. Allowed: d1, none

Please adjust your selections to resolve these conflicts.
```

### Validation Error Format
```
❌ Template validation failed:
  • Missing required field: schemaVersion
  • Missing required field: id
```

## File Organization

```
tests/e2e/sprint1-tutorial-gaps.test.mjs
│
├── Test: Selection file via CLI - basic usage
├── Test: Selection file via CLI - with placeholder override
├── Test: Gates validation - valid combination succeeds
├── Test: Gates validation - invalid combination fails
├── Test: create-scaffold validate - valid template
└── Test: create-scaffold validate - invalid template
```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Gate enforcement path differs from programmatic test | Test actual CLI path, not just internal APIs |
| Selection file parsing edge cases | Test both minimal and complete selection files |
| Validate command path resolution | Test both directory and file paths |
