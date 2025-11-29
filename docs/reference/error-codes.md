---
title: "Error Codes Reference"
description: "Complete reference for exit codes, error messages, and troubleshooting"
type: reference
audience: "all"
estimated_time: "N/A (reference)"
prerequisites: []
related_docs:
  - "cli-reference.md"
  - "../how-to/troubleshooting.md"
last_updated: "2025-01-15"
---

# Error Codes Reference

## Overview

Complete reference for exit codes, error messages, and troubleshooting information for the `@m5nv/create` package.

## Exit Codes

| Code | Category | Description | Common Causes |
|------|----------|-------------|---------------|
| `0` | Success | Operation completed successfully | Normal execution, help displayed, dry run completed |
| `1` | General Error | Generic error or validation failure | Argument parsing errors, validation failures, template errors, unknown commands |
| `2` | Preflight Error | Setup/environment issues | Git not installed, Node.js version issues, critical environment problems |
| `3` | Network Error | Network connectivity issues | Git clone timeouts, repository access failures |
| `4` | Filesystem Error | File system permission/access issues | Permission denied, disk space issues, path access problems |

## Error Categories

### Argument Parsing Errors

**Exit Code:** `1`
**Category:** Input Validation

| Error Message Pattern | Cause | Resolution |
|----------------------|-------|------------|
| `❌ Validation failed:`<br>`  • <project-name> is required` | Missing required project name argument | Provide project directory name as first argument |
| `❌ Validation failed:`<br>`  • --template flag is required` | Missing required template flag | Add `--template <template-name>` or `-T <template-name>` |
| `❌ Error: Invalid arguments`<br><br>`Unknown option: --invalid-flag` | User provided unrecognized command-line flag | Check available options with `--help` |
| `❌ Error: Unknown command 'invalid'` | Command name not recognized | Use valid commands: `new`, `list`, `validate`, or `help` |

**Example:**
```bash
$ create scaffold new my-app --invalid-flag
❌ Error: Invalid arguments

Unknown option: --invalid-flag

Use --help for usage information.
```

### Validation Errors

**Exit Code:** `1`
**Category:** Input Validation

#### Project Directory Validation

| Error Message Pattern | Cause | Resolution |
|----------------------|-------|------------|
| `❌ Validation failed:`<br>`  • Project directory name contains path separators or traversal attempts` | Directory name contains `/`, `\`, or `..` | Use simple directory name without path separators |
| `❌ Validation failed:`<br>`  • Project name contains invalid characters` | Name contains special characters like `<>:"\|?*` | Use only letters, numbers, hyphens, underscores |
| `❌ Validation failed:`<br>`  • Project name is a reserved system name` | Using Windows reserved names like `CON`, `PRN`, `AUX` | Choose different directory name |
| `❌ Validation failed:`<br>`  • Project name is too long` | Name exceeds 255 characters | Choose shorter name |

#### Template Validation

| Error Message Pattern | Cause | Resolution |
|----------------------|-------|------------|
| `❌ Validation failed:`<br>`  • Template name contains invalid characters` | Template name contains spaces or injection characters | Use simple template name without special characters |
| `❌ Validation failed:`<br>`  • Template not accessible` | Template path doesn't exist or isn't readable | Check template path and permissions |
| `❌ Validation failed:`<br>`  • Cannot use both --no-cache and --cache-ttl` | Conflicting cache options provided | Use either `--no-cache` OR `--cache-ttl`, not both |

#### Branch and Repository Validation

| Error Message Pattern | Cause | Resolution |
|----------------------|-------|------------|
| `❌ Validation failed:`<br>`  • Branch name contains invalid characters` | Branch name has spaces or special chars | Use valid git branch name format |
| `❌ Validation failed:`<br>`  • Branch name contains path traversal attempts` | Branch name contains `..` or invalid slashes | Use simple branch name |

#### Cache and Configuration Validation

| Error Message Pattern | Cause | Resolution |
|----------------------|-------|------------|
| `❌ Invalid cache TTL value: abc. Must be a positive integer.` | Non-numeric or invalid TTL value | Provide numeric value between 1-720 hours |
| `❌ Validation failed:`<br>`  • Cannot use both --no-cache and --cache-ttl` | Conflicting cache flags | Use either `--no-cache` OR `--cache-ttl` |

