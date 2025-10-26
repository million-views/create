# Roadmap

Strategic feature development for @m5nv/create-scaffold, prioritized by user impact and implementation complexity.

## Phase 1: Core User Experience (v0.3)

### 1. Template Caching

**Problem:** Repeated clones are slow; other features need fast repository access  
**Solution:** Cache repos in `~/.m5nv/cache` with TTL, `--no-cache` to bypass  
**Impact:** High - **Foundation for all other features**, significant performance improvement

### 2. Detailed Logging

**Problem:** Users can't debug failures or audit what the tool did  
**Solution:** `--log-file path/to/log` writes timestamped operations (git clone, file copy, setup execution, errors)  
**Impact:** High - Essential for production use and troubleshooting

### 3. Template Discovery

**Problem:** Users don't know what templates are available  
**Solution:** `--list-templates` uses cached repo to instantly show templates with descriptions from `template.json` or README frontmatter  
**Impact:** High - Removes biggest user friction point, **fast thanks to caching**

### 4. Dry Run Mode

**Problem:** Users want to preview operations before execution  
**Solution:** `--dry-run` shows planned operations without executing them, **uses cache for fast preview**  
**Impact:** Medium - Builds confidence, especially for CI/CD

## Phase 2: Developer Experience (v.0.4)

### 4. Template Validation

**Problem:** Broken templates waste user time  
**Solution:** `--validate-template` checks structure, setup script syntax, required files before use  
**Impact:** Medium - Prevents frustration, improves template quality

### 5. Configuration File

**Problem:** Teams repeat same repository/branch arguments  
**Solution:** `.m5nvrc` JSON file for default repo, branch, author info  
**Impact:** Medium - Reduces typing, enables team standards

### 6. Interactive Mode

**Problem:** New users don't know command syntax  
**Solution:** `npm create @m5nv/scaffold` (no args) prompts for template selection from available options  
**Impact:** Medium - Lowers barrier to entry

## Phase 3: Advanced Features (v0.5)

### 7. Template Variables

**Problem:** Templates need more customization than just project name  
**Solution:** Support `{{AUTHOR}}`, `{{LICENSE}}`, etc. with prompts or config file values  
**Impact:** Low - Advanced templating for sophisticated use cases

### 8. Multi-Template Projects

**Problem:** Complex projects need multiple templates (frontend + backend)  
**Solution:** `--from-templates frontend,backend` creates multiple directories with orchestrated setup  
**Impact:** Low - Niche use case, high complexity

## Phase 4: Ecosystem (v0.6)

### 10. Template Health Checks

**Problem:** Template quality varies, no validation  
**Solution:** Automated testing of templates (dependencies install, basic commands work)  
**Impact:** Low - Community feature, requires infrastructure

## Implementation Strategy

### Phase 1 Rationale

- **Caching** is foundational infrastructure that accelerates all other features
- **Logging** solves immediate production needs
- **Discovery** removes biggest user barrier and is fast thanks to caching
- **Dry run** builds user confidence and benefits from cached repository access
- All are high-value, with caching being the strategic enabler

### Success Metrics

- **Phase 1:** Reduced support requests, increased template repository usage
- **Phase 2:** Higher user retention, more template repositories created
- **Phase 3:** Power user adoption, enterprise usage
- **Phase 4:** Community ecosystem growth

### Technical Considerations

- Maintain zero external dependencies
- All features must pass comprehensive security review
- Backward compatibility required
- Each feature needs comprehensive test coverage

## Non-Goals

- **GUI Interface** - CLI-first tool
- **Template Hosting** - Use existing git infrastructure
- **Package Management** - Not competing with npm/yarn
- **Build System Integration** - Templates handle their own build setup
