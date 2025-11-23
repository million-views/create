---
title: "Defense-in-Depth Architecture Design"
status: "draft"
parent_spec: "requirements.md"
created: "2025-11-20"
---

# Design: Defense-in-Depth Security Architecture

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     CLI Entry Points                         │
│  (commands/new, commands/list, commands/validate)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              LAYER 1: Input Validation Gate                  │
│  • Centralized validation enforcer                           │
│  • All inputs validated before ANY processing                │
│  • No bypass paths allowed                                   │
│  • Audit log: validation attempts                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         LAYER 2: Business Logic Validation                   │
│  • Template resolution with security checks                  │
│  • Repository URL validation                                 │
│  • Path existence and permission checks                      │
│  • Audit log: resolution decisions                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          LAYER 3: Runtime Boundary Enforcement               │
│  • Path traversal checks on EVERY file operation             │
│  • Null byte detection                                       │
│  • Symlink validation                                        │
│  • Audit log: boundary violations                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            LAYER 4: VM Sandbox Isolation                     │
│  • Setup scripts execute in restricted VM                    │
│  • No Node built-ins (require/import/eval)                   │
│  • Only approved APIs via tools object                       │
│  • Audit log: sandbox violations                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         LAYER 5: Audit and Monitoring                        │
│  • All security events logged                                │
│  • Pattern detection for abuse                               │
│  • Rate limiting on repeated failures                        │
│  • Security metrics collection                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Security Gate Enforcer

**Purpose**: Architectural boundary that ensures ALL code paths validate inputs

**Location**: `lib/security-gate.mjs`

```javascript
/**
 * Security gate enforcer - architectural boundary for validation
 * ALL entry points MUST call this before processing
 */
export class SecurityGate {
  constructor(auditLogger) {
    this.auditLogger = auditLogger;
    this.validationCache = new Map(); // Cache for performance
  }

  /**
   * Enforce validation at architectural boundary
   * @throws {SecurityGateError} if validation fails
   * @returns {ValidatedInputs} - Validated and sanitized inputs
   */
  async enforce(rawInputs, context) {
    const startTime = Date.now();

    try {
      // Layer 1: Validate inputs using existing validators
      const validated = validateAllInputs(rawInputs);

      // Log successful validation
      this.auditLogger.logValidation({
        timestamp: new Date().toISOString(),
        context,
        inputs: this.sanitizeForLogging(rawInputs),
        outcome: 'success',
        duration: Date.now() - startTime
      });

      return validated;

    } catch (error) {
      // Log validation failure
      this.auditLogger.logValidation({
        timestamp: new Date().toISOString(),
        context,
        inputs: this.sanitizeForLogging(rawInputs),
        outcome: 'failure',
        error: error.message,
        duration: Date.now() - startTime
      });

      // Check for repeated failures (abuse detection)
      this.checkForAbuse(context, error);

      // Re-throw with context
      throw new SecurityGateError(
        `Input validation failed: ${error.message}`,
        { originalError: error, context }
      );
    }
  }

  checkForAbuse(context, error) {
    // Track failures per context (e.g., per user session)
    // Implement rate limiting or warnings
  }

  sanitizeForLogging(inputs) {
    // Remove sensitive data before logging
    return Object.keys(inputs).reduce((acc, key) => {
      acc[key] = '<sanitized>';
      return acc;
    }, {});
  }
}
```

### 2. Audit Logger

**Purpose**: Centralized security event logging

**Location**: `lib/security-audit-logger.mjs`

```javascript
/**
 * Security audit logger - tracks all security-relevant events
 */
export class SecurityAuditLogger {
  constructor(options = {}) {
    this.logFile = options.logFile || null;
    this.console = options.console || false;
    this.buffer = [];
  }

  logValidation(event) {
    this.log('VALIDATION', event);
  }

  logBoundaryViolation(event) {
    this.log('BOUNDARY_VIOLATION', event);
  }

  logSandboxViolation(event) {
    this.log('SANDBOX_VIOLATION', event);
  }

  log(type, event) {
    const entry = {
      type,
      timestamp: event.timestamp || new Date().toISOString(),
      ...event
    };

    // Buffer for async writes
    this.buffer.push(entry);

    // Console output if enabled
    if (this.console) {
      console.error(`[SECURITY] ${type}:`, entry);
    }

    // Flush buffer periodically
    if (this.buffer.length >= 10) {
      this.flush();
    }
  }

  async flush() {
    if (!this.logFile || this.buffer.length === 0) return;

    const entries = this.buffer.splice(0, this.buffer.length);
    const fs = await import('fs/promises');

    // Append to log file (JSON lines format)
    await fs.appendFile(
      this.logFile,
      entries.map(e => JSON.stringify(e)).join('\n') + '\n',
      'utf8'
    );
  }
}
```

