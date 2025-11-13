# Design Document

## Architecture Overview

The integration follows a monorepo consolidation pattern where make-template components are migrated into the existing create-scaffold structure while maintaining clear separation and shared utilities.

## Directory Structure

### Before Integration
```text
create-scaffold/
├── bin/create-scaffold/
├── lib/shared/core/          # create-scaffold utilities
├── test/create-scaffold/
└── .kiro/specs/tools/create-scaffold/

make-template/ (separate repo)
├── bin/make-template/
├── lib/shared/make-template/ # make-template components
├── test/make-template/
└── .kiro/specs/             # make-template specs
```

### After Integration
```text
create-scaffold/ (monorepo)
├── bin/
│   ├── create-scaffold/
│   └── make-template/        # migrated
├── lib/shared/
│   ├── core/                 # consolidated utilities
│   └── make-template/        # migrated components
├── test/
│   ├── create-scaffold/
│   └── make-template/        # migrated tests
└── .kiro/specs/tools/
    ├── create-scaffold/
    └── make-template/        # migrated specs + integration spec
```

## Component Mapping

### CLI Entry Points
- `bin/make-template/index.mjs` → `bin/make-template/index.mjs`
- Maintains separate entry point for backward compatibility
- Updates package.json bin field to include both commands

### Shared Components Migration
```text
Source: make-template/lib/shared/make-template/
├── analyzers/     → lib/shared/make-template/analyzers/
├── processors/    → lib/shared/make-template/processors/
├── generators/    → lib/shared/make-template/generators/
└── config.mjs     → lib/shared/make-template/config.mjs
```

### Utility Consolidation Strategy

#### Logger Consolidation
- **Source A**: create-scaffold logger (basic file logging)
- **Source B**: make-template logger (enhanced with sanitization)
- **Strategy**: Merge enhanced features into shared implementation
- **Location**: `lib/shared/core/logger.mjs`

#### FS Utils Consolidation
- **Source A**: create-scaffold fs-utils (basic operations)
- **Source B**: make-template fs-utils (atomic operations, error handling)
- **Strategy**: Combine error handling approaches, prefer atomic operations
- **Location**: `lib/shared/core/fs-utils.mjs`

#### Schema Validation
- **Strategy**: Extract common validation logic to shared utility
- **Location**: `lib/shared/core/schema-validator.mjs`

## Import Path Resolution

### Migration Strategy
1. **Phase 1**: Migrate components with relative path updates
2. **Phase 2**: Update imports to use consolidated utilities
3. **Phase 3**: Remove duplicate implementations

### Path Mapping Examples
```javascript
// Before (make-template)
import { Logger } from '../utils/logger.mjs';
import { ensureDirectory } from '../utils/fs-utils.mjs';

// After (integrated)
import { Logger } from '../../../core/logger.mjs';
import { ensureDirectory } from '../../../core/fs-utils.mjs';
```

## Package.json Updates

### Bin Field
```json
{
  "bin": {
    "create-scaffold": "./bin/create-scaffold/index.mjs",
    "make-template": "./bin/make-template/index.mjs"
  }
}
```

### Exports Field
```json
{
  "exports": {
    ".": "./bin/create-scaffold/index.mjs",
    "./make-template": "./bin/make-template/index.mjs",
    "./schema/template.json": "./schema/template.json",
    "./types/template-schema": "./types/template-schema.d.ts"
  }
}
```

## Schema Consumption Updates

### Before Integration
- make-template depended on `@m5nv/create-scaffold` for schema
- External package dependency for local schema usage

### After Integration
- Remove external dependency
- Update imports to use local `schema/template.json`
- Ensure schema validation works with local copy

## Test Suite Integration

### Test Organization
```text
test/
├── create-scaffold/     # existing tests
├── make-template/       # migrated tests
│   ├── unit/
│   ├── integration/
│   └── functional/
└── shared/             # tests for consolidated utilities
```

### Test Execution
- Maintain separate test suites for each tool
- Add integration tests for cross-tool workflows
- Ensure consolidated utilities are tested independently

## Backward Compatibility

### CLI Interface Preservation
- `create-scaffold` command maintains existing interface
- `make-template` command maintains existing interface
- No breaking changes to command-line arguments

### API Preservation
- Public APIs remain unchanged
- Internal refactoring only
- Import paths updated but functionality preserved

## Error Handling Strategy

### Migration Errors
- **Path Resolution**: Validate all import paths during migration
- **Missing Dependencies**: Ensure all required modules are present
- **Schema Compatibility**: Verify schema consumption works locally

### Runtime Errors
- **Dual CLI Loading**: Ensure both CLIs can load without conflicts
- **Shared Utility Access**: Verify consolidated utilities work for both tools
- **Cross-Tool Integration**: Test make-template → create-scaffold workflows

## Performance Considerations

### Bundle Size
- **Goal**: Reduce package size through deduplication
- **Target**: >50% reduction in duplicate code
- **Monitoring**: Track bundle size changes during migration

### Runtime Performance
- **Goal**: Maintain or improve performance
- **Testing**: Performance regression testing for consolidated utilities
- **Metrics**: Execution time, memory usage, file I/O operations

## Rollback Strategy

### Migration Rollback
- **Phase Rollback**: Ability to rollback individual migration phases
- **Branch Strategy**: Maintain migration branches for rollback
- **Backup**: Preserve original make-template repository state

### Runtime Rollback
- **Feature Flags**: Ability to disable integration features if needed
- **Version Pinning**: Option to use separate packages if integration fails
- **Documentation**: Clear rollback procedures for users

## Success Metrics

### Code Quality
- **Duplication Reduction**: >50% reduction in duplicate utilities
- **Test Coverage**: Maintain >90% test coverage across both tools
- **Import Resolution**: Zero import path errors

### User Experience
- **Installation**: Single package installation for both tools
- **Compatibility**: 100% backward compatibility maintained
- **Performance**: No performance regressions

### Development Experience
- **Build Time**: Consolidated build process
- **Testing**: Unified test execution
- **Documentation**: Single source of truth for both tools