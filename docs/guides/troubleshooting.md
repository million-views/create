---
title: "Troubleshooting Guide"
type: "guide"
audience: "all"
estimated_time: "5-15 minutes per issue"
prerequisites:
  - "Basic familiarity with command line"
  - "@m5nv/create-scaffold installed"
related_docs:
  - "../reference/error-codes.md"
  - "../reference/cli-reference.md"
  - "../tutorial/getting-started.md"
last_updated: "2024-01-15"
---

# Troubleshooting Guide

This guide helps you resolve specific problems when using @m5nv/create-scaffold. Issues are organized by when they typically occur in your workflow.

## Quick Problem Identification

**Use this checklist to quickly identify your issue category:**

- 🚀 **Installation/Setup Issues** - Can't install or run the tool
- 🎯 **First Use Issues** - Tool runs but fails on basic operations
- ⚡ **Advanced Usage Issues** - Problems with caching, logging, or complex scenarios
- 🔧 **Template Issues** - Problems with specific templates or setup scripts

---

## 🚀 Installation and Setup Issues

### How to Fix "Git Not Found" Error

**When this happens:** Running any scaffold command shows `Git is not installed or not available in PATH`

**Diagnostic command:**
```bash
git --version
```

**Expected output:** `git version x.x.x` or similar

**If git is missing, install it:**

```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt install git

# Windows
# Download from https://git-scm.com/download/win
```

**Verify the fix:**
```bash
git --version
npm create @m5nv/scaffold -- --help
```

**Expected result:** Both commands should work without errors.

### How to Fix Node.js Version Issues

**When this happens:** Error message about Node.js version requirements

**Diagnostic command:**
```bash
node --version
```

**Expected output:** A supported Node.js version

