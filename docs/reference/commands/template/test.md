# create template test

Test template functionality

## Usage

```bash
create template test <template-path> [options]
```

## Description

Test templates by creating projects and validating functionality.

The testing process:
  • Creates a temporary project from the template
  • Validates template.json structure and metadata
  • Tests placeholder resolution and restoration
  • Verifies setup scripts execute correctly
  • Cleans up temporary files (unless --keep-temp specified)

Use --verbose for detailed output during testing phases.

## Options

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed test output |
| `--keep-temp` | Preserve temporary directories after testing |

## Examples

```bash
# Test template functionality
create template test ./my-template

# Test with detailed output
create template test ./my-template --verbose
```

## See Also

- [validate](./validate.md)
- [convert](./convert.md)