### 3. Boundary Validator

**Purpose**: Runtime enforcement of path boundaries on EVERY file operation

**Location**: `lib/boundary-validator.mjs`

```javascript
/**
 * Boundary validator - enforces path boundaries at runtime
 * Wraps all file operations to ensure they stay within allowed directories
 */
export class BoundaryValidator {
  constructor(allowedRoot, auditLogger) {
    this.allowedRoot = path.resolve(allowedRoot);
    this.auditLogger = auditLogger;
  }

  /**
   * Validate and resolve path - MUST be called before ANY file operation
   */
  validatePath(userPath, operation = 'unknown') {
    // Layer 3: Runtime boundary check
    const resolved = path.resolve(this.allowedRoot, userPath);

    // Check for path traversal
    if (!resolved.startsWith(this.allowedRoot + path.sep) &&
        resolved !== this.allowedRoot) {

      // Log boundary violation
      this.auditLogger.logBoundaryViolation({
        timestamp: new Date().toISOString(),
        operation,
        attemptedPath: userPath,
        resolvedPath: resolved,
        allowedRoot: this.allowedRoot
      });

      throw new BoundaryViolationError(
        'Path escapes allowed directory boundaries',
        { userPath, resolved, allowedRoot: this.allowedRoot }
      );
    }

    // Check for null bytes
    if (userPath.includes('\0')) {
      throw new BoundaryViolationError('Path contains null bytes');
    }

    return resolved;
  }

  /**
   * Wrap fs operations to enforce boundary checks
   */
  wrapFs(fs) {
    return new Proxy(fs, {
      get: (target, prop) => {
        const original = target[prop];

        // Wrap file operations that take paths
        const pathOps = ['readFile', 'writeFile', 'mkdir', 'readdir',
                        'stat', 'unlink', 'rmdir', 'copyFile'];

        if (pathOps.includes(prop)) {
          return (...args) => {
            // Validate first argument (path)
            args[0] = this.validatePath(args[0], prop);
            return original.apply(target, args);
          };
        }

        return original;
      }
    });
  }
}
```

### 4. Command Router Security Integration (Roll-Forward Rewrite)

**Purpose**: Eliminate ALL manual validation, enforce security gate at entry points

**BEFORE (commands/new/index.js) - 80 lines of manual validation:**
```javascript
async run(parsed) {
  const errors = [];

  // Validate required argument
  if (!parsed.projectName) {
    errors.push('<project-name> is required');
  }

  // Validate required option
  if (!parsed.template) {
    errors.push('--template flag is required');
  }

  // Validate project name
  if (parsed.projectName) {
    const projectValidation = validateProjectName(parsed.projectName);
    if (!projectValidation.valid) {
      errors.push(projectValidation.error);
    }
  }

  // Validate template (50+ lines of manual checks)
  if (parsed.template) {
    // ... complex manual validation ...
  }

  // Validate cache flags don't conflict
  if (parsed.cache === false && parsed.cacheTtl !== undefined) {
    errors.push('Cannot use both --no-cache and --cache-ttl');
  }

  if (errors.length > 0) {
    console.error('❌ Validation failed:');
    errors.forEach(error => console.error(`  • ${error}`));
    this.showHelp();
    process.exit(1);
  }

  // Execute scaffolding
  const scaffolder = new Scaffolder(parsed);
  return scaffolder.scaffold();
}
```

**AFTER (Roll-Forward Rewrite) - 5 lines total:**
```javascript
async run(parsed) {
  // Security gate enforces ALL validation - architectural boundary
  const validated = await this.securityGate.enforce(parsed, {
    command: 'new',
    requiredFields: ['projectName', 'template']
  });

  // All validation complete - proceed with business logic
  const scaffolder = new Scaffolder(validated);
  return scaffolder.scaffold();
}
```

**Files to DELETE:**
- `commands/new/validator.js` - Manual validation replaced by SecurityGate
- `commands/list/validator.js` - Manual validation replaced by SecurityGate
- `commands/validate/validator.js` - Manual validation replaced by SecurityGate

