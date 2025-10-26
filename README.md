# @m5nv/create

A secure, zero-dependency CLI for creating projects from git-based templates.

## Quick Start

```bash
# Create a basic project
npm create @m5nv/create my-app -- --template react-vite

# Create with IDE-specific customization
npm create @m5nv/create my-app -- --template react-vite --ide kiro

# Create with specific features enabled
npm create @m5nv/create my-app -- --template react-vite --features "auth,database,testing"

# Create with both IDE and features
npm create @m5nv/create my-app -- --template react-vite --ide vscode --features "auth,uploads"

# Create from custom repository
npm create @m5nv/create my-api -- --template express --repo myorg/templates
```

## Usage

```bash
# Use latest version (default)
npm create @m5nv/create <project-name> -- --template <template-name> [options]

# Use specific version
npm create @m5nv/create@1.0.0 <project-name> -- --template <template-name> [options]
```

| Option           | Description                                     |
| ---------------- | ----------------------------------------------- |
| `--template, -t` | Template name (required)                        |
| `--repo, -r`     | Repository (default: `million-views/templates`) |
| `--branch, -b`   | Git branch                                      |
| `--ide, -i`      | Target IDE (kiro, vscode, cursor, windsurf)    |
| `--features, -f` | Comma-separated feature list                    |
| `--help, -h`     | Show help                                       |

## Examples

### Basic Project Creation

```bash
# Create a simple React project
npm create @m5nv/create my-react-app -- --template react-vite

# Create a Node.js API
npm create @m5nv/create my-api -- --template express
```

### IDE-Specific Customization

```bash
# Create project optimized for Kiro IDE
npm create @m5nv/create kiro-project -- --template react-vite --ide kiro

# Create project with VSCode settings
npm create @m5nv/create vscode-project -- --template react-vite --ide vscode

# Create project for Cursor IDE
npm create @m5nv/create cursor-project -- --template react-vite --ide cursor

# Create project for Windsurf IDE
npm create @m5nv/create windsurf-project -- --template react-vite --ide windsurf
```

### Feature-Based Customization

```bash
# Enable authentication features
npm create @m5nv/create auth-app -- --template react-vite --features "auth"

# Enable multiple features
npm create @m5nv/create full-app -- --template react-vite --features "auth,database,testing"

# Enable file upload capabilities
npm create @m5nv/create upload-app -- --template react-vite --features "file-upload,image-processing"
```

### Combined Usage

```bash
# Create a full-featured project for Kiro IDE
npm create @m5nv/create enterprise-app -- \
  --template react-vite \
  --ide kiro \
  --features "auth,database,testing,monitoring"

# Create API with specific IDE and features
npm create @m5nv/create api-server -- \
  --template express \
  --ide vscode \
  --features "auth,database,swagger"
```

### Custom Repositories

```bash
# Use your organization's templates
npm create @m5nv/create company-app -- \
  --template corporate-react \
  --repo mycompany/project-templates

# Use specific branch
npm create @m5nv/create beta-app -- \
  --template react-vite \
  --repo myorg/templates \
  --branch experimental
```

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

- [Creating Templates](docs/creating-templates.md) - How to build your own template repository
- [Authentication](docs/authentication.md) - Setting up git access for private repositories
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [Security](docs/security.md) - Security features and best practices
- [Development](docs/development.md) - Local development and testing guide
- [Contributing](CONTRIBUTING.md) - How to contribute to the project

## License

MIT
