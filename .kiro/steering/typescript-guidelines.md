---
inclusion: always
---

# Type-Strippable TypeScript Guidelines

## Core Principle: Zero Build Step TypeScript

This project uses **type-strippable TypeScript** - TypeScript syntax that Node.js can execute directly by stripping type annotations at runtime. No transpilation or build step is required.

## Runtime Requirements

- **Node.js 23+**: Type stripping is stable and enabled by default
- **File Extension**: Use `.mts` for ESM TypeScript modules
- **Import Paths**: Use `.mts` extension when importing TypeScript files

```typescript
// ✅ CORRECT: Import .mts files with .mts extension
import { ValidationError } from './error/validation.mts';

// ❌ WRONG: Missing extension
import { ValidationError } from './error/validation';

// ❌ WRONG: Using .mjs for .mts files (confusing, though it may work)
import { ValidationError } from './error/validation.mjs';
```

**Note**: Node.js resolves `.mts` imports directly - no need to pretend files are `.mjs`.

## Allowed TypeScript Features (Type-Strippable)

These features are **safe to use** - they contain no runtime code and will be stripped:

### Type Annotations

```typescript
// Parameters and return types
function validate(input: string, strict: boolean): ValidationResult {
  // ...
}

// Variable declarations
const config: Config = loadConfig();
let count: number = 0;
```

### Type Aliases

```typescript
// Simple type alias
type UserId = string;

// Union types (PREFERRED over enums)
type ErrorContext = 'validation' | 'network' | 'filesystem' | 'runtime';
type ErrorSeverity = 'low' | 'medium' | 'high' | 'fatal';

// Intersection types
type ExtendedConfig = BaseConfig & { extra: string };
```

### Interfaces

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

interface ValidationIssue {
  type: string;
  message: string;
  path: string[];
}

// Interface extension
interface ExtendedResult extends ValidationResult {
  suggestions: string[];
}
```

### Generics

```typescript
// Generic functions
function map<T, U>(arr: T[], fn: (x: T) => U): U[] {
  return arr.map(fn);
}

// Generic interfaces
interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
}

// Generic classes
class Registry<T> {
  private items = new Map<string, T>();
  
  register(key: string, item: T): void {
    this.items.set(key, item);
  }
}
```

### Type Assertions

```typescript
// 'as' assertions
const config = JSON.parse(text) as Config;

// 'satisfies' operator (TS 4.9+)
const options = {
  strict: true,
  verbose: false
} satisfies Options;
```

### Optional and Readonly

```typescript
interface Config {
  required: string;
  optional?: string;
  readonly immutable: string;
}

// Optional chaining (JavaScript feature, not TS-specific)
const value = config.nested?.deep?.value;
```

## Forbidden TypeScript Features (NOT Type-Strippable)

These features generate runtime code and **MUST NOT be used**:

### ❌ Enums

```typescript
// ❌ FORBIDDEN - Generates runtime object
enum Status {
  Active,
  Inactive,
  Pending
}

// ✅ USE INSTEAD - Union type
type Status = 'active' | 'inactive' | 'pending';

// ✅ If you need numeric values, use a const object
const Status = {
  Active: 0,
  Inactive: 1,
  Pending: 2
} as const;
type Status = typeof Status[keyof typeof Status];
```

### ❌ Parameter Properties

```typescript
// ❌ FORBIDDEN - Generates assignment code
class Validator {
  constructor(private strict: boolean) {}
}

// ✅ USE INSTEAD - Explicit declaration
class Validator {
  private strict: boolean;
  
  constructor(strict: boolean) {
    this.strict = strict;
  }
}
```

### ❌ Namespaces with Values

```typescript
// ❌ FORBIDDEN - Generates runtime object
namespace Utils {
  export const VERSION = '1.0.0';
  export function helper() {}
}

// ✅ USE INSTEAD - Regular modules
// utils/version.mts
export const VERSION = '1.0.0';

// utils/helper.mts
export function helper() {}
```

### ❌ Decorators

```typescript
// ❌ FORBIDDEN - Generates runtime wrapper code
@Injectable()
class Service {}

// ✅ USE INSTEAD - Explicit patterns or factory functions
function createService(): Service {
  return new Service();
}
```

### ❌ const Enums (with isolatedModules)

```typescript
// ❌ FORBIDDEN - Requires cross-module analysis
const enum Direction {
  Up,
  Down
}