**DRY Wins:**
- 80 lines → 5 lines per command (240 lines deleted across 3 commands)
- One validation path enforced architecturally
- No duplication of validation logic
- Error handling centralized in SecurityGate

### 5. Template Resolver Security Enhancement (Complete Rewrite)

**Purpose**: Validation FIRST, resolution SECOND - no bypass paths

**BEFORE (Scaffolder.js) - Validation bypass via registry alias:**
```javascript
// Registry alias resolution happens BEFORE comprehensive validation (BAD)
let resolvedTemplate = this.options.template;
if (this.options.template && !this.options.template.includes('://') &&
    !this.options.template.startsWith('/')) {
  const tempResolver = new TemplateResolver(this.cacheManager, configMetadata);
  resolvedTemplate = tempResolver.resolveRegistryAlias(this.options.template);
}

// Then manual validation happens (too late - already processed)
if (this.options.template) {
  if (this.options.template.includes('\0')) {
    handleError(new ValidationError('Template contains null bytes'));
  }
  // ... more manual checks ...
}
```

**AFTER (Roll-Forward Rewrite):**
```javascript
// 1. Security gate validates RAW input FIRST - no processing until validated
const validated = await this.securityGate.enforce({
  projectName: this.options.projectName,
  template: this.options.template, // Raw, unprocessed
  ...this.options
});

// 2. Template resolver uses validated input (cannot bypass validation)
const templateResolver = new TemplateResolver(this.cacheManager, configMetadata);
const resolved = await templateResolver.resolve(validated.template);

// Template resolver itself has Layer 2 validation for URLs
```

**Template Resolver Rewrite:**
```javascript
// DRY: Consolidate all template resolution patterns
async resolve(templateInput) {
  // Layer 2: Business logic validation (defense-in-depth)
  this.validateTemplateFormat(templateInput);

  // Determine template type using native URL API
  const type = this.detectTemplateType(templateInput);

  switch (type) {
    case 'registry-alias':
      return this.resolveRegistryAlias(templateInput);
    case 'git-url':
      return this.resolveGitUrl(templateInput);
    case 'local-path':
      return this.resolveLocalPath(templateInput);
    case 'shorthand':
      return this.resolveShorthand(templateInput);
    default:
      throw new Error(`Unknown template type: ${templateInput}`);
  }
}

detectTemplateType(input) {
  // Use native URL API for robust parsing
  try {
    const url = new URL(input);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? 'git-url'
      : 'unknown';
  } catch {
    // Not a URL
  }

  if (input.startsWith('./') || input.startsWith('../') || input.startsWith('/')) {
    return 'local-path';
  }

  if (input.includes('/')) {
    return 'shorthand'; // repo/template format
  }

  return 'registry-alias'; // Simple name
}
```

**DRY Wins:**
- Template type detection consolidated (was scattered across 4+ locations)
- Native `URL` API replaces regex parsing
- Single validation order enforced architecturally
- No bypass paths possible

## Security Properties to Verify

### Property 1: No Bypass Paths
**Test**: Architectural test that verifies all CLI entry points call `SecurityGate.enforce()`

