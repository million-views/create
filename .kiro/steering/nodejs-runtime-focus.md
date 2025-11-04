---
inclusion: always
---

# Node.js Runtime Focus

## Core Principles

- **ESM Only**: All code must use ES Modules. No CommonJS patterns or require() statements
- **Node.js Built-ins First**: Prefer native Node.js modules over external dependencies
- **Modern JavaScript**: Use latest stable Node.js features (async/await, destructuring, etc.)
- **Test-First Development**: Write failing tests before implementation

## Technology Constraints

### Required Stack

- **Runtime**: Node.js 22+ (latest LTS)
- **Module System**: ES Modules exclusively (`type: "module"` in package.json)
- **File Operations**: `fs/promises` for async file operations
- **Process Management**: `child_process` for spawning subprocesses

### Forbidden Patterns

- ❌ CommonJS (`require()`, `module.exports`)
- ❌ Heavy external dependencies (prefer zero-dependency approach)
- ❌ Browser-specific APIs or patterns
- ❌ Outdated Node.js patterns (callbacks, sync operations where async available)

## Test-First Development (Critical)

- **ALWAYS** write comprehensive functional tests FIRST before implementing any functionality
- **MANDATORY WORKFLOW**: For ANY implementation task:
  1. STOP - Do not write implementation code
  2. Write failing tests that define the expected behavior
  3. Run tests to confirm they fail (red)
  4. Implement ONLY the minimum code to make tests pass (green)
  5. Refactor if needed while keeping tests green
- Write tests that cover all functionality, error scenarios, and expected behaviors
- Test all security validations (path traversal, injection prevention) before implementing them
- Create tests for all operations and edge cases
- **NEVER** implement functionality without tests - this wastes time and creates technical debt

### Test Execution Requirements

- Use `npm test` as the canonical entry point before every handoff or commit.
- For targeted runs, execute `node --test test/<suite-name>.test.mjs`; never reference legacy custom runners or camelCase filenames.
- Update or add suites in kebab-case (`*.test.mjs`) so `node --test` discovers them automatically.
- Capture real command output from the native runner when documenting or troubleshooting behavior; do not rely on simulated output.

## Development Task Ordering

### Correct Order for Development (RED-GREEN-REFACTOR)

1. **Search existing codebase FIRST** - Use grepSearch and readFile to find existing functionality
2. **Analyze existing patterns** - Understand current validation, error handling, and architectural patterns
3. **Identify reuse opportunities** - Extend existing functions rather than duplicating functionality
4. **Write failing tests FIRST** - Define expected behavior with comprehensive test cases
5. **Run tests to confirm failure** - Verify tests fail for the right reasons (RED)
6. **Implement minimum viable code** - Write only enough code to make tests pass (GREEN)
7. **Refactor if needed** - Improve code quality while maintaining green tests
8. **Update configuration** - package.json, dependencies (if needed)
9. **Integration testing** - Ensure new functionality integrates properly

### MANDATORY Pre-Implementation Checklist

Before writing ANY implementation code, ask:

- [ ] **Have I searched the existing codebase** for similar or duplicate functionality?
- [ ] **Can I extend/reuse existing functions** instead of creating new ones?
- [ ] **Have I identified all existing validation patterns** to maintain consistency?
- [ ] Have I written comprehensive tests that define the expected behavior?
- [ ] Do the tests currently fail (proving they test the right thing)?
- [ ] Do I understand exactly what needs to be implemented based on the failing tests?

### Avoid These Anti-Patterns

- ❌ **NEVER** implement functionality first, then write tests
- ❌ **NEVER** duplicate existing functionality without searching the codebase first
- ❌ **NEVER** create new functions when existing ones can be extended or reused
- ❌ **NEVER** build modules in isolation without test-driven validation
- ❌ **NEVER** fix issues reactively instead of preventing them with tests
- ❌ **NEVER** assume implementation works without failing tests to prove it

## Enforcement Mechanisms

### MANDATORY Pre-Implementation Protocol

**BEFORE writing ANY implementation code, you MUST:**

1. **DECLARE INTENT**: State explicitly "I will now follow strict TDD: search codebase → write failing tests → verify RED → get permission → implement GREEN"
2. **SEARCH CODEBASE**: Use grepSearch and readFile to find existing similar functionality
3. **WRITE FAILING TESTS**: Create comprehensive tests that define expected behavior
4. **VERIFY RED STATE**: Run tests to confirm they fail with expected error messages
5. **GET EXPLICIT PERMISSION**: Ask user "Tests are now failing as expected. May I proceed with minimal implementation to make them pass?"

### ABSOLUTE PROHIBITIONS

- **NEVER** write implementation code before tests exist and fail
- **NEVER** use `node -e "..."` for debugging - fix tests instead and run proper test suite
- **NEVER** proceed without explicit user confirmation after RED phase
- **NEVER** skip the "search existing codebase" step
- **NEVER** assume tests work - always run them to verify failure first

### Auto-Enforcement Triggers

**If you catch yourself:**
- Writing any function implementation before tests
- Using `executeBash` with `node -e` for testing/debugging
- Debugging implementation issues instead of test failures
- Proceeding without user permission after RED phase

**You MUST:**
1. **STOP IMMEDIATELY** and state "I violated TDD protocol"
2. **DELETE** any implementation code written
3. **RESTART** with proper test-first approach
4. **APOLOGIZE** to user and explain the violation

### Compliance Verification Statement

Before ANY implementation task, you must state:
"I will follow strict TDD protocol: 1) Search codebase 2) Write failing tests 3) Verify RED 4) Get user permission 5) Implement minimal GREEN solution"

### Debugging Protocol

When tests fail or issues arise:
- **NEVER** use ad-hoc `node -e` commands
- **ALWAYS** fix the test files and re-run through proper test runner
- **ALWAYS** use `npm test` or specific test file execution
- **ALWAYS** treat test failures as specification issues, not implementation bugs

## Success Criteria

A well-built Node.js package should:

- Start quickly (minimal dependencies)
- Handle errors gracefully with helpful messages
- Work reliably across different environments
- Follow Node.js best practices
- Have comprehensive test coverage written BEFORE implementation
- Follow strict Test-Driven Development (TDD) methodology