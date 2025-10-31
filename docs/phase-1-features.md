---
title: "Phase 1 Core UX Features"
type: "reference"
audience: "all"
estimated_time: "N/A (reference)"
prerequisites:
  - "Basic familiarity with @m5nv/create-scaffold"
related_docs:
  - "tutorial/getting-started.md"
  - "reference/cli-reference.md"
  - "guides/troubleshooting.md"
  - "explanation/caching-strategy.md"
last_updated: "2025-10-31"
---

# Phase 1 Core UX Features

This document provides comprehensive documentation for the Phase 1 Core User Experience features introduced in @m5nv/create-scaffold v0.3. These features focus on improving performance, debugging capabilities, template discoverability, and user confidence.

## Overview

Phase 1 introduces six key features that work together to enhance the scaffolding experience:

1. **Template Caching** - Local caching for faster operations
2. **Detailed Logging** - Comprehensive operation tracking
3. **Template Discovery** - Fast template exploration
4. **Dry Run Mode** - Preview operations before execution
5. **Template Schema Standardization** - Versioned manifest validation artifacts
6. **Template Variables (Canonical Defaults)** - Shared metadata for common placeholders

## Template Caching

### Overview

Template caching stores frequently used template repositories locally to dramatically improve performance and enable offline operation for cached templates.

### Cache Directory Structure

```
~/.m5nv/cache/
├── abc123def456/          # Repository hash directory
│   ├── .git/              # Git repository data
│   ├── template1/         # Template directories
│   ├── template2/
│   └── template3/
├── def456ghi789/          # Another repository
└── .metadata/             # Cache metadata storage
    ├── abc123def456.json  # Repository metadata
    └── def456ghi789.json
```

### Cache Metadata Format

Each cached repository has associated metadata stored as JSON:

```json
{
  "repoUrl": "https://github.com/user/repo.git",
  "branchName": "main",
  "lastUpdated": "2024-10-26T10:30:00.000Z",
  "ttlHours": 24,
  "repoHash": "abc123def456",
  "size": 1024000,
  "templateCount": 5
}
```

### TTL (Time-to-Live) Behavior

- **Default TTL**: 24 hours
- **Automatic Refresh**: Expired entries are refreshed on next access
- **Custom TTL**: Use `--cache-ttl <hours>` to override (1-720 hours)
- **Cache Bypass**: Use `--no-cache` to skip cache entirely

### Cache Management

The cache system automatically:
- Creates cache directory with proper permissions (user-only access)
- Generates unique hashes for repository/branch combinations
- Detects and recovers from cache corruption
- Handles disk space and permission issues gracefully

### Usage Examples

```bash
# Normal operation (uses cache)
npm create @m5nv/scaffold my-app -- --from-template react

# Bypass cache for latest version
npm create @m5nv/scaffold my-app -- --from-template react --no-cache

# Set custom cache TTL (48 hours)
npm create @m5nv/scaffold my-app -- --from-template react --cache-ttl 48

# Force fresh template discovery
npm create @m5nv/scaffold -- --list-templates --no-cache
```

## Detailed Logging

### Overview

Detailed logging provides comprehensive tracking of all CLI operations for debugging, auditing, and troubleshooting purposes.

### Log File Format

Log entries are structured JSON objects with timestamps:

```json
{
  "timestamp": "2024-10-26T10:30:00.000Z",
  "operation": "git_clone",
  "details": {
    "repoUrl": "https://github.com/user/repo.git",
    "branch": "main",
    "destination": "/tmp/scaffold-temp-abc123",
    "duration": 2500,
    "success": true
  }
}
```

### Logged Operations

The logging system tracks:

1. **Git Operations**
   - Repository cloning with URL, branch, and destination
   - Clone duration and success status
   - Git command output and errors

2. **File Operations**
   - Template file copying with source and destination paths
   - Directory creation and permission setting
   - File operation timing and success status

3. **Setup Script Execution**
   - Script path and execution environment
   - Script output, errors, and exit codes
   - Execution duration and cleanup status

4. **Error Conditions**
   - Detailed error information with context
   - Stack traces for debugging
   - Recovery actions taken

### Security Considerations

