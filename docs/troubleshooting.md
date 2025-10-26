# Troubleshooting

Common issues and solutions when using @m5nv/create-scaffold.

## Git Not Found

**Error:** `Git is not installed or not available in PATH`

**Solutions:**
```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt install git

# Windows
# Download from https://git-scm.com/download/win
```

## Repository Not Found

**Error:** `Repository not found`

**Check:**
- Repository name is correct and exists
- You have access to the repository
- Authentication is configured for private repos
- Repository URL format is valid

## Template Not Found

**Error:** `Template not found in the repository`

**Check:**
- Template name matches subdirectory exactly (case-sensitive)
- Template exists in the specified branch
- Repository was cloned successfully

## Permission Denied

**Error:** `Permission denied` or `Authentication failed`

**Solutions:**
- Set up SSH keys or personal access tokens
- Verify git authentication: `ssh -T git@github.com`
- Check repository access permissions

## Directory Already Exists

**Error:** `Directory already exists and is not empty`

**Solutions:**
- Choose a different project name
- Remove existing directory: `rm -rf project-name`
- Move existing directory to backup location

## Setup Script Fails

**Warning:** `Setup script execution failed`

**Notes:**
- Setup script failures don't stop project creation
- Check setup script syntax and permissions
- Review setup script output for specific errors

## Network Issues

**Error:** `Git clone operation timed out`

**Solutions:**
- Check internet connection
- Try again (temporary network issues)
- Use different network if behind restrictive firewall
- Verify repository server is accessible

## Phase 1 Feature Issues

### Cache Issues

**Error:** `Cache directory permission denied`

**Solutions:**
- Check `~/.m5nv/cache` directory permissions
- Ensure user has write access to home directory
- Use `--no-cache` flag to bypass cache temporarily

**Error:** `Corrupted cache entry`

**Solutions:**
- Tool automatically re-clones corrupted entries
- No manual intervention required
- Use `--no-cache` if automatic recovery fails

**Error:** `Template not found in cached repository`

**Solutions:**
- Use `--no-cache` to get latest repository version
- Verify template name is correct and exists
- Check if template was added after cache creation

### Logging Issues

**Error:** `Cannot write to log file`

**Solutions:**
- Check log file path permissions
- Ensure parent directory exists
- Verify sufficient disk space
- Use absolute path for log file

**Error:** `Log file path invalid`

**Solutions:**
- Use absolute path: `/full/path/to/logfile.log`
- Ensure parent directory exists
- Check path doesn't contain invalid characters

### Template Discovery Issues

**Error:** `No templates found in repository`

**Solutions:**
- Verify repository URL is correct
- Check repository contains template subdirectories
- Ensure branch name is correct
- Try with `--no-cache` for latest version

**Error:** `Repository access denied during discovery`

**Solutions:**
- Check git credentials are configured
- Verify repository permissions
- Test repository access: `git clone <repo-url>`

### Dry Run Issues

**Error:** `Template access failed in dry run mode`

**Solutions:**
- Use `--no-cache` to bypass cache issues
- Verify repository and template exist
- Check network connectivity

**Error:** `Path resolution errors in preview`

**Solutions:**
- Verify project directory path is valid
- Check current directory permissions
- Use absolute path for project directory

## Getting Help

```bash
# Display help with all new features
npm create @m5nv/scaffold -- --help

# List available templates
npm create @m5nv/scaffold -- --list-templates

# Preview operations without executing
npm create @m5nv/scaffold my-app -- --from-template react --dry-run

# Enable detailed logging for debugging
npm create @m5nv/scaffold my-app -- --from-template react --log-file ./debug.log
```

## Reporting Issues

When reporting issues, include:
- Command that failed
- Complete error message
- Operating system and Node.js version
- Git version: `git --version`
- Log file contents (if using `--log-file`)
- Cache directory status: `ls -la ~/.m5nv/cache/`