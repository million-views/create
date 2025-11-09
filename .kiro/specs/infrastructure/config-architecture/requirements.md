# Configuration Architecture Modernization

## Problem Statement

The current configuration system has inconsistencies and limitations:

1. **Path Inconsistencies**: Mix of `.m5nvrc`, `~/.config/m5nv/rc.json`, and `~/.m5nv/cache`
2. **Single-Product Focus**: Configuration is product-specific rather than company-wide
3. **No Default Registry**: `--list-templates` fails silently when no config exists
4. **Documentation Drift**: Docs reference outdated config paths

## Success Criteria

- ✅ Consistent configuration paths under `~/.m5nv/`
- ✅ Shared configuration file for multiple m5nv products
- ✅ Default registry fallback for better UX
- ✅ Backward compatibility maintained
- ✅ Documentation updated to reflect new architecture

## Scope

**In Scope:**
- Change user config location from `~/.config/m5nv/rc.json` to `~/.m5nv/rc.json`
- Add default registry fallback to `git@github.com:million-views/templates.git`
- Update config structure to support multiple products
- Update documentation and help text

**Out of Scope:**
- Breaking changes to existing functionality
- Migration of existing user configs (document manual migration)
- Changes to project-level `.m5nvrc` files

## Constraints

- Must maintain backward compatibility
- Must not break existing installations
- Must follow existing security and validation patterns
- Must update documentation as part of the change