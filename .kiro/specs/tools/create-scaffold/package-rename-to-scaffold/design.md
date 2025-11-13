# Design Document

## Overview

The package rename from `@m5nv/create` to `@m5nv/create-scaffold` is a comprehensive change that affects the package identity, user commands, documentation, tests, and internal references. This design ensures a systematic approach to updating all components while maintaining functionality and creating clean, roll-forward user documentation.

## Architecture

### Package Identity Changes

**Current State:**
- Package name: `@m5nv/create`
- User command: `npm create @m5nv` (doesn't work properly)
- Bin field: `"m5nv-create": "./bin/index.mjs"`

**Target State:**
- Package name: `@m5nv/create-scaffold`
- User command: `npm create @m5nv/scaffold`
- Bin field: `"create-scaffold": "./bin/index.mjs"`

### npm create Transformation

When users run `npm create @m5nv/scaffold`, npm transforms this to:
1. `npm exec @m5nv/create-scaffold`
2. npm installs `@m5nv/create-scaffold` temporarily
3. npm executes the `create-scaffold` binary from the package

## Components and Interfaces

### 1. Package Configuration

**Location:** `package.json`

```json
{
  "name": "@m5nv/create-scaffold",
  "description": "Scaffolds new projects for million-views using templates",
  "bin": {
    "create-scaffold": "./bin/index.mjs"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/million-views/create.git"
  },
  "keywords": [
    "scaffold",
    "scaffolding",
    "templates",
    "cli",
    "esm",
    "million-views",
    "project-generator"
  ]
}
```

### 2. Documentation Updates

**Primary Usage Examples:**
```bash
# Primary recommended usage
npm create @m5nv/scaffold my-project -- --from-template react-vite --ide kiro

# Alternative npx usage
npx @m5nv/create-scaffold@latest my-project --from-template react-vite --ide kiro
```

**Explanation Section:**
- Why `npm create @m5nv/scaffold` works (package naming convention)
- Relationship between npm create and npx commands

### 3. Test Suite Updates

**Test File Locations:**
- `test/cli.test.mjs`
- `test/spec-compliance-verification.mjs`
- `scripts/smoke-test.mjs`
- Any other test files referencing the package

**Implementation Patterns:**
```javascript
// Package name references
const packageName = '@m5nv/create-scaffold';
const command = 'npm create @m5nv/scaffold';
```

### 4. Internal Code References

**Implementation Areas:**
- Package name strings: `"@m5nv/create-scaffold"`
- Error messages with correct package name
- Help text and usage examples
- Package validation logic

**Files to Check:**
- `bin/index.mjs`
- `bin/argumentParser.mjs`
- `bin/security.mjs`
- `bin/preflightChecks.mjs`

## Data Models

### Package Metadata

```typescript
interface PackageMetadata {
  name: "@m5nv/create-scaffold";
  description: string;
  bin: {
    "create-scaffold": "./bin/index.mjs";
  };
  repository: {
    type: "git";
    url: "git+https://github.com/million-views/create.git";
  };
  keywords: string[];
}
```

### Command Patterns

```typescript
interface CommandPatterns {
  primary: "npm create @m5nv/scaffold <project> [options]";
  alternative: "npx @m5nv/create-scaffold@latest <project> [options]";
  transformation: "npm exec @m5nv/create-scaffold <project> [options]";
}
```

## Error Handling

### Package Name Validation

Package name validation should use the correct package identity:

```javascript
// Package validation
if (packageName !== '@m5nv/create-scaffold') {
  throw new Error('Invalid package name');
}
```

### User-Facing Error Messages

Error messages should reference the correct package name:

```javascript
// Error message with correct package name
console.error('Install @m5nv/create-scaffold globally or use npx');
```

## Testing Strategy

### Validation Tests

1. **Package Identity Tests**
   - Verify package.json has correct name and bin mapping
   - Test that the binary is accessible via the new name
   - Validate repository URL remains correct

2. **Command Execution Tests**
   - Test `npm create @m5nv/scaffold` simulation
   - Test `npx @m5nv/create-scaffold` execution
   - Verify all existing functionality works with new name

3. **Documentation Tests**
   - Verify no old package name references remain
   - Test that usage examples are correct
   - Validate help text shows proper commands

### Integration Tests

1. **End-to-End Workflow**
   - Full project scaffolding with new command
   - Template processing with renamed package
   - Setup script execution under new identity

2. **Error Scenario Testing**
   - Invalid commands show correct package name in errors
   - Help text displays proper usage patterns
   - All error messages reference correct package name

## Documentation Updates

### README.md Changes

**Usage Section:**
```markdown
## Usage

Use `npm create` for the standard experience:

```bash
npm create @m5nv/scaffold <your-project-name> -- --from-template <template-name> [options]
```

Alternatively, you can use `npx`:

```bash
npx @m5nv/create-scaffold@latest <your-project-name> --from-template <template-name> [options]
```

### Why This Works

The `npm create @m5nv/scaffold` command works because:
1. npm transforms `npm create @m5nv/scaffold` to `npm exec @m5nv/create-scaffold`
2. npm temporarily installs the `@m5nv/create-scaffold` package
3. npm executes the `create-scaffold` binary from that package

**Note:** The command `npm create @m5nv/scaffold` works due to npm's package naming convention that transforms it to `npm exec @m5nv/create-scaffold`.
```text

### Help Text Updates

**Location:** `bin/argumentParser.mjs`

```javascript
function generateHelpText() {
  return `
Usage: npm create @m5nv/scaffold <project-name> [options]
   or: npx @m5nv/create-scaffold@latest <project-name> [options]

Options:
  -t, --from-template <name>  Template name (default: basic)
  -r, --repo <repo>          Repository (default: million-views/templates)
  -b, --branch <branch>      Git branch
  -i, --ide <ide>            Target IDE (kiro, vscode, cursor, windsurf)
  -f, --features <list>      Comma-separated feature list
  -h, --help                Show help

Examples:
  npm create @m5nv/scaffold my-app -- --from-template react-vite --ide kiro
  npm create @m5nv/scaffold api-server -- --from-template express --features "auth,database"
  npx @m5nv/create-scaffold@latest full-stack --from-template nextjs --ide vscode
`;
}
```text

## Implementation Phases

### Phase 1: Package Identity
1. Update package.json with new name, description, and bin field
2. Update repository references and keywords
3. Verify package configuration is valid

### Phase 2: Documentation Overhaul
1. Update README.md with new usage patterns
2. Update all documentation files
3. Update help text and usage examples
4. Add explanation of npm create mechanics

### Phase 3: Test Suite Updates
1. Update all test files with new package name
2. Modify command simulation tests
3. Update expected output validations
4. Test both npm create and npx patterns

### Phase 4: Internal Code Review
1. Search and replace hardcoded package references
2. Update error messages and validation logic
3. Verify no broken references remain
4. Test all functionality with new identity

## Implementation Considerations

### Package Identity

The package uses `@m5nv/create-scaffold` as its identity which:
- Enables the `npm create @m5nv/scaffold` command pattern
- Follows npm create naming conventions
- Provides clear semantic meaning for scaffolding

### Documentation Strategy

- Clear documentation of the correct usage patterns
- Examples showing proper npm create and npx usage
- Explanation of how npm create mechanics work

### Validation Checklist

- [ ] Package.json correctly configured
- [ ] All documentation updated
- [ ] All tests pass with new package name
- [ ] No hardcoded old references remain
- [ ] Help text shows correct usage
- [ ] Error messages reference correct package
- [ ] Both npm create and npx patterns work