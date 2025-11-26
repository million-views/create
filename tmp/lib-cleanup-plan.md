# lib/ Root Cleanup Plan

## Goal
Eliminate all backward compatibility shims and full implementations from `lib/` root.
Only `lib/index.mts` and `lib/types.mts` should remain at root level.

## Current State Analysis

### Files at lib/ root (excluding index.mts, types.mts)

| File | Lines | Type | Target Domain |
|------|-------|------|---------------|
| `security.mjs` | 1095 | Full impl | Split: `security/validate.mts` + `validation/cli/` |
| `logger.mjs` | 551 | Full impl | `util/logger.mts` |
| `error-handler.mjs` | 385 | Full impl | `error/handler.mts` |
| `fs-utils.mjs` | 351 | Full impl | `util/fs.mts` |
| `template-manifest-validator.mjs` | 235 | Full impl | `validation/schema/manifest.mts` |
| `security-audit-logger.mjs` | 164 | Full impl | `security/audit.mts` |
| `path-resolver.mjs` | 84 | Full impl | `util/path.mts` |
| `command-utils.mjs` | 80 | Full impl | `util/command.mts` |
| `error-classes.mjs` | 28 | Full impl | `error/classes.mts` |
| `boundary-validator.mjs` | 22 | Shim | DELETE |
| `security-gate.mjs` | 20 | Shim | DELETE |
| `templatize-config.mjs` | 19 | Shim | DELETE |
| `template-ignore.mjs` | 15 | Shim | DELETE |
| `canonical-variables.mjs` | 15 | Shim | DELETE |
| `placeholder-resolver.mjs` | 15 | Shim | DELETE |
| `placeholder-schema.mjs` | 15 | Shim | DELETE |
| `placeholder-formats.mjs` | 11 | Shim | DELETE |
| `template-discovery.mjs` | 11 | Shim | DELETE |
| `templatize-*.mjs` (4) | 11 each | Shim | DELETE |

**Total: 22 files to eliminate**

## Migration Order (by dependency)

### Phase A: Error Domain Completion
1. `error-classes.mjs` → `lib/error/classes.mts` (ArgumentError, PreflightError)
2. `error-handler.mjs` → `lib/error/handler.mts` (formatErrorMessage, handleError, etc.)

### Phase B: Util Domain Completion  
3. `path-resolver.mjs` → `lib/util/path.mts`
4. `fs-utils.mjs` → `lib/util/fs.mts`
5. `command-utils.mjs` → `lib/util/command.mts`
6. `logger.mjs` → `lib/util/logger.mts`

### Phase C: Security Domain Completion
7. `security-audit-logger.mjs` → `lib/security/audit.mts`
8. `security.mjs` → Split across domains:
   - Package identity functions → `lib/security/identity.mts`
   - Remaining validators → `lib/validation/cli/` (already have some there)

### Phase D: Validation Domain Completion
9. `template-manifest-validator.mjs` → `lib/validation/schema/manifest.mts`

### Phase E: Consumer Migration
10. Update all `bin/` imports to use domain paths
11. Update all `tests/` imports to use domain paths

### Phase F: Shim Deletion
12. Delete all 22 shim files at lib/ root

### Phase G: Facade Update
13. Update `lib/index.mts` with any new exports
14. Verify architecture compliance

## Consumer Impact

### bin/ files using old paths (need update):
- `@m5nv/create-scaffold/lib/security.mjs` (7 uses)
- `@m5nv/create-scaffold/lib/error-handler.mjs` (6 uses)
- `@m5nv/create-scaffold/lib/template-discovery.mjs` (5 uses)
- `@m5nv/create-scaffold/lib/security-gate.mjs` (3 uses)
- `@m5nv/create-scaffold/lib/template-ignore.mjs` (3 uses)
- `@m5nv/create-scaffold/lib/templatize-config.mjs` (3 uses)
- `@m5nv/create-scaffold/lib/path-resolver.mjs` (3 uses)
- `@m5nv/create-scaffold/lib/template-manifest-validator.mjs` (2 uses)
- `@m5nv/create-scaffold/lib/placeholder-formats.mjs` (2 uses)
- And more...

### tests/ files using old paths (need update):
- `../../lib/security.mjs` (7 uses)
- `../../lib/path-resolver.mjs` (3 uses)
- `../../lib/error-handler.mjs` (2 uses)
- `../../lib/boundary-validator.mjs` (2 uses)
- And more...

## Success Criteria
- [ ] Only `lib/index.mts` and `lib/types.mts` at lib/ root
- [ ] All implementations in proper domain directories
- [ ] All imports use domain paths or public facade
- [ ] All 43 test suites pass
- [ ] No backward compatibility code
