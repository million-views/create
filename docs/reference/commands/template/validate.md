# create template validate

Validate template.json

## Usage

```bash
create template validate [options]
```

## Description

Validates template.json in the current directory.
Checks for required fields, valid structure, and common issues.

## Options

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Specify input file path |
| `--suggest` | Show intelligent fix suggestions |

Custom path to configuration file

Provide suggestions for fixing validation errors

## Examples

```bash
# Validate template.json in current directory
create template validate template.json

# Validate specific file
create template validate --file my-template.json

# Get fix suggestions
create template validate --file template.json --suggest
```

## See Also

- [init](./init.md)
- [config validate](./config-validate.md)
