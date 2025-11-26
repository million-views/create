# Fail-Fast Implementation Plan: Remove `config init` & Fix `convert` Behavior

**Goal**: Implement fail-fast workflow where `convert` requires configuration to exist first, and remove the redundant `config init` command.

**Philosophy**: Principle of least surprise - configuration and conversion are separate operations. `init` creates config, `convert` uses config, never the other way around.

---

## Phase 1: Code Changes

### 1.1 Remove `config init` Command
**Priority**: HIGH | **Impact**: Breaking Change

#### Files to Delete:
- `bin/make-template/commands/config/init/index.js`
- `bin/make-template/commands/config/init/help.js`
- `bin/make-template/commands/config/` (entire directory if only contains init)

#### Files to Modify:
- `bin/make-template/index.mjs`
  - Remove: `import { ConfigInitCommand } from './commands/config/init/index.js';`
  - Remove from `this.subcommands.config.init`
  - Remove `'config init'` from examples array

**Verification**:
```bash
npx make-template config init  # Should fail with "Unknown command"
npx make-template --help        # Should not list config init
```

---

### 1.2 Fix `convert` Command - Remove Template Creation
**Priority**: HIGH | **Impact**: Breaking Change

#### File: `bin/make-template/commands/convert/converter.js`

**Changes**:

1. **Remove `createTemplateJson()` method** (lines 92-115)
2. **Update `convert()` method** (lines 17-62):
   - Remove call to `await this.createTemplateJson();` (line 41)
   - Add validation checks before processing

**New `convert()` flow**:
```javascript
async convert() {
  try {
    console.log(`Converting project: ${this.options.projectPath}`);
    
    const projectPath = path.resolve(this.options.projectPath);
    
    // FAIL-FAST: Check configuration exists
    const templateJsonPath = path.join(projectPath, 'template.json');
    const templatizeJsonPath = path.join(projectPath, '.templatize.json');
    
    if (!await exists(templateJsonPath)) {
      console.error('❌ Error: Configuration not found\n');
      console.error('Before converting, you must initialize configuration:');
      console.error('  npx make-template init\n');
      console.error('This creates:');
      console.error('  • .templatize.json (defines what to templatize)');
      console.error('  • template.json (defines placeholder metadata)\n');
      console.error('Then run convert again.');
      process.exit(1);
    }
    
    if (!await exists(templatizeJsonPath)) {
      console.error('❌ Error: .templatize.json not found\n');
      console.error('Run: npx make-template init');
      process.exit(1);
    }

    // Check for development repository indicators
    const devIndicators = await this.checkDevelopmentIndicators();
    if (devIndicators.length > 0 && !this.options.yes) {
      console.error('❌ This appears to be a development repository:');
      devIndicators.forEach(indicator => console.error(`   • ${indicator}`));
      console.error("\n💡 Use --yes to proceed anyway, or ensure you're converting a clean project directory.");
      process.exit(1);
    }

    if (this.options.dryRun) {
      console.log('DRY RUN MODE - No changes will be made');
      console.log('DRY RUN: Would convert project to template');
      console.log('No changes were made');
      return;
    }

    // Detect and replace placeholders in files
    const detectedPlaceholders = await this.detectAndReplacePlaceholders();

    // Update template.json with detected placeholders (PRESERVE METADATA)
    await this.updateTemplateJsonWithPlaceholders(detectedPlaceholders);

    // Create undo log
    await this.createUndoLog();
    console.log('✓ Project converted to template successfully');
  } catch (error) {
    handleError(error, {
      context: ErrorContext.USER_INPUT,
      severity: ErrorSeverity.HIGH,
      operation: 'convert',
      suggestions: [
        'Run: npx make-template init',
        'Check that configuration files exist',
        'Verify write permissions in the target directory'
      ]
    });
    process.exit(1);
  }
}
```

---

### 1.3 Fix `updateTemplateJsonWithPlaceholders()` - Preserve Metadata
**Priority**: HIGH | **Impact**: Bug Fix

#### File: `bin/make-template/commands/convert/converter.js` (lines 451-497)

**Current Behavior**: Merges placeholders but metadata already overwritten by `createTemplateJson()`

**New Behavior**: ONLY update placeholders section, preserve all metadata

