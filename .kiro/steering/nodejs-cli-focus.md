---
inclusion: always
---

# Node.js CLI Development Focus

## Core Principles

- **ESM Only**: All code must use ES Modules. No CommonJS patterns or require() statements
- **Node.js Built-ins First**: Prefer native Node.js modules over external dependencies
- **CLI-Specific**: Focus on command-line interface patterns, argument parsing, and terminal output
- **Modern JavaScript**: Use latest stable Node.js features (async/await, destructuring, etc.)

## Technology Constraints

### Required Stack

- **Runtime**: Node.js 22+ (latest LTS)
- **Module System**: ES Modules exclusively (`type: "module"` in package.json)
- **Argument Parsing**: `util.parseArgs` (native Node.js) - NOT minimist or yargs
- **File Operations**: `fs/promises` for async file operations
- **Process Management**: `child_process` for spawning git commands

### Forbidden Patterns

- ❌ CommonJS (`require()`, `module.exports`)
- ❌ Heavy external dependencies (prefer zero-dependency approach)
- ❌ Browser-specific APIs or patterns
- ❌ Outdated Node.js patterns (callbacks, sync operations where async available)

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

## CLI Development Methodology

### Test-First Development (Critical)

- **ALWAYS** write comprehensive functional tests FIRST before implementing any CLI functionality
- Write end-to-end tests that cover all CLI arguments, error scenarios, and expected behaviors
- Test all security validations (path traversal, injection prevention) before implementing them
- Create tests for all preflight checks, git operations, and file operations
- This approach saves significant time and tokens by catching issues early and providing clear implementation targets

### Why Test-First for CLI Tools

- CLI tools have complex interaction patterns (arguments, file system, external processes)
- Error scenarios are numerous and critical to handle correctly
- Security validations must be bulletproof from the start
- User experience depends on consistent behavior across all scenarios
- Debugging CLI issues without tests wastes enormous time and effort

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

## Development Task Ordering

### Correct Order for CLI Development

1. **Write comprehensive functional tests first** - Cover all CLI scenarios
2. **Update configuration** - package.json, dependencies
3. **Implement core modules** - Argument parsing, validation, security
4. **Implement operations** - Git, file system, process management
5. **Integration** - Wire everything together in main entry point

### Avoid This Anti-Pattern

- ❌ Implementing functionality first, then writing tests
- ❌ Building modules in isolation without end-to-end validation
- ❌ Fixing issues reactively instead of preventing them with tests

## Success Criteria

A well-built Node.js CLI tool should:

- Start quickly (minimal dependencies)
- Provide clear feedback during operations
- Handle errors gracefully with helpful messages
- Work reliably across different environments
- Follow Node.js and CLI best practices
- Have comprehensive test coverage written before implementation
