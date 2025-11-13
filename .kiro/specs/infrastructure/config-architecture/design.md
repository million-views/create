# Configuration Architecture Design

## Proposed Architecture

```text
~/.m5nv/
├── rc.json          # Shared config for all m5nv products
└── cache/           # Cache directory (existing)

project/
├── .m5nvrc          # Project-specific overrides (optional)
└── ...
```

## Configuration Loading Priority

1. **Project `.m5nvrc`** (highest priority - project overrides)
2. **User `~/.m5nv/rc.json`** (user preferences)
3. **Default registry** `git@github.com:million-views/templates.git` (fallback)

## Shared Config Structure

```json
{
  "create-scaffold": {
    "repo": "https://github.com/user/templates",
    "branch": "main",
    "author": "User Name"
  },
  "registries": {
    "favorites": {
      "express-api": "https://github.com/expressjs/express",
      "react-spa": "https://github.com/facebook/react"
    },
    "company": {
      "backend": "./templates/backend",
      "frontend": "./templates/frontend"
    }
  },
  "other-product": {
    "setting": "value"
  }
}
```

## Backward Compatibility Strategy

- **Existing `~/.config/m5nv/rc.json`**: Document migration path
- **Existing `.m5nvrc` files**: Continue to work as project overrides
- **New installations**: Use `~/.m5nv/rc.json` by default

## Implementation Phases

### Phase 1: Path Changes
- Update `resolveUserConfigPath()` to use `~/.m5nv/rc.json`
- Add fallback to `~/.config/m5nv/rc.json` for migration period

### Phase 2: Default Registry
- Modify `executeListTemplates()` to use default registry when no config exists
- Add `DEFAULT_REGISTRY` constant

### Phase 3: Documentation
- Update help text and examples
- Update README and other docs
- Document migration path for existing users

### Phase 4: Testing
- Test all config loading scenarios
- Test registry fallback behavior
- Verify backward compatibility