```javascript
async updateTemplateJsonWithPlaceholders(detectedPlaceholders) {
  const projectPath = path.resolve(this.options.projectPath);
  const templatePath = path.join(projectPath, 'template.json');

  let template;
  try {
    template = await readJsonFile(templatePath);
  } catch (error) {
    throw new Error(`Failed to read template.json: ${error.message}`);
  }

  // Validate template structure
  if (!template || typeof template !== 'object') {
    throw new Error('Invalid template.json structure');
  }

  if (!template.placeholders || typeof template.placeholders !== 'object') {
    template.placeholders = {};
  }

  // MERGE detected placeholders (preserve existing + add new)
  // This ensures manual edits to existing placeholders are kept
  template.placeholders = { ...template.placeholders, ...detectedPlaceholders };

  // Validate placeholder definitions
  for (const [name, def] of Object.entries(template.placeholders)) {
    if (!def || typeof def !== 'object') {
      console.warn(`Warning: Invalid placeholder definition for ${name}, skipping`);
      delete template.placeholders[name];
      continue;
    }
    if (typeof def.default !== 'string') {
      console.warn(`Warning: Placeholder ${name} missing valid default value, setting to empty string`);
      def.default = '';
    }
    if (!def.description || typeof def.description !== 'string') {
      def.description = `${name.toLowerCase().replace(/_/g, ' ')}`;
    }
  }

  // CRITICAL: Write template while preserving ALL metadata
  // Only the placeholders section is updated
  try {
    await writeJsonFile(templatePath, template);
    console.log(`✓ Updated template.json with ${Object.keys(detectedPlaceholders).length} detected placeholders`);
  } catch (error) {
    throw new Error(`Failed to write template.json: ${error.message}`);
  }
}
```

---

### 1.4 Update `createUndoLog()` - Remove Template Creation Entry
**Priority**: MEDIUM | **Impact**: Minor

#### File: `bin/make-template/commands/convert/converter.js` (lines 117-156)

**Remove**:
```javascript
// Add template.json creation
undoLog.fileOperations.push({
  type: 'create',
  path: 'template.json',
  description: 'Created template configuration file',
  timestamp: new Date().toISOString()
});
```

Since `convert` no longer creates `template.json`, the undo log shouldn't record it.

---

### 1.5 Update Help Documentation
**Priority**: HIGH | **Impact**: User Experience

#### File: `bin/make-template/commands/convert/help.js`

Update these sections:

**Prerequisites**:
```javascript
prerequisites: [
  'Configuration files must exist (run: make-template init)',
  'Project must be in a clean state',
  'Ensure .templatize.json defines correct patterns'
],
```

**Related Commands**:
```javascript
'  • make-template init - Create configuration files (REQUIRED FIRST)',
'  • make-template restore - Undo conversion',
'  • make-template validate - Check template validity'
```

#### File: `bin/make-template/commands/init/help.js`

Update description:
```javascript
detailedDescription: [
  'Creates configuration files required before conversion.',
  'Generates both .templatize.json (extraction rules) and template.json (placeholder metadata).',
  'MUST be run before make-template convert.',
  'Auto-detects common patterns from package.json and project structure.'
],
```

---

## Phase 2: Test Updates

### 2.1 Remove `config init` Tests
**Priority**: HIGH

#### Files to Check/Remove:
- Search all test files for `config init` references
- Remove any tests specifically for `ConfigInitCommand`
- Update integration tests that use `config init`

**Search Command**:
```bash
grep -r "config init" tests/
```

Expected: No matches found (from previous search)

---

### 2.2 Update `convert` Command Tests
**Priority**: HIGH

#### File: Look for convert tests in `tests/make-template/`

**New Test Cases Needed**:

1. **Test: Convert fails without template.json**
```javascript
test('convert should fail if template.json missing', async () => {
  // Setup: Create project without template.json
  // Execute: Run convert
  // Assert: Exit code 1, error message shown
});
```

2. **Test: Convert fails without .templatize.json**
```javascript
test('convert should fail if .templatize.json missing', async () => {
  // Setup: Create project without .templatize.json
  // Execute: Run convert
  // Assert: Exit code 1, error message shown
});
```

3. **Test: Convert preserves template.json metadata**
```javascript
test('convert should preserve manually edited metadata', async () => {
  // Setup: Create template.json with custom id, name, description
  // Execute: Run init, then convert
  // Assert: Custom metadata unchanged, placeholders added
});
```

4. **Test: Convert merges placeholders**
```javascript
test('convert should merge new placeholders with existing ones', async () => {
  // Setup: template.json with 2 placeholders, project has 3
  // Execute: Run convert
  // Assert: template.json now has all 5 placeholders
});
```

---

### 2.3 Update Integration/E2E Tests
**Priority**: MEDIUM

#### File: `tests/workflow-e2e.test.mjs`

Update workflow tests to always call `init` before `convert`:

```javascript
// OLD
await runCommand('make-template convert . --yes');

// NEW
await runCommand('make-template init');
await runCommand('make-template convert . --yes');
```

---

## Phase 3: Documentation Updates

### 3.1 Tutorial: `docs/tutorial/make-template.md`
**Priority**: CRITICAL | **Impact**: User-facing breaking change

#### Changes Required:

1. **Line 295** - Replace `config init` with `init`:
```markdown
### Initialize Configuration

```bash
npx make-template init
```

This creates both configuration files with auto-detected patterns from your project.
```

