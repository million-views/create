# Sprint 3: Technical Design

## Test Architecture

### Test File Structure

```
tests/e2e/sprint3-tutorial-gaps.test.mjs
├── Edge Cases
│   ├── Minimal template scaffolding
│   └── Overwrite behavior with --force
├── Restore Workflow
│   ├── Successful restore from backup
│   └── Restore without backup fails gracefully
└── Error Scenarios
    ├── Invalid template.json JSON
    ├── Missing required fields
    └── Invalid placeholder syntax
```

### Test Infrastructure

All tests will use:
- `createTestEnvironment()` for hermetic isolation
- `execCLI()` for command execution
- Proper cleanup in afterEach hooks

## Detailed Test Design

### Edge Case Tests

#### Test 1: Minimal Template Scaffolding
```javascript
// Template with single file, single placeholder
// Verifies basic scaffolding works without complex features
```

#### Test 2: Overwrite Behavior Without Force
```javascript
// Create output directory with existing file
// Run scaffolding without --force
// Verify error message indicates conflict
```

#### Test 3: Overwrite Behavior With Force
```javascript
// Create output directory with existing file
// Run scaffolding with --force
// Verify existing file is replaced
```

### Restore Workflow Tests

#### Test 4: Successful Restore
```javascript
// Run make-template convert to create template
// Verify .create-backup exists
// Run make-template restore
// Verify original files restored
// Verify backup directory removed
```

#### Test 5: Restore Without Backup
```javascript
// Create project without running convert
// Run make-template restore
// Verify appropriate error message
```

### Error Scenario Tests

#### Test 6: Invalid JSON in template.json
```javascript
// Create template.json with syntax error
// Run create-scaffold validate
// Verify JSON parse error reported
```

#### Test 7: Missing Required Fields
```javascript
// Create template.json without 'name' field
// Run create-scaffold validate
// Verify specific field error
```

#### Test 8: Invalid Placeholder Syntax
```javascript
// Create template with malformed placeholder
// Run make-template test or validate
// Verify placeholder error reported
```

## Test Data Requirements

### Minimal Template
- Single index.html with one placeholder
- Basic template.json with required fields only

### Error Templates
- template-invalid-json/template.json - Malformed JSON
- template-missing-name/template.json - Missing name field
- template-bad-placeholder/index.html - Invalid {{placeholder}} syntax

## Validation Strategy

1. Each test runs in isolated M5NV_HOME
2. Exit codes verified for success/failure
3. Output messages checked for expected content
4. File system state verified after operations
