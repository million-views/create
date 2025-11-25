# Design: SUT Architecture Redesign

## Overview

This design restructures lib/ from a flat collection of 137 exports into a domain-driven architecture with a single public facade. The design follows the naming conventions in `.kiro/steering/naming-conventions.md`, particularly the contextual naming rules that eliminate redundancy.

**Key Change**: All new modules will use **type-strippable TypeScript** (`.mts` files) that Node.js 22+ can execute natively with `--experimental-strip-types`.

## Architecture Decision Records

### ADR-1: Domain-Driven Directory Structure

**Context**: The current flat lib/ structure makes it unclear which modules belong together and what their boundaries are.

**Decision**: Organize lib/ into domain subdirectories, each with its own index.mts facade.

**Consequences**:
- Clear ownership of functionality
- Easier to understand dependencies
- Enables independent testing per domain

### ADR-2: Single Public Facade

**Context**: bin/ commands currently import from 15+ different lib/ modules, creating tight coupling.

**Decision**: Create lib/index.mts as the only file bin/ should import from.

**Consequences**:
- Reduced API surface (137 → ~20 exports)
- Internal changes don't break bin/ commands
- Clear contract between lib/ and bin/

### ADR-3: Context-Aware Naming

**Context**: Current naming has redundancy (e.g., `validateTemplateName()` in security.mjs, `SecurityGate.enforceSecurityGate()`).

**Decision**: Follow hierarchical context naming - names inherit context from their container.

**Consequences**:
- Shorter, clearer names
- Less cognitive overhead
- Consistent with naming-conventions.md

### ADR-4: Type-Strippable TypeScript

**Context**: Current codebase uses JSDoc for type hints, which is verbose and lacks full IDE support.

**Decision**: Use TypeScript with only type-strippable features, allowing native Node.js execution.

**Rationale**:
- Node.js 22+ supports `--experimental-strip-types` (stable in Node 23)
- No build step required - types are erased at runtime
- Full IDE support for refactoring, autocomplete, error detection
- Gradual migration possible - `.mjs` and `.mts` can coexist

**Constraints (Type-Strippable Only)**:
```typescript
// ✅ ALLOWED - Type annotations
function validate(input: string): boolean { ... }

// ✅ ALLOWED - Interfaces and types
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ✅ ALLOWED - Generics
function map<T, U>(arr: T[], fn: (x: T) => U): U[] { ... }

// ✅ ALLOWED - Type assertions
const config = JSON.parse(text) as Config;

// ✅ ALLOWED - satisfies operator
const options = { strict: true } satisfies Options;

// ❌ FORBIDDEN - Enums (have runtime code)
enum Status { Active, Inactive }  // Use union types instead

// ❌ FORBIDDEN - Parameter properties
class Foo {
  constructor(private x: number) {}  // Must declare field separately
}

// ❌ FORBIDDEN - Namespaces with values
namespace Utils {
  export const x = 1;  // Use modules instead
}
```

**Consequences**:
- Zero build step for development
- Types provide documentation and safety
- Must avoid enum (use `type X = 'a' | 'b'` instead)

## Target Directory Structure

