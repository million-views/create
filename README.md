# @m5nv/create

A secure, zero-dependency CLI for creating projects from git-based templates.

## Quick Start

```bash
# Create a new project
npm create @m5nv/create my-app -- --template react-vite

# With custom repository
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
| `--help, -h`     | Show help                                       |

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
