---
inclusion: always
---

# CLI Development Focus

## Core Principles

- **CLI-Specific**: Focus on command-line interface patterns, argument parsing, and terminal output
- **Argument Parsing**: Use `util.parseArgs` for robust CLI argument handling
- **Terminal UX**: Clear progress indicators and consistent output formatting

## Superior CLI UX Design Patterns

### Visual Design & Feel

**Progressive Disclosure in Help**
- Help should reveal information in layers: basic usage first, then detailed options
- Command-specific help shows only relevant options for that command
- Help text matches actual usage patterns, not generic templates
- Visual hierarchy with clear sections (USAGE, OPTIONS, EXAMPLES)

**Consistent Visual Language**
- Use emojis strategically for visual cues (🚀 📦 ✅ ❌ ⚠️ 💥)
- Consistent spacing and formatting across all commands
- Clear section headers and visual separators
- Progress indicators for multi-step operations

**Interactive vs Non-Interactive Balance**
- Auto-detect when interactive mode is needed (missing required args)
- Provide clear prompts with sensible defaults
- Allow non-interactive mode for automation and scripting
- Graceful fallback when TTY is not available

### Help System Architecture

**Dual Help Patterns: Both Are Essential**
- `<tool-name> <command> --help`: Quick reference - shows all options at a glance
- `<tool-name> help <command>`: Detailed documentation - comprehensive format with examples

**Pattern Purposes & UX**
- `--help` flag: Immediate discovery, quick reference during usage
- `help` subcommand: Learning mode, comprehensive documentation with context
- Both patterns show the same information but with different presentation depth

**Context-Aware Help**
- `--help` shows command-specific help, not global help
- Help includes actual command name (`@m5nv/tool-name command`)
- Options are grouped by relevance and usage frequency
- Examples show real-world usage patterns

**Progressive Help Depth**
- Basic help: essential usage and common options
- Detailed help: all options with descriptions
- Help integrates with command validation (shows valid options)

### Dry-Run & Preview Patterns

**Safe Experimentation**
- `--dry-run` shows exactly what would happen without making changes
- Clear indication of preview mode in output headers
- Tree view for directory operations when available
- Detailed logging of planned operations

**Preview-First Workflow**
- Dry-run is the default mental model for complex operations
- Users should feel confident running commands after seeing dry-run output
- Clear distinction between preview and actual execution
- Easy transition from dry-run to real execution

**Comprehensive Preview Information**
- File operations: shows copy/move/delete operations
- Git operations: shows clone, checkout, commit plans
- Setup scripts: shows execution plan and environment
- Resource usage: temporary directories, cleanup plans

## CLI Development Guidelines

### Error Handling

- Fail fast with clear, actionable error messages
- Include specific instructions for common issues (git not found, auth failures)
- Use appropriate exit codes (0 for success, 1 for errors)
- Provide context about what went wrong and how to fix it

### User Experience

- Clear progress indicators for long operations (cloning, copying)
- Consistent output formatting with visual cues (✅ ❌ 📦 etc.)
- Help text that matches actual usage patterns
- Graceful handling of edge cases (existing directories, network issues)

### Code Organization

- Single-purpose functions with clear responsibilities
- Async/await throughout (no callback patterns)
- Proper cleanup of temporary resources
- Modular design that's easy to test and maintain

## Implementation Focus Areas

1. **Functional Testing**: Comprehensive end-to-end CLI behavior tests
2. **Argument Parsing**: Use `util.parseArgs` for robust CLI argument handling
3. **Git Integration**: Spawn git processes with proper error handling
4. **File System Operations**: Async file operations with proper error handling
5. **Template Processing**: Directory copying, setup script execution
6. **Process Management**: Clean subprocess handling and cleanup

## Anti-Patterns to Avoid

- Don't build web applications or browser-focused tools
- Don't use heavy frameworks when simple solutions work
- Don't ignore error cases or provide vague error messages
- Don't mix sync and async patterns inconsistently
- Don't create overly complex abstractions for simple CLI operations

## Success Criteria

A well-built Node.js CLI tool should:

- Start quickly (minimal dependencies)
- Provide clear feedback during operations
- Handle errors gracefully with helpful messages
- Work reliably across different environments
- Follow Node.js and CLI best practices
- Have comprehensive test coverage written BEFORE implementation
- Follow strict Test-Driven Development (TDD) methodology