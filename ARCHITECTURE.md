# Architecture Overview

This document describes the architecture of the `@m5nv/create` library, which provides the core functionality for the `create-scaffold` and `make-template` CLI tools.

## Design Philosophy

The library follows a **domain-driven design** approach with clear boundaries between concerns:

1. **Single Entry Point**: All public exports are available through `lib/index.mts`
2. **Namespace Organization**: Exports are organized into domain namespaces
3. **Backward Compatibility**: Re-export shims maintain existing import paths
4. **Type-Strippable TypeScript**: Uses Node.js 23+ native `.mts` execution

## Directory Structure

```
lib/
├── index.mts              # Public facade - single entry point
├── types.mts              # Shared type definitions
│
├── error/                 # Error Domain
│   ├── index.mts          # Domain facade
│   ├── validation.mts     # ValidationError class
│   ├── contextual.mts     # ContextualError class
│   ├── boundary.mts       # ViolationError class
│   └── gate.mts           # GateError class
│
├── security/              # Security Domain
│   ├── index.mts          # Domain facade
│   ├── sanitize.mts       # Input sanitization utilities
│   ├── gate.mts           # Gate/SecurityGate classes
│   └── boundary.mts       # Boundary/BoundaryValidator classes
│
├── validation/            # Validation Domain
│   ├── index.mts          # Domain facade
│   ├── schema/            # JSON Schema validators
│   │   └── index.mts      # Schema validator facade
│   ├── domain/            # Business rule validators
│   │   └── index.mts      # Domain validator facade
│   └── cli/               # CLI input validators
│       └── index.mts      # CLI validator facade
│
├── placeholder/           # Placeholder Domain
│   ├── index.mts          # Domain facade
│   ├── resolve.mjs        # Placeholder resolution
│   ├── format.mjs         # Format detection/conversion
│   ├── canonical.mjs      # Canonical variable definitions
│   └── schema.mjs         # Placeholder schema validation
│
├── templatize/            # Templatize Domain
│   ├── index.mts          # Domain facade
│   └── strategy/          # File-type strategies
│       ├── index.mts      # Strategy facade
│       ├── json.mjs       # JSON file templatization
│       ├── markdown.mjs   # Markdown file templatization
│       ├── html.mjs       # HTML file templatization
│       ├── jsx.mjs        # JSX/TSX file templatization
│       └── config.mjs     # Config file processing
│
├── template/              # Template Domain
│   ├── index.mts          # Domain facade
│   ├── discover.mjs       # Template discovery
│   └── ignore.mjs         # Template ignore utilities
│
└── util/                  # Utility Domain
    ├── index.mts          # Domain facade
    ├── file.mjs           # File utilities
    ├── shell.mjs          # Shell command utilities
    └── text.mjs           # Text processing utilities
```

## Public API

All public exports are available through namespace imports:

```typescript
import { error, security, validation, placeholder, templatize, template, util } from '@m5nv/create';

// Error handling
throw new error.ValidationError('Invalid input');

// Security validation
const gate = new security.Gate();
const boundary = new security.Boundary(baseDir);

// Validation
const result = validation.schema.validateManifest(manifest);

// Placeholder resolution
const resolved = placeholder.resolve(template, values);

// File templatization
const changes = templatize.json(content, config);

// Template discovery
const discovery = new template.TemplateDiscovery(cacheManager);

// Utilities
const content = await util.File.read(path);
```

### Export Count

The public facade exports approximately **15 items** (well under the 30 limit):
- 7 domain namespaces
- 4 error classes (direct exports for convenience)
- 2 security classes (direct exports for convenience)
- Type exports

## Domain Boundaries

### Dependency Rules

1. **No Cross-Domain Imports**: Domains should not import from each other at the same level
2. **Downward Dependencies Only**: Higher-level domains may depend on lower-level ones
3. **Error Domain is Foundation**: All domains may use error classes

### Dependency Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                     Application Layer                    │
│              (bin/create-scaffold, bin/make-template)    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    lib/index.mts                         │
│                   (Public Facade)                        │
└────────────────────────────┬────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  template/  │     │ templatize/ │     │ validation/ │
│             │     │             │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                placeholder/  │  security/  │  util/     │
│                  (Foundation Layer)                      │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                        error/                            │
│                   (Base Error Types)                     │
└─────────────────────────────────────────────────────────┘
```

## TypeScript Configuration

The project uses **type-strippable TypeScript** with Node.js 23+ native execution:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "noEmit": true,
    "allowJs": true
  }
}
```

Key features:
- **No Build Step**: TypeScript files run directly with Node.js
- **Type-Only Imports**: Use `import type` for type-only imports
- **`.mts` Extension**: TypeScript files use `.mts` for ESM modules
- **`.mjs` Allowed**: JavaScript files use `.mjs` extension

## Backward Compatibility

Legacy import paths are maintained through re-export shims:

```javascript
// Old import (still works)
import { ValidationError } from './lib/error-classes.mjs';

// New import (preferred)
import { ValidationError } from './lib/index.mts';
// or
import { error } from './lib/index.mts';
const { ValidationError } = error;
```

## Testing Strategy

Tests are organized to mirror the lib/ structure:

```
tests/
├── lib/                   # Domain-specific tests
│   ├── facade.test.mts    # Public facade tests
│   ├── error/             # Error domain tests
│   ├── security/          # Security domain tests
│   ├── validation/        # Validation domain tests
│   ├── placeholder/       # Placeholder domain tests
│   ├── templatize/        # Templatize domain tests
│   ├── template/          # Template domain tests
│   └── util/              # Utility domain tests
│
├── e2e/                   # End-to-end workflow tests
├── create-scaffold/       # CLI integration tests
├── make-template/         # CLI integration tests
└── shared/                # Shared test utilities
```

## Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| lib/ exports | ≤30 | ~15 |
| Largest module | ≤300 lines | ✓ |
| L2 test % | ≤25% | ~19.6% |
| Type errors | 0 | 0 |

## Migration Guide

### For New Code

Always import from the public facade:

```typescript
import { error, security, validation } from './lib/index.mts';
```

### For Existing Code

Existing imports will continue to work through re-export shims. Migration can be done incrementally.

## Related Documentation

- [Testing Guide](docs/guides/testing.md) - Test organization and patterns
- [Spec-Driven Development](docs/spec-driven-development.md) - Development methodology
- [API Reference](docs/reference/) - Detailed API documentation
