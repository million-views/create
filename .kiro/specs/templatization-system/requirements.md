# Templatization System Requirements

## Overview

Implement an intelligent templatization system that automatically detects and replaces project-specific content with reusable placeholders during template creation. The system must balance automation with author control while maintaining safety and performance.

## Functional Requirements

### Core Templatization Engine

**REQ-001: JSX File Processing**
- **Description**: Process JSX/TSX files to identify string literals in text content and attribute values
- **Constraints**:
  - Only target quoted string literals, never JavaScript expressions
  - Support CSS selector-based element targeting
  - Handle both text content and attribute values
  - Support multiple instances of the same placeholder type
- **Acceptance Criteria**:
  - `<h1>Welcome</h1>` → `<h1>{CONTENT_TITLE}</h1>`
  - `<div title="My App">` → `<div title="{CONTENT_TITLE}">`
  - `{user.name}` remains unchanged (expression, not literal)

**REQ-002: JSON File Processing**
- **Description**: Extract values from JSON files using JSONPath expressions
- **Constraints**:
  - Support standard JSONPath syntax
  - Handle nested objects and arrays
  - Validate JSONPath expressions
- **Acceptance Criteria**:
  - `{"name": "my-app"}` → `{"name": "{PACKAGE_NAME}"}`
  - `{"config": {"title": "My Title"}}` → `{"config": {"title": "{CONTENT_TITLE}"}`

**REQ-003: Markdown File Processing**
- **Description**: Process Markdown files to identify headings and content
- **Constraints**:
  - Support heading level detection
  - Handle frontmatter if present
  - Preserve markdown structure
- **Acceptance Criteria**:
  - `# My Title` → `# {CONTENT_TITLE}`
  - Frontmatter `title: My Title` → `title: {CONTENT_TITLE}`

**REQ-004: HTML File Processing**
- **Description**: Process HTML files with CSS selector support
- **Constraints**:
  - Support standard CSS selectors
  - Handle both text content and attributes
  - Parse HTML structure correctly
- **Acceptance Criteria**:
  - `<title>My App</title>` → `<title>{CONTENT_TITLE}</title>`
  - `<meta name="description" content="My desc">` → `<meta name="description" content="{CONTENT_DESCRIPTION}">`

### Configuration System

**REQ-005: Configuration File Generation**
- **Description**: Generate `.templatize.json` with comprehensive default rules during `init`
- **Constraints**:
  - Include patterns for all supported file types
  - Provide sensible defaults for common use cases
  - Allow easy customization by template authors
- **Acceptance Criteria**:
  - `init` command creates valid `.templatize.json`
  - File contains working patterns for JSX, JSON, Markdown, HTML
  - Template authors can modify patterns without breaking the system

**REQ-006: Configuration Validation**
- **Description**: Validate `.templatize.json` structure and content
- **Constraints**:
  - Strict validation on required fields
  - Lenient handling of unknown properties (forwards compatibility)
  - Clear error messages for invalid configurations
- **Acceptance Criteria**:
  - Invalid JSON produces clear error messages
  - Missing required fields are detected
  - Unknown properties are ignored with warnings

### Control Mechanisms

**REQ-007: Skip Regions**
- **Description**: Allow template authors to exclude content from templatization
- **Constraints**:
  - Support `/* @template-skip */` style comments
  - Handle region-based skipping
  - Work across all supported file types
- **Acceptance Criteria**:
  - Content between skip markers is never modified
  - Skip markers are removed from final template
  - Works in JSX, HTML, and other file types

**REQ-008: Manual Placeholder Precedence**
- **Description**: Respect manually placed placeholders over auto-detection
- **Constraints**:
  - Manual placeholders take precedence
  - Auto-detection skips areas with existing placeholders
  - Preserve manual placeholder formatting
- **Acceptance Criteria**:
  - `{MANUAL_PLACEHOLDER}` remains unchanged
  - Auto-detection doesn't conflict with manual placeholders
  - Mixed manual/auto content works correctly

