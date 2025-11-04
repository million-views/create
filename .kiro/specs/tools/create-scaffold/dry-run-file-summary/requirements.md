# Requirements Document

## Introduction

The existing dry-run output lists every file copy operation individually. For larger templates this becomes noisy and hard to scan. This specification updates the summary to aggregate file copy counts by destination directory while still providing a high-level overview in dry-run mode.

## Glossary

- **Dry_Run_Mode**: Execution mode triggered by `--dry-run`, calculating planned operations without modifying the filesystem.
- **Directory_Bucket**: A group of files whose destination share the same project directory (e.g., root `./`, `src/`, `public/`).
- **Summary_Output**: The section of dry-run output that lists planned file, directory, and setup script operations.

## Requirements

### Requirement 1: Aggregated File Summary

**User Story:** As a developer inspecting a dry run, I want file copy counts grouped by destination directory so I can quickly understand what areas of the project will change.

#### Acceptance Criteria

1. The dry-run summary SHALL report file copy counts aggregated by their destination directory relative to the project root (e.g., `./`, `src/`, `src/components/`).
2. The root directory SHALL be represented as `./`.
3. Directories SHALL be listed in a deterministic order (recommended: sorted alphabetically).
4. Each entry SHALL show the directory path and number of files targeted for that directory, e.g., `• src/ (6 files)`.

### Requirement 2: Overall File Count Integrity

**User Story:** As a developer validating the dry-run summary, I want to ensure aggregated counts match the total file copy operations.

#### Acceptance Criteria

1. The total file count displayed in the summary header SHALL match the sum of all per-directory counts.
2. If there are zero file operations, the file copy section SHALL either be omitted or clearly state `0 files`.

### Requirement 3: Directory Creation Reporting

**User Story:** As a developer previewing project structure, I want directory creation counts to remain understandable when file listing changes.

#### Acceptance Criteria

1. Directory creation entries SHALL remain listed individually, aligned with the destination path.
2. Directory reporting SHALL not duplicate information conveyed in the file copy summary (e.g., avoid re-aggregating directories in both sections unless necessary for clarity).

### Requirement 4: Logging Alignment

**User Story:** As a maintainer reviewing logs, I want dry-run logging to reflect the aggregated summary so logs stay consistent with console output.

#### Acceptance Criteria

1. When `--log-file` is used with `--dry-run`, the log entry SHALL include the aggregated per-directory file counts.
2. The log entry SHALL continue to capture total operation counts and tree availability data from prior work.

### Requirement 5: Testing Coverage

**User Story:** As a maintainer, I want confidence that the aggregated summary stays correct over time.

#### Acceptance Criteria

1. Dry-run engine unit tests SHALL verify aggregation logic, ensuring directory buckets contain correct counts and include the root bucket when applicable.
2. CLI integration tests SHALL validate that the formatted output shows aggregated counts instead of individual file listings.
3. Tests SHALL cover scenarios with nested directories, files only in root, and zero-file templates.

