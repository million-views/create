---
title: "Error Codes Reference"
type: "reference"
audience: "all"
estimated_time: "N/A (reference)"
prerequisites: []
related_docs:
  - "cli-reference.md"
  - "../guides/troubleshooting.md"
last_updated: "2024-01-15"
---

# Error Codes Reference

## Overview

Complete reference for exit codes, error messages, and troubleshooting information for the `@m5nv/create-scaffold` CLI tool.

## Exit Codes

| Code | Category | Description | Common Causes |
|------|----------|-------------|---------------|
| `0` | Success | Operation completed successfully | Normal execution, help displayed, dry run completed |
| `1` | General Error | Generic error or unhandled exception | Various error conditions, validation failures, unexpected errors |

## Error Categories

### Argument Parsing Errors

**Exit Code:** `1`
**Category:** Input Validation

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Unknown option: --invalid-flag` | User provided an unrecognized command-line flag | Check available options with `--help` |
| `Invalid option value: --cache-ttl abc` | User provided invalid value for an option | Provide valid value (e.g., numeric for `--cache-ttl`) |
| `Argument parsing failed: [details]` | General argument parsing failure | Check command syntax and option formats |

**Example:**
```bash
$ npm create @m5nv/scaffold my-app -- --invalid-flag
❌ Error: Invalid arguments

  Unknown option: --invalid-flag

Use --help for usage information.
```

### Validation Errors

**Exit Code:** `1`
**Category:** Input Validation

#### Project Directory Validation

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Project directory is required as the first argument` | Missing project directory argument | Provide project directory name |
| `Project directory name contains path separators or traversal attempts` | Directory name contains `/`, `\`, or `..` | Use simple directory name without path separators |
| `Project directory name cannot start with a dot` | Directory name starts with `.` | Choose name that doesn't start with dot |
| `Project directory name is reserved and cannot be used` | Using reserved name like `node_modules` | Choose different directory name |
| `Project directory name contains invalid characters` | Name contains special characters | Use only letters, numbers, hyphens, underscores |
| `Project directory name is too long (maximum 100 characters)` | Name exceeds length limit | Choose shorter name |

#### Template Validation

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `--from-template flag is required` | Missing required template flag | Add `--from-template <template-name>` |
| `Template name contains path traversal attempts` | Template name contains `..` or `/` | Use simple template name |
| `Template name contains invalid characters` | Name contains special characters | Use only letters, numbers, hyphens, underscores |
| `Template name is too long (maximum 255 characters)` | Name exceeds length limit | Choose shorter template name |

#### Repository Validation

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Repository format must be user/repo, a valid URL, or a local path` | Invalid repository format | Use `user/repo`, full URL, or local path |
| `Unsupported protocol: ftp:` | Using unsupported protocol | Use `http:`, `https:`, `git:`, or `ssh:` |
| `Private network URLs are not allowed` | Using localhost or private IP | Use public repository URL |
| `Repository user or name is too long` | GitHub user/repo names too long | Use shorter names |

#### Branch Validation

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Branch name contains invalid characters` | Branch name has spaces or special chars | Use valid git branch name |
| `Branch name contains path traversal attempts` | Branch name contains `..` or invalid slashes | Use simple branch name |
| `Branch name cannot start or end with a dot` | Branch starts/ends with `.` | Choose different branch name |
| `Branch name cannot end with .lock` | Branch ends with `.lock` | Choose different branch name |

#### IDE and Options Validation

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Invalid IDE: "invalid". Supported IDEs: kiro, vscode, cursor, windsurf` | Unsupported IDE specified | Use supported IDE or omit flag |
| `Invalid option name: "invalid@option"` | Option contains invalid characters | Use only letters, numbers, hyphens, underscores |
| `Option name too long: "very-long-option-name..."` | Option name exceeds 50 characters | Use shorter option names |

