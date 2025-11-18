# Configuration Architecture Implementation Tasks

## Phase 1: Path Changes ✅
- [x] Update `resolveUserConfigPath()` to prioritize `~/.m5nv/rc.json`
- [x] Add backward compatibility fallback to `~/.config/m5nv/rc.json`
- [x] Test config loading from new location
- [x] Verify existing configs still work

## Phase 2: Default Registry Fallback ✅
- [x] Add `DEFAULT_REGISTRY` constant in index.mjs
- [x] Modify `executeListTemplates()` to use default registry when no user config exists
- [x] Test `--list-templates` with no config shows default registry templates
- [x] Test `--list-templates --registry <name>` still works

## Phase 3: Config Structure Updates ✅
- [x] Update config validation to support product-specific sections
- [x] Ensure registries remain in global scope for backward compatibility
- [x] Test nested config structure loading

## Phase 4: Documentation Updates ✅
- [x] Update help text examples to reference `~/.m5nv/rc.json`
- [x] Update README.md with new config paths
- [x] Add migration guide for existing users
- [x] Update any hardcoded references to old paths

## Phase 5: Testing & Validation ✅
- [x] Test all config loading scenarios (project, user, none)
- [x] Test registry functionality with new paths
- [x] Test template creation with registry aliases
- [x] Verify no regressions in existing functionality
- [x] Test on different platforms (macOS, Linux, Windows)
- [x] Fix dry-run logic for local template paths
- [x] Clean up debug messages
- [x] Update CLI integration tests to match new registry behavior

## Phase 6: Cleanup
- [x] Remove backward compatibility fallbacks after migration period
- [x] Update any remaining documentation references
- [x] Final validation of all functionality