```javascript
test('All CLI commands enforce security gate', async () => {
  const commands = ['new', 'list', 'validate'];

  for (const cmd of commands) {
    const Command = await import(`./commands/${cmd}/index.js`);
    const instance = new Command.default();

    // Verify securityGate is injected and used
    assert.ok(instance.securityGate, `${cmd} command missing security gate`);

    // Verify run() method calls enforce()
    const runSource = instance.run.toString();
    assert.ok(
      runSource.includes('securityGate.enforce'),
      `${cmd} command run() doesn't call securityGate.enforce()`
    );
  }
});
```

### Property 2: Layer Independence
**Test**: Each layer independently catches malicious inputs

```javascript
test('Each security layer independently blocks path traversal', async () => {
  const maliciousPath = '../../../etc/passwd';

  // Layer 1: Input validation should block
  assert.throws(() => validateProjectDirectory(maliciousPath));

  // Layer 2: Template name validation should block
  assert.throws(() => validateTemplateName(maliciousPath));

  // Layer 3: Runtime boundary check should block
  const validator = new BoundaryValidator('/safe/root');
  assert.throws(() => validator.validatePath(maliciousPath));

  // Even if one layer is bypassed, others protect
});
```

### Property 3: Fail-Secure Behavior
**Test**: All error paths fail safely without masking security issues

```javascript
test('Security errors propagate without fallback', async () => {
  const maliciousInputs = {
    projectDirectory: '../evil',
    template: '../../malicious'
  };

  // Security gate should reject and NOT fallback to defaults
  await assert.rejects(
    async () => securityGate.enforce(maliciousInputs),
    SecurityGateError
  );

  // Verify no state was modified
  assert.equal(fallbackCalled, false, 'Should not fallback on security failure');
});
```

## Implementation Strategy (Roll-Forward, No Backward Compatibility)

### Philosophy: Delete, Don't Deprecate

- **No feature flags** - One implementation path only
- **No legacy code** - Delete old validation code completely
- **No compatibility shims** - If it's wrong, fix it
- **Aggressive DRY** - Extract all duplication
- **Modern Node.js only** - Use latest APIs (Node.js 22+)

### Phase 1: Foundation + Aggressive Cleanup (Week 1-2)
- [ ] Implement `SecurityGate` class using modern Node.js APIs
- [ ] Implement `SecurityAuditLogger` with native async logging
- [ ] Implement `BoundaryValidator` using latest `fs` APIs
- [ ] **DELETE all manual validation code from commands**
- [ ] Add architectural tests that ENFORCE security gate usage
- [ ] DRY: Consolidate error handling patterns

### Phase 2: Command Rewrite (Week 3)
- [ ] **Rewrite `NewCommand.run()`** - Use SecurityGate only, delete manual validation
- [ ] **Rewrite `ListCommand.run()`** - Use SecurityGate only
- [ ] **Rewrite `ValidateCommand.run()`** - Use SecurityGate only
- [ ] **DELETE** `validator.js` files (validation moves to SecurityGate)
- [ ] DRY: Extract common command patterns into base class
- [ ] Use native `structuredClone` for deep copying inputs

### Phase 3: Template Resolution Cleanup (Week 4)
- [ ] **Rewrite template resolution** - Validation BEFORE resolution, always
- [ ] Remove registry alias resolution from validation bypass paths
- [ ] DRY: Consolidate URL/path/shorthand resolution logic
- [ ] Use `URL` native API for repository URL parsing
- [ ] Use `AbortController` for timeout enforcement

### Phase 4: File Operations + VM Sandbox (Week 5)
- [ ] **Rewrite file operations** - BoundaryValidator on ALL fs calls
- [ ] Use latest Node.js `fs/promises` APIs (no callbacks)
- [ ] Enhance VM sandbox with audit logging
- [ ] DRY: Consolidate path resolution logic
- [ ] Use native `path` methods aggressively

### Phase 5: Testing + Cleanup (Week 6)
- [ ] Add architectural tests that PREVENT validation bypass
- [ ] Add layer independence tests
- [ ] Add fail-secure behavior tests
- [ ] **DELETE unused validation functions** (keep only what's needed)
- [ ] Performance benchmarking
- [ ] Security penetration testing

### Phase 6: Documentation (Week 7)
- [ ] Update security-model.md with defense-in-depth architecture
- [ ] Add architecture diagrams
- [ ] Document security properties
- [ ] Template author guide

## Performance Targets

1. **< 50ms overhead** - Using caching, async logging, modern APIs
2. **Zero blocking operations** - All I/O is async
3. **Efficient validation** - Cache validated inputs with native `Map`
4. **Stream-based logging** - Use Node.js streams for audit logs

## Breaking Changes (Intentional)

### What Will Break (and why that's good):

1. **Templates exploiting validation bugs** - GOOD, they were security vulnerabilities
2. **Direct file path patterns that bypass validation** - GOOD, security risk
3. **Edge cases relying on undefined behavior** - GOOD, undefined = unreliable
4. **Manual validation in commands** - DELETED, replaced with SecurityGate

### What Won't Break:

1. **Legitimate template patterns** - All valid use cases preserved
2. **CLI interface** - Same commands, flags, behavior for valid inputs
3. **Template structure** - No changes to template.json, _setup.mjs, etc.
4. **Security functions** - Enhanced, not removed

## Documentation Updates

1. Update `security-model.md` to describe defense-in-depth architecture
2. Add architecture diagrams showing security layers
3. Document security properties and how they're verified
4. Template author guide for security best practices