### Git Operation Errors

**Exit Code:** `3` (Network) or `1` (General)
**Category:** Git Operations

| Error Message Pattern | Cause | Resolution |
|----------------------|-------|------------|
| `❌ Repository not found` | Repository doesn't exist or no access | Check repository URL and permissions |
| `❌ Branch not found in repository` | Specified branch doesn't exist | Check branch name or omit to use default |
| `❌ Authentication failed` | Git credentials not configured | Set up SSH keys or personal access token |
| `❌ Git clone operation timed out` | Network issues or large repository | Check network connection, try again |
| `❌ Failed to access repository: [details]` | General git access failure | Check repository URL, credentials, network |

**Common Git Error Scenarios:**

```bash
# Repository not found
❌ Repository not found.
Please check that:
  1. The repository exists
  2. You have access to it
  3. Your git credentials are configured correctly

# Authentication failed
❌ Authentication failed.
Please ensure your git credentials are configured correctly.
For private repositories, you need to set up:
  - SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
  - Personal Access Token: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

# Network timeout
❌ Network error during git clone
Technical Details: Clone operation timed out
💡 Suggestions:
   • Check your internet connection
   • Try again in a few minutes
   • Use --no-cache to bypass cached data

Please check your network connection and try again.
```

### File System Errors

**Exit Code:** `4` (Filesystem) or `1` (General)
**Category:** File Operations

| Error Message Pattern | Cause | Resolution |
|----------------------|-------|------------|
| `❌ Template not found in the repository` | Template directory doesn't exist | Check template name, run `create scaffold list` |
| `❌ Failed to copy template: [details]` | File copy operation failed | Check permissions, disk space |
| `❌ Project directory already exists` | Target directory exists and is not empty | Choose different name or remove existing directory |
| `❌ Permission denied` | Insufficient file system permissions | Check directory permissions |
| `❌ No space left on device` | Insufficient disk space | Free up disk space |

### Cache System Errors

**Exit Code:** `1`
**Category:** Cache Operations

| Error Message Pattern | Cause | Resolution |
|----------------------|-------|------------|
| `❌ Cache directory permission denied` | Cannot access cache directory | Check `~/.m5nv/cache` permissions or use `--no-cache` |
| `❌ Corrupted cache entry` | Cache entry is corrupted | Tool automatically re-clones, or use `--no-cache` |
| `❌ Cache cleanup failed` | Cannot clean up cache | Check disk space and permissions |

### Setup Script Errors

**Exit Code:** `0` (Warning only)
**Category:** Setup Script Execution

Setup script errors are treated as warnings and don't cause the CLI to exit with error code 1.

| Warning Message Pattern | Cause | Resolution |
|------------------------|-------|------------|
| `⚠️  Warning: Setup script execution failed: [details]` | Setup script threw an error | Check setup script code, review logs |
| `⚠️  Warning: Setup script must export a default function` | Setup script has wrong export format | Ensure `export default function setup(env) { ... }` |
| `⚠️  Warning: Setup script not found` | No `_setup.mjs` file (normal) | No action needed - setup scripts are optional |

**Example:**
```bash
⚠️  Warning: Setup script execution failed: Cannot read property 'name' of undefined
Continuing without setup...

✅ Project created successfully!
```

### Preflight Check Errors

**Exit Code:** `2`
**Category:** Environment Validation

| Error Message Pattern | Cause | Resolution |
|----------------------|-------|------------|
| `❌ Git is not installed or not in PATH` | Git command not found | Install git and ensure it's in PATH |
| `❌ Node.js version requirement not met` | Unsupported Node.js version | Upgrade to supported Node.js version |
| `❌ Project directory already exists` | Target directory exists | Choose different name or remove directory |

## Environment Variables

The CLI tools support the following environment variables:

| Variable | Usage | Description |
|----------|-------|-------------|
| `M5NV_HOME` | Cache and config base | Override default `~/.m5nv` directory for cache and config storage. Useful for testing and custom installations. |
| `NODE_ENV` | Setup scripts | Environment mode (development, production) |
| `PATH` | CLI execution | System PATH for finding git and other tools |
| `HOME` / `USERPROFILE` | Default home directory | User home directory (fallback when `M5NV_HOME` not set) |

### M5NV_HOME Environment Variable