- **Data Sanitization**: Sensitive information is filtered from logs
- **Path Normalization**: File paths are normalized to prevent information disclosure
- **No Credentials**: Git credentials are never logged
- **User Control**: Logging is opt-in via `--log-file` flag

### Usage Examples

```bash
# Enable logging to specific file
npm create @m5nv/scaffold my-app -- --from-template react --log-file ./scaffold.log

# Combine with dry run for preview logging
npm create @m5nv/scaffold my-app -- --from-template react --dry-run --log-file ./preview.log

# Log template discovery operations
npm create @m5nv/scaffold -- --list-templates --log-file ./discovery.log
```

## Template Discovery

### Overview

Template discovery allows users to explore available templates in repositories quickly using cached data, eliminating the need to clone repositories just to see what's available.

### Template Metadata

Templates can include metadata in two formats:

#### 1. template.json Format

```json
{
  "name": "react-typescript",
  "description": "React application with TypeScript and modern tooling",
  "version": "1.0.0",
  "author": "Million Views",
  "tags": ["react", "typescript", "vite"],
  "handoff": ["npm install", "npm run dev"],
  "requirements": {
    "node": ">=18.0.0"
  }
}
```

#### 2. README.md Frontmatter Format

```markdown
---
name: react-typescript
description: React application with TypeScript and modern tooling
version: 1.0.0
author: Million Views
tags: [react, typescript, vite]
handoff:
  - npm install
  - npm run dev
requirements:
  node: ">=18.0.0"
---

# React TypeScript Template

This template provides...
```

The optional `handoff` array (shown above) feeds the CLI’s “Next steps” section so
users immediately see the most relevant follow-up commands.

### Discovery Output Format

Template discovery displays information in a structured format:

```
📦 Available Templates from million-views/templates (main)

react-typescript
  React application with TypeScript and modern tooling
  Tags: react, typescript, vite
  Requirements: node >=18.0.0

express-api
  Express.js REST API with TypeScript
  Tags: express, api, typescript
  Requirements: node >=16.0.0

vue-spa
  No description available
```

### Usage Patterns

```bash
# List templates from default repository
npm create @m5nv/scaffold -- --list-templates

# List templates from custom repository
npm create @m5nv/scaffold -- --list-templates --repo user/templates

# List templates from specific branch
npm create @m5nv/scaffold -- --list-templates --repo user/templates --branch develop

# Force fresh discovery (bypass cache)
npm create @m5nv/scaffold -- --list-templates --no-cache

# Log discovery operations
npm create @m5nv/scaffold -- --list-templates --log-file ./discovery.log
```

## Dry Run Mode

### Overview

Dry run mode provides a preview of all operations that would be performed without actually executing them, allowing users to verify the intended actions before making changes.

### Preview Operations

Dry run mode shows:

1. **Repository Operations**
   - Repository URL and branch to be cloned
   - Cache usage or bypass status
   - Clone destination path

2. **File Operations**
   - Source template directory
   - Destination project directory
   - Individual file copy operations
   - Directory creation operations

3. **Setup Script Detection**
   - Setup script location and type
   - Execution environment details
   - Script permissions and requirements

### Preview Output Format

```
🔍 DRY RUN MODE - Preview of planned operations (no changes will be made)

📦 Template: react-typescript
🌐 Repository: https://github.com/million-views/templates.git (main)
📁 Target Directory: ./my-app/

📄 Summary:
   • Directories: 2
   • Files: 5
   • Setup Scripts: 1

📋 File Copy (5 operations):
   ✓ package.json → ./my-app/package.json
   ✓ src/index.tsx → ./my-app/src/index.tsx
   ✓ src/App.tsx → ./my-app/src/App.tsx
   ✓ public/index.html → ./my-app/public/index.html
   ✓ tsconfig.json → ./my-app/tsconfig.json

📁 Directory Creation (2 operations):
   ✓ ./my-app/src/
   ✓ ./my-app/public/

⚙️ Setup Script (1 operations):
   ⚙️ Execute setup script: _setup.mjs

🌲 Template structure (depth 2):
my-app
├── package.json
├── src
│   ├── App.tsx
│   └── index.tsx
└── public
    └── index.html

To execute these operations, run the same command without --dry-run
```

If the machine does not have the `tree` command installed, the CLI reports `Tree preview unavailable` instead of the directory listing.

