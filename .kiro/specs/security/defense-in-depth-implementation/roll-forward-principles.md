---
title: "Roll-Forward Implementation Principles"
parent_spec: "design.md"
status: "draft"
created: "2025-11-20"
---

# Roll-Forward Implementation Principles

## Core Philosophy: Delete, Don't Deprecate

This implementation follows **strict roll-forward principles** with **zero backward compatibility baggage**. The product is pre-release, so we optimize for correctness and maintainability, not backward compatibility.

## Guiding Principles

### 1. One Path, One Truth
- **Never**: Keep old code "just in case"
- **Never**: Add feature flags for gradual migration
- **Never**: Maintain parallel implementations
- **Always**: Delete old code when replacing it
- **Always**: One implementation path only

### 2. Aggressive DRY (Don't Repeat Yourself)
- **If code appears twice**: Extract to function
- **If patterns repeat**: Create abstraction
- **If validation duplicates**: Consolidate to SecurityGate
- **If error handling duplicates**: Use centralized handler

### 3. Use Platform Native Functions
- **Prefer**: Native Node.js APIs over custom implementations
- **Prefer**: `URL` API over regex parsing
- **Prefer**: `structuredClone` over custom deep copy
- **Prefer**: `AbortController` over custom timeouts
- **Prefer**: Latest `fs/promises` over callbacks or older APIs
- **Require**: Node.js 22+ (latest LTS)

### 4. Delete, Don't Comment Out
- **Never**: Comment out old code "for reference"
- **Never**: Keep unused functions "just in case"
- **Always**: Delete unused code completely
- **Always**: Git history preserves old implementations if needed

### 5. Fix Bugs, Don't Work Around Them
- **Never**: Add workarounds for bugs in old code
- **Never**: Preserve undefined behavior for "compatibility"
- **Always**: Fix the root cause
- **Always**: Write tests that enforce correct behavior

## Implementation Checklist

### Before Writing New Code:

- [ ] Can I use a native Node.js API instead?
- [ ] Does similar code exist elsewhere? (DRY violation)
- [ ] Am I keeping old code "just in case"? (Delete it)
- [ ] Am I adding a feature flag? (Don't - roll forward)
- [ ] Am I working around a bug? (Fix the bug instead)

### When Refactoring:

- [ ] Delete old implementation completely
- [ ] Consolidate duplicated logic
- [ ] Use native APIs where available
- [ ] Write tests for new implementation
- [ ] Update documentation (delete old docs too)

### When Encountering "Legacy" Code:

- [ ] **Delete it** - Don't work around it
- [ ] Replace with modern implementation
- [ ] No "compatibility mode" - fix it properly
- [ ] If tests depend on bugs, fix the tests

## Modern Node.js APIs to Leverage

### Node.js 22+ Features We'll Use:

```javascript
// 1. Native structuredClone (no lodash needed)
const cloned = structuredClone(complexObject);

// 2. AbortController for timeouts (no custom timers)
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
await fetch(url, { signal: controller.signal });

// 3. URL API for robust parsing
const url = new URL('https://github.com/user/repo');
console.log(url.pathname); // /user/repo

// 4. fs/promises with latest APIs
import { readFile, writeFile, mkdir } from 'fs/promises';
await mkdir(dir, { recursive: true });

// 5. Native Map for caching (faster than objects)
const cache = new Map();
cache.set(key, value);

// 6. Native Set for deduplication
const unique = [...new Set(array)];

// 7. Promise.allSettled for parallel operations
const results = await Promise.allSettled([op1, op2, op3]);

// 8. Optional chaining and nullish coalescing
const value = obj?.deeply?.nested?.property ?? 'default';

// 9. Private class fields
class SecurityGate {
  #auditLogger; // Truly private
  
  constructor(logger) {
    this.#auditLogger = logger;
  }
}

// 10. Top-level await (in ESM modules)
const config = await loadConfig();
```

## Anti-Patterns to Avoid

### ❌ Backward Compatibility Debt
```javascript
// DON'T DO THIS:
function validateInput(input, { legacy = false } = {}) {
  if (legacy) {
    return oldValidation(input); // Keeping old bugs alive
  }
  return newValidation(input);
}

// DO THIS INSTEAD:
function validateInput(input) {
  return newValidation(input); // One path, always correct
}
```

### ❌ Feature Flags for Migration
```javascript
// DON'T DO THIS:
const USE_NEW_VALIDATOR = process.env.USE_NEW_VALIDATOR === 'true';

if (USE_NEW_VALIDATOR) {
  validate(input);
} else {
  legacyValidate(input); // Delete this path entirely
}

// DO THIS INSTEAD:
validate(input); // Always use the correct implementation
```

### ❌ Commented Out Code
```javascript
// DON'T DO THIS:
function processTemplate(template) {
  // Old implementation (keeping for reference)
  // if (template.includes('/')) {
  //   return oldLogic(template);
  // }
  
  return newLogic(template);
}

// DO THIS INSTEAD:
function processTemplate(template) {
  return newLogic(template); // Git history has old code if needed
}
```

### ❌ Reinventing Platform Features
```javascript
// DON'T DO THIS:
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj)); // Buggy, loses functions/dates
}

// DO THIS INSTEAD:
const cloned = structuredClone(obj); // Native, correct, fast
```

### ❌ Working Around Bugs
```javascript
// DON'T DO THIS:
function safeValidate(input) {
  try {
    return validate(input); // Has a bug but we work around it
  } catch (error) {
    return fallbackValidation(input); // Masks the bug
  }
}

// DO THIS INSTEAD:
function validate(input) {
  // Fix the bug in validate() directly
  // No fallback, no workaround
}
```

## Code Deletion Strategy

### What to Delete:

1. **Manual validation in commands** - Replace with SecurityGate
2. **validator.js files** - Validation moved to centralized gate
3. **Duplicate error handling** - Use centralized handler
4. **Custom deep clone** - Use native `structuredClone`
5. **Custom timeout logic** - Use `AbortController`
6. **Regex URL parsing** - Use native `URL` API
7. **Callback-based fs** - Use `fs/promises`
8. **Commented out code** - Delete it all
9. **Unused functions** - Delete them
10. **Legacy compatibility shims** - Delete them

### How to Delete Safely:

1. **Write tests first** - Ensure new code is correct
2. **Delete in commits** - One deletion per commit for easy rollback
3. **Run tests after deletion** - Verify nothing breaks
4. **Update docs** - Remove references to deleted code
5. **Search for usages** - Ensure nothing references deleted code

## Success Metrics

### Code Quality Metrics:

- **Lines of Code**: Should DECREASE significantly
- **Cyclomatic Complexity**: Should DECREASE (simpler logic)
- **Duplication**: Should approach ZERO
- **Test Coverage**: Should remain 100% (or improve)
- **Build Time**: Should DECREASE (less code)
- **Node.js APIs Used**: Should INCREASE (less custom code)

### Before/After Targets:

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Command validation LOC | ~240 lines | ~15 lines | -94% |
| Validation functions | 16 scattered | 1 SecurityGate | -94% |
| Template resolution paths | 4+ code paths | 1 unified path | -75% |
| Error handling patterns | 5+ different | 1 centralized | -80% |
| Total codebase size | Baseline | -20% target | -20% |

## Remember:

1. **Product is pre-release** - No users to break
2. **Git preserves history** - Can always reference old code
3. **Tests catch regressions** - Safety net for aggressive refactoring
4. **Simpler is better** - Less code = fewer bugs
5. **Modern is faster** - Native APIs are optimized
6. **One path is maintainable** - No branching logic maze

---

**When in doubt: Delete it. Roll forward. Use native APIs. Keep it DRY.**