The `M5NV_HOME` environment variable allows you to override the default `~/.m5nv` directory used for cache and configuration storage. This is particularly useful for:

- **Testing**: Isolate test runs with separate cache directories
- **CI/CD**: Use workspace-local cache instead of user home directory
- **Custom installations**: Install to non-standard locations (e.g., `/opt/m5nv`)

**Examples:**

```bash
# Use custom directory for all M5NV data
export M5NV_HOME=/opt/m5nv
create scaffold new my-app --template react

# Isolate test environment
M5NV_HOME=./test-cache npm test

# CI/CD: Use workspace-local cache
M5NV_HOME=$GITHUB_WORKSPACE/.m5nv npm run scaffold
```

**When `M5NV_HOME` is set:**
- Cache directory: `$M5NV_HOME/cache`
- Config file: `$M5NV_HOME/rc.json`
- Template cache: `$M5NV_HOME/cache/templates`

**When `M5NV_HOME` is NOT set (default):**
- Cache directory: `~/.m5nv/cache`
- Config file: `~/.m5nv/rc.json`
- Template cache: `~/.m5nv/cache/templates`

## Logging and Debugging

The CLI tool provides comprehensive logging and debugging capabilities through the Logger class. Logging output varies by environment and can be controlled through log levels and output modes.

### Log Output Formats

#### Console Mode (Default)
Console logging uses emoji prefixes and structured formatting:

| Log Level | Emoji | Example Output |
|-----------|-------|----------------|
| Error | `❌` | `❌ Error: Repository not found` |
| Warning | `⚠️` | `⚠️ Warning: Setup script execution failed` |
| Info | `ℹ️` | `ℹ️ Cloning repository: user/repo (branch: main) to /tmp/repo` |
| Debug | `🔍` | `🔍 Debug: Cache entry found for user/repo:main` |
| Success | `✅` | `✅ Project created successfully!` |
| Progress | `🔄` | `🔄 Cloning [1/3] (33%) Starting git clone operation` |
| Dry Run | `🔍` | `🔍 [DRY RUN] Would clone repository: user/repo` |
| Confirm | `❓` | `❓ Continue with operation? (y/N)` |

#### File Mode (`--log-file`)
When using `--log-file <path>`, logs are written as JSON Lines format:

```json
{"timestamp":"2024-01-15T10:30:00.000Z","level":"error","message":"Repository not found"}
{"timestamp":"2024-01-15T10:30:01.000Z","level":"info","message":"Starting git clone operation","data":{"repoUrl":"user/repo","branch":"main"}}
{"timestamp":"2024-01-15T10:30:02.000Z","operation":"git_clone","details":{"repoUrl":"user/repo","branch":"main","destination":"/tmp/repo"}}
```

### Log Levels

| Level | Description | Environment Default |
|-------|-------------|-------------------|
| `error` | Critical errors only | All environments |
| `warn` | Errors and warnings | All environments |
| `info` | General information + warnings/errors | Production, CI |
| `debug` | Detailed debugging + all above | Development, Test |

### Environment-Specific Logging

- **Development/Test**: Console mode with `debug` level (verbose output)
- **CI**: Console mode with `info` level (moderate output)
- **Production**: Console mode with `info` level (moderate output)

### Specialized Logging Methods

#### Validation Errors
Validation errors include structured suggestions:

```text
❌ Validation failed:
  • Project directory name contains path separators or traversal attempts
  • Project name contains invalid characters
ℹ️ Suggestions:
  • Use simple directory name without path separators
  • Use only letters, numbers, hyphens, underscores
```

#### Filesystem Errors
Filesystem operations log with path and error details:

```text
❌ mkdir operation failed for: /path/to/directory
❌ Error: EACCES: permission denied, mkdir '/path/to/directory'
```

#### Missing Dependencies
Dependency errors include installation instructions:

```text
❌ Missing required dependencies: git, node
ℹ️ Installation instructions:
  npm install git node
Then run the command again.
```

