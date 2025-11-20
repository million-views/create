---
title: "Caching Strategy Explained"
description: "How @m5nv/create-scaffold implements intelligent caching for improved performance and reliability"
type: explanation
audience: "intermediate"
estimated_time: "7 minutes read"
prerequisites:
  - "Understanding of file systems and caching concepts"
  - "Basic knowledge of git repositories"
related_docs:
  - "../reference/cli-reference.md"
  - "../guides/troubleshooting.md"
  - "template-system.md"
last_updated: "2025-11-19"
---

# Caching Strategy Explained

## Introduction

@m5nv/create-scaffold implements an intelligent caching system that dramatically improves performance for repeated template operations while maintaining data integrity and security. The caching strategy balances speed, reliability, and storage efficiency to provide a smooth user experience even with large or frequently-used templates.

## The Problem

Template scaffolding operations face several performance challenges:

- **Network Latency**: Downloading repositories repeatedly is slow and bandwidth-intensive
- **Large Repositories**: Some template repositories contain significant amounts of data
- **Repeated Operations**: Users often scaffold multiple projects from the same template
- **Branch Switching**: Different template versions require separate network operations
- **Offline Usage**: Users want to work with previously-used templates without network access

## Our Approach

We implement a multi-layered caching system with validation, TTL management, and corruption detection to provide fast, reliable template access.

### Key Principles

1. **Transparent Caching**: Users benefit from caching without needing to manage it
2. **Validation First**: Cached data is validated to prevent corruption issues
3. **Configurable TTL**: Cache lifetime can be adjusted based on user needs
4. **Graceful Degradation**: Cache failures don't prevent operations
5. **Storage Efficiency**: Cache management prevents unbounded growth

## How It Works

### Cache Architecture

```text
Cache Structure:
~/.m5nv/cache/
├── [repo-hash-1]/
│   ├── metadata.json      # Cache metadata and TTL info
│   ├── .git/             # Full git repository
│   ├── README.md         # Repository contents
│   └── template-files/   # Template structure
├── [repo-hash-2]/
│   └── ...
└── [repo-hash-n]/
    └── ...
```

### Repository Hashing

Each repository/branch combination gets a unique hash:

```javascript
// Hash generation process
const normalizedUrl = normalizeRepoUrl(repoUrl);  // user/repo → full GitHub URL
const hashInput = `${normalizedUrl}#${branchName}`;
const repoHash = sha256(hashInput).slice(0, 16);  // 16-character unique identifier
```

**Benefits:**
- **Collision Resistance**: SHA-256 ensures unique identifiers
- **Branch Separation**: Different branches are cached separately
- **URL Normalization**: Equivalent URLs (user/repo vs full GitHub URL) share cache

### Cache Lifecycle

```text
Operation Flow:
Request → Hash Generation → Cache Check → TTL Validation → Integrity Check → Use/Refresh
```

1. **Cache Lookup**: Generate repository hash and check for existing cache
2. **TTL Validation**: Check if cached data is within time-to-live window
3. **Validation Check**: Verify cached repository directory and metadata are valid
4. **Cache Hit**: Use cached data if valid and fresh
5. **Cache Miss**: Download repository and update cache
6. **Cleanup**: Remove expired or corrupted entries periodically

### Metadata Management

Each cached repository includes metadata for management:

```json
{
  "repoUrl": "https://github.com/user/repo.git",
  "branchName": "main",
  "lastUpdated": "2025-11-12T10:30:00.000Z",
  "ttlHours": 24,
  "cacheVersion": "1.0"
}
```

## Design Decisions

### Decision 1: User Directory Cache Location

**Why we chose this:** Cache is stored in `~/.m5nv/cache/` in the user's home directory (configurable via `M5NV_HOME` environment variable).

**Trade-offs:**
- **Gained**: User-specific caching, no permission issues, survives project deletion, customizable location
- **Given up**: System-wide cache sharing (each user has separate cache)

**Alternatives considered:**
- **Project-local cache** (rejected - doesn't survive project deletion)
- **System-wide cache** (rejected - permission and security complications)
- **Temporary directory cache** (rejected - doesn't persist across sessions)

**Customization:** Set `M5NV_HOME` environment variable to override the default `~/.m5nv` location. This is useful for testing, CI/CD, and custom installations.

### Decision 2: 24-Hour Default TTL

**Why we chose this:** Balances freshness with performance for typical development workflows.

**Trade-offs:**
- **Gained**: Recent changes are picked up within a day, good performance for repeated operations
- **Given up**: Immediate updates (can be overridden with `--no-cache`)

**Alternatives considered:**
- **No TTL** (rejected - stale data issues)
- **Short TTL (1 hour)** (rejected - too many network requests)
- **Long TTL (1 week)** (rejected - stale data for active development)

### Decision 3: Full Repository Caching

**Why we chose this:** Cache complete git repositories rather than just template files.

**Trade-offs:**
- **Gained**: Preserves git history, supports branch operations, enables offline git operations
- **Given up**: Storage efficiency (git metadata takes space)

**Alternatives considered:**
- **File-only caching** (rejected - loses git context and branch support)
- **Compressed archives** (rejected - complicates git operations)
- **Shallow clones only** (rejected - limits git functionality)

### Decision 4: Cache Validation

**Why we chose this:** Validate cache structure before use to prevent corruption issues.

**Trade-offs:**
- **Gained**: Reliability, corruption detection, automatic recovery
- **Given up**: Some performance (validation checks take time)

**Alternatives considered:**
- **No validation** (rejected - corruption leads to confusing errors)
- **Checksum-only validation** (rejected - doesn't catch structural corruption)
- **Full validation on every use** (rejected - too slow)

## Cache Management

### Automatic Cleanup

The system automatically manages cache size and health:

- **Expired Entry Removal**: Entries past TTL are removed during cleanup
- **Corruption Detection**: Corrupted entries are detected and removed
- **Orphaned File Cleanup**: Incomplete cache entries are cleaned up
- **Storage Monitoring**: Cache size is monitored (future enhancement)

### User Control

Users can control caching behavior through CLI options:

```bash
# Bypass cache for fresh download
create-scaffold new my-project user/repo --no-cache

