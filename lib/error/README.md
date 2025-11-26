# Error Domain

The error domain provides custom error classes for different failure contexts in the application.

## Overview

This domain exports four specialized error classes that extend the base `Error` class:

- **ValidationError** - For input validation failures
- **ContextualError** - For errors with additional context
- **ViolationError** - For security boundary violations
- **GateError** - For security gate failures

## Usage

```typescript
import { error } from '../index.mts';

// Or import directly
import { ValidationError, ContextualError, ViolationError, GateError } from '../index.mts';

// Throw validation error
throw new error.ValidationError('Invalid template name');

// Throw contextual error with details
throw new error.ContextualError('Template not found', {
  templateId: 'my-template',
  searchPaths: ['/path1', '/path2']
});

// Throw violation error for security issues
throw new error.ViolationError('Path traversal detected');

// Throw gate error for access control
throw new error.GateError('Repository access denied');
```

## Module Structure

```text
error/
├── index.mts        # Domain facade
├── validation.mts   # ValidationError class
├── contextual.mts   # ContextualError class
├── boundary.mts     # ViolationError class
└── gate.mts         # GateError class
```

## API Reference

### ValidationError

Used for input validation failures.

```typescript
class ValidationError extends Error {
  constructor(message: string);
}
```

### ContextualError

Used for errors that need additional context.

```typescript
class ContextualError extends Error {
  context?: Record<string, unknown>;
  constructor(message: string, context?: Record<string, unknown>);
}
```

### ViolationError

Used for security boundary violations.

```typescript
class ViolationError extends Error {
  constructor(message: string);
}
```

### GateError

Used for security gate failures.

```typescript
class GateError extends Error {
  constructor(message: string);
}
```
