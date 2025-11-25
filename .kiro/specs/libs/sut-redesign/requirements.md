# Requirements: SUT Architecture Redesign

## Problem Statement

The lib/ directory has grown organically without consistent architectural boundaries, resulting in:
1. **API Surface Explosion**: 137 exports where ~20-30 would suffice
2. **God Object**: security.mjs at 1,100 lines with 6+ unrelated concerns
3. **Overlapping Validators**: 8 validation modules with unclear boundaries
4. **Inverted Test Pyramid**: 56% L2 tests vs 7% L5 tests (should be inverted)
5. **Naming Redundancy**: Classes and modules with repetitive naming patterns
6. **No Type Safety**: Pure JavaScript with JSDoc comments, missing IDE support for refactoring

The key insight driving this redesign:
> "Greedy unit tests are a SYMPTOM of poorly designed SUT, not the root cause."

## Goals

### G1: Reduce Public API Surface
- **Current**: 137 exports from lib/
- **Target**: ≤30 exports via a single public facade (`lib/index.mts`)
- **Metric**: `grep "^export" lib/index.mts | wc -l`

### G2: Decompose God Objects
- **Current**: security.mjs (1,100 lines), template-validator.mjs (951 lines)
- **Target**: No module >300 lines; single responsibility per module
- **Metric**: `wc -l lib/**/*.mts | sort -rn | head -10`

### G3: Consolidate Validators
- **Current**: 8 validation-related modules
- **Target**: 3-4 with clear domain boundaries (schema, domain, security)
- **Metric**: Directory listing of lib/validation/

### G4: Correct Test Pyramid
- **Current**: L2 56%, L3/L4 37%, L5 7%
- **Target**: L2 ≤25%, L3/L4 ~35%, L5 ≥40%
- **Metric**: Test line count analysis

### G5: Eliminate Naming Redundancy
- **Current**: `SecurityGate.enforceSecurityGate()`, `validateTemplateName()` in security.mjs
- **Target**: Context-aware naming per naming-conventions.md
- **Metric**: Code review against naming checklist

### G6: Adopt Type-Strippable TypeScript
- **Current**: Pure JavaScript (.mjs) with JSDoc type hints
- **Target**: TypeScript (.mts) using only type-strippable features
- **Benefit**: Native Node.js execution, better IDE support, safer refactoring
- **Constraint**: No enums, no namespaces with values, no parameter properties

## Non-Goals

- **Not changing CLI UX**: User-facing commands remain identical
- **Not changing schema format**: template.json and selection.json schemas unchanged
- **Not adding new features**: This is purely architectural refactoring
- **Not optimizing performance**: Unless architectural changes naturally improve it

## User Stories

### US1: As a lib/ maintainer
**I want** clear module boundaries with single responsibilities  
**So that** I know exactly where to add new validation logic without confusion

**Acceptance Criteria**:
- [ ] Each lib/ subdirectory has an index.mjs facade
- [ ] No cross-domain imports (security doesn't import from validation)
- [ ] README.md in each subdirectory explains the domain

### US2: As a CLI command developer
**I want** a single import point for lib/ functionality  
**So that** I don't need to know the internal structure of lib/

**Acceptance Criteria**:
- [ ] All bin/ files import only from `lib/index.mjs`
- [ ] Public API is documented in lib/index.mjs JSDoc
- [ ] Breaking changes to public API require version bump

### US3: As a test author
**I want** focused modules that are easy to test at the right layer  
**So that** I can write fewer, more meaningful tests

**Acceptance Criteria**:
- [ ] L2 modules have <5 public functions each
- [ ] Integration tests at L3/L4 cover cross-module workflows
- [ ] E2E tests at L5 cover user-facing scenarios

### US4: As a code reviewer
**I want** consistent naming that doesn't repeat context  
**So that** I can quickly understand code without cognitive overhead

**Acceptance Criteria**:
- [ ] Class methods don't repeat class name
- [ ] Module exports don't repeat module/directory name
- [ ] File names don't repeat directory name

## Constraints

### C1: Backward Compatibility
- All existing bin/ commands must continue to work
- All existing tests must pass (or be intentionally updated)

### C2: Incremental Migration
- Changes must be deployable in phases
- Each phase must leave the codebase in a working state

### C3: No External Dependencies
- Continue using only Node.js built-in modules
- No new npm dependencies for restructuring

### C4: Naming Convention Compliance
- All new code must follow `.kiro/steering/naming-conventions.md`
- Existing code migrated to new structure must be renamed to comply

### C5: Type-Strippable TypeScript Only
- Use only TypeScript features that Node.js can strip at runtime
- **Allowed**: `type`, `interface`, type annotations, generics, `as`, `satisfies`
- **Forbidden**: `enum`, `namespace` with values, parameter properties, decorators
- File extension: `.mts` for ESM TypeScript modules
- Import paths: Must include `.mjs` extension (Node.js requirement)

## Success Criteria

| Metric | Current | Target | Verification |
|--------|---------|--------|--------------|
| lib/ exports | 137 | ≤30 | `grep "^export" lib/index.mts \| wc -l` |
| Largest module | 1,101 lines | ≤300 lines | `wc -l lib/**/*.mts \| sort -rn \| head -1` |
| Validator modules | 8 | 3-4 | `ls lib/validation/` |
| L2 test % | 56% | ≤25% | Test line count analysis |
| L5 test % | 7% | ≥40% | Test line count analysis |
| Naming violations | Unknown | 0 | Code review |
| TypeScript adoption | 0% | 100% of lib/ | `find lib -name "*.mts" \| wc -l` |

## Dependencies

- **Steering Documents**:
  - `.kiro/steering/naming-conventions.md` - Contextual naming rules
  - `.kiro/steering/typescript-guidelines.md` - Type-strippable TypeScript patterns
- **Testing Guide**: `docs/guides/testing.md` - Design principles for testing and SUT

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing tests | High | High | Incremental changes, test after each phase |
| Missing validation paths | High | Medium | Audit all bin/ imports before deleting |
| Documentation drift | Medium | Medium | Update docs in same PR as code |
| Naming convention violations | Low | Medium | Automated linting (future) |

## Open Questions (Resolved)

1. **Should lib/index.mjs re-export with renamed identifiers for clarity?**
   - **Decision**: Yes, use namespace exports (design.md ADR-2)

2. **Should we create a lib/internal/ directory for truly private modules?**
   - **Decision**: No, domain facades provide sufficient encapsulation

3. **How do we handle the bin/create-scaffold/modules/ validators that duplicate lib/?**
   - **Decision**: Audit in Task 7.3; consolidate into lib/validation/ if reusable

---

**Status**: APPROVED - Ready for implementation
