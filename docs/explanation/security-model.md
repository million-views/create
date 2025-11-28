---
title: "Security Model Explained"
description: "Comprehensive security-first approach to template processing and project scaffolding"
type: explanation
audience: "intermediate"
estimated_time: "8 minutes read"
prerequisites:
  - "Basic understanding of CLI tools and security concepts"
  - "Familiarity with git repositories and template systems"
related_docs:
  - "../tutorial/getting-started.md"
  - "../reference/cli-reference.md"
  - "../how-to/template-author-workflow.md"
last_updated: "2025-11-19"
---

# Security Model Explained

## Introduction

@m5nv/create implements a comprehensive security-first approach to template processing and project scaffolding. This security model protects users from common attack vectors while maintaining the flexibility needed for effective template systems. Understanding this model helps you use the tool safely and create secure templates.

## The Problem

Template scaffolding tools face unique security challenges:

- **Arbitrary Code Execution**: Templates could contain malicious setup scripts
- **Path Traversal Attacks**: Malicious templates could write files outside project boundaries
- **Input Injection**: User inputs could be crafted to execute unintended commands
- **Information Disclosure**: Error messages could leak sensitive system information
- **Supply Chain Attacks**: Dependencies or remote templates could be compromised

## Our Approach

We implement a layered security model with multiple security controls that protect against common attack vectors. Our architecture focuses on comprehensive input validation, VM sandbox isolation, and bounded file operations to create a secure scaffolding environment.

### Key Principles

1. **Input Validation First**: Every user input is validated and sanitized before processing
2. **Principle of Least Privilege**: Operations are restricted to the minimum necessary scope
3. **Fail Securely**: When errors occur, the system fails to a safe state without leaking information
4. **User Consent for Execution**: Setup scripts require explicit user understanding and consent
5. **Transparent Security**: Security measures are visible and understandable to users

## How It Works

### Input Sanitization and Validation

Every user input goes through comprehensive validation:

```javascript
// Project names are restricted to safe characters
validateProjectDirectory(projectName) // Only alphanumeric, hyphens, underscores

// Repository URLs are validated against injection attempts
validateRepoUrl(repoUrl) // Prevents malicious redirects and private network access

// Template names prevent directory traversal
validateTemplateName(templateName) // Blocks ../../../etc/passwd attempts

// Branch names follow git naming rules and prevent injection
sanitizeBranchName(branchName) // Blocks command injection via branch names
```

### Path Traversal Prevention

All file operations are bounded to prevent escaping project directories:

- **Directory Traversal Blocking**: `../` sequences are detected and blocked
- **Boundary Validation**: All resolved paths must stay within allowed directories
- **Null Byte Protection**: Null bytes in paths are detected and rejected

### Command Injection Prevention

Git operations and system commands are protected against injection:

- **Parameter Validation**: All git parameters are validated before use
- **Timeout Protection**: Operations have reasonable timeouts to prevent hanging

### Information Disclosure Protection

Error messages are sanitized to prevent information leakage:

```javascript
// Before: "Error: /Users/john/secret-project/.git not found"
// After: "Error: [path] not found"

// Removes: file paths, usernames, IP addresses, tokens, environment variables
```

## Design Decisions

### Decision 1: Comprehensive Input Validation

**Why we chose this:** Every attack vector starts with malicious input. By validating all inputs at the entry point, we prevent entire classes of attacks.

**Trade-offs:**
- **Gained**: Protection against injection, traversal, and malformed input attacks
- **Given up**: Some flexibility in naming conventions and path structures

**Alternatives considered:**
- Partial validation (rejected - leaves attack vectors open)
- Runtime validation only (rejected - allows malicious data to propagate)

### Decision 2: Setup Script Isolation

**Why we chose this:** Setup scripts run in a Node.js VM sandbox with restricted capabilities, blocking access to Node built-ins and dangerous operations.

**Trade-offs:**
- **Gained**: Protection against malicious scripts accessing filesystem, importing modules, or executing arbitrary code
- **Given up**: Flexibility - scripts must use provided tools API instead of Node built-ins

