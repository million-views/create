# Tasks: SUT Architecture Redesign

## Sprint Overview

**Duration**: 4-5 weeks  
**Approach**: Incremental migration with working codebase at each phase  
**Validation**: Full test suite must pass after each task  
**TypeScript**: All new lib/ code uses type-strippable TypeScript (.mts)

---

## Phase 0: TypeScript Setup (Day 1)

### Task 0.1: Update tsconfig.json for type-stripping
- [ ] Update tsconfig.json to include lib/ directory
- [ ] Set `"verbatimModuleSyntax": true` (required for type-stripping)
- [ ] Set `"allowImportingTsExtensions": true`
- [ ] Add `"noEmit": true` (already set, verify)
- [ ] Consider `"erasableSyntaxOnly": true` if available in TS version

### Task 0.2: Update package.json
- [ ] Update `engines.node` to `>=23.0.0` (type-stripping stable)
- [ ] Note: Node 25 has type-stripping enabled by default - no flag needed
- [ ] Add type-check script: `"typecheck": "tsc --noEmit"`

### Task 0.3: Create lib/types.mts
- [ ] Create shared type definitions file
- [ ] Import types from existing types/*.ts files
- [ ] Define common interfaces (ValidationResult, etc.)

### Task 0.4: Verify TypeScript setup
- [ ] Create a test .mts file in lib/
- [ ] Verify it runs with `node lib/test.mts` (no flags needed in Node 25)
- [ ] Verify `npm run typecheck` catches type errors
- [ ] Delete test file
- [ ] Commit: "build: configure type-strippable TypeScript"

---

## Phase 1: Foundation - Error Domain (Week 1)

### Task 1.1: Create lib/error/ directory structure
- [ ] Create `lib/error/` directory
- [ ] Create `lib/error/index.mts` (empty facade)

### Task 1.2: Extract ValidationError
- [ ] Create `lib/error/validation.mts` with ValidationError class
- [ ] Add TypeScript types for constructor options
- [ ] Class should match current behavior exactly
- [ ] Add JSDoc + TypeScript documentation

### Task 1.3: Extract ContextualError
- [ ] Create `lib/error/contextual.mts` with ContextualError
- [ ] Define `ErrorContext` as union type (NOT enum)
- [ ] Define `ErrorSeverity` as union type (NOT enum)
- [ ] Move from `lib/error-handler.mjs`

### Task 1.4: Extract boundary errors
- [ ] Create `lib/error/boundary.mts` with ViolationError (was BoundaryViolationError)
- [ ] Create `lib/error/gate.mts` with GateError (was SecurityGateError)
- [ ] Names follow contextual naming: directory is "error", module is "boundary"/"gate"
- [ ] Add proper TypeScript types

### Task 1.5: Create error facade
- [ ] Update `lib/error/index.mts` to export all error classes
- [ ] Export types using `export type { ... }`
- [ ] Verify exports match design.md

### Task 1.6: Create re-export shims
- [ ] Update `lib/security.mjs` to re-export ValidationError from `./error/index.mjs`
- [ ] Update `lib/error-handler.mjs` to re-export from `./error/index.mjs`
- [ ] Update `lib/security-gate.mjs` to re-export GateError from `./error/index.mjs`
- [ ] Update `lib/boundary-validator.mjs` to re-export ViolationError from `./error/index.mjs`
- [ ] Note: Shims remain .mjs for backward compatibility during migration

### Task 1.7: Verify error domain
- [ ] Run `npm run typecheck` - no type errors
- [ ] Run full test suite: `npm test`
- [ ] All tests must pass
- [ ] Commit: "refactor(lib): extract error domain with TypeScript"

---

## Phase 2: Security Domain Decomposition (Week 1-2)

### Task 2.1: Create lib/security/ directory structure
- [ ] Create `lib/security/` directory
- [ ] Create `lib/security/index.mts` (empty facade)

### Task 2.2: Extract sanitizers
- [ ] Create `lib/security/sanitize.mts`
- [ ] Move `sanitizePath()` → export as `path()`
- [ ] Move `sanitizeBranchName()` → export as `branch()`
- [ ] Move `sanitizeErrorMessage()` → export as `error()`
- [ ] Add internal `_createSecureTempDir()` (was `createSecureTempDir`)

### Task 2.3: Extract Gate class
- [ ] Create `lib/security/gate.mts`
- [ ] Move SecurityGate → export as `Gate`
- [ ] Update internal imports to use error domain
- [ ] Remove "Security" prefix per naming conventions

### Task 2.4: Move Boundary class
- [ ] Create `lib/security/boundary.mts`
- [ ] Move BoundaryValidator → export as `Boundary`
- [ ] Remove "Validator" suffix (it's in security domain, boundary enforcement is implied)
- [ ] Update to import ViolationError from error domain

### Task 2.5: Create security facade
- [ ] Update `lib/security/index.mts`:
  ```javascript
  export * as sanitize from './sanitize.mjs';
  export { Gate } from './gate.mjs';
  export { Boundary } from './boundary.mjs';
  ```

### Task 2.6: Create security re-export shims
- [ ] Update `lib/security.mts` to re-export sanitize functions from `./security/index.mts`
- [ ] Update `lib/security-gate.mts` to re-export Gate from `./security/index.mts`
- [ ] Update `lib/boundary-validator.mts` to re-export Boundary from `./security/index.mts`

### Task 2.7: Verify security domain
- [ ] Run full test suite: `npm test`
- [ ] All tests must pass
- [ ] Commit: "refactor(lib): extract security domain"

---

## Phase 3: Validation Domain Reorganization (Week 2-3)

### Task 3.1: Create lib/validation/ structure
- [ ] Create `lib/validation/schema/` directory
- [ ] Create `lib/validation/domain/` directory
- [ ] Create `lib/validation/cli/` directory
- [ ] Create index.mts in each

### Task 3.2: Extract schema validators
- [ ] Create `lib/validation/schema/template.mts`
  - Move schema validation from template-validator.mjs
  - Export `validate()` function
- [ ] Create `lib/validation/schema/selection.mts`
  - Move schema validation from selection-validator.mjs
  - Export `validate()` function
- [ ] Create `lib/validation/schema/index.mts` facade

### Task 3.3: Extract domain validators
- [ ] Create `lib/validation/domain/placeholder.mts`
  - Extract placeholder business rules
  - Export `validate()` function
- [ ] Create `lib/validation/domain/dimension.mts`
  - Extract from `validateDimensionsMetadata()` in security.mjs
  - Export `validate()` function
- [ ] Create `lib/validation/domain/index.mts` facade

### Task 3.4: Extract CLI validators
- [ ] Create `lib/validation/cli/option.mts`
  - Move `validateIdeParameter()` → `ide()`
  - Move `validateAuthoringMode()` → `authoringMode()`
  - Move `validateAuthorAssetsDir()` → `authorAssetsDir()`
  - Move `validateLogFilePath()` → `logFilePath()`
  - Move `validateCacheTtl()` → `cacheTtl()`
  - Move `validateAllInputs()` → `all()`
- [ ] Create `lib/validation/cli/index.mts` facade

### Task 3.5: Create validation root facade
- [ ] Create `lib/validation/index.mts`:
  ```javascript
  export * as schema from './schema/index.mts';
  export * as domain from './domain/index.mts';
  export * as cli from './cli/index.mts';
  ```

### Task 3.6: Update consumers and create shims
- [ ] Update internal lib/ consumers
- [ ] Create re-export shims in old locations
- [ ] Update lib/security.mjs to be a thin shim

### Task 3.7: Verify validation domain
- [ ] Run full test suite: `npm test`
- [ ] All tests must pass
- [ ] Commit: "refactor(lib): extract validation domain"

---

## Phase 4: Placeholder Domain (Week 3)

### Task 4.1: Create lib/placeholder/ structure
- [ ] Create `lib/placeholder/` directory
- [ ] Create `lib/placeholder/index.mts` (empty facade)

### Task 4.2: Migrate placeholder modules
- [ ] Create `lib/placeholder/resolve.mts`
  - Move from placeholder-resolver.mjs
  - Rename `resolvePlaceholders()` → `resolve()`
- [ ] Create `lib/placeholder/format.mts`
  - Move from placeholder-formats.mjs
  - Rename functions to remove "placeholder" prefix
- [ ] Create `lib/placeholder/canonical.mts`
  - Move from canonical-variables.mjs
  - Rename `canonicalizeVariables()` → `canonicalize()`
- [ ] Create `lib/placeholder/schema.mts`
  - Move from placeholder-schema.mjs
  - Rename `normalizePlaceholders()` → `normalize()`

### Task 4.3: Create placeholder facade
- [ ] Update `lib/placeholder/index.mts`:
  ```javascript
  export { resolve } from './resolve.mjs';
  export * as format from './format.mjs';
  export { canonicalize } from './canonical.mjs';
  export { normalize } from './schema.mjs';
  ```

### Task 4.4: Create re-export shims
- [ ] Update old placeholder-*.mjs files to re-export from new location
- [ ] Update canonical-variables.mjs to re-export from new location

### Task 4.5: Verify placeholder domain
- [ ] Run full test suite: `npm test`
- [ ] All tests must pass
- [ ] Commit: "refactor(lib): extract placeholder domain"

---

## Phase 5: Templatize Domain (Week 3-4)

### Task 5.1: Create lib/templatize/ structure
- [ ] Create `lib/templatize/` directory
- [ ] Create `lib/templatize/strategy/` directory

### Task 5.2: Create strategy modules
- [ ] Create `lib/templatize/strategy/json.mts`
  - Move from templatize-json.mjs
  - Rename `processJSONFile()` → `process()`
- [ ] Create `lib/templatize/strategy/markdown.mts`
  - Move from templatize-markdown.mjs
  - Rename `processMarkdownFile()` → `process()`
- [ ] Create `lib/templatize/strategy/html.mts`
  - Move from templatize-html.mjs
  - Rename `processHTMLFile()` → `process()`
- [ ] Create `lib/templatize/strategy/jsx.mts`
  - Move from templatize-jsx.mjs
  - Rename `processJSXFile()` → `process()`
- [ ] Create `lib/templatize/strategy/config.mts`
  - Move from templatize-config.mjs
  - Rename `processConfigFile()` → `process()`
- [ ] Create `lib/templatize/strategy/index.mts` facade

### Task 5.3: Create processor orchestrator
- [ ] Create `lib/templatize/processor.mts`
- [ ] Unified `process()` function that dispatches to strategies
- [ ] Based on file extension routing

### Task 5.4: Create templatize facade
- [ ] Create `lib/templatize/index.mts`:
  ```javascript
  export { process } from './processor.mjs';
  export * as strategy from './strategy/index.mts';
  ```

### Task 5.5: Create re-export shims
- [ ] Update old templatize-*.mjs files to re-export from new location

### Task 5.6: Verify templatize domain
- [ ] Run full test suite: `npm test`
- [ ] All tests must pass
- [ ] Commit: "refactor(lib): extract templatize domain"

---

## Phase 6: Template & Util Domains (Week 4)

### Task 6.1: Create lib/template/ domain
- [ ] Create `lib/template/` directory
- [ ] Create `lib/template/discover.mts` (from template-discovery.mjs)
  - Rename TemplateDiscovery → `Discover`
- [ ] Create `lib/template/ignore.mts` (from template-ignore.mjs)
  - Rename TemplateIgnore → `Ignore`
- [ ] Create `lib/template/index.mts` facade

### Task 6.2: Consolidate lib/util/ (singular)
- [ ] Rename `lib/utils/` → `lib/util/` (singular per conventions)
- [ ] Update all imports
- [ ] Create `lib/util/index.mts` facade

### Task 6.3: Verify template and util domains
- [ ] Run full test suite: `npm test`
- [ ] All tests must pass
- [ ] Commit: "refactor(lib): extract template and util domains"

---

## Phase 7: Public Facade & Cleanup (Week 4-5)

### Task 7.1: Create lib/index.mts public facade
- [ ] Create `lib/index.mts` with all public exports
- [ ] Use namespace exports per design.md
- [ ] Add comprehensive JSDoc documentation

### Task 7.2: Update bin/ imports
- [ ] Update `bin/create-scaffold/` to import from `lib/index.mts` only
- [ ] Update `bin/make-template/` to import from `lib/index.mts` only
- [ ] Search and replace all direct lib/ imports

### Task 7.3: Audit bin/ modules
- [ ] Review `bin/create-scaffold/modules/registry/template-validator.mts`
  - Determine if redundant with lib/validation/
  - Either consolidate or document why separate
- [ ] Review `bin/create-scaffold/modules/validators/manifest-validator.mts`
  - Thin wrapper - consider removal

### Task 7.4: Delete old shims and empty files
- [ ] Delete `lib/security.mts` (now empty shim)
- [ ] Delete `lib/error-handler.mts` (moved to error domain)
- [ ] Delete `lib/security-gate.mts` (moved to security domain)
- [ ] Delete `lib/boundary-validator.mts` (moved to security domain)
- [ ] Delete `lib/template-manifest-validator.mts` (moved to validation domain)
- [ ] Delete `lib/placeholder-*.mts` files (moved to placeholder domain)
- [ ] Delete `lib/canonical-variables.mts` (moved to placeholder domain)
- [ ] Delete `lib/templatize-*.mts` files (moved to templatize domain)
- [ ] Delete `lib/template-discovery.mts` (moved to template domain)
- [ ] Delete `lib/template-ignore.mts` (moved to template domain)

### Task 7.5: Final verification
- [ ] Run full test suite: `npm test`
- [ ] Verify no imports to deleted files remain
- [ ] Verify lib/ exports ≤30
- [ ] Commit: "refactor(lib): create public facade and cleanup"

---

## Phase 8: Test Pyramid Correction (Week 5)

### Task 8.1: Reorganize test directories
- [ ] Create `tests/lib/error/`
- [ ] Create `tests/lib/security/`
- [ ] Create `tests/lib/validation/`
- [ ] Create `tests/lib/placeholder/`
- [ ] Create `tests/lib/templatize/`
- [ ] Create `tests/lib/template/`

### Task 8.2: Identify redundant L2 tests
- [ ] Analyze `tests/security/security-functions.test.mts` (971 lines)
- [ ] Analyze `tests/validators/template-manifest-validator.test.mts` (993 lines)
- [ ] Analyze `tests/validators/template-validator-extended.test.mts` (962 lines)
- [ ] Document which tests are redundant vs necessary

### Task 8.3: Consolidate L2 tests
- [ ] Move relevant tests to new `tests/lib/` structure
- [ ] Delete redundant tests (document reason)
- [ ] Target: L2 tests ≤25% of total

### Task 8.4: Add L5 E2E tests
- [ ] Create user workflow tests in `tests/e2e/`
- [ ] Cover: create new project from template
- [ ] Cover: convert project to template
- [ ] Cover: validate template
- [ ] Target: L5 tests ≥40% of total

### Task 8.5: Verify test pyramid
- [ ] Count lines per test layer
- [ ] Verify L2 ≤25%, L5 ≥40%
- [ ] Commit: "test: correct test pyramid shape"

---

## Phase 9: Documentation & Finalization (Week 5)

### Task 9.1: Update ARCHITECTURE.md
- [ ] Document new domain structure
- [ ] Update dependency diagram
- [ ] Document public API

### Task 9.2: Add domain READMEs
- [ ] Create `lib/error/README.md`
- [ ] Create `lib/security/README.md`
- [ ] Create `lib/validation/README.md`
- [ ] Create `lib/placeholder/README.md`
- [ ] Create `lib/templatize/README.md`
- [ ] Create `lib/template/README.md`

### Task 9.3: Update testing.md
- [ ] Document test organization changes
- [ ] Update test pyramid diagrams
- [ ] Add migration notes

### Task 9.4: Final cleanup
- [ ] Delete `tmp/sut-redesign-analysis.md` (moved to specs)
- [ ] Run full test suite one more time
- [ ] Verify all success metrics met
- [ ] Commit: "docs: update architecture documentation"

---

## Success Metrics Verification

| Metric | Target | Verification Command |
|--------|--------|---------------------|
| lib/ exports | ≤30 | `grep "^export" lib/index.mts \| wc -l` |
| Largest module | ≤300 lines | `find lib -name "*.mts" -exec wc -l {} \; \| sort -rn \| head -1` |
| Validator modules | 3-4 directories | `ls lib/validation/` |
| L2 test % | ≤25% | Manual count |
| L5 test % | ≥40% | Manual count |
| Naming violations | 0 | Code review |
| TypeScript coverage | 100% of lib/ | `find lib -name "*.mts" \| wc -l` vs total |
| Type errors | 0 | `npm run typecheck` |

---

**Status**: DRAFT - Awaiting requirements and design approval
