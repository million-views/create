# @m5nv/create

A secure, zero-dependency CLI for creating projects from git-based templates.

## Quick Start

```bash
# Create a new project
npm create @m5nv my-app -- --template react-vite

# With custom repository
npm create @m5nv my-api -- --template express --repo myorg/templates
```

## Usage

```bash
npm create @m5nv <project-name> -- --template <template-name> [options]
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

## Development

```bash
# Run tests
npm test

# Quick validation
npm run test:quick

# Lint code
npm run lint
```

## License

MIT
