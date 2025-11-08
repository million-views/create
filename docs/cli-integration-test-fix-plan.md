# CLI Integration Test Fix Plan

## Overview
Comprehensive plan to fix all 7 failing CLI integration tests, achieving 100% pass rate for CI/CD compatibility.

**Current Status**: 14/21 tests passing, 7 failing
**Target**: 21/21 tests passing

## Root Cause Analysis

The main issue is **incomplete template resolution logic**. The current code has a simplified template resolution that assumes all templates are local paths, but the CLI needs to handle:

1. **Local template directories** (`/path/to/template` or `./template`)
2. **Repository URLs** (`https://github.com/user/repo` or `user/repo`)
3. **Registry paths** (`registry/official/template`)
4. **Repository shorthands** (`template-name` resolves to `default-repo/template-name`)

The dry-run, log-file, and template discovery features all depend on proper template resolution.

## Failing Tests & Solutions

### 1. --dry-run flag shows preview without execution
**Error**: "Cannot read properties of null (reading 'startsWith')"
**Root Cause**: `repoUrl` is null, template resolution logic incomplete
**Solution**: Implement complete template resolution logic

### 2. --dry-run includes tree preview when tree command available
**Error**: Same as above
**Solution**: Fix template resolution, then ensure tree command detection works

### 3. --dry-run warns when tree command is unavailable
**Error**: Same as above
**Solution**: Fix template resolution, ensure graceful fallback when tree unavailable

### 4. --log-file flag enables detailed logging
**Error**: Log file doesn't contain operation logs
**Solution**: Add comprehensive logging throughout execution flow

### 5. Combined flags work together correctly
**Error**: "Cannot read properties of null (reading 'startsWith')"
**Solution**: Fix template resolution and flag interaction logic

### 6. Template discovery shows metadata when available
**Error**: Should list all templates (but doesn't show metadata)
**Solution**: Enhance TemplateDiscovery to load and display metadata

### 7. Early exit modes (--list-templates, --dry-run) work correctly
**Error**: Dry run should exit successfully
**Solution**: Fix all dry-run related issues

## Implementation Phases

### Phase 1: Restore Complete Template Resolution Logic

**Problem**: Current logic only handles local paths simply. Need full resolution for all input types.

**Solution**: Implement proper template resolution that:
- Detects input type (local path, URL, registry, shorthand)
- Resolves repository URLs to cached local paths
- Sets `templatePath`, `templateName`, `repoUrl`, `branchName` correctly
- Handles both local and remote template sources

**Files to modify**:
- `bin/create-scaffold/index.mjs` - Restore complete template resolution logic

**Code Changes**:
```javascript
// Replace simplified logic with complete resolution
if (args.template) {
  if (args.template.startsWith('/') || args.template.startsWith('./') || args.template.startsWith('../')) {
    // Local template directory path
    templatePath = args.template;
    templateName = path.basename(args.template);
    repoUrl = null; // Local path
    branchName = null;
  } else if (args.template.includes('://') || args.template.startsWith('registry/')) {
    // Template URL or registry path - use TemplateResolver
    const templateResolver = new TemplateResolver(cacheManager);
    const resolution = await templateResolver.resolveTemplate(args.template, {
      branch: args.branch,
      logger
    });
    templatePath = resolution.templatePath;
    templateName = path.basename(templatePath);
    repoUrl = args.template;
    branchName = args.branch;
  } else {
    // Repository shorthand - resolve to default repo
    const repoUrlResolved = args.repo || DEFAULT_REPO;
    const branchNameResolved = args.branch;
    const cachedRepoPath = await ensureRepositoryCached(repoUrlResolved, branchNameResolved, cacheManager, logger);
    templatePath = path.join(cachedRepoPath, args.template);
    templateName = args.template;
    repoUrl = repoUrlResolved;
    branchName = branchNameResolved;
  }
}
```

### Phase 2: Fix Dry-Run Implementation

**Problem**: Dry-run fails because `repoUrl` is null, causing "Cannot read properties of null" errors.

**Solution**:
- Use proper template resolution from Phase 1
- Fix null checks in dry-run logic
- Ensure correct `DryRunEngine` method is called based on template source type

**Files to modify**:
- `bin/create-scaffold/index.mjs` - Fix dry-run template resolution and null handling

**Code Changes**:
```javascript
// Fix null handling in dry-run
if (repoUrl && (repoUrl.startsWith('/') || repoUrl.startsWith('./') || repoUrl.startsWith('../'))) {
  // Local repository path
  const repoPath = path.dirname(templatePath);
  preview = await dryRunEngine.previewScaffoldingFromPath(repoPath, templateName, args.projectDirectory);
} else if (repoUrl) {
  // Remote repository URL
  preview = await dryRunEngine.previewScaffolding(repoUrl, branchName || 'main', templateName, args.projectDirectory);
} else {
  // Local template without repo context
  const repoPath = path.dirname(templatePath);
  preview = await dryRunEngine.previewScaffoldingFromPath(repoPath, templateName, args.projectDirectory);
}
```

### Phase 3: Implement --log-file Flag

**Problem**: Logger is initialized but not used properly for file logging.

**Solution**:
- Ensure logger captures all operations when `--log-file` is specified
- Log template resolution, dry-run operations, and scaffolding steps
- Verify log file contains expected operation logs

**Files to modify**:
- `bin/create-scaffold/index.mjs` - Add comprehensive logging throughout execution flow

### Phase 4: Fix Combined Flags Functionality

**Problem**: Multiple CLI flags don't work together properly.

**Solution**:
- Ensure flag precedence and interaction logic
- Test combinations like `--dry-run --log-file`, `--list-templates --json`, etc.
- Fix any conflicts in argument processing

**Files to modify**:
- `bin/create-scaffold/index.mjs` - Fix flag interaction logic
- `bin/create-scaffold/argument-parser.mjs` - Ensure proper flag parsing

### Phase 5: Fix Template Discovery Metadata Display

**Problem**: Template discovery doesn't show metadata when available.

**Solution**:
- Load and display template metadata (name, description, version, etc.)
- Format output to include metadata for each discovered template
- Handle cases where metadata is missing gracefully

**Files to modify**:
- `bin/create-scaffold/template-discovery.mjs` - Enhance metadata loading and display
- `bin/create-scaffold/index.mjs` - Update list-templates to show metadata

## Testing Strategy

Run tests incrementally:
1. Fix template resolution → Test dry-run basic functionality
2. Add logging → Test --log-file flag
3. Enhance discovery → Test template metadata display
4. Test flag combinations → Verify all interactions work

## Expected Outcomes

- **14/21 → 21/21 tests passing**
- All CLI flags working individually and in combination
- Proper template resolution for all input types
- Comprehensive logging and dry-run preview
- Template discovery with rich metadata display

## Dependencies

- `ensureRepositoryCached` function needs to be available (from CacheManager)
- TemplateResolver needs to be properly integrated
- DryRunEngine methods need to work correctly
- Logger needs to be initialized early for --log-file flag

## Risk Assessment

- **High Risk**: Template resolution changes could break existing functionality
- **Medium Risk**: Logger integration might conflict with existing error handling
- **Low Risk**: Template discovery metadata enhancement is additive

## Success Criteria

- All 21 CLI integration tests pass
- No regressions in existing functionality
- Proper error handling for edge cases
- Clean, maintainable code following existing patterns