2. **Lines 591-595** - Remove comparison section entirely:
```markdown
### Understanding Configuration Files

**Two configuration files work together:**

1. **`.templatize.json`**: Defines extraction rules (what to replace with placeholders)
2. **`template.json`**: Defines placeholder metadata (what default values to use when scaffolding)

The first tells the system HOW to find values, the second tells users WHAT those values mean.
```

3. **Line 297-400** - Update manual configuration section:
```markdown
Now edit the generated `.templatize.json` to add business-specific rules:

```json
{
  "version": "1.0",
  "autoDetect": true,
  "rules": {
    // ... your custom rules
  }
}
```

Then manually enhance `template.json` with better descriptions:

```json
{
  "schemaVersion": "1.0.0",
  "id": "yourname/lawnmow-web",  // ← Customize this
  "name": "LawnMow Web Marketing Template",  // ← And this
  "description": "Marketing website template for service businesses",
  "placeholders": {
    // ... auto-generated, enhance descriptions
  }
}
```
```

4. **Line 815** - Remove `config init` reference:
```markdown
**LawnMow Web** - Marketing website with hero section, contact forms, and testimonials; demonstrated `allowMultiple` for multiple images and testimonials, manual configuration editing
```

---

### 3.2 CLI Reference: `docs/reference/cli-reference.md`
**Priority**: HIGH

#### Changes Required:

1. **Lines 212-240** - Remove entire `config init` section

2. **Line 332** - Remove from related commands:
```markdown
## Related Commands

* make-template init - Initialize configuration files (REQUIRED BEFORE CONVERT)
* make-template validate - Check template validity
* make-template hints - Get conversion insights
```

3. **Update `init` section** to emphasize it's required:
```markdown
### `init` - Initialize template configuration (REQUIRED FIRST STEP)

Generate configuration files required before conversion. This command creates both `.templatize.json` (extraction rules) and `template.json` (placeholder metadata) by auto-detecting patterns in your project.

**Usage:**
```bash
make-template init [options]
```

**When to use:**
- Before running `make-template convert` (REQUIRED)
- Starting a new template from an existing project
- Regenerating configuration after significant project changes
```

4. **Update `convert` section**:
```markdown
### `convert` - Convert project to template

**Prerequisites:**
- Configuration must exist (run `make-template init` first)
- Project should be in a clean state

**Error handling:**
If configuration files are missing, convert will fail with clear instructions to run `init` first.
```

---

### 3.3 How-To Guide: `docs/how-to/templatization-configuration.md`
**Priority**: MEDIUM

#### Lines 36-39 - Update initialization section:

```markdown
## Creating Configuration

Use the init command to create both configuration files:

```bash
npx make-template init
```

This generates:
- `.templatize.json` with auto-detected patterns
- `template.json` with placeholder definitions

**Customization workflow:**
1. Run `make-template init` to auto-generate
2. Edit `.templatize.json` to refine extraction rules
3. Edit `template.json` to improve placeholder descriptions and defaults
4. Run `make-template convert` to apply
```

---

### 3.4 Steering Documents: `.kiro/steering/cli-development-focus.md`
**Priority**: LOW

#### Lines 92, 113-114, 164, 191, 197 - Update examples:

Replace all `config init` examples with just `init` or appropriate alternatives.

---

## Phase 4: Verification & Testing

### 4.1 Manual Testing Checklist

**Test Case 1: Convert without init should fail**
```bash
mkdir test-project && cd test-project
npm create vite@latest . -- --template react --yes
npx make-template convert . --yes
# Expected: Error message with instructions to run init
```

**Test Case 2: Init then convert should work**
```bash
mkdir test-project && cd test-project
npm create vite@latest . -- --template react --yes
npx make-template init
npx make-template convert . --yes
# Expected: Success, both files created and updated
```

**Test Case 3: Metadata preservation**
```bash
mkdir test-project && cd test-project
npm create vite@latest . -- --template react --yes
npx make-template init
# Manually edit template.json: change id to "custom/template"
npx make-template convert . --yes
cat template.json | grep '"id"'
# Expected: "id": "custom/template" (unchanged)
```

**Test Case 4: Placeholder merging**
```bash
mkdir test-project && cd test-project
npm create vite@latest . -- --template react --yes
npx make-template init
# Manually add CUSTOM_VAR placeholder to template.json
npx make-template convert . --yes
cat template.json | grep 'CUSTOM_VAR'
# Expected: CUSTOM_VAR still present + new detected placeholders
```

**Test Case 5: config init should not exist**
```bash
npx make-template config init
# Expected: "Unknown command: config init"
```

---

### 4.2 Automated Test Run
```bash
npm test
# All tests should pass
# No references to config init
# New fail-fast tests passing
```

---