```text
lib/
├── index.mts                      # PUBLIC FACADE - only file bin/ imports
│
├── error/                         # ERROR DOMAIN
│   ├── index.mts                  # Facade: exports ValidationError, ContextualError
│   ├── validation.mts             # ValidationError class
│   ├── contextual.mts             # ContextualError, ErrorContext, ErrorSeverity
│   └── boundary.mts               # BoundaryViolationError
│
├── security/                      # SECURITY DOMAIN
│   ├── index.mts                  # Facade: exports sanitize, Gate, Boundary
│   ├── sanitize.mts               # sanitize.path(), sanitize.branch(), sanitize.error()
│   ├── gate.mts                   # Gate class (was SecurityGate)
│   └── boundary.mts               # Boundary class (was BoundaryValidator)
│
├── validation/                    # VALIDATION DOMAIN
│   ├── index.mts                  # Facade: exports schema, domain, cli
│   ├── schema/                    # JSON Schema validation
│   │   ├── index.mts              # schema.template(), schema.selection()
│   │   ├── template.mts           # Template schema validation
│   │   └── selection.mts          # Selection schema validation
│   ├── domain/                    # Business rules validation
│   │   ├── index.mts              # domain.placeholder(), domain.dimension()
│   │   ├── placeholder.mts        # Placeholder business rules
│   │   └── dimension.mts          # Dimension business rules
│   └── cli/                       # CLI input validation
│       ├── index.mts              # cli.ide(), cli.cacheTtl(), cli.all()
│       └── option.mts             # All CLI option validators
│
├── placeholder/                   # PLACEHOLDER DOMAIN
│   ├── index.mts                  # Facade: exports resolve, format, canonical
│   ├── resolve.mts                # resolve() function
│   ├── format.mts                 # Format definitions and helpers
│   ├── canonical.mts              # Canonicalization logic
│   └── schema.mts                 # Placeholder normalization
│
├── templatize/                    # TEMPLATIZATION DOMAIN
│   ├── index.mts                  # Facade: exports process, Strategy
│   ├── processor.mts              # Main processor orchestrator
│   └── strategy/                  # File-type strategies
│       ├── index.mts              # Strategy base class
│       ├── json.mts               # JSON file strategy
│       ├── markdown.mts           # Markdown file strategy
│       ├── html.mts               # HTML file strategy
│       ├── jsx.mts                # JSX file strategy
│       └── config.mts             # Config file strategy
│
├── template/                      # TEMPLATE DISCOVERY DOMAIN
│   ├── index.mts                  # Facade: exports discover, ignore
│   ├── discover.mts               # Template discovery logic
│   └── ignore.mts                 # Template ignore patterns
│
├── environment/                   # ENVIRONMENT DOMAIN (setup script sandbox)
│   ├── index.mts                  # Facade: exports Context, Tools, sandbox errors
│   ├── context.mts                # Context factory for immutable ctx object
│   ├── tools/                     # Tool implementations (sandboxed APIs)
│   │   ├── index.mts              # Tools factory
│   │   ├── files.mts              # files.* operations (read, write, copy, etc.)
│   │   ├── inputs.mts             # inputs.* operations (placeholder access)
│   │   ├── json.mts               # json.* operations (read, write, merge)
│   │   ├── logger.mts             # logger.* operations (info, warn, error)
│   │   ├── options.mts            # options.* operations (dimension access)
│   │   ├── placeholders.mts       # placeholders.* operations (resolve, format)
│   │   ├── templates.mts          # templates.* operations (render strings/files)
│   │   └── text.mts               # text.* operations (transform utilities)
│   ├── testing.mts                # Test fixtures: createTestContext, createTestTools
│   └── utils.mts                  # Sandbox utilities: resolveProjectPath, SandboxError
│
├── cli/                           # CLI INFRASTRUCTURE
│   ├── command.mts                # Command base class
│   └── router.mts                 # Router base class
│
└── util/                          # SHARED UTILITIES (singular, not utils)
    ├── index.mts                  # Facade: exports File, Shell, Text
    ├── file.mts                   # File class (operations wrapper)
    ├── shell.mts                  # Shell execution wrapper
    └── text.mts                   # Text utilities
```

## Naming Transformations

### Current → New (Following Context Rules)

| Current Location | Current Name | New Location | New Name | Rationale |
|-----------------|--------------|--------------|----------|-----------|
| lib/security.mjs | `ValidationError` | lib/error/validation.mjs | `ValidationError` | Class name is sufficient |
| lib/security.mjs | `sanitizePath()` | lib/security/sanitize.mjs | `path()` | Module is "sanitize" |
| lib/security.mjs | `sanitizeBranchName()` | lib/security/sanitize.mjs | `branch()` | Module is "sanitize" |
| lib/security.mjs | `sanitizeErrorMessage()` | lib/security/sanitize.mjs | `error()` | Module is "sanitize" |
| lib/security.mjs | `validateTemplateName()` | lib/validation/domain/template.mjs | `name()` | Module is "template" |
| lib/security.mjs | `validateProjectDirectory()` | lib/validation/domain/project.mjs | `directory()` | Module is "project" |
| lib/security.mjs | `validateIdeParameter()` | lib/validation/cli/option.mjs | `ide()` | Module context |
| lib/security.mjs | `validateAllInputs()` | lib/validation/cli/option.mjs | `all()` | Module context |
| lib/security-gate.mjs | `SecurityGate` | lib/security/gate.mjs | `Gate` | Directory is "security" |
| lib/security-gate.mjs | `SecurityGateError` | lib/error/gate.mjs | `GateError` | Directory is "error" |
| lib/boundary-validator.mjs | `BoundaryValidator` | lib/security/boundary.mjs | `Boundary` | Directory is "security" |
| lib/boundary-validator.mjs | `BoundaryViolationError` | lib/error/boundary.mjs | `ViolationError` | Module is "boundary" |
| lib/placeholder-resolver.mjs | `resolvePlaceholders()` | lib/placeholder/resolve.mjs | `resolve()` | Directory is "placeholder" |
| lib/placeholder-formats.mjs | `getPlaceholderFormat()` | lib/placeholder/format.mjs | `get()` | Module is "format" |
| lib/template-discovery.mjs | `TemplateDiscovery` | lib/template/discover.mjs | `Discover` | Directory is "template" |
| lib/template-ignore.mjs | `TemplateIgnore` | lib/template/ignore.mjs | `Ignore` | Directory is "template" |
| lib/templatize-json.mjs | `processJSONFile()` | lib/templatize/strategy/json.mts | `process()` | Module is "json" |
| lib/utils/file.mjs | `File` | lib/util/file.mts | `File` | Already correct |
| lib/environment/utils.mjs | `SetupSandboxError` | lib/environment/utils.mts | `SandboxError` | "Setup" context implicit |
| lib/environment/context.mjs | `ContextValidationError` | lib/environment/context.mts | `ValidationError` | Module is "context" |
| lib/environment/testing.mjs | `createTestContext()` | lib/environment/testing.mts | `context()` | Module is "testing" |