# Set custom TTL (in hours)
create-scaffold new my-project user/repo --cache-ttl 48

# Force cache refresh (future enhancement)
create-scaffold --cache-refresh user/repo
```

### Cache Inspection

Users can inspect cache status (future enhancement):

```bash
# List cached repositories
create-scaffold --cache-list

# Show cache statistics
create-scaffold --cache-stats

# Clear specific cache entry
create-scaffold --cache-clear user/repo

# Clear all cache
create-scaffold --cache-clear-all
```

## Performance Impact

### Cache Hit Performance

- **Network Elimination**: No git clone operation required
- **Disk I/O Only**: Fast local file operations
- **Reduced Latency**: Eliminates network round-trip time
- **Bandwidth Savings**: No repeated downloads of same content

### Cache Miss Performance

- **One-Time Cost**: Initial download creates cache for future use
- **Background Optimization**: Cache updates can happen asynchronously (future)
- **Partial Hits**: Branch caches can share base repository data (future)

### Storage Efficiency

- **Deduplication**: Identical repositories are cached once per branch
- **Cleanup Automation**: Expired entries are automatically removed
- **Compression**: Git's built-in compression reduces storage needs
- **Selective Caching**: Only accessed repositories are cached

## Implications

### For Users

- **Faster Operations**: Repeated template usage is significantly faster
- **Offline Capability**: Previously-used templates work without network access
- **Transparent Benefits**: Caching works automatically without user intervention
- **Configurable Behavior**: Can bypass or customize caching when needed

### For Template Authors

- **Update Propagation**: Changes propagate to users within TTL window
- **Branch Support**: Different branches are cached independently
- **Large Repository Support**: Caching makes large templates practical
- **Development Workflow**: Frequent template testing benefits from caching

### For System Administrators

- **User-Scoped Impact**: Each user's cache is independent
- **Predictable Storage**: Cache size is bounded by TTL and cleanup
- **No Special Permissions**: Cache operates within user permissions
- **Monitoring Capability**: Cache status can be inspected and managed

## Limitations

Current caching limitations that users should understand:

1. **Storage Usage**: Cache consumes disk space in user directory
2. **TTL Granularity**: TTL is per-repository, not per-file
3. **Network Dependency**: Initial cache population requires network access
4. **Single User**: Cache is not shared between users on same system
5. **Manual Management**: Limited tools for cache inspection and management

## Future Considerations

### Planned Enhancements

- **Smart TTL**: Adjust TTL based on repository update frequency
- **Partial Updates**: Update only changed files rather than full repository
- **Cache Sharing**: Optional system-wide cache for shared environments
- **Compression**: Additional compression for large repositories
- **Analytics**: Cache hit/miss statistics and optimization recommendations

### Research Areas

- **Predictive Caching**: Pre-cache likely-to-be-used templates
- **Delta Synchronization**: Sync only changes since last cache update
- **Distributed Caching**: Share cache across development team
- **Content-Addressed Storage**: Deduplicate identical files across repositories

## Related Concepts

- **Template System Architecture**: How caching integrates with template processing
- **Security Model**: Security considerations in cache management
- **IDE Integration Philosophy**: How caching affects development environment integration

## Further Reading

- 📚 [Getting Started Tutorial](../tutorial/getting-started.md) - See caching in action
- 🛠️ [Troubleshooting Guide](../guides/troubleshooting.md) - Cache-related troubleshooting
- 📖 [CLI Reference](../reference/cli-reference.md) - Cache-related command options