### Capabilities and Limitations

#### Capabilities
- Fast preview using cached repositories
- Accurate file operation simulation
- Setup script detection and analysis
- Integration with logging system
- Cache-aware operation planning

#### Limitations
- Cannot predict setup script behavior
- File conflicts detected only at execution time
- Network-dependent operations may differ in actual execution
- Dynamic template behavior not captured in preview

### Usage Examples

```bash
# Preview basic scaffolding operation
npm create @m5nv/scaffold my-app -- --from-template react --dry-run

# Preview with custom repository
npm create @m5nv/scaffold my-app -- --from-template custom --repo user/templates --dry-run

# Preview with logging
npm create @m5nv/scaffold my-app -- --from-template react --dry-run --log-file ./preview.log

# Preview with cache bypass
npm create @m5nv/scaffold my-app -- --from-template react --dry-run --no-cache
```

## Template Schema Standardization

### Overview

@m5nv/create-scaffold now ships a versioned manifest schema so template authors
and tooling can rely on a single source of truth. The canonical schema lives at
`schema/template.v1.json` with a rolling `schema/template.json` alias that
always points to the latest version.

### Generated Artifacts

- `npm run schema:build` regenerates TypeScript declarations in
   `types/template-schema.ts` (plus ESM/CJS exports) and ensures they stay in
   sync with the JSON Schema.
- `npm run schema:check` verifies the generated artifacts match the schema to
   prevent drift in CI.
- Consumers import the schema via `@m5nv/create-scaffold/schema/template.v1`
   while tooling can reference the types from
   `@m5nv/create-scaffold/template-schema`.

### CLI Integration

- `templateValidator.mjs` validates manifest files against the schema before any
   filesystem operations run, producing actionable errors for authors.
- CLI discovery surfaces schema-backed metadata (name, description, tags,
   handoff steps) so users always see validated information.
- Spec compliance tests enforce schema alignment, guaranteeing regressions are
   caught early.

### Author Workflow

1. Declare template metadata in `template.json` or README frontmatter.
2. Run `npm run schema:check` locally after edits to verify structure.
3. Use the exported TypeScript types for author tooling or custom linters.

### Manifest Example

```json
{
   "name": "react-typescript",
   "description": "React application with TypeScript and modern tooling",
   "metadata": {
      "variables": [],
      "placeholders": [
         {
            "name": "PROJECT_NAME",
            "prompt": "What should we name the project?"
         }
      ]
   }
}
```

## Template Variables (Canonical Defaults)

### Overview

Canonical template variables supply reusable metadata such as `{{AUTHOR}}` and
`{{LICENSE}}`. Templates can override these values without reimplementing
placeholder logic, and downstream tooling receives a normalized set of values.

### Registry and Schema

- The canonical registry ships in `bin/utils/canonicalVariables.mjs` with
   documented defaults.
- The schema’s `metadata.variables` section declares overrides for known
   canonical names and enforces validation rules.
- Generated TypeScript interfaces (via `npm run schema:build`) expose
   `TemplateCanonicalVariableDefinition` so author tooling can type-check
   overrides.

### Runtime Behavior

- `templateValidator.mjs` merges canonical defaults with template-specific
   placeholders, deduplicating entries and normalizing descriptions.
- `templateMetadata.mjs` exposes the merged `canonicalVariables` collection so
   CLI flags (`--list-templates`, `--dry-run`, logging) share an accurate view.
- The experimental placeholder prompts feature reads the merged set so setup
   scripts access `ctx.inputs` and `tools.placeholders.applyInputs()` with
   canonical values present.

### Author Experience

- Override defaults to reflect team-specific metadata:

   ```json
   {
      "metadata": {
         "variables": [
            {
               "name": "AUTHOR",
               "defaultValue": "Million Views DX Team",
               "description": "Primary maintainer for generated projects"
            },
            {
               "name": "LICENSE",
               "defaultValue": "Apache-2.0"
            }
         ]
      }
   }
   ```

- Combine canonical variables with traditional placeholders to capture project
   specifics while keeping organizational metadata centralized.

### Safety Guarantees

