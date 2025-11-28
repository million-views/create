---
title: "Authentication Setup"
type: "guide"
audience: "intermediate"
estimated_time: "10 minutes"
prerequisites:
  - "Git installed and configured"
  - "Access to git provider (GitHub, GitLab, etc.)"
related_docs:
  - "../tutorial/getting-started.md"
  - "../guides/troubleshooting.md"
  - "../explanation/security.md"
last_updated: "2025-11-12"
---

# Authentication

Setting up git access for private template repositories.

## SSH Keys (Recommended)

Most secure method for accessing private repositories:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to SSH agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub
```

Add the public key to your git provider:
- **GitHub**: Settings → SSH and GPG keys
- **GitLab**: User Settings → SSH Keys
- **Bitbucket**: Personal settings → SSH keys

## Personal Access Tokens

For HTTPS authentication:

```bash
# Configure git to store credentials
git config --global credential.helper store

# First clone will prompt for credentials
# Username: your-username
# Password: your-personal-access-token
```

### Creating Tokens

- **GitHub**: Settings → Developer settings → Personal access tokens
- **GitLab**: User Settings → Access Tokens
- **Bitbucket**: Personal settings → App passwords

Required permissions: Repository read access

## Testing Access

Verify your authentication works:

```bash
# Test SSH
ssh -T git@github.com

# Test repository access
git ls-remote https://github.com/yourorg/private-templates.git
```

## Using Private Templates

Once authenticated, use private repositories normally:

```bash
create scaffold new my-app yourorg/private-templates --template react
```

## Troubleshooting

**Permission denied (publickey)**
- Ensure SSH key is added to SSH agent
- Verify public key is added to your git provider

**Repository not found**
- Check repository name and organization
- Verify you have access to the repository
- Ensure authentication is properly configured

## What's Next

Now that you have authentication set up, you might want to:

- 🎯 **Create your first project**: [Getting Started Tutorial](../tutorial/getting-started.md) - Use your authenticated access
- 🚨 **Resolve auth issues**: [Troubleshooting Guide](../guides/troubleshooting.md) - Fix authentication problems
- 🔒 **Learn about security**: [Security Features](../explanation/security.md) - Understand how authentication fits into our security model
