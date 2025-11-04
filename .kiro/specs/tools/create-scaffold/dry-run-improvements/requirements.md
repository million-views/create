# Requirements Document

## Introduction

The current `--dry-run` mode for @m5nv/create-scaffold provides minimal feedback, showing only that no changes will be made. This specification enhances dry-run output so developers can understand what the CLI would do without executing it. The improvements include summarizing template contents, listing planned operations, and optionally rendering a short directory tree when the `tree` utility exists.

## Glossary

- **CLI_Tool**: The @m5nv/create-scaffold command-line interface.
- **Dry_Run_Mode**: Execution mode triggered by the `--dry-run` flag where no file system changes occur.
- **Template_Directory**: The template subdirectory within the cached repository selected by `--from-template`.
- **Operation_Summary**: Structured data describing planned file copies, directory creations, and setup scripts.
- **Tree_Output**: Pretty-printed directory structure from the `tree` command limited to depth two (`tree -L 2`).
- **Cache_Path**: Location in `~/.m5nv/cache/<repo-hash>` where templates are stored.

## Requirements

### Requirement 1: Meaningful Dry-Run Summary

**User Story:** As a developer running `--dry-run`, I want a clear summary of what the CLI would do, so I can confidently proceed or adjust my options.

#### Acceptance Criteria

1. WHEN `--dry-run` executes successfully, THEN the CLI SHALL display the template name, resolved repository, and target project directory.
2. WHEN the template is analyzed, THEN the CLI SHALL report the total number of directories and files that would be copied.
3. WHEN the template contains a setup script, THEN the CLI SHALL mention that the script would run (without executing it).
4. WHEN no operations are detected (e.g., empty template), THEN the CLI SHALL explicitly state that nothing would be copied.

### Requirement 2: Planned Operations Listing

**User Story:** As a developer reviewing a dry-run, I want to see the detailed steps the CLI would perform, so I can audit them before running for real.

#### Acceptance Criteria

1. THE CLI_Tool SHALL list planned operations grouped by type (`Directories`, `Files`, `Setup Scripts`).
2. EACH file operation entry SHALL include relative source and destination paths.
3. Directory creation operations SHALL reflect the directories that would be created in the target project.
4. Setup script entries SHALL include the script name and summary of what would happen (e.g., “would execute `_setup.mjs`”).
5. The operations listing SHALL be omitted only when there are no operations to display.

### Requirement 3: Optional Tree Output

**User Story:** As a developer with the `tree` command available, I want to preview a short directory tree so I can visualize the template structure quickly.

#### Acceptance Criteria

1. WHEN the host system has the `tree` executable in PATH, THEN the CLI SHALL append a `tree -L 2` listing of the template directory after the operations summary.
2. WHEN `tree` is not available, THEN the CLI SHALL show a short message indicating that the tree view is skipped.
3. THE tree output SHALL be clearly labeled and visually separated from the operations list.
4. THE CLI SHALL ensure the tree view respects dry-run semantics (no file system changes).

### Requirement 4: Dry-Run Logging and Tests

**User Story:** As a maintainer, I want dry-run logging and tests to cover the new behavior, so regressions are prevented.

#### Acceptance Criteria

1. WHEN `--log-file` is supplied with `--dry-run`, THEN the operation summary SHALL be logged (mirroring console output at high level).
2. THE test suite SHALL include functional tests verifying counts, groupings, and tree output behavior.
3. Tests SHALL cover scenarios where `tree` is present and absent.
4. Tests SHALL assert that no files or directories are created during dry-run.

### Requirement 5: Documentation Sync

**User Story:** As a user reading the docs, I want the dry-run section to match observed behavior, so expectations are clear.

#### Acceptance Criteria

1. Documentation in `docs/` SHALL be updated to describe the improved dry-run output and tree preview behavior.
2. Examples SHALL showcase the enhanced summary without introducing maintenance liabilities (avoid literal file counts unless part of sample output).
