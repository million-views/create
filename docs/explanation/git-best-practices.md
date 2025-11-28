---
title: "Git Best Practices for Template Development"
description: "Essential Git practices for maintaining clean template repositories and avoiding common pitfalls"
type: explanation
audience: "template-authors"
estimated_time: "8 minutes"
prerequisites:
  - "Familiarity with Git commands"
  - "Understanding of template development workflow"
related_docs:
  - "../how-to/development.md"
  - "../how-to/creating-templates.md"
  - "../how-to/troubleshooting.md"
last_updated: "2025-11-19"
---

# Git Best Practices for Template Development

## Introduction

Clean Git history and proper repository management are essential for template
development. This guide covers proactive practices to maintain repository
hygiene, prevent accidental commits, and ensure templates remain reliable and
secure.

## Core Principles

### Prevention Over Correction

The most effective approach to Git management focuses on preventing issues
rather than fixing them after they occur:

- **Proactive Hygiene**: Set up proper `.gitignore` and workflows from the start
- **Review Before Commit**: Always verify what you're committing
- **Selective Staging**: Use `git add -p` for granular control over changes

### Template-Specific Considerations

Templates have unique requirements that demand careful Git management:

- **Security Boundaries**: Never commit sensitive data or credentials
- **Reproducibility**: Ensure template repositories are clean and predictable
- **Collaboration**: Maintain clear history for template evolution

## Essential Practices

### Repository Setup

#### Comprehensive .gitignore

Start every template repository with a comprehensive `.gitignore`:

```gitignore
# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build outputs
dist/
build/
*.tsbuildinfo

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
Thumbs.db

# Logs and temporary files
*.log
tmp/
temp/

# Environment and secrets
.env
.env.local
.env.*.local

# Template-specific ignores
__scaffold__/
.template-undo.json
```

#### Repository Initialization

```bash
# Initialize with proper setup
git init
echo "node_modules/" > .gitignore
git add .gitignore
git commit -m "Initial commit with .gitignore"
```

### Development Workflow

#### Pre-Commit Verification

Always review changes before committing:

```bash
# See what will be committed
git status
git diff --cached

# For templates, verify no sensitive data
git diff --cached | grep -i "password\|secret\|key\|token"
```

#### Selective Staging

Use interactive staging for precise control:

```bash
# Stage changes interactively
git add -p

# Review staged changes
git diff --cached
```

#### Meaningful Commit Messages

Write clear, descriptive commit messages:

```bash
# Good: Specific and actionable
git commit -m "Add TypeScript configuration for better IDE support"

# Good: Reference template features
git commit -m "Implement placeholder replacement for project metadata"

# Avoid: Vague or unhelpful
git commit -m "Fix stuff"
git commit -m "Update"
```

### Template-Specific Practices

#### Clean Template Commits

When developing templates, maintain clean separation:

```bash
# Work on template logic
git add template.json _setup.mjs
git commit -m "Configure placeholder replacement for API endpoints"

# Work on example content separately
git add src/ README.md
git commit -m "Add example implementation with authentication"
```

#### Version Control for Template Assets

Handle template assets appropriately:

```bash
# For large binary and large assets (if needed)
git lfs install  # Use Git LFS for large files
git lfs track "*.pdf"
git add .gitattributes

# For generated files
echo "dist/" >> .gitignore
echo "build/" >> .gitignore
```

### Security Practices

#### Never Commit Sensitive Data

Implement multiple safeguards:

```bash
# Check for potential secrets before committing
npm install -g git-secrets
git secrets --install
git secrets --register-aws  # Register common secret patterns

# Or use manual checks
git diff --cached | grep -E "(password|secret|key|token)" | head -10
```

#### Environment File Management

Handle environment files securely:

```bash
# Template .env.example (committed)
echo "API_KEY=your-api-key-here" > .env.example
git add .env.example
git commit -m "Add environment configuration template"

# Actual .env (never committed)
cp .env.example .env
# Edit .env with real values
echo ".env" >> .gitignore
```

### Collaboration and Sharing

#### Branch Management

Use branches effectively for template development:

```bash
# Feature branches for template improvements
git checkout -b feature/add-testing-setup
# ... make changes ...
git commit -m "Add Jest configuration for template testing"

# Merge with clean history
git checkout main
git merge feature/add-testing-setup --no-ff
```

#### Template Publishing

When sharing templates publicly:

```bash
# Ensure repository is clean
git gc --prune=now
git repack -a -d

# Verify no sensitive data in history
git log --all --full-history --grep="password\|secret"

# Create clean public version if needed
git clone --mirror . ../template-public.git
cd ../template-public.git
# Remove any sensitive commits if necessary
```

## Common Pitfalls and Solutions

### Accidental File Commits

**Prevention:**

```bash
# Always check what's staged
git status
git diff --cached

# Use .gitignore proactively
echo "tmp/" >> .gitignore
echo "*.tmp" >> .gitignore
```

**If it happens:**

```bash
# Remove from staging without deleting locally
git rm --cached accidental-file.txt

# Amend the commit
git commit --amend --no-edit

# Force push if already pushed (use with caution)
git push --force-with-lease origin main
```

### Large File Management

**Prevention:**

```bash
# Use Git LFS for large assets
git lfs track "*.zip"
git lfs track "*.tar.gz"

# Or exclude large files
echo "*.zip" >> .gitignore
echo "large-assets/" >> .gitignore
```

### Commit Message Quality

**Improvement:**

```bash
# Use conventional commits for templates
git commit -m "feat: add multi-environment configuration support"

# Or detailed messages
git commit -m "Implement conditional asset inclusion

- Add feature gates for different deployment targets
- Include database setup only when required
- Support both SQLite and PostgreSQL configurations"
```

## Template Development Checklist

Before publishing or sharing a template:

- [ ] `.gitignore` is comprehensive and up-to-date
- [ ] No sensitive data in repository history
- [ ] Commit messages are clear and descriptive
- [ ] Repository size is reasonable (consider Git LFS for large assets)
- [ ] All template files are properly organized
- [ ] Documentation is included and accurate
- [ ] Example usage is provided

## Tools and Automation

### Git Hooks for Quality

Set up pre-commit hooks:

```bash
# Install husky for Git hooks
npm install --save-dev husky
npx husky install

# Add pre-commit hook
echo '#!/usr/bin/env sh
npx lint-staged
git diff --cached --name-only | xargs -I {} sh -c "head -1 {} | grep -q \"#!/\" && echo \"Executable bit check passed for {}\" || true"' > .husky/pre-commit
chmod +x .husky/pre-commit
```

### Repository Maintenance

Regular cleanup commands:

```bash
# Clean up repository
git gc --prune=now
git repack -a -d

# Remove untracked files
git clean -fd

# Check repository health
git fsck
```

## Conclusion

Maintaining clean Git repositories for templates requires proactive practices
and attention to detail. By implementing comprehensive `.gitignore` files,
reviewing changes before committing, and following security best practices,
template authors can ensure their repositories remain reliable, secure, and easy
to use.

Remember: the best Git practice is prevention. Setting up proper workflows from
the beginning saves time and prevents issues that are difficult to fix later.
