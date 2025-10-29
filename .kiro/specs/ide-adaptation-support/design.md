# Design Document

## Overview

The IDE adaptation feature extends the @m5nv/create CLI tool to support IDE-specific template customization through enhanced command-line arguments and a redesigned setup script interface. This design provides a secure, extensible foundation for template developers to create IDE-aware project scaffolding while maintaining the tool's security-first approach.

## Architecture

### Command-Line Interface Changes

The CLI will be extended with two new optional arguments:
- `--ide <ide_name>`: Specifies the target IDE (kiro, vscode, cursor, windsurf)
- `--features <feature_list>`: Comma-separated list of features to enable

### Setup Script Interface Redesign

The current setup script interface will be replaced with a single Environment_Object parameter containing all necessary context. This eliminates the need for multiple parameters and provides a clean, extensible interface.

**Current Interface (to be replaced):**
```javascript
export default function setup({ projectDirectory, projectName, cwd }) {
  // ...
}
```

**New Interface:**
```javascript
export default function setup(env) {
  // env.projectDir, env.projectName, env.cwd, env.ide, env.features
}
```

## Components and Interfaces

### 1. Argument Parser Enhancement

**Location:** `bin/argumentParser.mjs`

The argument parser will be extended to handle the new IDE and features arguments:

```javascript
// New argument definitions
const argumentConfig = {
  ide: {
    type: 'string',
    short: 'i'
  },
  features: {
    type: 'string',
    short: 'f'
  }
  // ... existing arguments
};
```

**Validation Logic:**
- IDE validation against allowed values: ['kiro', 'vscode', 'cursor', 'windsurf']
- Features parsing and validation (alphanumeric, hyphens, underscores only)
- Case-insensitive IDE matching with normalization to lowercase

### 2. Security Module Enhancement

**Location:** `bin/security.mjs`

The security module will be extended to validate the new parameters:

```javascript
function validateIdeParameter(ide) {
  const allowedIdes = ['kiro', 'vscode', 'cursor', 'windsurf'];
  if (ide && !allowedIdes.includes(ide.toLowerCase())) {
    throw new ValidationError(`Invalid IDE: ${ide}. Supported IDEs: ${allowedIdes.join(', ')}`);
  }
  return ide ? ide.toLowerCase() : null;
}

function validateFeaturesParameter(features) {
  if (!features) return [];

  const featureList = features.split(',').map(f => f.trim());
  const validFeaturePattern = /^[a-zA-Z0-9_-]+$/;

  for (const feature of featureList) {
    if (!validFeaturePattern.test(feature)) {
      throw new ValidationError(`Invalid feature name: ${feature}. Use only letters, numbers, hyphens, and underscores.`);
    }
  }

  return featureList;
}
```

### 3. Environment Object Factory

**Location:** `bin/environmentFactory.mjs` (new module)

A new module will create and validate the Environment_Object:

```javascript
export function createEnvironmentObject({
  projectDirectory,
  projectName,
  cwd,
  ide,
  features
}) {
  // Validate and sanitize all inputs
  const env = Object.freeze({
    projectDir: sanitizePath(projectDirectory),
    projectName: sanitizeProjectName(projectName),
    cwd: sanitizePath(cwd),
    ide: validateIdeParameter(ide),
    features: validateFeaturesParameter(features)
  });

  return env;
}
```

### 4. Setup Script Execution Enhancement

**Location:** `bin/index.mjs` (main file)

The setup script execution will be updated to use the new Environment_Object:

