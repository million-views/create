# Working in This Repository (Kiro Methodology)

**CRITICAL**: The Kiro Methodology is designed for **production development work**. Do NOT apply the full methodology when the user's intent is clearly exploratory, investigative, or emergency-based. Identify the context before triggering the flow.

## Context Recognition Rules
- **Exploratory**: "prototype", "explore", "quick test" → Build lightweight, skip formal specs
- **Investigative**: "debug", "investigate", "strange issue" → Conduct unstructured debugging, apply Kiro only after issue is understood
- **Emergency**: "emergency", "hotfix", "service down" → Deploy immediate fix, formalize later
- **Uncertain?** → **PAUSE and check with human-in-the-loop**

## Task Type Recognition
Different types of work require different methodological approaches:

### Feature Development (Default)
- **Characteristics**: New user-facing functionality, API changes, UI improvements
- **Process**: Full 3-phase spec-driven development (requirements → design → tasks)
- **Location**: `.kiro/specs/<component>/<feature>/`
- **Validation**: Comprehensive testing, documentation updates

### Migration/Integration Work
- **Characteristics**: Repository restructuring, tool integration, dependency updates, data migration
- **Process**: Lightweight planning with clear success criteria, focus on rollback plans
- **Location**: `.kiro/specs/<component>/<migration-name>/`
- **Validation**: Pre/post state verification, rollback testing

### Chore/Maintenance Work
- **Characteristics**: Refactoring, cleanup, dependency updates, build improvements
- **Process**: Task-based tracking with clear acceptance criteria
- **Location**: `.kiro/specs/<component>/<chore-name>/`
- **Validation**: Regression testing, performance benchmarks

### Infrastructure Work
- **Characteristics**: CI/CD changes, deployment automation, environment setup
- **Process**: Infrastructure-as-code principles, change management
- **Location**: `.kiro/specs/infrastructure/<work-name>/`
- **Validation**: Automated testing, monitoring integration

## Repository Type Determination

### Quick Repository Type Check
**Monolith Repository**:
- One main deployable unit (app, service, tool, or library)
- Single `package.json` at repository root
- No package.json files in subdirectories (except node_modules)

**Monorepo Environment**:
- Contains multiple deployable packages/applications
- Multiple `package.json` files in different subdirectories
- Multiple deployment artifacts from same repository
- Shared libraries used across packages
- Uses npm/pnpm workspaces for package management
- Often uses Lerna, Rush, Nx, or similar tooling

### Detection Commands
```bash
# Count package.json files (exclude node_modules)
find . -name "package.json" -not -path "./node_modules/*" | wc -l
# > 1 = likely monorepo

# Check for npm/pnpm workspace configuration
grep -E '"workspaces"' package.json
ls -la | grep -E "pnpm-workspace\.yaml"
```

## Artifact Organization

### Transient & Ephemeral Artifacts
- **Location**: All transient, ephemeral, or temporary artifacts must be created under the `tmp/` folder
- **CRITICAL**: Never use absolute paths outside the project directory (e.g., `/tmp`, `/var/tmp`, `~/tmp`). Always use relative paths within the project (e.g., `./tmp/`, `tmp/`)
- **Directory Restriction**: All file operations, terminal commands, and directory changes must stay within the project root directory. Never `cd` to or reference paths outside the project workspace.
- **Purpose**: Keep the repository root clean and avoid committing temporary files
- **Examples**: Test artifacts, build outputs, generated documentation, experimental prototypes
- **Cleanup**: Always implement proper cleanup for temporary artifacts
- **Naming**: Use descriptive names with timestamps when needed (e.g., `tmp/test-run-20241108/`)

### Permanent Repository Structure
- **Code**: Core source code stays in appropriate directories (`bin/`, `lib/`, `src/`, etc.)
- **Tests**: Test files belong in `tests/` directory
- **Documentation**: Documentation goes in `docs/` directory
- **Configuration**: Configuration files stay at appropriate levels

## Workflow by Repository Type

### Monolith Workflow
- **Specs**: Flat structure under `.kiro/specs/feature-name/`
- **Coordination**: Work within single codebase
- **Deployment**: Single artifact deployment

### Monorepo Workflow
- **Specs**: Hierarchical structure under `.kiro/specs/{apps,libs,services,tools}/`
- **Coordination**: Cross-package dependencies and shared libraries
- **Deployment**: Multiple artifact coordination using npm/pnpm workspaces

