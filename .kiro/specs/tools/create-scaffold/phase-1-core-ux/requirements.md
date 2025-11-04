# Requirements Document

## Introduction

This specification defines the Phase 1 Core User Experience features for @m5nv/create-scaffold v0.3. These features focus on improving performance, debugging capabilities, template discoverability, and user confidence through caching, logging, discovery, and dry-run functionality. The features are strategically ordered with template caching as the foundational infrastructure that enables and accelerates all other features.

## Glossary

- **CLI_Tool**: The @m5nv/create-scaffold command-line interface application
- **Template_Repository**: A Git repository containing project templates and scaffolding files
- **Cache_System**: Local storage mechanism for template repositories in `~/.m5nv/cache`
- **Template_Cache**: Cached copy of a template repository with associated metadata
- **Log_System**: Structured logging mechanism that records CLI operations and events
- **Template_Discovery**: Feature that lists available templates from cached repositories
- **Dry_Run_Mode**: Preview mode that shows planned operations without executing them
- **TTL**: Time-to-live value determining cache expiration
- **Setup_Script**: Executable script in template repositories (e.g., `_setup.mjs`)

## Requirements

### Requirement 1

**User Story:** As a developer using templates repeatedly, I want template repositories to be cached locally, so that subsequent operations are fast and don't require network access.

#### Acceptance Criteria

1. WHEN the CLI_Tool clones a Template_Repository for the first time, THE CLI_Tool SHALL store the repository in the Cache_System at `~/.m5nv/cache/<repo-hash>`
2. WHEN the CLI_Tool needs to access a previously cached Template_Repository, THE CLI_Tool SHALL use the cached copy instead of cloning from the network
3. WHEN a Template_Cache exceeds its TTL, THE CLI_Tool SHALL refresh the cache by fetching updates from the remote repository
4. WHERE the user provides the `--no-cache` flag, THE CLI_Tool SHALL bypass the Cache_System and clone directly from the remote repository
5. THE CLI_Tool SHALL create the cache directory structure with appropriate permissions if it does not exist

### Requirement 2

**User Story:** As a developer troubleshooting template issues, I want detailed operation logs, so that I can debug failures and audit what the tool performed.

#### Acceptance Criteria

1. WHERE the user provides the `--log-file <path>` argument, THE CLI_Tool SHALL write timestamped log entries to the specified file
2. WHEN the CLI_Tool performs git clone operations, THE CLI_Tool SHALL log the repository URL, branch, and destination path
3. WHEN the CLI_Tool copies template files, THE CLI_Tool SHALL log source and destination paths for each file operation
4. WHEN the CLI_Tool executes Setup_Scripts, THE CLI_Tool SHALL log the script path, execution status, and any output or errors
5. IF any operation fails, THEN THE CLI_Tool SHALL log detailed error information including stack traces and context

### Requirement 3

**User Story:** As a developer exploring available templates, I want to list all templates in a repository, so that I can discover and choose the appropriate template for my project.

#### Acceptance Criteria

1. WHERE the user provides the `--list-templates` flag, THE CLI_Tool SHALL display all available templates from the cached Template_Repository
2. WHEN displaying template information, THE CLI_Tool SHALL show the template name and description from `template.json` or README frontmatter
3. WHEN the Template_Repository is not cached, THE CLI_Tool SHALL use the Cache_System to fetch and cache the repository before listing templates
4. THE CLI_Tool SHALL display templates in a readable format with clear visual separation between entries
5. IF a template lacks description metadata, THEN THE CLI_Tool SHALL display the template name with a default "No description available" message

### Requirement 4

**User Story:** As a developer wanting to preview operations, I want a dry-run mode, so that I can see what the tool will do before making actual changes.

#### Acceptance Criteria

1. WHERE the user provides the `--dry-run` flag, THE CLI_Tool SHALL display all planned operations without executing them
2. WHEN in Dry_Run_Mode, THE CLI_Tool SHALL show planned file copy operations with source and destination paths
3. WHEN in Dry_Run_Mode, THE CLI_Tool SHALL indicate which Setup_Scripts would be executed without running them
4. WHEN in Dry_Run_Mode, THE CLI_Tool SHALL use the Cache_System to access template information for fast preview generation
5. THE CLI_Tool SHALL clearly indicate that it is running in preview mode and no actual changes will be made

### Requirement 5

**User Story:** As a developer managing disk space, I want cache management capabilities, so that I can control cache size and refresh outdated templates.

#### Acceptance Criteria

1. THE CLI_Tool SHALL store cache metadata including repository URL, last updated timestamp, and TTL information
2. WHEN the CLI_Tool starts, THE CLI_Tool SHALL check for expired cache entries based on TTL values
3. WHERE cache entries are expired, THE CLI_Tool SHALL automatically refresh them during the next access
4. THE CLI_Tool SHALL handle cache corruption gracefully by re-cloning affected repositories
5. THE CLI_Tool SHALL provide clear error messages when cache operations fail due to disk space or permission issues