```javascript
async function executeSetupScript(projectDirectory, projectName, ide, features) {
  const setupScriptPath = path.join(projectDirectory, SETUP_SCRIPT);

  try {
    await fs.access(setupScriptPath);
  } catch {
    return; // No setup script
  }

  try {
    console.log('⚙️  Running template setup script...');

    const setupScriptUrl = `file://${path.resolve(setupScriptPath)}`;
    const setupModule = await import(setupScriptUrl);

    const env = createEnvironmentObject({
      projectDirectory,
      projectName,
      cwd: process.cwd(),
      ide,
      features
    });

    if (typeof setupModule.default === 'function') {
      await setupModule.default(env);
    } else {
      throw new Error('Setup script must export a default function');
    }

  } catch (err) {
    const sanitizedMessage = sanitizeErrorMessage(err.message);
    console.warn(`⚠️  Warning: Setup script execution failed: ${sanitizedMessage}`);
    console.warn('Continuing without setup...');
  } finally {
    // Clean up setup script
    try {
      await fs.unlink(setupScriptPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
```

## Data Models

### Environment Object Structure

```typescript
interface EnvironmentObject {
  readonly projectDir: string;       // Absolute path to project directory
  readonly projectName: string;      // Sanitized project name
  readonly cwd: string;             // Current working directory
  readonly ide: string | null;      // Target IDE or null
  readonly features: string[];      // Array of enabled features
}
```

### Command Line Arguments

```typescript
interface CLIArguments {
  projectDirectory: string;
  template?: string;
  repo?: string;
  branch?: string;
  ide?: string;           // New
  features?: string;      // New
  help?: boolean;
}
```

## Error Handling

### IDE Validation Errors

```javascript
// Invalid IDE provided
if (invalidIde) {
  throw new ValidationError(
    `Invalid IDE: "${providedIde}"\n` +
    `Supported IDEs: kiro, vscode, cursor, windsurf\n` +
    `Example: --ide kiro`
  );
}
```

### Features Validation Errors

```javascript
// Invalid feature name
if (invalidFeature) {
  throw new ValidationError(
    `Invalid feature name: "${invalidFeature}"\n` +
    `Feature names must contain only letters, numbers, hyphens, and underscores\n` +
    `Example: --features "auth,file-upload,dark-theme"`
  );
}
```

### Setup Script Errors

```javascript
// Setup script validation
if (typeof setupFunction !== 'function') {
  throw new Error(
    'Setup script must export a default function\n' +
    'Example: export default function setup(env) { ... }'
  );
}
```

## Testing Strategy

### Unit Tests

**Location:** `test/unit/` (new directory)

1. **Argument Parser Tests** (`argumentParser.test.mjs`)
   - Valid IDE argument parsing
   - Invalid IDE rejection
   - Features parsing and validation
   - Case sensitivity handling

2. **Security Validation Tests** (`security.test.mjs`)
   - IDE parameter validation
   - Features parameter validation
   - Path sanitization with new parameters

3. **Environment Factory Tests** (`environmentFactory.test.mjs`)
   - Environment object creation
   - Immutability verification
   - Input sanitization

### Integration Tests

**Location:** `test/integration/` (new directory)

1. **CLI Integration Tests** (`cli-integration.test.mjs`)
   - End-to-end CLI execution with new arguments
   - Setup script execution with Environment_Object
   - Error handling scenarios

### Functional Tests

**Location:** `test/` (existing directory, enhanced)

1. **Enhanced CLI Tests** (`cli.test.mjs`)
   - Add IDE and features argument testing
   - Setup script execution with new interface
   - Template customization verification

### Test Templates

**Location:** `test/fixtures/templates/` (new directory)

Create test templates with setup scripts that use the new Environment_Object interface:

```javascript
// test/fixtures/templates/ide-test/_setup.mjs
export default function setup(env) {
  console.log(`IDE: ${env.ide}`);
  console.log(`Features: ${env.features.join(', ')}`);
  console.log(`Project: ${env.projectName} in ${env.projectDir}`);

  // Create IDE-specific files for testing
  if (env.ide === 'kiro') {
    // Create .kiro directory and settings
  } else if (env.ide === 'vscode') {
    // Create .vscode directory and settings
  }
}
```

## Documentation Updates

### 1. CLI Help Text

Update the help text to include new arguments:

```
Usage: m5nv-create <project-name> [options]

Options:
  -t, --template <name>     Template name (default: basic)
  -r, --repo <repo>         Repository (default: million-views/templates)
  -b, --branch <branch>     Git branch
  -i, --ide <ide>           Target IDE (kiro, vscode, cursor, windsurf)
  -f, --features <list>     Comma-separated feature list
  -h, --help               Show help

Examples:
  m5nv-create my-app --template react-vite --ide kiro
  m5nv-create api-server --template express --features "auth,database"
  m5nv-create full-stack --ide vscode --features "auth,uploads,testing"
```

### 2. Template Creation Guide

**Location:** `docs/how-to/creating-templates.md`

Update the template creation documentation with:
- New Environment_Object interface
- IDE-specific customization examples
- Features-based conditional logic
- Security best practices for setup scripts

### 3. README Updates

**Location:** `README.md`

Add examples of IDE-specific usage and feature selection.

## Security Considerations

### Input Sanitization

All new parameters will be validated and sanitized:
- IDE values restricted to approved list
- Feature names validated against safe character set
- All paths continue to be sanitized for directory traversal prevention

### Setup Script Sandboxing

While full sandboxing is planned for future enhancement, current security measures include:
- Input validation and sanitization
- Error message sanitization
- Temporary file cleanup
- No system environment variable exposure through Environment_Object

### Future Sandboxing Enhancement

The design accommodates future sandboxing by:
- Using a single Environment_Object parameter (easy to proxy)
- Immutable environment object (prevents tampering)
- Clear separation between CLI context and setup script context

## Implementation Phases

### Phase 1: Fix Existing Foundation
1. Update existing documentation to use new Environment_Object interface
2. Fix existing tests to use new setup script interface
3. Update example templates in documentation

### Phase 2: Core Infrastructure
1. Argument parser enhancement for --ide and --features
2. Security validation updates for new parameters
3. Environment_Object factory creation

### Phase 3: Setup Script Integration
1. Update setup script execution to use Environment_Object
2. Environment_Object parameter passing implementation
3. Error handling enhancement for new interface

### Phase 4: Testing and Validation
1. Comprehensive test suite for new features
2. End-to-end testing with IDE and features parameters
3. Security validation and performance verification