# @m5nv/create-scaffold

[![npm version](https://badge.fury.io/js/@m5nv%2Fcreate-scaffold.svg)](https://badge.fury.io/js/@m5nv%2Fcreate-scaffold)
[![npm downloads](https://img.shields.io/npm/dm/@m5nv/create-scaffold.svg)](https://www.npmjs.com/package/@m5nv/create-scaffold)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A secure, zero-dependency CLI for scaffolding projects from git-based templates.

## Quick Start

```bash
# Create a basic project
npm create @m5nv/scaffold my-app -- --from-template react-vite

# Create with IDE-specific customization
npm create @m5nv/scaffold my-app -- --from-template react-vite --ide kiro

# Create with specific features enabled
npm create @m5nv/scaffold my-app -- --from-template react-vite --features "auth,database,testing"

# Create with both IDE and features
npm create @m5nv/scaffold my-app -- --from-template react-vite --ide vscode --features "auth,uploads"

# Create from custom repository
npm create @m5nv/scaffold my-api -- --from-template express --repo myorg/templates
```

## Usage

```bash
# Primary usage (recommended)
npm create @m5nv/scaffold <project-name> -- --from-template <template-name> [options]

# Alternative using npx
npx @m5nv/create-scaffold@latest <project-name> --from-template <template-name> [options]
```

### How npm create Works

The `npm create @m5nv/scaffold` command works due to npm's package naming convention:

1. **Command Transformation**: When you run `npm create @m5nv/scaffold`, npm automatically transforms this to `npm exec @m5nv/create-scaffold`
2. **Package Installation**: npm temporarily installs the `@m5nv/create-scaffold` package if not already available
3. **Binary Execution**: npm executes the `create-scaffold` binary defined in the package's `bin` field
4. **Cleanup**: The temporary installation is cleaned up after execution

This pattern allows for a clean, semantic command structure where `npm create @m5nv/scaffold` clearly indicates you're scaffolding a project using Million Views templates.

| Option           | Description                                     |
| ---------------- | ----------------------------------------------- |
| `--from-template, -t` | Template name (required)                        |
| `--repo, -r`     | Repository (default: `million-views/templates`) |
| `--branch, -b`   | Git branch                                      |
| `--ide, -i`      | Target IDE (kiro, vscode, cursor, windsurf)    |
| `--features, -f` | Comma-separated feature list                    |
| `--list-templates` | Display available templates from repository    |
| `--dry-run`      | Preview operations without executing them       |
| `--log-file`     | Enable detailed logging to specified file      |
| `--no-cache`     | Bypass cache system and clone directly         |
| `--cache-ttl`    | Override default cache TTL (1-720 hours)       |
| `--help, -h`     | Show help                                       |

## Examples

### Basic Project Creation

```bash
# Create a simple React project
npm create @m5nv/scaffold my-react-app -- --from-template react-vite

# Create a Node.js API
npm create @m5nv/scaffold my-api -- --from-template express
```

### IDE-Specific Customization

```bash
# Create project optimized for Kiro IDE
npm create @m5nv/scaffold kiro-project -- --from-template react-vite --ide kiro

# Create project with VSCode settings
npm create @m5nv/scaffold vscode-project -- --from-template react-vite --ide vscode

# Create project for Cursor IDE
npm create @m5nv/scaffold cursor-project -- --from-template react-vite --ide cursor

# Create project for Windsurf IDE
npm create @m5nv/scaffold windsurf-project -- --from-template react-vite --ide windsurf
```

### Feature-Based Customization

```bash
# Enable authentication features
npm create @m5nv/scaffold auth-app -- --from-template react-vite --features "auth"

# Enable multiple features
npm create @m5nv/scaffold full-app -- --from-template react-vite --features "auth,database,testing"

# Enable file upload capabilities
npm create @m5nv/scaffold upload-app -- --from-template react-vite --features "file-upload,image-processing"
```

### Combined Usage

```bash
# Create a full-featured project for Kiro IDE
npm create @m5nv/scaffold enterprise-app -- \
  --from-template react-vite \
  --ide kiro \
  --features "auth,database,testing,monitoring"

# Create API with specific IDE and features
npm create @m5nv/scaffold api-server -- \
  --from-template express \
  --ide vscode \
  --features "auth,database,swagger"
```

### Custom Repositories

```bash
# Use your organization's templates
npm create @m5nv/scaffold company-app -- \
  --from-template corporate-react \
  --repo mycompany/project-templates

# Use specific branch
npm create @m5nv/scaffold beta-app -- \
  --from-template react-vite \
  --repo myorg/templates \
  --branch experimental
```

## Phase 1 Core UX Features

Version 0.3 introduces powerful new features for enhanced performance and debugging:

### Template Caching
Dramatically faster operations with local template caching:
```bash
# Automatic caching (24-hour TTL)
npm create @m5nv/scaffold my-app -- --from-template react

# Custom cache TTL (48 hours)
npm create @m5nv/scaffold my-app -- --from-template react --cache-ttl 48

# Bypass cache for latest version
npm create @m5nv/scaffold my-app -- --from-template react --no-cache
```

### Template Discovery
Explore available templates before creating projects:
```bash
# List templates from default repository
npm create @m5nv/scaffold -- --list-templates

# List templates from custom repository
npm create @m5nv/scaffold -- --list-templates --repo user/templates
```

### Dry Run Mode
Preview operations without making changes:
```bash
# Preview what will be created
npm create @m5nv/scaffold my-app -- --from-template react --dry-run

# Combine with logging for detailed analysis
npm create @m5nv/scaffold my-app -- --from-template react --dry-run --log-file preview.log
```

### Detailed Logging
Comprehensive operation tracking for debugging:
```bash
# Enable detailed logging
npm create @m5nv/scaffold my-app -- --from-template react --log-file scaffold.log

# Log template discovery
npm create @m5nv/scaffold -- --list-templates --log-file discovery.log
```

**📖 [Complete Phase 1 Features Documentation](docs/phase-1-features.md)**

## Best Practices

### IDE Selection
- **Kiro**: Choose when using Kiro IDE for enhanced integration and workflow optimization
- **VSCode**: Select for comprehensive VSCode extensions and settings configuration
- **Cursor**: Opt for AI-powered development workflow optimizations
- **Windsurf**: Use for collaborative development environment setup

### Feature Planning
- Start with core features: `auth`, `database`
- Add development tools: `testing`, `linting`, `formatting`
- Include deployment features: `docker`, `ci-cd`
- Consider monitoring: `logging`, `analytics`, `monitoring`

### Template Selection
- Use `react-vite` for modern React applications
- Choose `express` for Node.js APIs
- Select `full-stack` for complete application setups
- Pick `minimal` for lightweight projects

### Security Considerations
- Always review template setup scripts before execution
- Use trusted template repositories
- Keep your CLI tool updated for security patches
- Verify template authenticity when using custom repositories

## Requirements

- Node.js 22+
- Git installed and configured

## Documentation

- [Phase 1 Features](docs/phase-1-features.md) - Caching, logging, discovery, and dry run features
- [Creating Templates](docs/creating-templates.md) - How to build your own template repository
- [Authentication](docs/authentication.md) - Setting up git access for private repositories
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [Security](docs/security.md) - Security features and best practices
- [Development](docs/development.md) - Local development and testing guide
- [Contributing](CONTRIBUTING.md) - How to contribute to the project

## License

MIT
