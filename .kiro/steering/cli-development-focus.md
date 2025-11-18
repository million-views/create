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

## CLI Architecture: Command Pattern & Separation of Concerns

### How to Catch Poor Architectural Choices Before Implementation

**Red Flags During Design Phase**
- **Flag Proliferation**: When a single command needs more than 3-4 flags, consider subcommands
- **Mode Switching**: Commands that fundamentally change behavior based on flags (convert vs init vs validate)
- **Mixed Responsibilities**: Single command handling multiple distinct operations
- **Complex Parsing Logic**: Argument parsing that requires extensive conditional logic

**Architecture Review Checklist**
- [ ] Does each command have a single, clear responsibility?
- [ ] Are commands discoverable without reading documentation?
- [ ] Does the command structure follow consistent patterns?
- [ ] Can users intuitively guess command names and usage?
- [ ] Are there fewer than 5 flags per command?
- [ ] Does help text fit on a single screen?

**Early Warning Signs**
- Command classes with complex conditional logic in `run()` method
- Help text that needs extensive examples to explain usage
- Users asking "how do I just do X" when X is buried in flags
- Difficulty explaining what a command does in one sentence

### What Good CLI Architecture Looks and Feels Like

**Command Cohesion & Clarity**
- **Single Purpose Commands**: Each command does one thing exceptionally well
- **Intuitive Naming**: Command names match user mental models (`init`, `validate`, `convert`)
- **Consistent Structure**: All commands follow identical patterns (parse → validate → run)
- **Discoverable**: Users can explore functionality through `--help` without documentation

**Subcommand Organization**
```bash
# Good: Clear hierarchy with related functionality grouped
tool config init        # Initialize configuration
tool config validate    # Validate configuration
tool template convert   # Convert to template
tool template restore   # Restore from template

# Poor: Flags hiding multiple commands
tool convert --init-config    # What does convert mean here?
tool convert --validate-config # Confusing and hard to discover
```

**Help System Integration**
- **Progressive Disclosure**: Basic help shows essentials, detailed help provides depth
- **Context-Aware**: Help shows command-specific options, not global options
- **Usage-Driven**: Help text matches actual usage patterns, not generic templates
- **Examples First**: Real usage examples before detailed option explanations

**User Experience Flow**
```bash
# Intuitive discovery flow
$ tool --help                    # See available commands
$ tool config --help            # See config subcommands
$ tool config init --help       # See specific command help
$ tool config init              # Execute with confidence
```

### When CLI Architecture is Sound

**Single Responsibility Principle**
- ✅ Each command class handles exactly one operation
- ✅ Command logic fits in < 100 lines without complex conditionals
- ✅ No command changes fundamental behavior based on flags
- ✅ Commands can be described in one clear sentence

**Command Pattern Implementation**
- ✅ All commands extend base Command class
- ✅ Consistent `parseArg()` → `run()` flow
- ✅ Help configuration separated from business logic
- ✅ Error handling follows consistent patterns

**User-Centric Design**
- ✅ Commands match user workflows and mental models
- ✅ Functionality is discoverable through exploration
- ✅ Help system provides appropriate information depth
- ✅ Error messages include actionable next steps

**Maintainability Indicators**
- ✅ New commands follow existing patterns without modification
- ✅ Testing is straightforward (one behavior per command)
- ✅ Documentation stays current with implementation
- ✅ Code reviews focus on business logic, not architecture

### Real-World Example: Config Management Refactor

**Before: Poor Architecture**
```javascript
// Single command with multiple modes
class ConvertCommand {
  async run(parsed) {
    if (parsed.initConfig) {
      // Initialize config and exit
    } else if (parsed.validateConfig) {
      // Validate config and exit  
    } else {
      // Do conversion
    }
  }
}
```

**After: Sound Architecture**
```javascript
// Separate commands with single responsibilities
class ConfigInitCommand {
  async run(parsed) {
    // Only initializes config
  }
}

class ConfigValidateCommand {
  async run(parsed) {
    // Only validates config
  }
}

class ConvertCommand {
  async run(parsed) {
    // Only does conversion
  }
}
```

**User Experience Impact**
```bash
# Before: Hard to discover, confusing
$ tool convert --help  # Shows 8+ options, unclear what convert means

# After: Clear, discoverable
$ tool --help          # Shows "config" and "convert" commands
$ tool config --help   # Shows "init" and "validate" subcommands
$ tool config init     # Obvious what this does
```

### Architecture Decision Framework

**When to Use Subcommands**
- Related operations that users think of as a group (`config init`, `config validate`)
- Operations that need similar but distinct option sets
- When flag-based commands would exceed 3-4 flags
- When operations have different success/failure modes

**When to Use Flags**
- Simple boolean options that modify command behavior
- Options that don't change the fundamental operation
- When the command stays focused on its core responsibility
- When users naturally think of the variation as "command with option"

**When to Split into Separate Commands**
- Operations with completely different inputs/outputs
- Commands that users would never run with the same flags
- When conditional logic in `run()` exceeds 10-15 lines
- When help text needs extensive examples to explain usage

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