### 4.3 Documentation Verification
```bash
# Check for lingering config init references
grep -r "config init" docs/ .kiro/
# Expected: No matches (or only in this plan document)

# Validate all markdown files
npm run validate-docs
```

---

## Phase 5: Migration Guide & Communication

### 5.1 Create Migration Guide: `docs/guides/migration-v2.md`

```markdown
# Migration Guide: v1 to v2

## Breaking Changes

### `config init` Command Removed

**What changed:**
- `make-template config init` no longer exists
- Use `make-template init` instead (creates both files)

**Migration:**

Before (v1):
```bash
npx make-template config init
# Edit .templatize.json
npx make-template convert . --yes
```

After (v2):
```bash
npx make-template init
# Edit both .templatize.json AND template.json if needed
npx make-template convert . --yes
```

**Why:**
- Removed redundancy: `init` already creates both files
- Simplified workflow: One command for initialization
- Clearer separation: init (setup) → convert (process)

### `convert` Command Requires Configuration

**What changed:**
- `convert` no longer creates template.json
- `convert` fails fast if configuration missing
- `convert` preserves manual edits to template.json metadata

**Migration:**

Before (v1):
```bash
# This worked (auto-created template.json)
npx make-template convert . --yes
```

After (v2):
```bash
# Must run init first
npx make-template init
npx make-template convert . --yes
```

**Benefits:**
- Predictable behavior: convert never modifies config
- Safe iteration: manual edits preserved
- Clear errors: fail fast with helpful messages
```

---

### 5.2 Update CHANGELOG.md

```markdown
## [2.0.0] - YYYY-MM-DD

### Breaking Changes
- **Removed `make-template config init` command** - Use `make-template init` instead, which creates both configuration files
- **`make-template convert` now requires configuration** - Will fail with clear error if template.json or .templatize.json missing. Run `make-template init` first.

### Changed
- **`make-template convert` preserves template.json metadata** - Only updates placeholders section, never overwrites id/name/description fields
- **Improved error messages** - Fail-fast with actionable guidance when configuration missing

### Fixed
- Template metadata no longer overwritten by convert command
- Placeholder merging now preserves manually added placeholders

### Migration
See `docs/guides/migration-v2.md` for detailed migration instructions.
```

---

## Implementation Order

### Sprint 1: Core Code Changes (Breaking)
1. Remove `config init` command and files
2. Update `convert` to fail-fast on missing config
3. Fix `updateTemplateJsonWithPlaceholders()` to preserve metadata
4. Update CLI help text

### Sprint 2: Tests & Validation
5. Remove `config init` test references
6. Add fail-fast test cases
7. Add metadata preservation tests
8. Update integration tests

### Sprint 3: Documentation Sweep
9. Update tutorial (critical user-facing)
10. Update CLI reference
11. Update how-to guides
12. Update steering documents

### Sprint 4: Release Preparation
13. Create migration guide
14. Update CHANGELOG
15. Manual testing verification
16. Documentation validation

---

## Risk Assessment

### High Risk
- **Breaking change in widely-used tutorial** - Users following old tutorial will hit errors
- **Mitigation**: Clear error messages, migration guide, version bump to 2.0.0

### Medium Risk
- **Existing templates may break** - If users relied on convert auto-creating template.json
- **Mitigation**: Error message explicitly states to run init first

### Low Risk
- **Test suite changes** - Well-isolated changes
- **Documentation updates** - Straightforward find/replace

---

## Success Criteria

### Code
- [ ] `config init` command removed completely
- [ ] `convert` fails fast with helpful error if config missing
- [ ] `convert` preserves template.json metadata (id, name, description)
- [ ] All tests pass
- [ ] No lint errors

### Documentation
- [ ] Tutorial updated (no `config init` references)
- [ ] CLI reference accurate
- [ ] How-to guides updated
- [ ] Migration guide created
- [ ] CHANGELOG updated

### User Experience
- [ ] Clear error messages guide users to correct workflow
- [ ] init → convert workflow is obvious
- [ ] Manual edits to template.json preserved
- [ ] No surprising behavior

---

## Timeline Estimate

- **Phase 1 (Code)**: 4-6 hours
- **Phase 2 (Tests)**: 3-4 hours
- **Phase 3 (Docs)**: 4-5 hours
- **Phase 4 (Verification)**: 2-3 hours
- **Phase 5 (Migration)**: 2 hours

**Total**: 15-20 hours

---

## Rollback Plan

If critical issues discovered post-release:

1. Revert to v1.x tag
2. Re-release v1.x with patch version
3. Mark v2.0.0 as deprecated
4. Fix issues in separate branch
5. Release v2.0.1 with fixes

**Rollback trigger conditions**:
- Template conversion failure rate >10%
- User complaints about lost metadata >5 reports
- Test failure rate >5% in production