### Public Facade Re-exports

```typescript
// lib/index.mts - PUBLIC API

// Errors (with context since consumer context unknown)
export { ValidationError } from './error/index.mjs';
export { ContextualError, ErrorContext, ErrorSeverity } from './error/index.mjs';
export { GateError } from './error/index.mjs';

// Security (namespace export for clarity)
export * as security from './security/index.mjs';
// Usage: security.sanitize.path(), security.Gate, security.Boundary

// Validation (namespace export for clarity)
export * as validation from './validation/index.mjs';
// Usage: validation.schema.template(), validation.cli.all()

// Placeholder (namespace export for clarity)
export * as placeholder from './placeholder/index.mjs';
// Usage: placeholder.resolve(), placeholder.format.get()

// Templatize (namespace export for clarity)
export * as templatize from './templatize/index.mjs';
// Usage: templatize.process()

// Template (namespace export for clarity)
export * as template from './template/index.mjs';
// Usage: template.discover(), template.ignore()

// Environment (namespace export for setup script sandbox)
export * as environment from './environment/index.mjs';
// Usage: environment.createContext(), environment.createTools(), environment.SandboxError

// CLI infrastructure
export { Command } from './cli/command.mjs';
export { Router } from './cli/router.mjs';

// Utilities (namespace export)
export * as util from './util/index.mjs';
// Usage: util.File, util.Shell
```

**Note on Import Extensions**: When importing `.mts` files, use `.mjs` extension in the import path. Node.js requires explicit extensions, and `.mts` files resolve to `.mjs` at runtime.

## Type Definitions

### Shared Types (lib/types.mts)

```typescript
// lib/types.mts - Shared type definitions

// Error types
export interface ErrorOptions {
  context?: string;
  cause?: Error;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  type: string;
  message: string;
  path: string[];
}

// Template types - re-export from generated types
export type {
  TemplatePlaceholder,
  TemplateDimension,
  TemplateManifest
} from '../types/template-schema.mjs';

// Selection types - re-export from generated types
export type {
  SelectionManifest,
  SelectionDimension
} from '../types/selection-schema.mjs';
```

## Domain Facades

### lib/error/index.mts

```typescript
// Error domain facade
export { ValidationError } from './validation.mjs';
export { ContextualError, ErrorContext, ErrorSeverity } from './contextual.mjs';
export { ViolationError } from './boundary.mjs';
export { GateError } from './gate.mjs';

// Re-export types
export type { ErrorOptions } from './validation.mjs';
```

### lib/security/index.mts

```typescript
// Security domain facade
export * as sanitize from './sanitize.mjs';
export { Gate } from './gate.mjs';
export { Boundary } from './boundary.mjs';

// Re-export types
export type { SanitizeOptions } from './sanitize.mjs';
export type { GateContext, GateResult } from './gate.mjs';
export type { BoundaryOptions } from './boundary.mjs';
```

### lib/validation/index.mts

```typescript
// Validation domain facade
export * as schema from './schema/index.mjs';
export * as domain from './domain/index.mjs';
export * as cli from './cli/index.mjs';

// Re-export shared types
export type { ValidationResult, ValidationIssue } from '../types.mjs';
```

