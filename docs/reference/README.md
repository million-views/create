---
title: "Reference Documentation"
type: "reference"
audience: "all"
estimated_time: "N/A (reference)"
prerequisites: []
related_docs: 
  - "../tutorial/getting-started.md"
  - "../creating-templates.md"
last_updated: "2024-01-15"
---

# Reference Documentation

Complete technical reference for the `@m5nv/create-scaffold` CLI tool. These documents provide comprehensive, searchable information for quick lookup during development and troubleshooting.

## Available References

### [CLI Reference](cli-reference.md)
Complete command-line interface documentation including all parameters, options, examples, and usage patterns.

**Use when you need to:**
- Look up specific CLI parameters and their types
- Find examples for different usage scenarios
- Understand input validation rules
- Check supported repository formats and options

### [Environment Object Reference](environment-object.md)
Detailed documentation of the Environment Object passed to template setup scripts.

**Use when you need to:**
- Create or modify template setup scripts
- Understand available context in setup scripts
- Implement IDE-specific or option-based customization
- Handle security considerations in templates

### [Error Codes Reference](error-codes.md)
Complete listing of exit codes, error messages, and troubleshooting information.

**Use when you need to:**
- Understand what specific error messages mean
- Troubleshoot CLI execution problems
- Debug git, file system, or validation issues
- Interpret log file contents

## Quick Reference Tables

### Most Common CLI Parameters

| Parameter | Short | Required | Description |
|-----------|-------|----------|-------------|
| `<project-directory>` | - | Yes* | Directory name for new project |
| `--from-template` | `-t` | Yes* | Template name to use |
| `--repo` | `-r` | No | Repository URL (default: million-views/templates) |
| `--ide` | `-i` | No | Target IDE (kiro, vscode, cursor, windsurf) |
| `--options` | `-o` | No | Comma-separated contextual options |
| `--help` | `-h` | No | Show help information |

*Not required for `--list-templates` or `--help`

### Most Common Exit Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `0` | Success | Normal completion, help shown, dry run completed |
| `1` | Error | Invalid arguments, git failures, file system errors |

### Most Common Options

| Option | Description | Use Case |
|--------|-------------|----------|
| `typescript` | TypeScript configuration | TypeScript projects |
| `monorepo` | Monorepo structure | Part of larger workspace |
| `no-git` | Skip git initialization | Existing git repository |
| `minimal` | Minimal dependencies | Lightweight setup |
| `testing-focused` | Comprehensive test setup | Test-driven development |

## Navigation

### By User Type

**End Users (using templates):**
- Start with [CLI Reference](cli-reference.md)
- Check [Error Codes Reference](error-codes.md) for troubleshooting

**Template Authors (creating templates):**
- Focus on [Environment Object Reference](environment-object.md)
- Use [CLI Reference](cli-reference.md) for testing templates

**Maintainers/Contributors:**
- Review all reference documents
- Use [Error Codes Reference](error-codes.md) for debugging

### By Task

**Creating a new project:**
1. [CLI Reference](cli-reference.md) - Basic usage examples
2. [Error Codes Reference](error-codes.md) - If issues arise

**Creating templates:**
1. [Environment Object Reference](environment-object.md) - Setup script context
2. [CLI Reference](cli-reference.md) - Testing your templates

**Troubleshooting:**
1. [Error Codes Reference](error-codes.md) - Understand error messages
2. [CLI Reference](cli-reference.md) - Verify correct usage

## Related Documentation

### Learning-Oriented
- [Getting Started Tutorial](../tutorial/getting-started.md) - Step-by-step beginner guide
- [First Template Tutorial](../tutorial/first-template.md) - Create your first template

### Task-Oriented
- [Creating Templates Guide](../creating-templates.md) - How to create templates
- [Troubleshooting Guide](../guides/troubleshooting.md) - Problem-solving procedures

### Understanding-Oriented
- [Security Model Explanation](../explanation/security-model.md) - Why security matters
- [Template System Explanation](../explanation/template-system.md) - How templates work

## Search Tips

These reference documents are optimized for quick lookup:

- **Use Ctrl+F** to search within documents
- **Parameter tables** are scannable for quick reference
- **Examples sections** show real usage patterns
- **Cross-references** link related information
- **Error message tables** help identify specific issues

## Feedback

Found an error or missing information in the reference documentation? Please [open an issue](https://github.com/million-views/create/issues) with:

- Document name and section
- What information is incorrect or missing
- Suggested correction or addition

Reference documentation is kept up-to-date with each release to ensure accuracy.