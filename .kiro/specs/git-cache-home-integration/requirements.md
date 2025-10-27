# Requirements Document

## Introduction

This specification ensures the @m5nv/create-scaffold CLI stores and maintains cached template repositories inside the documented cache directory (`~/.m5nv/cache`). Current behaviour clones repositories into ephemeral system temporary directories and never promotes them into the persistent cache, leaving the documented cache directory unused. The change aligns implementation with design documentation so users can inspect, reuse, or delete cached repositories as intended.

## Glossary

- **CLI_Tool**: The @m5nv/create-scaffold command-line interface.
- **Cache_Directory**: The user-scoped cache location at `~/.m5nv/cache`.
- **Cache_Manager**: The module responsible for cache lifecycle operations (`bin/cacheManager.mjs`).
- **Cached_Repository**: A repository cloned into the Cache_Directory with metadata recorded via Cache_Manager.
- **Temp_Directory**: A transient directory created via `createSecureTempDir()` for short-lived cloning.
- **TTL**: Time-to-live, determining when a Cached_Repository is considered stale.
- **Metadata**: The structured JSON data stored alongside each Cached_Repository that records repo URL, branch, timestamps, and TTL configuration.

## Requirements

### Requirement 1: Cache Population

**User Story:** As a developer running the CLI for the first time against a repository, I want the tool to populate the documented cache directory, so subsequent runs benefit from the cache and I can manage it easily.

#### Acceptance Criteria

1. WHEN the CLI clones a repository that is not present or is expired in the cache, THEN it SHALL clone directly into a directory under `~/.m5nv/cache/<repo-hash>`.
2. WHEN cloning into the cache completes successfully, THEN the CLI SHALL update cache metadata (including `lastUpdated`, TTL, branch, and repo URL).
3. WHEN cloning into the cache fails, THEN the CLI SHALL clean up any partially written cache directory.
4. WHEN the user passes `--no-cache`, THEN the CLI SHALL skip populating the cache (existing behaviour preserved).

### Requirement 2: Cache Retrieval

**User Story:** As a developer using cached repositories, I want the CLI to operate against the cached copy without re-cloning into temp space, so operations are fast and consistent.

#### Acceptance Criteria

1. WHEN a Cached_Repository exists and is within TTL, THEN the CLI SHALL use that cached path for downstream operations (list templates, dry run, scaffolding).
2. WHEN a Cached_Repository is expired, THEN the CLI SHALL refresh it in-place inside the cache before proceeding.
3. WHEN the cached directory is missing or corrupted, THEN the CLI SHALL remove it and recreate it in the cache.
4. THE CLI SHALL avoid cloning repositories into system Temp_Directory locations when caching is enabled.

### Requirement 3: Cache Consistency Across Modules

**User Story:** As a developer relying on auxiliary features (template discovery, dry-run, CLI scaffolding), I want all modules to respect the same cache location, so behaviour is predictable.

#### Acceptance Criteria

1. THE Template Discovery module SHALL read repositories exclusively from the Cache_Directory (or from a provided path override used in tests).
2. THE Dry Run Engine SHALL require repositories to exist in the Cache_Directory for normal operation and SHALL surface helpful guidance when they are missing.
3. THE main CLI workflow (`bin/index.mjs`) SHALL delegate cache population and retrieval to Cache_Manager for all cache-enabled execution paths.
4. THE Cache_Manager SHALL expose any new helper functions required for population, refresh, and metadata maintenance without duplicating logic in other modules.

### Requirement 4: Cache Metadata Integrity

**User Story:** As a developer inspecting or clearing the cache, I want metadata to accurately reflect the cached content, so I can make informed decisions.

#### Acceptance Criteria

1. AFTER a successful cache update or refresh, metadata SHALL contain accurate `lastUpdated`, `ttlHours`, `repoUrl`, and `branchName`.
2. WHEN cache entries are removed due to corruption or refresh, metadata files SHALL be removed or rewritten accordingly.
3. WHEN cache refreshes occur, metadata SHALL preserve user-specified TTL overrides (falling back to defaults when unset).
4. Metadata writes SHALL remain atomic to avoid partially written files.

### Requirement 5: Documentation Alignment

**User Story:** As a user referencing documentation, I want behaviour to match documented cache semantics, so I can rely on published guidance.

#### Acceptance Criteria

1. THE implementation SHALL reflect the documented cache location without hidden temp-directory fallbacks for cached workflows.
2. Documentation SHALL not require substantive updates beyond clarifying language that already references the home-directory cache.