// ✅ USE INSTEAD - Union type
type Direction = 'up' | 'down';
```

## TypeScript Configuration

### tsconfig.json Settings

```jsonc
{
  "compilerOptions": {
    // Module settings for ESM
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    
    // Type-stripping requirements
    "verbatimModuleSyntax": true,    // Required
    "allowImportingTsExtensions": true,
    "noEmit": true,                   // No compilation output
    
    // Strict type checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    
    // Compatibility
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "lib/**/*.mts",
    "types/**/*.ts"
  ]
}
```

### Key Settings Explained

| Setting | Value | Purpose |
|---------|-------|---------|
| `verbatimModuleSyntax` | `true` | Ensures imports/exports are type-strippable |
| `allowImportingTsExtensions` | `true` | Allows `.mts` imports |
| `noEmit` | `true` | No compilation - types are for checking only |
| `module` | `NodeNext` | ESM module system |
| `moduleResolution` | `NodeNext` | Node.js ESM resolution |

## Pattern: Union Types Instead of Enums

Enums are the most common "gotcha" - they look like types but generate runtime code.

### Pattern 1: String Unions (Most Common)

```typescript
// Define the type
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Use in function signatures
function log(level: LogLevel, message: string): void {
  console.log(`[${level.toUpperCase()}] ${message}`);
}

// Type-safe usage
log('info', 'Starting...');  // ✅
log('invalid', 'Oops');      // ❌ Type error
```

### Pattern 2: Const Object with Derived Type

```typescript
// When you need both values and type
const ErrorSeverity = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Fatal: 'fatal'
} as const;

type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];
// Equivalent to: 'low' | 'medium' | 'high' | 'fatal'

// Use the const for values
console.log(ErrorSeverity.High);  // 'high'

// Use the type for annotations
function handleError(severity: ErrorSeverity): void { ... }
```

### Pattern 3: Numeric Values

```typescript
// When you need numeric enum-like behavior
const Priority = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3
} as const;

type Priority = typeof Priority[keyof typeof Priority];
// Equivalent to: 0 | 1 | 2 | 3

// Comparison works
if (task.priority >= Priority.High) {
  notifyAdmin();
}
```

## File Organization

### Naming Convention

```text
lib/
├── types.mts              # Shared type definitions
├── error/
│   ├── index.mts          # Domain facade
│   ├── validation.mts     # ValidationError class
│   └── contextual.mts     # ContextualError class
└── security/
    ├── index.mts          # Domain facade
    └── sanitize.mts       # Sanitization functions
```

### Type Export Patterns

```typescript
// lib/error/validation.mts

// Export class
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Export associated types
export interface ValidationErrorOptions {
  field?: string;
  cause?: Error;
}
```

```typescript
// lib/error/index.mts (facade)

// Re-export classes
export { ValidationError } from './validation.mts';
export { ContextualError } from './contextual.mts';

// Re-export types (use 'export type' for type-only exports)
export type { ValidationErrorOptions } from './validation.mts';
export type { ContextualErrorOptions } from './contextual.mts';
```

## Verification Commands

```bash
# Type check without emitting
npm run typecheck
# or
npx tsc --noEmit

# Run TypeScript directly (Node 23+)
node lib/index.mts

# Verify type-stripping works
node --experimental-strip-types lib/index.mts  # Explicit flag (Node 22)
```

## Review Checklist

Before committing TypeScript code:

- [ ] File uses `.mts` extension for ESM
- [ ] Imports include `.mts` extension for TypeScript files
- [ ] No `enum` declarations (use union types)
- [ ] No parameter properties in constructors
- [ ] No `namespace` with values
- [ ] No decorators
- [ ] `npm run typecheck` passes
- [ ] Code runs with `node file.mts` (no build step)

## Migration Notes

When converting `.mjs` to `.mts`:

1. Rename file from `.mjs` to `.mts`
2. Update imports in other files to use `.mts` extension
3. Add type annotations to function parameters and return types
4. Define interfaces for object shapes
5. Replace any `@typedef` JSDoc with TypeScript types
6. Run `npm run typecheck` to catch type errors
7. Test with `node file.mts` to verify runtime behavior

## Related Documents

- `naming-conventions.md` - Naming rules for types and interfaces
- `nodejs-runtime-focus.md` - Node.js runtime requirements
- `.kiro/specs/libs/sut-redesign/` - Active sprint using these guidelines
