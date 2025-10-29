---
title: "Security Features and Best Practices"
type: "explanation"
audience: "all"
estimated_time: "5 minutes read"
prerequisites:
  - "Basic understanding of CLI tools and security concepts"
related_docs:
  - "security-model.md"
  - "../guides/troubleshooting.md"
  - "../tutorial/getting-started.md"
last_updated: "2024-10-26"
---

# Security

Security features and best practices for @m5nv/create-scaffold.

## Built-in Security Features

### Zero Dependencies
- No external runtime dependencies
- Eliminates supply chain attack vectors
- Uses only Node.js built-in modules

### Input Validation
- All user inputs are validated and sanitized
- Path traversal prevention (`../` attacks blocked)
- Repository URL validation prevents malicious redirects
- Branch name validation prevents command injection

### Secure Operations
- Temporary directories use secure creation with proper cleanup
- File operations are bounded to project directories
- Error messages are sanitized to prevent information disclosure
- Git operations use safe argument passing

## Template Security

### Trust Your Sources
Only use templates from repositories you trust:
- Review template repositories before use
- Verify template authors and organizations
- Use official or well-known template sources when possible

### Setup Script Review
Setup scripts run with your permissions:
- Review `_setup.mjs` files before running
- Understand what setup scripts will do
- Setup scripts can modify files and run commands

### Private Templates
For sensitive projects:
- Use private template repositories
- Implement proper access controls
- Audit template changes regularly

## Best Practices

### Repository Management
- Keep template repositories clean and organized
- Use version tags for stable template releases
- Document template purposes and requirements
- Regular security audits of template content

### Access Control
- Use SSH keys instead of passwords
- Rotate access tokens regularly
- Limit repository access to necessary users
- Monitor repository access logs

### Development
- Test templates in isolated environments first
- Use separate repositories for experimental templates
- Implement code review for template changes
- Keep templates minimal and focused

## Security Considerations

### Setup Scripts
Setup scripts have full access to:
- Project directory and files
- System commands and utilities
- Network access (if needed)
- Environment variables

### Mitigation Strategies
- Review setup scripts before execution
- Use templates from trusted sources only
- Run in isolated environments for testing
- Monitor setup script behavior

## Reporting Security Issues

For security vulnerabilities:
- Do not create public issues
- Email security concerns privately
- Include detailed reproduction steps
- Allow time for responsible disclosure

## What's Next

Next steps:

- [Security Model Explained](security-model.md) — Architecture details
- [Troubleshooting Guide](../guides/troubleshooting.md) — Security-related issue handling
- [Getting Started Tutorial](../tutorial/getting-started.md) — Guided introduction with safety checks
