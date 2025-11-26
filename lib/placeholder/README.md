# Placeholder Domain

The placeholder domain handles placeholder resolution, format detection, canonical variables, and schema validation.

## Overview

This domain exports:

- **resolve** - Placeholder resolution and merging
- **format** - Placeholder format detection and conversion
- **canonical** - Canonical variable definitions
- **schema** - Placeholder schema validation

## Usage

```typescript
import { placeholder } from '../index.mts';

// Resolve placeholders in content
const resolved = placeholder.resolve(templateContent, {
  PROJECT_NAME: 'my-app',
  AUTHOR_NAME: 'John Doe'
});

// Detect placeholder format
const format = placeholder.format.detect('{{PROJECT_NAME}}'); // 'mustache'

// Get canonical variables
const canonicalVars = placeholder.canonical.getVariables();

// Validate placeholder schema
const normalized = placeholder.schema.normalize(placeholderConfig);
```

## Module Structure

```text
placeholder/
├── index.mts      # Domain facade
├── resolve.mjs    # Placeholder resolution
├── format.mjs     # Format detection/conversion
├── canonical.mjs  # Canonical variable definitions
└── schema.mjs     # Placeholder schema validation
```

## Supported Placeholder Formats

| Format | Example | Description |
|--------|---------|-------------|
| `mustache` | `{{NAME}}` | Double curly braces |
| `dollar` | `$NAME` or `${NAME}` | Dollar sign prefix |
| `percent` | `%NAME%` | Percent signs |
| `unicode` | `⟨NAME⟩` | Unicode angle brackets |

## API Reference

### resolve

Placeholder resolution utilities.

```typescript
function resolve(content: string, values: Record<string, string>): string;
function resolveFile(filePath: string, values: Record<string, string>): Promise<string>;
```

### format

Format detection and conversion.

```typescript
namespace format {
  function detect(content: string): PlaceholderFormat;
  function convert(content: string, from: PlaceholderFormat, to: PlaceholderFormat): string;
  function getPattern(format: PlaceholderFormat): RegExp;
}
```

### canonical

Canonical variable definitions.

```typescript
namespace canonical {
  function getVariables(): CanonicalVariable[];
  function isCanonical(name: string): boolean;
  function getDescription(name: string): string | undefined;
}
```

### schema

Placeholder schema validation.

```typescript
namespace schema {
  function normalize(placeholders: unknown): NormalizedPlaceholder[];
  function validate(placeholder: unknown): ValidationResult;
  const supportedTypes: readonly string[];
}
```

## Canonical Variables

Standard placeholder variables with semantic meaning:

| Variable | Description |
|----------|-------------|
| `PROJECT_NAME` | Project name |
| `PACKAGE_NAME` | npm package name |
| `AUTHOR_NAME` | Author's name |
| `AUTHOR_EMAIL` | Author's email |
| `DESCRIPTION` | Project description |
| `LICENSE` | License identifier |
| `REPO_URL` | Repository URL |