**If version is too old:**
1. Visit [nodejs.org](https://nodejs.org) and download the latest LTS version
2. Install the new version
3. Restart your terminal
4. Verify: `node --version`

**See also:** 📖 [CLI Reference](../reference/cli-reference.md)

---

## 🎯 First Use Issues

### How to Fix "Repository Not Found" Error

**When this happens:** `Repository not found` when trying to create a project

**Step 1: Verify repository exists**
```bash
# Test if you can access the repository directly
git ls-remote https://github.com/user/repo
```

**Expected output:** List of git references, or authentication prompt

**Step 2: Check repository format**
Valid formats:
- `user/repo` (GitHub shorthand)
- `https://github.com/user/repo.git` (full URL)
- `git@github.com:user/repo.git` (SSH URL)

**Step 3: Test with a known working repository**
```bash
npm create @m5nv/scaffold test-project -- --from-template basic --from-repo microsoft/vscode-extension-samples
```

**If this works:** Your original repository URL has an issue
**If this fails:** Check your git configuration and network connection

**See also:** 📖 [CLI Reference](../reference/cli-reference.md)

### How to Fix Authentication Issues

**When this happens:** `Authentication failed` or `Permission denied` errors

**For public repositories:**
```bash
# This should work without authentication
npm create @m5nv/scaffold test-project -- --from-template basic --from-repo microsoft/vscode-extension-samples
```

**For private repositories, set up authentication:**

**Option 1: SSH Keys (Recommended)**
```bash
# Test SSH connection
ssh -T git@github.com

# Expected output: "Hi username! You've successfully authenticated..."
```

If SSH fails, [set up SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

**Option 2: Personal Access Token**
```bash
# Configure git to use token
git config --global credential.helper store

# Next git operation will prompt for username/token
```

**Verify authentication works:**
```bash
git clone https://github.com/your-username/your-private-repo.git temp-test
rm -rf temp-test
```

**See also:** 💡 [Security Model](../explanation/security-model.md)

### How to Fix "Template Not Found" Error

**When this happens:** `Template not found in the repository`

**Step 1: List available templates**
```bash
npm create @m5nv/scaffold -- --list-templates --from-repo user/repo
```

**Expected output:** List of available template directories

**Step 2: Check template name exactly**
Template names are case-sensitive and must match directory names exactly.

**Step 3: Verify branch contains template**
```bash
# Check if template exists in specific branch
npm create @m5nv/scaffold -- --list-templates --from-repo user/repo --from-branch feature-branch
```

**Step 4: Use dry run to debug**
```bash
npm create @m5nv/scaffold test-project -- --from-template your-template --from-repo user/repo --dry-run
```

**See also:** 📖 [CLI Reference](../reference/cli-reference.md)

### How to Fix "Directory Already Exists" Error

**When this happens:** `Project directory already exists and is not empty`

**Option 1: Choose different name**
```bash
npm create @m5nv/scaffold my-project-v2 -- --from-template react
```

**Option 2: Remove existing directory**
```bash
# ⚠️ This permanently deletes the directory
rm -rf my-project
npm create @m5nv/scaffold my-project -- --from-template react
```

**Option 3: Backup existing directory**
```bash
mv my-project my-project-backup
npm create @m5nv/scaffold my-project -- --from-template react
```

---

## ⚡ Advanced Usage Issues

### How to Fix Cache Issues

**When this happens:** Cache-related errors or stale template data

**Problem: Cache permission denied**
```bash
# Check cache directory permissions
ls -la ~/.m5nv/cache/

# Expected: Directory should be readable/writable by your user
```

**Solution:**
```bash
# Fix permissions
chmod -R 755 ~/.m5nv/cache/

# Or bypass cache temporarily
npm create @m5nv/scaffold my-project -- --from-template react --no-cache
```

**Problem: Stale cached templates**
```bash
# Force fresh clone
npm create @m5nv/scaffold my-project -- --from-template react --no-cache

# Or set shorter cache TTL
npm create @m5nv/scaffold my-project -- --from-template react --cache-ttl 1
```

**Problem: Corrupted cache**
The tool automatically handles corrupted cache entries, but you can force a refresh:
```bash
npm create @m5nv/scaffold my-project -- --from-template react --no-cache
```

**See also:** 💡 [Caching Strategy](../explanation/caching-strategy.md)

### How to Fix Logging Issues

**When this happens:** Cannot write to log file or invalid log paths

**Problem: Log file permission denied**
```bash
# Use absolute path in your home directory
npm create @m5nv/scaffold my-project -- --from-template react --log-file ~/debug.log

# Check the log was created
ls -la ~/debug.log
```

**Problem: Log directory doesn't exist**
```bash
# Create directory first
mkdir -p ~/logs
npm create @m5nv/scaffold my-project -- --from-template react --log-file ~/logs/scaffold.log
```

**Problem: Invalid log path**
Avoid these patterns:
- Relative paths: `./debug.log` (use absolute paths)
- System directories: `/var/log/debug.log` (use user directories)
- Paths with `..`: `../debug.log` (security restriction)

**See also:** 📖 [CLI Reference](../reference/cli-reference.md)

### How to Fix Network and Timeout Issues

**When this happens:** `Git clone operation timed out` or network errors

**Step 1: Test basic connectivity**
```bash
# Test if you can reach GitHub
ping github.com

# Test git access
git ls-remote https://github.com/microsoft/vscode-extension-samples.git
```

**Step 2: Try with different network**
- Switch from WiFi to ethernet or mobile hotspot
- Try from different location if behind corporate firewall

**Step 3: Use dry run to isolate the issue**
```bash
# This tests repository access without full clone
npm create @m5nv/scaffold test-project -- --from-template basic --from-repo microsoft/vscode-extension-samples --dry-run
```

**Step 4: Check for proxy/firewall issues**
```bash
# Check git proxy settings
git config --global --get http.proxy
git config --global --get https.proxy

# If behind corporate proxy, configure git
git config --global http.proxy http://proxy.company.com:8080
```

---

## 🔧 Template and Setup Script Issues

### How to Fix Setup Script Failures

**When this happens:** `Setup script execution failed` warning appears

**Important:** Setup script failures don't prevent project creation - they're warnings only.

**Step 1: Enable detailed logging**
```bash
npm create @m5nv/scaffold my-project -- --from-template react --log-file ~/setup-debug.log
```

**Step 2: Check the log for details**
```bash
cat ~/setup-debug.log | grep -A 5 -B 5 "setup_script"
```

**Step 3: Common setup script issues**

**Problem: Setup script syntax error**
```javascript
// ❌ Wrong - missing export
function setup(env) { ... }

// ✅ Correct - proper ES module export
export default function setup(env) { ... }
```

**Problem: Setup script runtime error**
Check that the setup script handles missing properties:
```javascript
export default function setup(env) {
  // ✅ Safe property access
  const projectName = env.projectDirectory || 'my-project';
  const ide = env.ide || 'vscode';
}
```

**Step 4: Test setup script independently**
```bash
# Navigate to created project
cd my-project

# Check if _setup.mjs exists and is valid
node -e "import('./template/_setup.mjs').then(m => console.log('Setup script is valid'))"
```

**See also:** 🎯 [Creating Templates Guide](../how-to/creating-templates.md)

### How to Debug Template Structure Issues

**When this happens:** Templates don't work as expected or have missing files

**Step 1: Examine template structure**
```bash
# List templates in repository
npm create @m5nv/scaffold -- --list-templates --from-repo user/repo

# Use dry run to see what would be copied
npm create @m5nv/scaffold test-project -- --from-template your-template --from-repo user/repo --dry-run
```

**Step 2: Check template directory structure**
Expected structure:
```
repository/
├── template-name/
│   ├── files and directories to copy
│   └── _setup.mjs (optional)
└── another-template/
    └── ...
```

**Step 3: Verify template accessibility**
```bash
# Clone repository manually to inspect
git clone https://github.com/user/repo.git temp-inspect
ls -la temp-inspect/template-name/
rm -rf temp-inspect
```

**See also:** 📖 [Creating Templates Guide](../how-to/creating-templates.md) - Template structure and organization

---

## 🆘 Getting Additional Help

### Diagnostic Information Collection

When reporting issues, collect this information:

```bash
# System information
node --version
git --version
npm --version

# CLI version
npm list @m5nv/create-scaffold

# Cache status
ls -la ~/.m5nv/cache/

# Test basic functionality
npm create @m5nv/scaffold test-diagnostic -- --from-template basic --from-repo microsoft/vscode-extension-samples --dry-run
```

### Community Resources

- **GitHub Issues:** [Report bugs and request features](https://github.com/m5nv/create-scaffold/issues)
- **GitHub Discussions:** [Ask questions and share templates](https://github.com/m5nv/create-scaffold/discussions)
- **Documentation:** [Complete reference and guides](https://github.com/m5nv/create-scaffold/tree/main/docs)

### Escalation Path

1. **Check this troubleshooting guide** for your specific issue
2. **Search existing issues** on GitHub for similar problems
3. **Create detailed issue report** with diagnostic information
4. **Include reproduction steps** and expected vs actual behavior

### Emergency Workarounds

If you need to work around persistent issues:

```bash
# Bypass all caching
npm create @m5nv/scaffold my-project -- --from-template react --no-cache

# Use alternative repository format
npm create @m5nv/scaffold my-project -- --from-template react --from-repo https://github.com/user/repo.git

# Clone and copy manually as last resort
git clone https://github.com/user/repo.git temp-manual
cp -r temp-manual/template-name my-project
rm -rf temp-manual
```

**See also:**
- 📖 [Error Codes Reference](../reference/error-codes.md) - Complete error code documentation
- 📖 [CLI Reference](../reference/cli-reference.md) - All command-line options
- 🎯 [Getting Started Tutorial](../tutorial/getting-started.md) - Step-by-step beginner guide