## Default Behavior: When in Doubt
- **If context is unclear or requirements are ambiguous, STOP and consult the human user.**
- **Do not proceed with assumptions**. The cost of clarification is always less than the cost of incorrect implementation.

---

## 1. Work Classification & Planning
- **Identify task type** using the Task Type Recognition rules above
- **Choose appropriate process** based on work characteristics
- **Create appropriate planning artifacts** (specs for features, task lists for chores/migrations)

## 2. Spec-Driven Development (for Feature Work)
- Features begin with a spec under `.kiro/specs/<component>/<feature>/`.
- **Read `docs/spec-driven-development.md`** for complete guidance on creating requirements, design, and implementation plans.
- Author and drive changeset for one or more features in a sprint in 3 phases:
  - Create `requirements.md` and iterate to get approval
  - Create `design.md` and iterate to get approval
  - Create `tasks.md` and iterate to completion:
    - Track progress incrementally: work on ONE task at a time, mark it `[x]` when completed, then move to the next task
    - Use `[ ]` for not started tasks, `[x]` for completed tasks, `[*]` for optional tasks
    - NEVER mark all tasks complete at once - progress must be tracked incrementally through the sprint

## 3. Migration/Integration Workflows
- Migrations and integrations use lightweight planning with emphasis on:
  - Clear success criteria and rollback plans
  - Pre/post state verification
  - Risk assessment and mitigation strategies
  - Stakeholder coordination for cross-team changes

### Pre-Refactoring Preparation Checklist

**Phase 1: Baseline & Impact Assessment**
- [ ] **Run full test suite** - Capture current passing state as baseline
- [ ] **Document current behavior** - Note error messages, validation flows, and edge cases
- [ ] **Identify change scope** - Flag areas affecting: error messages, validation logic, security checks, API contracts
- [ ] **Review test coupling** - Identify tests depending on implementation details vs behavior

**Phase 2: Test Strategy Planning** 
- [ ] **Plan test updates** - For flagged areas, prepare regex patterns or behavioral assertions
- [ ] **Document validation precedence** - Map current error-catching order for security validations
- [ ] **Prepare isolation fixes** - Identify tests needing explicit cleanup or mocking
- [ ] **Create rollback plan** - Know how to revert if tests break unexpectedly

**Phase 3: Execution & Validation**
- [ ] **Immediate post-change testing** - Run full suite after ANY error message or validation changes
- [ ] **Security validation audit** - Confirm attack vectors still covered after validation reordering  
- [ ] **Behavioral regression check** - Ensure improvements don't break intended functionality
- [ ] **Test isolation verification** - No tests depend on implementation artifacts

**Phase 4: Documentation & Handoff**
- [ ] **Update error message inventory** - Track all user-facing messages for future test updates
- [ ] **Document architectural changes** - Validation flows, security boundaries, API contracts
- [ ] **Flag follow-up work** - Any deferred test improvements or documentation updates

**Key Mindset**: Test failures post-refactoring are often signals of *improvement* - investigate before reverting. Use surgical test updates over code rollbacks when possible.

## 2. Strict Test-Driven Development
- Search the codebase for existing patterns before writing new code.
- Write failing tests first (RED), run them to confirm failure, then implement minimal changes to make them pass (GREEN).
- Use the project's test suites (`node test/...`, `npm test`); avoid ad-hoc `node -e`.

## 3. Safety & Source Control
- Do not revert unrelated changes or run destructive git commands (`reset --hard`, `checkout --`, etc.).
- Respect `.kiro/specs/` content created by others unless explicitly instructed.
- Keep implementation isolated to relevant files.

## 4. Security Validation & Error Handling: ABSOLUTE REQUIREMENTS

**CRITICAL**: These patterns are FORBIDDEN. They have caused production security vulnerabilities and must NEVER be implemented.

### 🚫 FORBIDDEN: Fallback Logic That Masks Validation Failures
**NEVER** implement "helpful" fallback mechanisms that hide security validation errors. Examples of what NOT to do:

```javascript
// ❌ WRONG: Fallback masks security validation
try {
  validateInput(input);
  processInput(input);
} catch (error) {
  // DON'T DO THIS - masks security failures
  console.log("Input invalid, falling back to defaults...");
  processDefaultInput();
}
```

