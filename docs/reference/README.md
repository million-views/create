---
title: "Reference Documentation"
description: "Complete technical reference for the @m5nv/create package"
type: reference
audience: "all"
estimated_time: "N/A (reference)"
prerequisites: []
related_docs:
  - "../tutorial/getting-started.md"
  - "../how-to/creating-templates.md"
last_updated: "2025-11-17"
---

# Reference Documentation

Complete technical reference for the `@m5nv/create` package. These documents provide comprehensive, searchable information for quick lookup during development and troubleshooting.

## Available References

### [CLI Reference](cli-reference.md)
Complete command-line interface documentation including all parameters, options, examples, and usage patterns.

**Use when you need to:**
- Look up specific CLI parameters and their types
- Find examples for different usage scenarios
- Understand input validation rules
- Check supported repository formats and options

### [Environment Reference](environment.md)
Detailed documentation of the Environment passed to template setup scripts.

**Use when you need to:**
- Create or modify template setup scripts
- Understand available context in setup scripts
- Implement IDE-specific or option-based customization
- Handle security considerations in templates

### [Template Schema Reference](template-schema.md)
Complete reference for Schema V1.0 (`template.json`). Covers all sections of the template schema including metadata, setup configuration, dimensions, gates, feature specifications, hints, constants, and scaffolding steps.

**Use when you need to:**
- Understand template.json structure and validation rules
- Create or validate template manifests
- Reference dimension definitions and constraints
- Implement advanced template features

## Quick Reference Tables

### Most Common CLI Parameters

| Parameter | Short | Required | Description |
|-----------|-------|----------|-------------|
| `<project-directory>` | - | Yes¹ | Directory name for new project |
| `--template` | `-T` | Yes¹ | Template name or URL to use |
| `--help` | `-h` | No | Show help information |

¹Not required for `list`, `info`, `validate` commands or `--help`

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
- Focus on [Template Schema Reference](template-schema.md) and [Environment Reference](environment.md)
- Use [CLI Reference](cli-reference.md) for testing templates

**Maintainers/Contributors:**
- Review all reference documents
- Use [Error Codes Reference](error-codes.md) for debugging

### By Task

**Creating a new project:**
1. [CLI Reference](cli-reference.md) - Basic usage examples
2. [Error Codes Reference](error-codes.md) - If issues arise

**Creating templates:**
1. [Template Schema Reference](template-schema.md) - Schema structure
2. [Environment Reference](environment.md) - Setup script context
3. [CLI Reference](cli-reference.md) - Testing your templates

**Troubleshooting:**
1. [Error Codes Reference](error-codes.md) - Understand error messages
2. [CLI Reference](cli-reference.md) - Verify correct usage

## Related Documentation

### Learning-Oriented
- [Getting Started Tutorial](../tutorial/getting-started.md) - Step-by-step beginner guide
- [create scaffold Tutorial](../tutorial/scaffold.md) - Create your first project

### Task-Oriented
- [Creating Templates Guide](../how-to/creating-templates.md) - How to create templates
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