### lib/placeholder/index.mts

```typescript
// Placeholder domain facade
export { resolve } from './resolve.mjs';
export * as format from './format.mjs';
export { canonicalize } from './canonical.mjs';
export { normalize } from './schema.mjs';

// Re-export types
export type { PlaceholderFormat, ResolveOptions } from './format.mjs';
```

### lib/environment/index.mts

```typescript
// Environment domain facade - Setup script sandbox
export { createContext, isContext, ContextValidationError } from './context.mjs';
export { createTools, isTools } from './tools/index.mjs';
export { SandboxError, resolveProjectPath } from './utils.mjs';

// Test utilities (separate export for test files only)
export * as testing from './testing.mjs';

// Re-export types
export type { Context, CreateContextOptions } from './context.mjs';
export type { Tools, ToolsConfig } from './tools/index.mjs';
```

**Sandboxing Architecture**:

The environment domain provides a **sandboxed execution context** for template setup scripts. Key security features:

1. **Path Boundary Enforcement**: `resolveProjectPath()` ensures all file operations stay within the project directory. Any attempt to escape via `../` or absolute paths throws `SandboxError`.

2. **Immutable Context**: The `ctx` object passed to setup scripts is deeply frozen. Scripts cannot mutate project metadata.

3. **Controlled Tool Surface**: Setup scripts only access operations through the `tools` object. Direct `fs` access is not available.

4. **Input Validation**: All tool methods validate inputs before execution, throwing `SandboxError` on violations.

```typescript
// Example sandbox violation
tools.files.write('../../../etc/passwd', 'malicious'); // Throws SandboxError
tools.files.write('/absolute/path', 'content');        // Throws SandboxError
tools.files.write('safe/relative/path.txt', 'ok');     // Allowed - stays in project
```

## Migration Strategy

### Phase 1: Create New Structure (Non-Breaking)

1. Create all new directories and index.mjs facades
2. Create new modules that import from old locations
3. New code exports from new locations
4. Old code continues to work

### Phase 2: Update Internals

1. Move code from old modules to new modules
2. Old modules become re-export shims
3. All tests continue to pass

### Phase 3: Update Consumers

1. Update bin/ imports to use lib/index.mjs
2. Update internal lib/ imports to use domain facades
3. Remove re-export shims

### Phase 4: Cleanup

1. Delete old empty modules
2. Update documentation
3. Final test verification

## Test Impact

### Current Test Mapping

| Test File | Tests Module | Layer |
|-----------|--------------|-------|
| tests/security/security-functions.test.mjs | lib/security.mjs | L2 |
| tests/validators/template-manifest-validator.test.mjs | lib/template-manifest-validator.mjs | L2 |
| tests/validators/template-validator-extended.test.mjs | lib/validation/template-validator.mjs | L2 |
| tests/shared/placeholder-resolver.test.mjs | lib/placeholder-resolver.mjs | L2 |

### New Test Organization

| New Test Location | Tests Domain | Layer |
|-------------------|--------------|-------|
| tests/lib/error/ | lib/error/ | L2 |
| tests/lib/security/ | lib/security/ | L2 |
| tests/lib/validation/ | lib/validation/ | L2 |
| tests/lib/placeholder/ | lib/placeholder/ | L2 |
| tests/lib/templatize/ | lib/templatize/ | L2 |
| tests/lib/environment/ | lib/environment/ | L2 |
| tests/integration/ | Cross-domain | L3 |
| tests/e2e/ | User workflows | L5 |

## Open Design Questions

### Q1: Namespace vs Named Exports?

**Option A**: Namespace exports (chosen)
```javascript
import { security } from './lib/index.mjs';
security.sanitize.path(input);
```

**Option B**: Flat named exports
```javascript
import { sanitizePath } from './lib/index.mjs';
sanitizePath(input);
```

**Decision**: Option A - namespaces provide better organization and reduce import clutter.

### Q2: Handle bin/ Module Validators?

**Current**: bin/create-scaffold/modules/registry/template-validator.mjs duplicates lib/ validation.

**Options**:
1. Move to lib/ and share
2. Keep in bin/ as CLI-specific
3. Delete if truly redundant

**Decision**: Audit usage, likely move to lib/validation/registry/ if reusable.

### Q3: Singular vs Plural Directory Names?

**Decision**: Singular per naming conventions (`error/`, `util/`, `strategy/`).

---

**Status**: APPROVED - Ready for implementation