```javascript
// ❌ WRONG: Repository fallback hides access errors
try {
  cloneRepository(repoUrl);
} catch (error) {
  // DON'T DO THIS - masks authentication/repository issues
  console.log("Repository failed, using default repo...");
  cloneRepository(DEFAULT_REPO);
}
```

**✅ CORRECT**: Always fail fast on validation errors:
```javascript
// ✅ CORRECT: Fail fast on validation errors
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

### 🚫 FORBIDDEN: Insufficient Input Validation
**NEVER** skip validation layers. Always implement multi-layer validation:

```javascript
// ❌ WRONG: Single validation point
function processTemplate(templateUrl) {
  if (!templateUrl.includes('://')) {
    // Only basic check - MISSING security validation
    return templateUrl;
  }
}
```

**✅ CORRECT**: Multi-layer validation with security checks:
```javascript
// ✅ CORRECT: Multi-layer validation
function validateTemplateUrl(templateUrl) {
  // Layer 1: Basic format validation
  if (!templateUrl || typeof templateUrl !== 'string') {
    throw new Error('Template URL must be a non-empty string');
  }
  
  // Layer 2: Security validation - BLOCK INJECTION
  if (templateUrl.includes('\0')) {
    throw new Error('Template contains null bytes');
  }
  if (templateUrl.includes(';') || templateUrl.includes('|') || templateUrl.includes('&')) {
    throw new Error('Template contains shell metacharacters');
  }
  
  // Layer 3: Path traversal prevention
  if (templateUrl.includes('../') || templateUrl.startsWith('/')) {
    throw new Error('Path traversal attempts are not allowed');
  }
  
  return templateUrl;
}
```

### 🚫 FORBIDDEN: Generic Error Messages That Hide Security Issues
**NEVER** use generic error messages that could mask security validation failures:

```javascript
// ❌ WRONG: Generic error hides security issues
try {
  validateAndProcess(input);
} catch (error) {
  // DON'T DO THIS - could be hiding injection attacks
  console.error("Processing failed, continuing...");
}
```

**✅ CORRECT**: Specific, security-aware error messages:
```javascript
// ✅ CORRECT: Security-aware error handling
try {
  validateAndProcess(input);
} catch (error) {
  if (error.message.includes('injection') || error.message.includes('traversal')) {
    throw new ContextualError('Security validation failed', {
      context: ErrorContext.SECURITY,
      severity: ErrorSeverity.CRITICAL,
      suggestions: ['Check input for malicious characters', 'Use only safe characters']
    });
  }
  throw error; // Re-throw other errors as-is
}
```

### 🚫 FORBIDDEN: Command Routing That Bypasses Validation
**NEVER** allow command routing to skip validation layers:

```javascript
// ❌ WRONG: Routing bypasses validation
function routeCommand(args) {
  if (args[0] === 'new') {
    // DON'T DO THIS - skips validation for certain patterns
    if (args[1].includes('/')) {
      return handleSpecialCase(args[1]);
    }
    return handleNewCommand(args.slice(1));
  }
}
```

**✅ CORRECT**: Consistent validation regardless of command path:
```javascript
// ✅ CORRECT: Consistent validation
function routeCommand(args) {
  // Always validate first, regardless of command
  validateArguments(args);
  
  if (args[0] === 'new') {
    return handleNewCommand(args.slice(1));
  }
  // ... other commands
}
```

### 🚫 FORBIDDEN: Incorrect Lint Error Fixes That Break Code
**NEVER** attempt to "fix" lint errors by prefixing unused imports with `_`. This approach ONLY works for unused variables, NOT for ES module imports. Attempting this will cause import errors and break your code.

```javascript
// ❌ WRONG: This BREAKS ES module imports
import { unusedFunction as _unusedFunction } from './module.mjs';
import _unusedVariable from './other-module.mjs';

