# Implementation Plan

- [x] 1. Extend argument parser for new CLI flags

  - Add support for `--log-file <path>`, `--list-templates`, `--dry-run`, `--no-cache`, and `--cache-ttl <hours>` flags
  - Update help text to document new options
  - Add validation for new flag parameters
  - _Requirements: 2.1, 3.1, 4.1_

- [x] 2. Implement Cache Manager module
- [x] 2.1 Create cache directory structure and metadata handling

  - Write functions to create `~/.m5nv/cache` directory with proper permissions
  - Implement repository hashing algorithm for unique cache keys
  - Create cache metadata serialization and storage functions
  - _Requirements: 1.1, 1.5, 5.1_

- [x] 2.2 Implement core cache operations

  - Write `getCachedRepo()` function with TTL checking and automatic refresh
  - Implement `refreshCache()` function for updating expired entries
  - Create cache bypass logic for `--no-cache` flag
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.3 Add cache corruption recovery and cleanup

  - Implement cache corruption detection and automatic re-cloning
  - Write `clearExpiredEntries()` function for cache maintenance
  - Add graceful error handling for disk space and permission issues
  - _Requirements: 1.5, 5.4, 5.5_

- [x] 2.4 Write unit tests for Cache Manager

  - Test repository hashing consistency and collision handling
  - Test TTL expiration logic and automatic refresh behavior
  - Test cache corruption recovery and error handling scenarios
  - _Requirements: 1.1, 1.2, 1.3, 5.4_

- [x] 3. Implement Logger module
- [x] 3.1 Create structured logging system

  - Write Logger class with timestamped log entry formatting
  - Implement async file writing operations for log entries
  - Add log data sanitization to prevent information disclosure
  - _Requirements: 2.1, 2.5_

- [x] 3.2 Add operation-specific logging methods

  - Implement `logGitClone()` for repository cloning operations
  - Write `logFileCopy()` for template file copy operations
  - Create `logSetupScript()` for setup script execution tracking
  - Add `logError()` with context and stack trace logging
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 3.3 Write unit tests for Logger

  - Test log entry formatting and timestamp generation
  - Test async file writing and error handling
  - Test log data sanitization for security compliance
  - _Requirements: 2.1, 2.5_

- [x] 4. Implement Template Discovery module
- [x] 4.1 Create template listing functionality

  - Write `listTemplates()` function using cached repositories
  - Implement template metadata extraction from `template.json` and README frontmatter
  - Create formatted console output with visual separation between templates
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 4.2 Add template metadata parsing

  - Implement JSON parsing for `template.json` files with error handling
  - Write README frontmatter parser for template descriptions
  - Add fallback descriptions for templates without metadata
  - _Requirements: 3.2, 3.5_

- [x] 4.3 Integrate with cache system for fast discovery

  - Use Cache Manager for instant template access without network calls
  - Implement automatic cache population when templates are requested
  - Add error handling for missing or inaccessible template repositories
  - _Requirements: 3.1, 3.3_

- [x] 4.4 Write unit tests for Template Discovery

  - Test template metadata parsing with various file formats
  - Test formatted output generation and error handling
  - Test integration with Cache Manager for fast discovery
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 5. Implement Dry Run Engine module
- [x] 5.1 Create operation preview functionality

  - Write `previewScaffolding()` function to simulate complete scaffolding process
  - Implement `previewFileCopy()` to show planned file operations without execution
  - Create `previewSetupScript()` to detect and display setup scripts without running them
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5.2 Add preview display formatting

  - Implement clear visual indicators for dry run mode
  - Create formatted output showing planned operations with source and destination paths
  - Add operation categorization (file copy, setup script, directory creation)
  - _Requirements: 4.1, 4.5_

- [x] 5.3 Integrate with cache system for fast previews

  - Use Cache Manager for instant repository access during preview generation
  - Implement template path resolution using cached repositories
  - Add error handling for cache misses during dry run operations
  - _Requirements: 4.4_

- [x] 5.4 Write unit tests for Dry Run Engine

  - Test operation preview generation without actual execution
  - Test formatted output display and visual indicators
  - Test integration with Cache Manager for fast preview generation
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 6. Integrate new features into main CLI workflow
- [x] 6.1 Update main CLI entry point

  - Modify `main()` function to handle new CLI flags
  - Add conditional initialization of Logger, Cache Manager, Template Discovery, and Dry Run Engine
  - Implement early exit for `--list-templates` and `--dry-run` modes
  - _Requirements: 2.1, 3.1, 4.1_

- [x] 6.2 Replace direct git cloning with cache-aware operations

  - Update `cloneTemplateRepo()` function to use Cache Manager
  - Modify template verification to work with cached repositories
  - Add logging integration throughout existing operations
  - _Requirements: 1.1, 1.2, 2.2, 2.3_

- [x] 6.3 Add feature-specific error handling and user feedback

  - Implement clear error messages for cache-related failures
  - Add progress indicators for cache operations and template discovery
  - Create user-friendly output for dry run and template listing modes
  - _Requirements: 1.5, 3.4, 4.5, 5.5_

- [x] 6.4 Write integration tests for complete CLI workflow

  - Test end-to-end functionality with new CLI flags
  - Test cache integration with existing scaffolding workflow
  - Test logging integration across all operations
  - Test error handling and recovery scenarios
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 7. Update documentation and help text
- [x] 7.1 Update CLI help text and examples

  - Add documentation for all new CLI flags in `generateHelpText()`
  - Include usage examples for cache, logging, discovery, and dry run features
  - Add troubleshooting information for common cache and logging issues
  - _Requirements: 2.1, 3.1, 4.1_

- [x] 7.2 Create feature documentation
  - Document cache directory structure and TTL behavior
  - Explain logging format and security considerations
  - Provide template discovery usage patterns and metadata format
  - Document dry run mode capabilities and limitations
  - _Requirements: 1.1, 2.1, 3.1, 4.1_
