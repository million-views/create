# Working in This Repository (Kiro Methodology)

**CRITICAL**: The Kiro Methodology is designed for **production development work**. Do NOT apply the full methodology when the user's intent is clearly exploratory, investigative, or emergency-based. Identify the context before triggering the flow.

## Context Recognition Rules
- **Exploratory**: "prototype", "explore", "quick test" → Build lightweight, skip formal specs
- **Investigative**: "debug", "investigate", "strange issue" → Conduct unstructured debugging, apply Kiro only after issue is understood
- **Emergency**: "emergency", "hotfix", "service down" → Deploy immediate fix, formalize later
- **Uncertain?** → **PAUSE and check with human-in-the-loop**

## Task Type Recognition
Different types of work require different methodological approaches:

### Feature Development (Default)
- **Characteristics**: New user-facing functionality, API changes, UI improvements
- **Process**: Full 3-phase spec-driven development (requirements → design → tasks)
- **Location**: `.kiro/specs/<component>/<feature>/`
- **Validation**: Comprehensive testing, documentation updates

### Migration/Integration Work
- **Characteristics**: Repository restructuring, tool integration, dependency updates, data migration
- **Process**: Lightweight planning with clear success criteria, focus on rollback plans
- **Location**: `.kiro/specs/<component>/<migration-name>/`
- **Validation**: Pre/post state verification, rollback testing

### Chore/Maintenance Work
- **Characteristics**: Refactoring, cleanup, dependency updates, build improvements
- **Process**: Task-based tracking with clear acceptance criteria
- **Location**: `.kiro/specs/<component>/<chore-name>/`
- **Validation**: Regression testing, performance benchmarks

### Infrastructure Work
- **Characteristics**: CI/CD changes, deployment automation, environment setup
- **Process**: Infrastructure-as-code principles, change management
- **Location**: `.kiro/specs/infrastructure/<work-name>/`
- **Validation**: Automated testing, monitoring integration

## Repository Type Determination

### Quick Repository Type Check
**Monolith Repository**:
- One main deployable unit (app, service, tool, or library)
- Single `package.json` at repository root
- No package.json files in subdirectories (except node_modules)

**Monorepo Environment**:
- Contains multiple deployable packages/applications
- Multiple `package.json` files in different subdirectories
- Multiple deployment artifacts from same repository
- Shared libraries used across packages
- Uses npm/pnpm workspaces for package management
- Often uses Lerna, Rush, Nx, or similar tooling

### Detection Commands
```bash
# Count package.json files (exclude node_modules)
find . -name "package.json" -not -path "./node_modules/*" | wc -l
# > 1 = likely monorepo

# Check for npm/pnpm workspace configuration
grep -E '"workspaces"' package.json
ls -la | grep -E "pnpm-workspace\.yaml"
```

## Artifact Organization

### Transient & Ephemeral Artifacts
- **Location**: All transient, ephemeral, or temporary artifacts must be created under the `tmp/` folder
- **Purpose**: Keep the repository root clean and avoid committing temporary files
- **Examples**: Test artifacts, build outputs, generated documentation, experimental prototypes
- **Cleanup**: Always implement proper cleanup for temporary artifacts
- **Naming**: Use descriptive names with timestamps when needed (e.g., `tmp/test-run-20241108/`)

### Permanent Repository Structure
- **Code**: Core source code stays in appropriate directories (`bin/`, `lib/`, `src/`, etc.)
- **Tests**: Test files belong in `test/` directory
- **Documentation**: Documentation goes in `docs/` directory
- **Configuration**: Configuration files stay at appropriate levels

## Workflow by Repository Type

### Monolith Workflow
- **Specs**: Flat structure under `.kiro/specs/feature-name/`
- **Coordination**: Work within single codebase
- **Deployment**: Single artifact deployment

### Monorepo Workflow
- **Specs**: Hierarchical structure under `.kiro/specs/{apps,libs,services,tools}/`
- **Coordination**: Cross-package dependencies and shared libraries
- **Deployment**: Multiple artifact coordination using npm/pnpm workspaces

## Default Behavior: When in Doubt
- **If context is unclear or requirements are ambiguous, STOP and consult the human user.**
- **Do not proceed with assumptions**. The cost of clarification is always less than the cost of incorrect implementation.

---

## 1. Work Classification & Planning
- **Identify task type** using the Task Type Recognition rules above
- **Choose appropriate process** based on work characteristics
- **Create appropriate planning artifacts** (specs for features, task lists for chores/migrations)

