# Testing Guide

**A comprehensive guide to testing strategy, patterns, and lessons learned in @m5nv/create-scaffold**

## Table of Contents

- [Philosophy](#philosophy)
- [The Layered Testing Model](#the-layered-testing-model)
- [Critical Lessons Learned](#critical-lessons-learned)
- [Testing Patterns and Examples](#testing-patterns-and-examples)
- [Coverage Journey](#coverage-journey)
- [Best Practices](#best-practices)
- [Common Pitfalls](#common-pitfalls)

---

## Philosophy

### Zero-Mock Testing

This project follows a **zero-mock philosophy**:

- **No mocking frameworks** - Tests interact with real implementations
- **Controlled environments** - Use temporary directories and isolated state
- **Real integrations** - File system, git operations, process spawning all use actual APIs
- **Behavioral validation** - Test observable outcomes, not implementation details

**Why zero mocks?**
- Mocks hide integration bugs that surface in production
- Tests become brittle when coupled to implementation
- Real tests give real confidence
- Refactoring is safer when tests validate behavior, not structure

### The Testing Manifesto

1. **Question before fixing** - When a test fails, ask "Is the SUT broken or is the test broken?"
2. **Design for testability** - Not "design for test pass-ability"
3. **Test behavior, not implementation** - Tests should survive refactoring
4. **Fail fast on validation errors** - Never mask security failures with fallbacks
5. **One assertion per concept** - Clear failure messages guide debugging

---

## The Layered Testing Strategy

### Why Layers Matter

**THE PROBLEM**: Without a testing strategy, you end up with:
- Redundant tests that slow down the suite
- Gaps in coverage that hide bugs
- No clear place to add new tests
- Confusion about what each test validates

**THE SOLUTION**: A structured pyramid with clear responsibilities at each layer.

### The Layered Testing Model

**CRITICAL PRINCIPLE**: Tests at layer N can ONLY call functions at layer N. They cannot reach down to N-1, N-2, etc.

```text
┌─────────────────────────────────────────────────────────────────┐
│                        TEST LAYERS                              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ L4 Tests                                                  │  │
│  │ • Test L4 functions ONLY                                  │  │
│  │ • Cannot call L3, L2, L1, or L0                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             ▲                                   │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │ L3 Tests                                                 │   │
│  │ • Test L3 functions ONLY                                 │   │
│  │ • Cannot call L2, L1, or L0                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             ▲                                   │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │ L2 Tests                                                 │   │
│  │ • Test L2 functions ONLY                                 │   │
│  │ • Cannot call L1 or L0                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             ▲                                   │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │ L1 Tests                                                 │   │
│  │ • Test L1 functions ONLY                                 │   │
│  │ • CAN use L0 (runtime) for fixtures/verification         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM UNDER TEST (SUT)                      │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ L4: CLI Entry Points                                      │  │
│  │ • Router, command classes                                 │  │
│  │ • Argument parsing, user interaction                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ L3: Orchestrators & Coordinators                          │  │
│  │ • Workflows that coordinate L2/L1                         │  │
│  │ • Business logic integration                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ L2: Business Logic Utilities                              │  │
│  │ • Pure data transformation                                │  │
│  │ • Validation, formatting, parsing                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ L1: Low-Level Wrappers                                    │  │
│  │ • Thin wrappers around Node.js APIs                       │  │
│  │ • File operations, process spawning                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ L0: Runtime (Node.js APIs)                                │  │
│  │ • fs, child_process, path, os, etc.                       │  │
│  │ • NOT written by us, NOT tested directly                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

KEY PRINCIPLE:
Tests at layer N sit ABOVE the SUT at layer N
• L4 Tests → test L4 SUT functions
• L3 Tests → test L3 SUT functions
• L2 Tests → test L2 SUT functions
• L1 Tests → test L1 SUT functions
• Tests NEVER reach down to lower layers in SUT
```

### Layer Definitions

#### L0: Runtime (Raw Node.js APIs)
**The operating system and Node.js built-in modules.**

This is NOT code you write—it's `fs`, `child_process`, `path`, `os`, etc. Your code calls these, but you never test them directly.

#### L1: Low-Level Wrappers
**Thin wrappers around Node.js APIs.**

**Example SUT**: `lib/utils/file.mjs`
- `File.ensureDirectory()` wraps `fs.mkdir()`
- `File.safeCleanup()` wraps `fs.rm()`

**Test Constraint for L1**:
- ✅ **MUST** import and test L1 functions from the SUT
- ✅ **MAY** use L0 (raw Node.js APIs: `fs`, `path`, `os`) for test setup/teardown/verification
- ❌ **MUST NOT** import or call L2 functions
- ❌ **MUST NOT** import or call L3 functions
- ❌ **MUST NOT** import or call L4 functions

**Why L1 tests can use L0**: You need the runtime to create test fixtures (temp directories), verify outcomes (check files exist), and cleanup. The SUT at L1 also calls L0 internally, so this is consistent.

**Example**: `tests/utils/file.test.mjs`
```javascript
import { File } from '../../lib/utils/file.mjs';
import { mkdtemp, rm } from 'fs/promises'; // ✅ OK: Using L0 to setup test

test('ensureDirectory creates nested directories', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'test-')); // L0 for fixture

  await File.ensureDirectory(join(tempDir, 'a/b/c')); // L1 under test

  assert(fs.existsSync(join(tempDir, 'a/b/c'))); // L0 for verification
  await rm(tempDir, { recursive: true }); // L0 for cleanup
});
```

#### L2: Business Logic Utilities
**Pure business logic operating on data structures.**

**Example SUT**: `lib/template-ignore.mjs`
- `createTemplateIgnoreSet()` - builds ignore rules
- `shouldIgnoreTemplateEntry()` - applies ignore rules
- `stripIgnoredFromTree()` - filters tree structure

**Test Constraint for L2**:
- ✅ **MUST** import and test L2 functions from the SUT
- ✅ **MAY** use plain JavaScript objects, arrays, primitives as test inputs
- ❌ **MUST NOT** import or call L1 functions (file operations, wrappers)
- ❌ **MUST NOT** use L0 (raw Node.js APIs: `fs`, `child_process`, `path`)
- ❌ **MUST NOT** import or call L3 functions
- ❌ **MUST NOT** import or call L4 functions

**Critical Rule**: If your test needs filesystem operations, process spawning, or any I/O, you're testing at the wrong layer. L2 is for pure data transformation only.

**Example**: `tests/shared/template-ignore.test.mjs`
```javascript
import { createTemplateIgnoreSet, shouldIgnoreTemplateEntry } from '../../lib/template-ignore.mjs';

test('should ignore template artifacts', () => {
  const ignoreSet = createTemplateIgnoreSet(); // L2 under test
  assert.strictEqual(shouldIgnoreTemplateEntry('template.json', ignoreSet), true); // L2 under test
  // ❌ FORBIDDEN: Using fs.readFile() or File.ensureDirectory() here
});
```

**Why this matters**: If you need filesystem operations in your test, your test is at the wrong layer. L2 functions should work with pure data.

#### L3: Orchestrators and Coordinators
**Modules that coordinate multiple L2/L1 modules.**

**Example SUT**: `bin/create-scaffold/modules/setup-runtime.mjs`
- Coordinates config loading, placeholder resolution, script execution
- Calls multiple L2 utilities to accomplish workflow

**Test Constraint for L3**:
- ✅ **MUST** import and test L3 orchestrator functions from the SUT
- ✅ **MAY** provide data objects (configs, contexts) as inputs to the orchestrator
- ✅ **MAY** assert on return values and observable side effects of the orchestrator
- ❌ **MUST NOT** import or call L2 utility functions directly
- ❌ **MUST NOT** import or call L1 wrapper functions directly
- ❌ **MUST NOT** use L0 (raw Node.js APIs) directly
- ❌ **MUST NOT** import or call L4 CLI/router functions

**Critical Rule**: Test the orchestrator's PUBLIC interface only. The orchestrator internally calls L2/L1, but your test never does. You're testing the CONTRACT, not the implementation.

**Example**: `tests/create-scaffold/setup-runtime.test.mjs`
```javascript
import { setupRuntime } from '../../bin/create-scaffold/modules/setup-runtime.mjs';

test('executes setup script with resolved placeholders', async () => {
  const context = {
    template: mockTemplate,
    placeholders: { PROJECT_NAME: 'test' }
  };

  const result = await setupRuntime(context); // L3 under test

  assert.strictEqual(result.success, true);
  // ❌ FORBIDDEN: Calling placeholder-resolver functions directly
  // ❌ FORBIDDEN: Using child_process.spawn() directly
  // ✅ CORRECT: Test through setupRuntime's interface only
});
```

**How L3 touches L2/L1**: The SUT (setupRuntime) calls L2/L1 internally. Your test never does. You test setupRuntime's CONTRACT, not its implementation.

#### L4: CLI Entry Points
**Router and command classes that handle user interaction.**

**Example SUT**: `bin/create-scaffold/index.mjs`, `bin/create-scaffold/commands/new/index.js`
- CLI argument parsing
- Command routing
- User-facing error messages

**Test Constraint for L4**:
- ✅ **MUST** spawn the CLI as a separate process (e.g., `spawnSync('node', ['bin/create-scaffold/index.mjs', ...args])`)
- ✅ **MAY** assert on stdout, stderr, exit codes
- ✅ **MAY** verify filesystem artifacts created by the CLI (after process completes)
- ❌ **MUST NOT** import the CLI router or command classes
- ❌ **MUST NOT** import or call L3 orchestrator functions
- ❌ **MUST NOT** import or call L2 utility functions
- ❌ **MUST NOT** import or call L1 wrapper functions
- ❌ **MUST NOT** use L0 (raw Node.js APIs) except `child_process.spawnSync()` to invoke CLI

**Critical Rule**: The ONLY interaction with the SUT is through `argv` (command-line arguments). You're testing the complete user experience, not internal modules. The CLI wires up all dependencies internally.

**Example**: `tests/create-scaffold/dry-run-cli.test.mjs`
```javascript
import { spawnSync } from 'child_process';

test('should preview template without creating files', () => {
  const result = spawnSync('node', [
    'bin/create-scaffold/index.mjs',
    'new', 'test-project',
    '--template', 'react-vite',
    '--dry-run'
  ], { encoding: 'utf8' });

  assert.strictEqual(result.status, 0);
  assert(result.stdout.includes('DRY RUN MODE'));
  // ❌ FORBIDDEN: Importing and calling setupRuntime() directly
  // ❌ FORBIDDEN: Calling config-loader functions directly
  // ✅ CORRECT: Test ONLY through CLI interface
});
```

**The key insight**: L4 tests exercise the entire stack naturally by invoking the CLI. The router creates all dependencies and wires them up. You never reach down.

### Test Suite Organization

Test suites are organized into groups matching the test pyramid:

```bash
# Unit tests: Core components at lower layers (L1/L2)
npm run test:unit

# Integration tests: Orchestrators and commands (L3/L4)
npm run test:integration

# System tests: Full end-to-end CLI workflows (L4)
npm run test:system
```

**Run by layer**:
```bash
npm run test:unit         # Fast feedback
npm run test:integration  # Medium speed
npm run test:system       # Comprehensive validation
```
---

## Critical Lessons Learned

### Lesson 1: Question Before Fixing

**THE MISTAKE**: When encountering test failures, immediately trying to "fix" the test to pass.

**EXAMPLE FROM THIS SPRINT**:
- Found `validation-utils.test.mjs` failing
- Initial instinct: "Let me fix the import paths to make it pass"
- **CORRECT ACTION**: Paused to investigate why it was failing
- **DISCOVERY**: Test imported dead code (`lib/utils/validator.mjs`) with broken imports
- **RESOLUTION**: Deleted 3 files (~240 lines) of dead code instead of "fixing" them

**THE LESSON**:
```text
Test failure → ASK: "Is the SUT broken or is the test broken?"
            → INVESTIGATE: Check if code is even used
            → DECIDE: Fix, delete, or refactor
            ❌ NEVER: Blindly make test pass
```

### Lesson 2: Design Strategy for Testing

**THE MISTAKE**: Writing tests without a clear strategy for what each test validates.

**SYMPTOMS OF NO STRATEGY**:
- "I'll just add more tests until coverage goes up"
- Tests at wrong layer (L4 test for L2 logic)
- Duplicate coverage across layers
- Unclear what broke when test fails

**THE FIX**: Layered testing approach
1. **Before writing a test**, ask: "What layer is this?"
2. **L2 for logic**, L3 for integration, L4 for CLI
3. **One test suite per module** with clear focus
4. **Test behavior that matters**, not implementation details

**EXAMPLE FROM THIS SPRINT**:

```javascript
// ❌ WRONG: Testing implementation details
test('config loader calls fs.readFile with correct path', () => {
  // Brittle - breaks if we change from fs.readFile to fs.readFileSync
});

// ✅ CORRECT: Testing observable behavior (L2)
test('config loader loads valid config from file', async () => {
  const config = await loadConfig('/path/to/config');
  assert.deepStrictEqual(config.defaults.branch, 'main');
  // Survives refactoring - only cares about result
});
```

### Lesson 3: Broken Tests Are Evidence

**THE MISTAKE**: Treating broken tests as obstacles to remove.

**WHAT HAPPENED**:
- Found `fs-utils.test.mjs` calling non-existent `File.writeFile()` method
- Found `validation-utils.test.mjs` importing modules that don't exist in production
- Initial thought: "These are in the way"
- **CORRECT REALIZATION**: "These are evidence of dead code"

**THE LESSON**:
Broken tests are like smoke detectors - they're alerting you to a problem:
- Test won't run → Check if code is dead
- Test fails on implementation → Check if implementation is wrong
- Test passes but shouldn't → Check if test is testing anything

### Lesson 4: Coverage Is Not The Goal

**THE MISTAKE**: "I need to hit X%, so I'll write whatever tests get me there."

**WHAT WE DID INSTEAD**:
1. **Registered unregistered tests** - Found existing tests not running!
2. **Deleted dead code** - Removed untestable/unused code
3. **Fixed bugs** - Tests revealed real issues (config-loader validation)
4. **Wrote targeted tests** - Each test had clear purpose at its layer

**RESULT**: Significant coverage improvement **with higher quality code**

**THE LESSON**:
```text
Coverage = Outcome of good testing, not the goal
Good testing = Testing what matters at the right layer
```

### Lesson 5: Fail Fast on Security

**THE CRITICAL RULE**: Never mask validation failures with fallbacks.

**FORBIDDEN PATTERN** (from AGENTS.md):
```javascript
// ❌ WRONG: Fallback masks security failures
try {
  validateInput(input);
  processInput(input);
} catch (error) {
  console.log("Input invalid, falling back to defaults...");
  processDefaultInput(); // HIDES THE ATTACK
}
```

**CORRECT PATTERN**:
```javascript
// ✅ CORRECT: Fail fast and loud
try {
  validateInput(input);
  processInput(input);
} catch (error) {
  throw new ContextualError('Input validation failed', {
    context: ErrorContext.SECURITY,
    severity: ErrorSeverity.CRITICAL,
    technicalDetails: error.message
  });
}
```

**WHY THIS MATTERS**:
- Security validation failures are not "try another approach" scenarios
- They're potential attacks that must terminate the operation
- Tests must verify the system fails safely, not that it "works somehow"

---

## Testing Patterns and Examples

### Pattern 1: L2 - Business Logic Testing

**Purpose**: Test L2 functions that operate on data structures.

**What you CAN do**:
- ✅ Call L2 functions being tested
- ✅ Use plain JavaScript objects/arrays as inputs
- ✅ Assert on return values and thrown errors

**What you CANNOT do**:
- ❌ Call L1 functions (file operations, process spawning)
- ❌ Call raw Node.js APIs (fs, child_process, etc.)
- ❌ Call L3 orchestrator functions

**Example: Template Ignore Set** (`tests/shared/template-ignore.test.mjs`)

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTemplateIgnoreSet, shouldIgnoreTemplateEntry } from '../../lib/template-ignore.mjs';

describe('createTemplateIgnoreSet', () => {
  it('includes standard template artifacts', () => {
    const ignoreSet = createTemplateIgnoreSet(); // L2 function
    assert(ignoreSet.has('template.json'));
    assert(ignoreSet.has('_setup.mjs'));
    // ❌ FORBIDDEN: fs.readFile(), File.ensureDirectory(), etc.
  });
});

describe('shouldIgnoreTemplateEntry', () => {
  it('ignores template artifacts', () => {
    const ignoreSet = createTemplateIgnoreSet(); // L2 function
    assert.strictEqual(shouldIgnoreTemplateEntry('template.json', ignoreSet), true); // L2 function
    // Tests pure data transformation only
  });
});
```

**Key Principle**: L2 tests work with data in, data out. No side effects, no lower layers.

### Pattern 2: L2 - Error Class Behavior

**Purpose**: Validate custom error classes maintain correct properties.

**Example: Error Classes** (`tests/shared/error-classes.test.mjs`)

```javascript
describe('ArgumentError', () => {
  it('creates error with correct name and message', () => {
    const error = new ArgumentError('Invalid argument');
    assert.strictEqual(error.name, 'ArgumentError');
    assert.strictEqual(error.message, 'Invalid argument');
  });

  it('maintains Error prototype chain', () => {
    const error = new ArgumentError('Test');
    assert(error instanceof Error);
    assert(error instanceof ArgumentError);
  });

  it('captures stack trace', () => {
    const error = new ArgumentError('Test');
    assert(error.stack);
    assert(error.stack.includes('ArgumentError'));
  });
});
```

**Why This Matters**:
- Errors are thrown across the codebase
- Must maintain correct type for `instanceof` checks
- Stack traces critical for debugging

### Pattern 3: L2 - Configuration Normalization

**Purpose**: Validate configuration loading and transformation logic.

**Example: Config Loader** (`tests/shared/config-loader-templates.test.mjs`)

```javascript
describe('normalizeTemplates', () => {
  it('loads templates with single mapping', () => {
    const config = {
      templates: {
        'react': { path: '/templates/react', name: 'React App' }
      }
    };

    const normalized = normalizeTemplates(config.templates);

    assert.strictEqual(normalized.get('react').path, '/templates/react');
    assert.strictEqual(normalized.get('react').name, 'React App');
  });

  it('rejects empty template alias', () => {
    const config = {
      templates: {
        '': { path: '/templates/react' }
      }
    };

    assert.throws(
      () => normalizeTemplates(config.templates),
      /Template alias cannot be empty/
    );
  });
});
```

**Bug Found During Testing**:
```javascript
// BEFORE: This validation was unreachable
if (typeof registry === 'object' && registry.type) {
  // Typed registry validation
} else if (typeof registry === 'object') {
  // This always matched first for typed registries!
}

// AFTER: Fixed order
if (typeof registry !== 'object') {
  throw new Error('Registry must be object');
}
if (registry.type) {
  // Typed registry validation
} else {
  // Simple registry validation
}
```

### Pattern 4: L3 - Orchestrator Testing

**Purpose**: Test L3 functions that coordinate multiple L2/L1 modules.

**What you CAN do**:
- ✅ Call L3 orchestrator functions being tested
- ✅ Provide data objects as inputs (configs, contexts)
- ✅ Assert on the orchestrator's return values and side effects

**What you CANNOT do**:
- ❌ Call L2 utility functions directly
- ❌ Call L1 file operation functions directly
- ❌ Call raw Node.js APIs directly
- ❌ Invoke the CLI

**Example: Setup Runtime** (L3 orchestrator test)

```javascript
import { describe, it } from 'node:test';
import { setupRuntime } from '../../bin/create-scaffold/modules/setup-runtime.mjs';

describe('setupRuntime', () => {
  it('executes setup script with resolved placeholders', async () => {
    const context = {
      templatePath: '/path/to/template',
      targetPath: '/tmp/test-project',
      placeholders: { PROJECT_NAME: 'my-app' }
    };

    const result = await setupRuntime(context); // L3 function under test

    assert.strictEqual(result.success, true);
    assert(result.scriptOutput.includes('Setup complete'));

    // ❌ FORBIDDEN: Calling placeholder-resolver directly
    // ❌ FORBIDDEN: Calling File.ensureDirectory() directly
    // ❌ FORBIDDEN: Using child_process.spawn() directly
    // ✅ CORRECT: Test only through setupRuntime's interface
  });
});
```

**Key Principle**: L3 tests exercise orchestrators through their public interface. The SUT calls L2/L1 internally, but your test never does.

### Pattern 5: L4 - CLI Testing

**Purpose**: Test L4 CLI entry points through argv only.

**What you CAN do**:
- ✅ Spawn CLI process with arguments
- ✅ Assert on stdout, stderr, exit codes
- ✅ Check filesystem artifacts created by the CLI

**What you CANNOT do**:
- ❌ Import and call L3 orchestrators
- ❌ Import and call L2 utilities
- ❌ Import and call L1 file operations
- ❌ Import and call the router/command classes

**Example: Dry Run Mode** (`tests/create-scaffold/dry-run-cli.test.mjs`)

```javascript
import { spawnSync } from 'child_process';

function runCLI(args, options = {}) {
  // Only interaction: spawn the CLI as a user would
  const result = spawnSync('node', ['bin/create-scaffold/index.mjs', ...args], {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, HOME: options.home || process.env.HOME }
  });

  return {
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

describe('Dry Run Mode', () => {
  it('previews template without creating files', () => {
    // Test only through CLI argv
    const result = runCLI([
      'new', 'test-project',
      '--template', '/path/to/template',
      '--dry-run'
    ], { cwd: tempDir });

    assert.strictEqual(result.exitCode, 0);
    assert(result.stdout.includes('DRY RUN MODE'));
    assert(!fs.existsSync(join(tempDir, 'test-project')));

    // ❌ FORBIDDEN: import { NewCommand } from '...'
    // ❌ FORBIDDEN: import { setupRuntime } from '...'
    // ✅ CORRECT: Test through CLI interface only
  });
});
```

**Key Principle**: L4 tests validate the complete user experience. The CLI wires up all layers internally, but the test only touches argv/stdout/stderr.

---

## Coverage Journey

### Sprint Journey: Coverage Improvement Case Study

**Initial Assessment**:
- Found unregistered test suites (tests existed but weren't running)
- Discovered dead code with broken imports
- Identified validation bugs in config-loader
- Gaps in error-classes coverage

### Actions Taken

#### Action 1: Create Missing Tests

**config-loader-templates.test.mjs**
- Found and fixed unreachable validation path
- Removed dead code (impossible type checks)
- Improved coverage significantly

**error-classes.test.mjs**
- Validated error prototype chains
- Ensured stack traces work correctly
- Achieved full coverage of error classes

**template-ignore.test.mjs**
- Comprehensive L2 coverage
- Fixed misunderstanding of stripIgnoredFromTree behavior
- High coverage of ignore logic

#### Action 2: Register Unregistered Tests

Found test suites that existed but weren't in test-runner.mjs:
- `error-handler.test.mjs` - significant coverage improvement
- `placeholder-resolver.test.mjs` - significant coverage improvement
- `selection-validator.test.mjs` - registered
- `path-resolver.test.mjs` - already had high coverage

**Impact**: Major coverage gain from tests that already existed!

#### Action 3: Delete Dead Code

Removed multiple files of dead/broken code:
- `lib/validation-utils.mjs` - unused duplicate
- `lib/utils/validator.mjs` - unused duplicate with broken imports
- `tests/shared/validation-utils.test.mjs` - test for dead code
- `tests/shared/fs-utils.test.mjs` - called non-existent APIs

**Impact**: Cleaner codebase, no false coverage inflation

#### Action 4: Reorganize Test Suites

Removed legacy/duplicate test groups:
- ❌ `test:smoke` (duplicate of `test:integration`)
- ❌ `test:e2e` (duplicate of `test:system`)
- ❌ `test:acceptance` (empty group)

Established clean 3-tier pyramid:
- ✅ `test:unit` (L1/L2 focus)
- ✅ `test:integration` (L3/L4 focus)
- ✅ `test:system` (L4 end-to-end)

### Key Achievements

**Coverage Goals Met**:
- ✅ Exceeded target coverage threshold
- ✅ All test suites passing
- ✅ Zero test failures
- ✅ Dead code eliminated
- ✅ Validation bugs fixed

**Process Improvements**:
- Established layered testing discipline
- Documented testing strategy
- Created reusable patterns for future test development

---

## Best Practices

### 1. Test Isolation

**ALWAYS** use temporary directories for tests that touch the filesystem:

```javascript
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

let tempDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});
```

**Why**:
- Tests don't pollute repository
- Tests can run in parallel
- No cleanup failures block CI

### 2. Descriptive Test Names

```javascript
// ❌ BAD
test('should work', () => { ... });
test('test1', () => { ... });

// ✅ GOOD
test('should ignore template.json from output tree', () => { ... });
test('should throw when template alias is empty string', () => { ... });
```

**Why**: When test fails, name tells you what broke.

### 3. One Assertion Per Concept

```javascript
// ❌ BAD: Multiple unrelated assertions
test('config loader', () => {
  const config = loadConfig();
  assert(config.branch === 'main');
  assert(config.author.name === 'Test');
  assert(config.registries.length > 0);
});

// ✅ GOOD: Separate tests for separate concepts
test('loads default branch from config', () => {
  const config = loadConfig();
  assert.strictEqual(config.branch, 'main');
});

test('loads author information from config', () => {
  const config = loadConfig();
  assert.strictEqual(config.author.name, 'Test');
});
```

### 4. Test Error Paths

**Don't just test happy paths**:

```javascript
describe('validateTemplateUrl', () => {
  // ✅ Happy path
  it('accepts valid template URL', () => {
    assert.doesNotThrow(() => validateTemplateUrl('owner/repo'));
  });

  // ✅ Error paths
  it('rejects null bytes', () => {
    assert.throws(
      () => validateTemplateUrl('owner\0/repo'),
      /null bytes/
    );
  });

  it('rejects path traversal', () => {
    assert.throws(
      () => validateTemplateUrl('../../../etc/passwd'),
      /Path traversal/
    );
  });
});
```

### 5. Respect Layer Boundaries

**Each test must stay at its own layer**:

```javascript
// ❌ BAD: L2 test reaching down to L1/L0
test('normalizeTemplates creates valid structure', async () => {
  await File.ensureDirectory('/tmp/test'); // L1 function - FORBIDDEN in L2 test
  const config = normalizeTemplates(templates); // L2 function
  assert(config.has('react'));
});

// ✅ GOOD: L2 test stays at L2
test('normalizeTemplates creates valid structure', () => {
  const templates = { react: { path: '/templates/react' } };
  const config = normalizeTemplates(templates); // L2 only
  assert(config.has('react'));
});

// ✅ GOOD: L1 test can use L0 for fixtures
test('File.ensureDirectory creates nested dirs', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'test-')); // L0 for setup
  await File.ensureDirectory(join(tempDir, 'a/b/c')); // L1 under test
  assert(fs.existsSync(join(tempDir, 'a/b/c'))); // L0 for verification
});
```

---

## Common Pitfalls

### Pitfall 1: Testing Implementation, Not Behavior

```javascript
// ❌ WRONG: Coupled to implementation
test('uses Map for template storage', () => {
  const loader = new TemplateLoader();
  assert(loader.templates instanceof Map);
});

// ✅ CORRECT: Tests behavior
test('retrieves template by alias', () => {
  const loader = new TemplateLoader();
  loader.addTemplate('react', { path: '/react' });
  assert.strictEqual(loader.getTemplate('react').path, '/react');
});
```

**Why it matters**: First test breaks if you switch from Map to Object. Second test doesn't care.

### Pitfall 2: Ignoring Broken Tests

```javascript
// ❌ WRONG: Skipping broken tests
test.skip('this test is flaky', () => { ... });

// ✅ CORRECT: Fix or delete
// Option 1: Fix the test
test('properly isolated test', () => { ... });

// Option 2: Delete if testing dead code
// (deleted the test file entirely)
```

### Pitfall 3: Not Cleaning Up Resources

```javascript
// ❌ WRONG: No cleanup
test('creates temp files', async () => {
  await fs.writeFile('/tmp/test-file', 'data');
  // Leaves files behind!
});

// ✅ CORRECT: Always cleanup
test('creates temp files', async (t) => {
  const tempFile = await mkdtemp(join(tmpdir(), 'test-'));

  t.after(async () => {
    await rm(tempFile, { recursive: true, force: true });
  });

  await fs.writeFile(join(tempFile, 'file'), 'data');
});
```

### Pitfall 4: Testing at Wrong Layer

```javascript
// ❌ WRONG: L4 test for L2 logic
test('CLI should validate input format', () => {
  const result = runCLI(['new', 'test\0name']);
  assert(result.exitCode !== 0);
  // Slow, unclear what's being tested
});

// ✅ CORRECT: L2 test for validation logic
test('validateProjectName rejects null bytes', () => {
  assert.throws(
    () => validateProjectName('test\0name'),
    /null bytes/
  );
  // Fast, clear what's being tested
});
```

### Pitfall 5: Blindly Fixing Tests to Pass

**ANTI-PATTERN**:
```javascript
// Test fails with "Cannot find module './security.mjs'"
// WRONG FIX: Change import to make it work
import { ValidationError } from '../security.mjs';  // "Fixed" the path

// CORRECT ACTION: Investigate why it's broken
// 1. Is this module even used in production? (No)
// 2. Is this test testing dead code? (Yes)
// 3. Should we delete it? (Yes)
// Result: Deleted the entire file
```

---

## Running Tests

### By Layer

```bash
# Fast feedback during development (L2/L3)
npm run test:unit

# Command-level validation (L3/L4)
npm run test:integration

# Full system validation (L4)
npm run test:system

# Everything
npm test
```

### Individual Test Suite

```bash
# Run specific suite by name
npm run test:suite "Error Classes Tests"
npm run test:suite "Template Ignore Tests"

# Or run file directly
node --test tests/shared/error-classes.test.mjs
```

### With Coverage

```bash
# Generate coverage report
npm run test:coverage

# View baseline
cat tmp/c8-baseline/coverage-summary.json
```

### Tool-Specific

```bash
# All create-scaffold tests
npm run test:create-scaffold

# All make-template tests
npm run test:make-template
```

---

## Conclusion

Testing is not about hitting coverage numbers. It's about:

1. **Building confidence** that your system works
2. **Catching bugs** before they reach production
3. **Documenting behavior** through executable examples
4. **Enabling refactoring** by validating contracts, not implementation

The layered approach gives you:
- **Clear strategy** for where to add tests
- **Fast feedback** from unit tests
- **Real confidence** from integration tests
- **Production validation** from system tests

Remember the core lessons:
- ✅ **Question before fixing** - Is the SUT or test broken?
- ✅ **Design for testing** - Know which layer before writing
- ✅ **Test behavior** - Not implementation details
- ✅ **Fail fast** - Especially on security validation
- ✅ **Zero mocks** - Real tests give real confidence

---

**Coverage is the outcome of good testing, not the goal.**

**Test what matters, at the right layer, with real confidence.**