- Unknown canonical names are rejected during validation, preventing drift.
- Overrides are sanitized to avoid leaking system paths or sensitive values.
- Dedicated tests in `test/canonical-variables.test.mjs` and
   `test/template-validator.test.mjs` cover merge logic and error handling.

## Feature Integration

### Combined Usage Patterns

The Phase 1 features can be combined in a single workflow:

```bash
# Comprehensive debugging session
npm create @m5nv/scaffold my-app -- --from-template react \
  --dry-run \
  --log-file ./debug.log \
  --no-cache

# Fast template exploration and creation
npm create @m5nv/scaffold -- --list-templates --repo user/templates
npm create @m5nv/scaffold my-app -- --from-template chosen-template --repo user/templates

# Performance-optimized workflow
npm create @m5nv/scaffold my-app -- --from-template react --cache-ttl 168  # 1 week cache
```

### Performance Impact

- **Cache Hit**: ~90% faster than network clone
- **Template Discovery**: ~95% faster with cached repositories  
- **Dry Run**: ~85% faster than full execution
- **Logging**: <5% performance overhead

### Error Handling

All Phase 1 features include comprehensive error handling:

- **Cache Corruption**: Automatic re-cloning of corrupted entries
- **Disk Space**: Clear error messages with actionable solutions
- **Permission Issues**: Detailed guidance for resolution
- **Network Failures**: Graceful fallback to direct operations
- **Log File Issues**: Alternative logging strategies

## Usage Guide

### Getting Started

Phase 1 features integrate with existing workflows:

- All existing commands work unchanged
- New features are opt-in via CLI flags
- No breaking changes to existing workflows
- Setup script interface remains identical

### Recommended Adoption

1. **Start with Template Discovery**
   ```bash
   npm create @m5nv/scaffold -- --list-templates
   ```

2. **Add Dry Run for Confidence**
   ```bash
   npm create @m5nv/scaffold my-app -- --from-template react --dry-run
   ```

3. **Enable Logging for Debugging**
   ```bash
   npm create @m5nv/scaffold my-app -- --from-template react --log-file ./scaffold.log
   ```

4. **Leverage Caching for Performance**
   ```bash
   # Cache is automatic, but you can customize TTL
   npm create @m5nv/scaffold my-app -- --from-template react --cache-ttl 48
   ```

## Best Practices

### Cache Management
- Use default TTL for most workflows
- Increase TTL for stable template repositories
- Use `--no-cache` when debugging template issues
- Monitor cache directory size periodically

### Logging Strategy
- Enable logging for complex operations
- Use descriptive log file names with timestamps
- Review logs when operations fail
- Keep logs for audit trails in team environments

### Template Discovery
- Explore templates before creating projects
- Use discovery to understand repository structure
- Combine with dry run for complete preview
- Cache discovery results for team sharing

### Dry Run Usage
- Always dry run complex or unfamiliar templates
- Use dry run to verify file operations
- Combine with logging for detailed analysis
- Share dry run output for team review

## Troubleshooting

See the main [Troubleshooting Guide](guides/troubleshooting.md) for general issues, plus these Phase 1 specific solutions:

### Cache Issues
- **Permission denied**: Check `~/.m5nv/cache` permissions
- **Corrupted cache**: Tool automatically re-clones corrupted entries
- **Disk space**: Clear old cache entries or use `--no-cache`

### Logging Issues  
- **Cannot write log file**: Check path permissions and disk space
- **Log file path invalid**: Use absolute paths or ensure parent directory exists

### Discovery Issues
- **No templates found**: Verify repository URL and branch
- **Repository access denied**: Check git credentials and permissions

### Dry Run Issues
- **Template access failed**: Use `--no-cache` to bypass cache issues
- **Path resolution errors**: Verify project directory path is valid

## What's Next

Now that you understand Phase 1 features, you might want to:

- 🎯 **Try them hands-on**: [Getting Started Tutorial](tutorial/getting-started.md) - Use caching, logging, discovery, and dry run
- 📖 **Get complete CLI details**: [CLI Reference](reference/cli-reference.md) - All parameters and options
- 🚨 **Troubleshoot issues**: [Troubleshooting Guide](guides/troubleshooting.md) - Resolve Phase 1 feature problems
- 💡 **Understand caching deeply**: [Caching Strategy Explained](explanation/caching-strategy.md) - Architecture and design decisions
