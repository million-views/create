# Sprint 2: Design Document

## Overview

Technical design for Sprint 2 e2e tests covering dimension-based scaffolding, placeholder override, and make-template test command.

## Test Architecture

### Test File Structure

```
tests/e2e/
├── sprint1-tutorial-gaps.test.mjs   # Sprint 1 tests (existing)
├── sprint2-tutorial-gaps.test.mjs   # NEW - Sprint 2 tests
├── tutorial-workflows.test.mjs       # Existing tutorial tests
├── guided-workflow.test.mjs          # Existing guided workflow tests
├── hermetic-isolation.test.mjs       # Existing isolation tests
└── test-helpers.mjs                  # Shared test infrastructure
```

## Component Design

### Test 1: Dimension-Based Scaffolding

**Purpose:** Validate dimension choices from selection files are applied to scaffolded projects

**Template Fixture:**
```json
{
  "schemaVersion": "1.0.0",
  "id": "test/dimension-test",
  "name": "dimension-test",
  "placeholders": {
    "PACKAGE_NAME": { "description": "Package name", "required": true }
  },
  "dimensions": {
    "features": {
      "type": "multi",
      "values": ["auth", "payments", "analytics"],
      "default": []
    },
    "deployment": {
      "type": "single", 
      "values": ["cloudflare", "vercel", "node"],
      "default": "node"
    }
  }
}
```

**Selection File:**
```json
{
  "templateId": "test/dimension-test",
  "version": "1.0.0",
  "selections": {
    "features": ["auth", "analytics"],
    "deployment": "cloudflare"
  }
}
```

**Validation:**
- Check workflow state contains dimension selections
- Verify selection file was loaded successfully (via output)

### Test 2: Placeholder Override Precedence

**Purpose:** Validate CLI --placeholder overrides other sources

**Test Cases:**
1. CLI overrides template default values
2. Multiple CLI placeholders work together
3. CLI values appear in final output

### Test 3: make-template test Command

**Purpose:** Validate template testing workflow

**Template Fixture:**
- Valid template with template.json and package.json
- Placeholder tokens in files

**Test Cases:**
1. `make-template test <path>` succeeds for valid template
2. `make-template test <path>` fails for invalid path
3. `--verbose` shows detailed output
4. Cleanup happens automatically

## Data Flow

```
Selection File                 CLI Flags                 Template
      │                           │                         │
      ▼                           ▼                         ▼
┌─────────────┐            ┌───────────┐            ┌──────────────┐
│ Load        │            │ Parse     │            │ Load         │
│ Selections  │            │ --placeholder         │ Defaults     │
└─────────────┘            └───────────┘            └──────────────┘
      │                           │                         │
      └───────────────────────────┼─────────────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Merge & Override │
                         │ (CLI wins)       │
                         └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Apply to Files   │
                         └──────────────────┘
```

## make-template test Flow

```
make-template test <path>
         │
         ▼
┌─────────────────────┐
│ Validate path exists │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Check template.json │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Run create-scaffold │
│ with --yes flag     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Validate project    │
│ was created         │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Cleanup temp dir    │
│ (unless --keep-temp)│
└─────────────────────┘
```

## File Organization

```
tests/e2e/sprint2-tutorial-gaps.test.mjs
│
├── Test: Dimension-based scaffolding - multi-select features
├── Test: Dimension-based scaffolding - single-select deployment  
├── Test: Placeholder override - CLI overrides defaults
├── Test: make-template test - valid template succeeds
├── Test: make-template test - missing path fails
└── Test: make-template test - verbose output
```
