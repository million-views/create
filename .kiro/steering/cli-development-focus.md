---
inclusion: always
---

# CLI Development Focus

## Core Principles

- **CLI-Specific**: Focus on command-line interface patterns, argument parsing, and terminal output
- **Argument Parsing**: Use `util.parseArgs` for robust CLI argument handling
- **Terminal UX**: Clear progress indicators and consistent output formatting

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