## 2. Spec-Driven Development (for Feature Work)
- Features begin with a spec under `.kiro/specs/<component>/<feature>/`.
- **Read `docs/spec-driven-development.md`** for complete guidance on creating requirements, design, and implementation plans.
- Author and drive changeset for one or more features in a sprint in 3 phases:
  - Create `requirements.md` and iterate to get approval
  - Create `design.md` and iterate to get approval
  - Create `tasks.md` and iterate to completion:
    - Track progress incrementally: work on ONE task at a time, mark it `[x]` when completed, then move to the next task
    - Use `[ ]` for not started tasks, `[x]` for completed tasks, `[*]` for optional tasks
    - NEVER mark all tasks complete at once - progress must be tracked incrementally through the sprint

## 3. Migration/Integration Workflows
- Migrations and integrations use lightweight planning with emphasis on:
  - Clear success criteria and rollback plans
  - Pre/post state verification
  - Risk assessment and mitigation strategies
  - Stakeholder coordination for cross-team changes

### Pre-Refactoring Preparation Checklist

**Phase 1: Baseline & Impact Assessment**
- [ ] **Run full test suite** - Capture current passing state as baseline
- [ ] **Document current behavior** - Note error messages, validation flows, and edge cases
- [ ] **Identify change scope** - Flag areas affecting: error messages, validation logic, security checks, API contracts
- [ ] **Review test coupling** - Identify tests depending on implementation details vs behavior

**Phase 2: Test Strategy Planning** 
- [ ] **Plan test updates** - For flagged areas, prepare regex patterns or behavioral assertions
- [ ] **Document validation precedence** - Map current error-catching order for security validations
- [ ] **Prepare isolation fixes** - Identify tests needing explicit cleanup or mocking
- [ ] **Create rollback plan** - Know how to revert if tests break unexpectedly

**Phase 3: Execution & Validation**
- [ ] **Immediate post-change testing** - Run full suite after ANY error message or validation changes
- [ ] **Security validation audit** - Confirm attack vectors still covered after validation reordering  
- [ ] **Behavioral regression check** - Ensure improvements don't break intended functionality
- [ ] **Test isolation verification** - No tests depend on implementation artifacts

**Phase 4: Documentation & Handoff**
- [ ] **Update error message inventory** - Track all user-facing messages for future test updates
- [ ] **Document architectural changes** - Validation flows, security boundaries, API contracts
- [ ] **Flag follow-up work** - Any deferred test improvements or documentation updates

**Key Mindset**: Test failures post-refactoring are often signals of *improvement* - investigate before reverting. Use surgical test updates over code rollbacks when possible.

## 2. Strict Test-Driven Development
- Search the codebase for existing patterns before writing new code.
- Write failing tests first (RED), run them to confirm failure, then implement minimal changes to make them pass (GREEN).
- Use the project's test suites (`node test/...`, `npm test`); avoid ad-hoc `node -e`.

## 3. Safety & Source Control
- Do not revert unrelated changes or run destructive git commands (`reset --hard`, `checkout --`, etc.).
- Respect `.kiro/specs/` content created by others unless explicitly instructed.
- Keep implementation isolated to relevant files.

## 4. Documentation & Logging
- Update docs and logs to match new behavior only after functionality is in place.
- Follow documentation standards (avoid maintenance liabilities, keep examples realistic).

## 5. Steering Documents
- **Comprehensive guidance** for implementation details is available in `.kiro/steering/**`:
  - `steering-hierarchy.md` - How to navigate the tiered steering structure
  - `greenfield-development.md` - Development philosophy (universal)
  - `workspace-safety.md` - File operation safety (universal)
  - `security-guidelines.md` - Security requirements (universal)
  - `nodejs-runtime-focus.md` - Node.js runtime requirements (universal)
  - `multi-level-validation.md` - Validation framework (universal)
  - `diataxis-documentation.md` - Documentation framework (universal)
  - `templates/` - Documentation templates (universal)
  - `cli-development-focus.md` - CLI-specific patterns (package-type)
  - `monorepo-coordination.md` - Cross-package coordination (project)
  - `release-orchestration.md` - Multi-package releases (project)
  - `shared-library-specs.md` - Shared library management (project)
  - `sprint-orchestration.md` - Multi-project sprint planning (project)
  - `naming-conventions.md` - Consistent naming patterns
  - `readme-guidelines.md` - README structure and content standards
- **Read `steering-hierarchy.md` first** to understand which standards apply to your context.

## 6. Dependencies & Environment
- Node.js ESM only; prefer built-in modules.
- No external dependencies unless documented.

## 7. Verification & Reporting
- Run appropriate tests before finishing a task.
- Summarize changes clearly, noting files touched and tests executed.