**Alternatives considered:**
- No sandbox (rejected - allows arbitrary code execution)
- Full OS-level sandboxing (rejected - too complex for cross-platform compatibility)

### Decision 3: Error Message Sanitization

**Why we chose this:** Error messages often contain sensitive information that could aid attackers or leak private data.

**Trade-offs:**
- **Gained**: Protection against information disclosure
- **Given up**: Some debugging convenience (though logs can contain full details)

**Alternatives considered:**
- Verbose errors in development mode (rejected - mode detection is unreliable)
- User-configurable verbosity (rejected - increases complexity)

### Decision 4: Cache Security

**Why we chose this:** Cached repositories are stored in user home directories with metadata validation and corruption detection.

**Trade-offs:**
- **Gained**: Corruption detection and automatic recovery through metadata validation
- **Given up**: Some performance - validation adds overhead

**Alternatives considered:**
- System-wide cache (rejected - permission and isolation issues)
- No validation (rejected - allows cache corruption to cause confusing errors)

## Implications

### For Users

- **Safe by Default**: You can use templates from unknown sources with reduced risk
- **Clear Warnings**: Setup script execution is clearly communicated and requires consent
- **Predictable Behavior**: Security restrictions are consistent and documented
- **Error Clarity**: While sanitized, error messages still provide actionable information

### For Template Authors

- **Naming Constraints**: Template and file names must follow security-safe patterns
- **Setup Script Limitations**: Scripts run in VM sandbox and must use provided tools API
- **Path Restrictions**: Templates cannot write files outside the project directory
- **Validation Requirements**: All template metadata must pass validation checks

### For the Ecosystem

- **Trust Model**: Users can safely try templates without full trust relationships
- **Standardization**: Security patterns can be adopted by similar tools
- **Transparency**: Open security model allows community review and improvement
- **Compatibility**: Security measures don't break standard git or npm workflows

## Limitations

Our security model has intentional limitations that users should understand:

1. **Setup Script Trust**: Setup scripts run in a VM sandbox but can still modify your project files through the tools API
2. **Repository Trust**: We validate repository URLs but cannot verify repository content integrity
3. **Network Security**: We rely on git's network security for remote operations
4. **Local System Security**: We cannot protect against compromised local systems or credentials
5. **Template Content**: We validate structure but cannot analyze template file contents for malicious patterns

## Future Considerations

### Planned Enhancements

- **Content Scanning**: Static analysis of template files for suspicious patterns
- **Signature Verification**: Support for signed templates with cryptographic verification
- **Audit Logging**: Detailed security event logging for enterprise environments

### Research Areas

- **Machine Learning Detection**: Automated detection of malicious template patterns
- **Formal Verification**: Mathematical proofs of security properties
- **Zero-Trust Architecture**: Assume all inputs and templates are potentially malicious

## Related Concepts

- **Template System Architecture**: How security integrates with template processing
- **Caching Strategy**: How security affects repository caching and validation
- **IDE Integration Philosophy**: Security considerations in development environment integration

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

### Template Security

#### Trust Your Sources
Only use templates from repositories you trust:
- Review template repositories before use
- Verify template authors and organizations
- Use official or well-known template sources when possible

#### Setup Script Review
Setup scripts run with your permissions:
- Review `_setup.mjs` files before running
- Understand what setup scripts will do
- Setup scripts can modify files and run commands

#### Private Templates
For sensitive projects:
- Use private template repositories
- Implement proper access controls
- Audit template changes regularly

## Reporting Security Issues

For security vulnerabilities:
- Do not create public issues
- Email security concerns privately
- Include detailed reproduction steps
- Allow time for responsible disclosure

## Further Reading

- 📚 [Getting Started Tutorial](../tutorial/getting-started.md) - See security in action
- 🛠️ [Template Author Workflow](../how-to/template-author-workflow.md) - Security considerations for template authors
- 📖 [CLI Reference](../reference/cli-reference.md) - Security-related parameters and options