### Command Integration

**REQ-009: Convert Command Integration**
- **Description**: Integrate templatization into the `convert` command
- **Constraints**:
  - Support `--auto-detect` flag (default true)
  - Support `--no-auto-detect` flag
  - Support `--dry-run` flag for preview
  - Maintain backwards compatibility
- **Acceptance Criteria**:
  - `convert --yes` runs templatization by default
  - `convert --no-auto-detect --yes` skips templatization
  - `convert --dry-run` shows changes without applying them

**REQ-010: Scaffold Command Isolation**
- **Description**: Ensure scaffold command ignores templatization files
- **Constraints**:
  - `.templatize.json` treated as meta content
  - Not distributed with templates
  - Consistent with other meta files (`.template-undo.json`)
- **Acceptance Criteria**:
  - Scaffold command never processes `.templatize.json`
  - File not included in template packages
  - No impact on existing scaffold functionality

## Non-Functional Requirements

### Performance

**PERF-001: File Processing Speed**
- **Target**: Process files < 1MB within 100ms each
- **Constraints**:
  - Lazy loading of parsers
  - AST caching during single convert operation
  - Reasonable file size limits
- **Acceptance Criteria**:
  - Large React projects process within reasonable time
  - Memory usage remains bounded
  - No performance degradation with multiple files

### Reliability

**REL-001: Error Recovery**
- **Description**: Handle malformed input gracefully
- **Constraints**:
  - Continue processing other files if one fails
  - Log warnings for recoverable errors
  - Fail fast on critical configuration errors
- **Acceptance Criteria**:
  - Malformed JSX doesn't break entire conversion
  - Invalid JSONPath expressions are skipped with warnings
  - System recovers from parser failures

**REL-002: Backwards Compatibility**
- **Description**: Maintain compatibility with existing workflows
- **Constraints**:
  - Old convert commands continue working
  - Existing templates remain functional
  - Graceful degradation for missing features
- **Acceptance Criteria**:
  - Projects without `.templatize.json` work normally
  - Convert command backwards compatible
  - No breaking changes to existing functionality

### Security

**SEC-001: Input Validation**
- **Description**: Validate all user inputs and file content
- **Constraints**:
  - Sanitize file paths and selectors
  - Prevent directory traversal
  - Validate JSONPath expressions
- **Acceptance Criteria**:
  - Malicious file paths are rejected
  - Invalid selectors don't cause crashes
  - No arbitrary code execution through configuration

## Success Criteria

### Functional Completeness
- [ ] All supported file types process correctly
- [ ] Configuration system works end-to-end
- [ ] Control mechanisms function as specified
- [ ] Command integration complete

### Quality Assurance
- [ ] Unit test coverage > 90%
- [ ] Integration tests pass for real projects
- [ ] Performance benchmarks met
- [ ] Security audit passed

### Documentation
- [ ] README updated to remove built-ins claim
- [ ] Pattern reference documentation complete
- [ ] Customization guide available
- [ ] Troubleshooting guide provided

## Acceptance Tests

### End-to-End Workflow Test
1. Create new project with JSX components
2. Run `make-template init`
3. Verify `.templatize.json` created with correct defaults
4. Run `make-template convert --dry-run`
5. Verify templatization suggestions are accurate
6. Run `make-template convert --yes`
7. Verify files templatized correctly
8. Test scaffold with resulting template

### Edge Case Tests
1. Malformed JSX files
2. Files with existing placeholders
3. Skip regions in various file types
4. Large files and performance limits
5. Invalid configuration files

### Compatibility Tests
1. Projects without `.templatize.json`
2. Old convert command usage
3. Mixed manual/auto templatization
4. Different project structures</content>
<parameter name="filePath">/Users/vijay/workspaces/ws-million-views/create/.kiro/specs/templatization-system/requirements.md