#### Cache and Logging Validation

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Cache TTL must be between 1 and 720 hours` | TTL outside valid range | Use value between 1-720 hours |
| `Cache TTL must be a valid integer` | Non-numeric TTL value | Provide numeric value |
| `cannot use both --no-cache and --cache-ttl flags together` | Conflicting cache flags | Use either `--no-cache` OR `--cache-ttl` |
| `Log file path contains path traversal attempts` | Log path contains `..` | Use safe log file path |
| `Log file path points to restricted system directory` | Log path in system directory | Use path in user directory |

### Git Operation Errors

**Exit Code:** `1`
**Category:** Git Operations

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Repository not found` | Repository doesn't exist or no access | Check repository URL and permissions |
| `Branch not found in repository` | Specified branch doesn't exist | Check branch name or omit to use default |
| `Authentication failed` | Git credentials not configured | Set up SSH keys or personal access token |
| `Git clone operation timed out` | Network issues or large repository | Check network connection, try again |
| `Failed to access repository: [details]` | General git access failure | Check repository URL, credentials, network |

**Common Git Error Scenarios:**

```bash
# Repository not found
❌ Error: Repository not found.
Please check that:
  1. The repository exists
  2. You have access to it
  3. Your git credentials are configured correctly

# Authentication failed
❌ Error: Authentication failed.
Please ensure your git credentials are configured correctly.
For private repositories, you need to set up:
  - SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
  - Personal Access Token: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

# Network timeout
❌ Error: Git clone operation timed out.
This may be due to:
  • Network connectivity issues
  • Large repository size
  • Repository server being slow or unavailable
  • Firewall or proxy blocking the connection

Please check your network connection and try again.
```

### File System Errors

**Exit Code:** `1`
**Category:** File Operations

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Template not found in the repository` | Template directory doesn't exist | Check template name, use `--list-templates` |
| `Failed to copy template: [details]` | File copy operation failed | Check permissions, disk space |
| `Project directory already exists` | Target directory already exists | Choose different name or remove existing directory |
| `Permission denied` | Insufficient file system permissions | Check directory permissions |
| `No space left on device` | Insufficient disk space | Free up disk space |

### Cache System Errors

**Exit Code:** `1`
**Category:** Cache Operations

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Cache directory permission denied` | Cannot access cache directory | Check `~/.m5nv/cache` permissions or use `--no-cache` |
| `Corrupted cache entry` | Cache entry is corrupted | Tool automatically re-clones, or use `--no-cache` |
| `Cache cleanup failed` | Cannot clean up cache | Check disk space and permissions |

### Setup Script Errors

**Exit Code:** `0` (Warning only)
**Category:** Setup Script Execution

Setup script errors are treated as warnings and don't cause the CLI to exit with error code 1.

| Warning Message | Cause | Resolution |
|-----------------|-------|------------|
| `Setup script execution failed: [details]` | Setup script threw an error | Check setup script code, review logs |
| `Setup script must export a default function` | Setup script has wrong export format | Ensure `export default function setup(env) { ... }` |
| `Setup script not found` | No `_setup.mjs` file (normal) | No action needed - setup scripts are optional |

**Example:**
```bash
⚠️  Warning: Setup script execution failed: Cannot read property 'name' of undefined
Continuing without setup...

✅ Project created successfully!
```

### Preflight Check Errors

**Exit Code:** `1`
**Category:** Environment Validation

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Git is not installed or not in PATH` | Git command not found | Install git and ensure it's in PATH |
| `Node.js version requirement not met` | Unsupported Node.js version | Upgrade to supported Node.js version |
| `Project directory already exists` | Target directory exists | Choose different name or remove directory |

## Environment Variables

The CLI tool doesn't use environment variables for configuration, but setup scripts may access standard environment variables:

| Variable | Usage | Description |
|----------|-------|-------------|
| `NODE_ENV` | Setup scripts | Environment mode (development, production) |
| `PATH` | CLI execution | System PATH for finding git and other tools |
| `HOME` / `USERPROFILE` | Cache location | User home directory for cache storage |

**Note:** The CLI tool itself doesn't read configuration from environment variables. All configuration is done through command-line arguments.

## Logging and Debugging

### Log File Format

When using `--log-file`, the CLI creates detailed logs in JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "operation": "git_clone_start",
  "data": {
    "repoUrl": "user/repo",
    "branchName": "main",
    "noCache": false
  }
}
```

### Common Log Operations

