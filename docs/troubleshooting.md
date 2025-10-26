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

## Getting Help

```bash
# Display help
npm create @m5nv -- --help

# Check version
npm create @m5nv -- --version
```

## Reporting Issues

When reporting issues, include:
- Command that failed
- Complete error message
- Operating system and Node.js version
- Git version: `git --version`