# Validation Domain

The validation domain provides validators organized by purpose: schema validation, domain rules, and CLI input validation.

## Overview

This domain exports three validator namespaces:

- **schema** - JSON Schema validators for template.json and selection.json
- **domain** - Business rule validators for placeholders, dimensions
- **cli** - CLI input validators for options and parameters

## Usage

```typescript
import { validation } from '../index.mts';

// Schema validation
const manifest = validation.schema.validateManifest(templateJson);
const selection = validation.schema.validateSelection(selectionJson);

// Domain validation
const placeholders = validation.domain.normalizePlaceholders(rawPlaceholders);
const dimensions = validation.domain.validateDimensions(dimensionConfig);

// CLI validation
const options = validation.cli.validateOptions(cliArgs);
```

## Module Structure

```text
validation/
├── index.mts          # Domain facade
├── schema/            # JSON Schema validators
│   ├── index.mts      # Schema validator facade
│   ├── manifest.mts   # Template manifest validator
│   └── selection.mts  # Selection schema validator
├── domain/            # Business rule validators
│   ├── index.mts      # Domain validator facade
│   ├── placeholder.mts # Placeholder normalization
│   └── dimension.mts  # Dimension validation
└── cli/               # CLI input validators
    ├── index.mts      # CLI validator facade
    └── options.mts    # Options validation
```

## API Reference

### schema namespace

JSON Schema validators.

```typescript
namespace schema {
  function validateManifest(manifest: unknown): ValidatedManifest;
  function validateSelection(selection: unknown): ValidatedSelection;
}
```

### domain namespace

Business rule validators.

```typescript
namespace domain {
  function normalizePlaceholders(placeholders: unknown): NormalizedPlaceholder[];
  function validateDimensions(dimensions: unknown): ValidatedDimensions;
  const supportedPlaceholderTypes: readonly string[];
}
```

### cli namespace

CLI input validators.

```typescript
namespace cli {
  function validateOptions(options: unknown): ValidatedOptions;
  function validatePath(path: string): string;
}
```

## Validation Flow

```text
User Input
    │
    ▼
┌─────────────────┐
│  CLI Validators │  ← Validates command-line arguments
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Schema Validators│  ← Validates JSON structure
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Domain Validators│  ← Validates business rules
└────────┬────────┘
         │
         ▼
   Validated Data
```
