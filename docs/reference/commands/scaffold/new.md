# scaffold new

Create a new project from a template

## Usage

```bash
scaffold new <project-name> --template <template-name> [options]
```

## Description

Creates a new project by cloning and configuring a template from a registry.
The command fetches the specified template, processes placeholders, and sets up a working project structure.

## Options

### Required

| Option | Description |
|--------|-------------|
| `-T, --template <name>` | Template to use |

Template identifier from a configured registry.
Can be specified as:
  • Short name: react-app
  • Full URL: https://github.com/user/template.git
  • Registry path: official/react-app
  • With branch: workshop/basic-react-spa#feature-branch

### Cache Options

| Option | Description |
|--------|-------------|
| `--no-cache` | Bypass cache system and clone directly |
| `--cache-ttl <hours>` | Override default cache TTL |

Skip local cache and fetch template directly from source

Specify cache time-to-live in hours (default: 24)

### Placeholder Options

| Option | Description |
|--------|-------------|
| `--placeholder <NAME=value>` | Supply placeholder value |
| `--selection <file>` | Use selection.json file for configuration |
| `--yes` | Suppress prompts and non-essential output |

Provide placeholder values in NAME=value format. Can be specified multiple times.

Load template selections and placeholder values from a selection.json file.
The file should conform to the Template Schema V1.0 selection manifest format.
When provided, bypasses interactive prompts and uses the saved configuration.

### Configuration

| Option | Description |
|--------|-------------|
| `--no-config` | Skip loading user configuration |

### Operation Modes

| Option | Description |
|--------|-------------|
| `-d, --dry-run` | Preview changes without executing them |
| `--log-file <path>` | Enable detailed logging to specified file |

## Examples

```bash
# Create React app from template
scaffold new my-app --template react-app

# Use template from specific branch
scaffold new my-app --template workshop/basic-react-spa#feature-branch

# Provide placeholder values
scaffold new my-app --template react-app --placeholder NAME=MyApp

# Use selection file for configuration
scaffold new my-app --template react-app --selection ./selection.json

# Skip cache and fetch fresh
scaffold new my-app --template react-app --no-cache
```

## Notes

First time? Install the package:
  npm install -g @m5nv/create

Then use create-scaffold and make-template commands directly.
