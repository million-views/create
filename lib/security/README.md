# Security Domain

The security domain provides input sanitization, security gates, and boundary validation.

## Overview

This domain exports:

- **sanitize** - Input sanitization utilities namespace
- **Gate/SecurityGate** - Security validation at entry points
- **Boundary/BoundaryValidator** - Path boundary enforcement

## Usage

```typescript
import { security } from '../index.mts';

// Sanitize user input
const safe = security.sanitize.input(userInput);
const safeError = security.sanitize.errorMessage(error.message);

// Create a security gate
const gate = new security.Gate({
  allowedDomains: ['github.com'],
  maxInputLength: 1000
});
const result = gate.validate(input);

// Create a boundary validator
const boundary = new security.Boundary('/project/root');
boundary.validate('/project/root/src/file.ts'); // OK
boundary.validate('/etc/passwd'); // Throws ViolationError
```

## Module Structure

```text
security/
├── index.mts      # Domain facade
├── sanitize.mts   # Input sanitization utilities
├── gate.mts       # Gate/SecurityGate classes
└── boundary.mts   # Boundary/BoundaryValidator classes
```

## API Reference

### sanitize namespace

Input sanitization utilities.

```typescript
namespace sanitize {
  function input(value: string): string;
  function errorMessage(message: string): string;
  function path(filePath: string): string;
}
```

### Gate / SecurityGate

Security validation at entry points.

```typescript
class Gate {
  constructor(options?: GateOptions);
  validate(input: unknown): GateResult;
  clearCache(): void;
}

interface GateOptions {
  allowedDomains?: string[];
  maxInputLength?: number;
  enableCache?: boolean;
}

interface GateResult {
  valid: boolean;
  errors?: string[];
}
```

### Boundary / BoundaryValidator

Path boundary enforcement to prevent directory traversal.

```typescript
class Boundary {
  constructor(baseDir: string, options?: BoundaryOptions);
  validate(path: string): void; // Throws ViolationError if invalid
  isWithinBoundary(path: string): boolean;
}

interface BoundaryOptions {
  allowSymlinks?: boolean;
  fs?: FsModule;
}
```

## Security Considerations

1. **Always sanitize user input** before processing
2. **Use boundary validators** for all file operations
3. **Gates should be applied** at CLI entry points
4. **Never trust** unsanitized paths or URLs