// ❌ WRONG: This causes "Cannot resolve module" errors
import { TemplateResolver as _TemplateResolver } from '../../modules/template-resolver.mjs';
```

**✅ CORRECT**: Remove unused imports entirely:
```javascript
// ✅ CORRECT: Remove unused imports completely
// import { unusedFunction } from './module.mjs'; // REMOVED
// import unusedVariable from './other-module.mjs'; // REMOVED
import { usedFunction } from './module.mjs'; // Keep only what's actually used
```

**✅ CORRECT**: For unused variables, remove them entirely:
```javascript
// ✅ CORRECT: Remove unused variables entirely
function processData(data) {
  // const unusedVar = data.unused; // REMOVED
  return data.used;
}
```

**MANDATORY LINT FIX PROTOCOL**:
1. **Identify the actual problem**: Read the lint error message carefully
2. **Understand the language/module system**: ES modules ≠ CommonJS ≠ variables
3. **Apply the correct fix**: Remove unused imports, not rename them
4. **Test immediately**: Run tests to ensure the fix doesn't break functionality
5. **Verify with linter**: Confirm the error is actually resolved

**WHY THIS MATTERS**: Incorrect lint fixes introduce runtime errors, break builds, and waste debugging time. Always fix lint errors properly on the first attempt.

### Security Validation Checklist (MANDATORY)
Before implementing ANY input processing:

- [ ] **Injection Prevention**: Block null bytes, shell metacharacters (`;`, `|`, `&`, `` ` ``, `$()`)
- [ ] **Path Traversal**: Prevent `../`, absolute paths, and directory traversal
- [ ] **Multi-layer Validation**: Validate at command router, business logic, AND security layers
- [ ] **Fail Fast**: Never fallback or continue on validation failures
- [ ] **Specific Errors**: Use descriptive error messages that don't leak system information
- [ ] **Test Coverage**: Write tests that verify validation blocks malicious inputs

### Error Handling Checklist (MANDATORY)
For ANY error handling code:

- [ ] **No Fallbacks**: Never fallback to "safe" defaults that mask validation failures
- [ ] **Preserve Error Context**: Maintain original error information for debugging
- [ ] **Security Classification**: Classify errors by security impact (CRITICAL, HIGH, MEDIUM)
- [ ] **User-Safe Messages**: Sanitize error messages to prevent information disclosure
- [ ] **Consistent Propagation**: Either handle completely or re-throw with added context

## 5. Documentation & Logging
- Update docs and logs to match new behavior only after functionality is in place.
- Follow documentation standards (avoid maintenance liabilities, keep examples realistic).

## 6. Steering Documents
- **Comprehensive guidance** for implementation details is available in `.kiro/steering/**`:
  - `steering-hierarchy.md` - How to navigate the tiered steering structure
  - `greenfield-development.md` - Development philosophy (universal)
  - `workspace-safety.md` - File operation safety (universal)
  - `security-guidelines.md` - Security requirements (universal)
  - `nodejs-runtime-focus.md` - Node.js runtime requirements (universal)
  - `multi-level-validation.md` - Validation framework (universal)
  - `diataxis-documentation.md` - Documentation framework (universal)
  - `templates/` - Documentation templates (universal)
  - `cli-development-focus.md` - CLI-specific patterns (package-type)
  - `monorepo-coordination.md` - Cross-package coordination (project)
  - `release-orchestration.md` - Multi-package releases (project)
  - `shared-library-specs.md` - Shared library management (project)
  - `sprint-orchestration.md` - Multi-project sprint planning (project)
  - `naming-conventions.md` - Consistent naming patterns
  - `readme-guidelines.md` - README structure and content standards
- **Read `steering-hierarchy.md` first** to understand which standards apply to your context.

## 7. Dependencies & Environment

## 7. Dependencies & Environment
- Node.js ESM only; prefer built-in modules.
- No external dependencies unless documented.

## 8. Development Philosophy: Roll-Forward Only

**CRITICAL RULE: ZERO BACKWARD COMPATIBILITY**

- **Roll-Forward Development**: All planning, code generation, and documentation must assume roll-forward development only. Do NOT consider backward compatibility unless explicitly requested by the product manager.
- **No Historical References**: Do NOT reference past decisions, legacy code, or historical artifacts when making new decisions. Focus only on the current state and desired future state.
- **Clean Slate Mindset**: Treat each task as if starting from a clean slate. Do not waste cycles or tokens maintaining compatibility with previous implementations.
- **Explicit Only**: Only implement backward compatibility when the product manager explicitly requests it in writing, with clear justification for the business value.
- **Future-Focused**: All decisions should optimize for the future state, not preserve the past state.

**SECURITY-FIRST EXCEPTION**: Security fixes that break backward compatibility are ALWAYS permitted and encouraged. Never preserve insecure behavior for "compatibility" reasons.

**Exception**: This rule does NOT apply to:
- Data migration (when explicitly requested)
- API contracts with external consumers (when explicitly requested)
- Breaking changes that affect end users (when explicitly requested)

**Default Behavior**: When in doubt, break compatibility and move forward.
