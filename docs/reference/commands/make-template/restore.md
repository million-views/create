# make-template restore

Restore template to project

## Usage

```bash
make-template restore [project-path] [options]
```

## Description

Restore a template back to a working project state.
Replaces placeholders with actual values and restores project structure.
If project-path is omitted, operates on current directory.

## Options

### Restore Scope

| Option | Description |
|--------|-------------|
| `--files <files>` | Restore only specified files (comma-separated) |
| `--placeholders-only` | Restore only placeholder values, keep template structure |

Comma-separated list of file paths to restore

Useful for refreshing placeholder values without affecting template files

### Configuration

| Option | Description |
|--------|-------------|
| `--generate-defaults` | Generate .restore-defaults.json configuration |

Creates a configuration file for default restoration values

### Operation Modes

| Option | Description |
|--------|-------------|
| `-d, --dry-run` | Preview changes without executing them |
| `--yes` | Skip confirmation prompts |
| `--keep-undo` | Preserve .template-undo.json after restoration |

Keeps the undo log file for debugging or re-restoration

## Examples

```bash
# Restore current directory
make-template restore

# Restore template to working state
make-template restore ./my-template

# Preview restoration in current directory
make-template restore --dry-run

# Restore specific files
make-template restore --files package.json,src/index.mts

# Only restore placeholder values
make-template restore --placeholders-only
```

## See Also

- [convert](./convert.md)
- [init](./init.md)