#### Operation Logging
Complex operations are logged with structured data:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "operation": "git_clone",
  "details": {
    "repoUrl": "user/repo",
    "branch": "main",
    "destination": "/tmp/repo"
  }
}
```

### Data Sanitization

All log data is automatically sanitized to prevent credential exposure:

- **Sensitive fields redacted**: `password`, `token`, `apikey`, `secret`, `auth`, `credential`
- **Pattern matching**: Fields containing sensitive keywords are replaced with `[REDACTED]`
- **Recursive sanitization**: Applied to nested objects and arrays

### Common Log Operations

| Operation | Description | Logged Data |
|-----------|-------------|-------------|
| `git_clone` | Git repository cloning | `repoUrl`, `branch`, `destination` |
| `file_copy` | Template file copying | `source`, `destination` |
| `setup_script` | Setup script execution | `scriptPath`, `status`, `output` |
| `error` | Error with context | `message`, `stack`, `context` |

### Debug Information

For troubleshooting, collect the following diagnostic information:

- **Node.js version:** `node --version`
- **Git version:** `git --version`
- **CLI version:** `npm list @m5nv/create`
- **Environment:** `NODE_ENV` value
- **Cache location:** `~/.m5nv/cache/`
- **Log file:** Use `--log-file debug.log` for detailed JSON logs

### Enabling Debug Logging

```bash
# Enable debug logging to console
NODE_ENV=development create scaffold new my-app --template basic

# Save detailed logs to file
create scaffold new my-app --template basic --log-file debug.log

# Combine with dry run for safe debugging
create scaffold new my-app --template basic --dry-run --log-file debug.log
```

## Troubleshooting Quick Reference

### Common Issues and Solutions

| Problem | Quick Fix |
|---------|-----------|
| "Unknown option" error | Check spelling, use `--help` for valid options |
| "Repository not found" | Verify repository URL, check access permissions |
| "Template not found" | Run `create scaffold list` to see available templates |
| "Authentication failed" | Set up git credentials (SSH keys or PAT) |
| "Permission denied" | Check file/directory permissions |
| "Cache issues" | Use `--no-cache` to bypass cache |
| "Network timeout" | Check internet connection, try again |
| "Setup script failed" | Check setup script code, review error message |

### Getting Help

1. **Check help:** `create scaffold --help`
2. **List templates:** `create scaffold list`
3. **Use dry run:** Add `--dry-run` to preview operations
4. **Enable logging:** Add `--log-file debug.log` for detailed logs
5. **Bypass cache:** Add `--no-cache` for fresh repository clone

## Quick Problem-Solution Reference

| Problem Category | Quick Identification | Primary Solution Guide |
|------------------|---------------------|------------------------|
| **Installation Issues** | Can't run CLI tool, git not found | [🚀 Installation Issues](../how-to/troubleshooting.md) |
| **Repository Access** | "Repository not found", "Authentication failed" | [🎯 First Use Issues](../how-to/troubleshooting.md) |
| **Template Problems** | "Template not found", setup script failures | [🔧 Template Issues](../how-to/troubleshooting.md) |
| **Cache/Performance** | Stale data, permission errors, slow operations | [⚡ Advanced Usage Issues](../how-to/troubleshooting.md) |
| **Network/Timeout** | Clone timeouts, connectivity issues | [⚡ Network Issues](../how-to/troubleshooting.md) |

### Community Support Channels

**For immediate help:**
- 📖 [Troubleshooting Guide](../how-to/troubleshooting.md) - Step-by-step problem resolution
- 📖 [CLI Reference](cli-reference.md) - Complete parameter documentation

**For community support:**
- 🐛 [GitHub Issues](https://github.com/m5nv/scaffold/issues) - Bug reports and feature requests
- 💬 [GitHub Discussions](https://github.com/m5nv/scaffold/discussions) - Questions and community help
- 📚 [Documentation](https://github.com/m5nv/scaffold/tree/main/docs) - Complete guides and references

**Escalation path for unresolved issues:**
1. Check [troubleshooting guide](../how-to/troubleshooting.md) for your specific scenario
2. Search [existing issues](https://github.com/m5nv/scaffold/issues) for similar problems
3. Collect [diagnostic information](../how-to/troubleshooting.md)
4. Create new issue with reproduction steps and system details

## See Also

- [CLI Reference](cli-reference.md) - Complete CLI parameter documentation
- [Troubleshooting Guide](../how-to/troubleshooting.md) - Detailed troubleshooting procedures
- [Template Author Workflow](../how-to/template-author-workflow.md) - Template creation and setup scripts