| Operation | Description | Data Fields |
|-----------|-------------|-------------|
| `cli_start` | CLI execution started | `args`, `timestamp` |
| `git_clone_start` | Git clone operation started | `repoUrl`, `branchName`, `noCache` |
| `git_clone_direct` | Direct git clone completed | `repoUrl`, `branchName`, `tempDir` |
| `cache_hit` | Repository found in cache | `repoUrl`, `branchName`, `cachedPath` |
| `cache_miss` | Repository not in cache | `repoUrl`, `branchName` |
| `file_copy_start` | File copy operation started | `templatePath`, `projectDirectory` |
| `file_copy_complete` | File copy completed | `templatePath`, `projectDirectory` |
| `setup_script_start` | Setup script execution started | `setupScriptPath`, `ide`, `options` |
| `setup_script_cleanup` | Setup script cleanup | `setupScriptPath`, `removed` |
| `error` | Error occurred | `error`, `operation`, `context` |

### Debug Information

For troubleshooting, the following information is useful:

- **Node.js version:** `node --version`
- **Git version:** `git --version`
- **CLI version:** `npm list @m5nv/create-scaffold`
- **Cache location:** `~/.m5nv/cache/`
- **Log file:** Specified with `--log-file`

## Troubleshooting Quick Reference

### Common Issues and Solutions

| Problem | Quick Fix |
|---------|-----------|
| "Unknown option" error | Check spelling, use `--help` for valid options |
| "Repository not found" | Verify repository URL, check access permissions |
| "Template not found" | Use `--list-templates` to see available templates |
| "Authentication failed" | Set up git credentials (SSH keys or PAT) |
| "Permission denied" | Check file/directory permissions |
| "Cache issues" | Use `--no-cache` to bypass cache |
| "Network timeout" | Check internet connection, try again |
| "Setup script failed" | Check setup script code, review error message |

### Getting Help

1. **Check help:** `npm create @m5nv/scaffold -- --help`
2. **List templates:** `npm create @m5nv/scaffold -- --list-templates`
3. **Use dry run:** Add `--dry-run` to preview operations
4. **Enable logging:** Add `--log-file debug.log` for detailed logs
5. **Bypass cache:** Add `--no-cache` for fresh repository clone

## Quick Problem-Solution Reference

| Problem Category | Quick Identification | Primary Solution Guide |
|------------------|---------------------|------------------------|
| **Installation Issues** | Can't run CLI tool, git not found | [🚀 Installation Issues](../guides/troubleshooting.md#-installation-and-setup-issues) |
| **Repository Access** | "Repository not found", "Authentication failed" | [🎯 First Use Issues](../guides/troubleshooting.md#-first-use-issues) |
| **Template Problems** | "Template not found", setup script failures | [🔧 Template Issues](../guides/troubleshooting.md#-template-and-setup-script-issues) |
| **Cache/Performance** | Stale data, permission errors, slow operations | [⚡ Advanced Usage Issues](../guides/troubleshooting.md#-advanced-usage-issues) |
| **Network/Timeout** | Clone timeouts, connectivity issues | [⚡ Network Issues](../guides/troubleshooting.md#how-to-fix-network-and-timeout-issues) |

### Community Support Channels

**For immediate help:**
- 📖 [Troubleshooting Guide](../guides/troubleshooting.md) - Step-by-step problem resolution
- 📖 [CLI Reference](cli-reference.md) - Complete parameter documentation

**For community support:**
- 🐛 [GitHub Issues](https://github.com/m5nv/create-scaffold/issues) - Bug reports and feature requests
- 💬 [GitHub Discussions](https://github.com/m5nv/create-scaffold/discussions) - Questions and community help
- 📚 [Documentation](https://github.com/m5nv/create-scaffold/tree/main/docs) - Complete guides and references

**Escalation path for unresolved issues:**
1. Check [troubleshooting guide](../guides/troubleshooting.md) for your specific scenario
2. Search [existing issues](https://github.com/m5nv/create-scaffold/issues) for similar problems
3. Collect [diagnostic information](../guides/troubleshooting.md#diagnostic-information-collection)
4. Create new issue with reproduction steps and system details

## See Also

- [CLI Reference](cli-reference.md) - Complete CLI parameter documentation
- [Troubleshooting Guide](../guides/troubleshooting.md) - Detailed troubleshooting procedures
- [Creating Templates Guide](../how-to/creating-templates.md) - Template creation and setup scripts