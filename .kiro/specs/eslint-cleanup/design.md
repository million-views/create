# ESLint Cleanup Design

## Overview

This design outlines a systematic approach to resolving ESLint warnings in the @m5nv/create-scaffold codebase. The cleanup focuses on unused variables and parameters identified by ESLint, ensuring code quality while maintaining functionality.

## Architecture

The cleanup follows a file-by-file approach, addressing warnings in logical order:
1. Core CLI modules (bin/)
2. Utility modules
3. Test files
4. Script files

## Components and Interfaces

### ESLint Configuration
- Uses existing ESLint rules for unused variables (`no-unused-vars`)
- Allows underscore-prefixed variables as intentionally unused
- Reports warnings (not errors) for gradual cleanup

### Cleanup Strategy

#### Variable Removal
- Remove accidentally unused variables
- Keep API-required parameters (prefix with _)
- Document intentional unused variables

#### Parameter Handling
- Remove unused optional parameters
- Prefix required API parameters with _
- Add TODO comments for planned usage

## Data Models

No new data models required - this is a refactoring of existing code.

## Error Handling

No new error handling required - existing functionality must be preserved.

## Testing Strategy

### Verification Approach
1. Run `npm run lint` before and after changes
2. Execute `npm test` to ensure functionality preserved
3. Run `npm run validate` for comprehensive validation

### Test Cases
- ESLint reports 0 warnings after cleanup
- All existing tests pass
- CLI functionality works as expected
- No breaking changes to APIs

## Implementation Considerations

### Safety Measures
- Make minimal changes to preserve functionality
- Test after each file cleanup
- Commit changes incrementally

### Patterns to Apply
- `_unusedVariable` for intentionally unused variables
- Remove truly unused variables
- Add comments for parameters awaiting implementation