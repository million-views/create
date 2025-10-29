# Template Boundary Alignment — Design

## Problem Decomposition
- **Option Drift**: Tutorials encourage passing arbitrary comma-separated `--options` strings ("auth", "database", "testing") without a shared vocabulary. Template authors receive free-form strings and must infer intent manually, which is brittle.
- **Tooling Disconnect**: make-template aspires to scaffold `_setup.mjs`/`template.json` automatically but lacks clarity on which context fields are guaranteed by create-scaffold. Generated scripts may reference values that do not exist at runtime.
- **Asset Placement Ambiguity**: Guidance references helper calls against `templates/*.tpl` files, yet we do not document the expected location or lifecycle of these assets. Template authors are unsure how to organize reusable snippets versus final outputs.
- **Testing Workflow Unclear**: make-template promotes working within the source project, while docs for create-scaffold imply developers should constantly re-run the CLI to validate options. There is no codified "cut" on when to leave make-template and how to rely on `.template-undo.json`.
- **Template Style Blind Spot**: We treat all templates as programmable, despite a large class of WYSIWYG templates that choose zero runtime customization. Without naming these modes, authors cannot easily decide how much complexity to adopt.

## Design Principles
1. **80/20 defaults** — Provide a small, documented set of dimensions that cover common variations (stack, infrastructure, capabilities, ide). Hard problems remain solvable via escape hatches, but everyday use avoids custom parsing.
2. **Fail-fast contracts** — create-scaffold validates option inputs against template-declared capabilities so authors get immediate feedback. make-template emits metadata in a predictable format, keeping runtime behavior deterministic.
3. **Single Source of Truth** — `template.json` becomes the authoritative catalog for template metadata: supported dimensions, allowed values, defaults, dependencies, conflicts, policy, and handoff notes. Both tools read/write the same schema.
4. **Author-local iteration** — make-template ensures authors can restore and retest their original app without relying on create-scaffold loops. create-scaffold remains the consumer tool but is not required for every authoring edit.
5. **Composable helpers when needed** — `_setup.mjs` stays focused on placeholder replacement and small adjustments. Heavy feature composition is handled structurally (template directories + metadata) rather than bespoke script logic.
6. **Explicit template modes** — Documentation and tooling acknowledge two modes: WYSIWYG (inline testing, minimal runtime options) and Composable (runtime assembly, snippet reuse). Authors choose deliberately and tooling reinforces the trade-offs.

## Proposed Division of Responsibilities

### make-template (Author Tool)
- **Detect & annotate dimensions**: During conversion, detect common axes (e.g., `stack`, `infra`, `capabilities`) and seed `template.json` with defaults. Authors may refine but benefit from generated scaffolding. WYSIWYG templates can disable dimensions entirely.
- **Generate `_setup.mjs` targeting declared dimensions**: Scripts use `tools.options.when()` with the known vocabulary emitted in metadata. make-template never assumes undocumented ctx fields and warns before adding dynamic logic to WYSIWYG templates.
- **Maintain auxiliary assets**: Place reusable `.tpl` files under `__scaffold__/` (new convention) so authors distinguish author-only resources from shipped files. make-template ignores this directory when restoring the app.
- **Provide restore workflow**: Continue emitting `.template-undo.json` and commands to revert template repos into runnable apps. Clarify that create-scaffold is optional for day-to-day iteration.
- **Surface template mode**: `template.json` carries `authoringMode: "wysiwyg" | "composable"` so docs and tooling can tailor guidance (e.g., enabling/disabling certain validators).

### create-scaffold (Consumer Tool)
- **Option validation**: Parse `template.json` and enforce declared dimensions. Unknown values trigger warnings or hard errors based on the dimension’s `policy`.
- **Dependency management**: Honor `requires`, `conflicts`, and `default` declarations per dimension. Resolve defaults automatically when the user omits a dimension; fail fast when requirements are unmet or conflicting selections appear.
- **Option delivery**: Pass normalized options to `_setup.mjs` via `ctx.options.byDimension` while preserving the original raw list as `ctx.options.raw`. Provide helpers (`tools.options.in('capabilities', 'auth')`, `tools.options.require('auth')`, `tools.options.conflictsWith(...)`) for ergonomic access.
- **Metadata enforcement**: Trust `template.json` for handoff instructions, IDE applicability, authoring mode hints, and dimension policies. Fail early when users request dimensions disabled for WYSIWYG templates.
- **Asset filtering**: Never copy directories named `__scaffold__/` or files listed under a forthcoming `setup.ignore` section. Dry-run output reflects filtered content.
- **Audience-specific docs**: Tutorials and references clearly separate operator guidance (create-scaffold) from author guidance (make-template), with cross-links for clarity.

## Runtime Contract for `_setup.mjs`
With no backward-compatibility constraints, we can freeze a lean contract that both tooling stacks honor:

| Field | Guarantee |
|-------|-----------|
| `ctx.projectDir` | Absolute path to the scaffold root (read-only). |
| `ctx.projectName` | Sanitized project name (kebab-case + underscores). |
| `ctx.ide` | Selected IDE preset or `null`. |
| `ctx.authoringMode` | `"wysiwyg"` or `"composable"` as declared in metadata. |
| `ctx.options.byDimension` | Object keyed by dimension; single-valued dimensions store strings, multi-valued store arrays. All defaults applied. |
| `ctx.options.raw` | Original array of option strings supplied on the CLI (post-sanitization). |
| `tools.*` | Helper modules documented in Environment reference; no direct Node imports allowed. |

Anything beyond these fields is considered future extension. make-template emits `_setup.mjs` that only references the guaranteed fields, ensuring scripts remain portable as templates move between repos or versions.

## Template Modes

| Mode | Characteristics | When to choose | Tooling support |
|------|-----------------|----------------|-----------------|
| **WYSIWYG** | Template mirrors a working app; minimal runtime options. Authors iterate inline using make-template’s restore flow. | Teams prioritizing speed and simplicity; single “golden path” scaffolds. | `authoringMode: "wysiwyg"`, `setup.dimensions: {}` by default. create-scaffold still honors `handoff` instructions; `_setup.mjs` limited to placeholder replacement. |
| **Composable** | Template assembles features/options at instantiation using `_setup.mjs` plus snippets under `__scaffold__/`. Requires structured options and validation. | Teams needing multiple stacks/infra/capability combinations from one template repo. | `authoringMode: "composable"`, rich `setup.dimensions`, dependency checks, snippet helpers. make-template scaffolds metadata and warns if restore drift occurs. |

The schema allows templates to move between modes—make-template can prompt authors when enabling dimensions on a WYSIWYG template or when simplifying a composable template back to a fixed shape.

## Option Taxonomy (80/20 baseline)
Introduce canonical dimensions in `template.json.setup.dimensions`. Each dimension entry supports:

| Field | Purpose |
|-------|---------|
| `type` | `single` (choose one) or `multi` (choose many). |
| `values` | Canonical identifiers (kebab-case). |
| `default` | Optional fallback when the user omits the dimension. Defaults apply per dimension. |
| `requires` | Dependency map `{ value: [requirements...] }`. Only relevant for values within the same dimension (e.g., `auth` requires `database`). |
| `conflicts` | Map `{ value: [conflictingValues...] }` indicating combinations that must not coexist (e.g., `cloudflare-d1` conflicts with `cloudflare-turso`). |
| `policy` | `strict` (reject unknown input) or `warn` (notify but continue). |
| `builtIn` | Flag for dimensions owned by create-scaffold (e.g., `ide`). |
| `description` | Human-readable hint for documentation/rendering (optional). |

Example:

```json
{
  "name": "react-vite",
  "description": "React starter with Vite",
  "handoff": ["npm install", "npm run dev"],
  "setup": {
    "authoringMode": "composable",
    "dimensions": {
      "stack": {
        "type": "single",
        "values": ["react-vite", "remix-cf"],
        "default": "react-vite"
      },
      "infrastructure": {
        "type": "single",
        "values": ["cloudflare-d1", "cloudflare-turso", "none"],
        "default": "none",
        "conflicts": {
          "cloudflare-d1": ["cloudflare-turso"],
          "cloudflare-turso": ["cloudflare-d1"]
        }
      },
      "capabilities": {
        "type": "multi",
        "values": ["auth", "database", "testing", "logging"],
        "requires": {
          "auth": ["database"]
        },
        "default": ["logging"],
        "policy": "strict"
      },
      "ide": {
        "type": "single",
        "values": ["kiro", "vscode", "cursor", "windsurf"],
        "default": null,
        "builtIn": true
      }
    }
  }
}
```

CLI syntax stays `--options` but evolves to accept dotted values:
- `--options stack=react-vite,infrastructure=cloudflare-d1,capabilities=auth+testing`
- Shorthand for the default multi dimension remains: `--options auth,testing` maps to `capabilities` when metadata marks it as the catch-all.

### Escape Hatch
Templates may define additional dimensions under `setup.dimensions` with `policy: "warn"` to allow auxiliary strings. create-scaffold surfaces warnings but leaves routing to `_setup.mjs`. Keeps hard things possible without mainstream docs encouraging bespoke vocabularies. WYSIWYG templates can set `setup.dimensions` to `{}` and rely entirely on defaults.

## Template Layout Convention
- Root files are copied verbatim except entries ignored via metadata.
- Author-only resources live under `__scaffold__/` (configurable alias) containing:
  - `_setup.mjs` templates or fragments
  - `.tpl` files for render helpers
  - Documentation assets not meant for end users
- `_setup.mjs` can reference `__scaffold__` via `tools.files.copyTemplateDir('__scaffold__/ide', '.vscode')` etc.
- make-template recognizes and preserves this directory and exposes a toggle when authors choose WYSIWYG mode (to hide unused scaffolding).

## Documentation Realignment
- **create-scaffold tutorials** focus on operators: command usage, selecting stacks/infra/capabilities, interpreting validation feedback, running dry runs.
- **make-template tutorials** shift toward author workflows: converting a project, editing `template.json` dimensions, choosing between WYSIWYG vs Composable, using restore/undo flows, and managing `__scaffold__/`.
- Shared references (Environment, CLI options, schema glossary) move toward a unified source (likely create-scaffold repo) with explicit cross-links into make-template docs.

## Out-of-Scope Considerations
- UI for browsing dimensions (future CLI enhancements).
- Automated migration of legacy templates—greenfield approach only, consistent with roll-forward policy.
- Advanced feature composition (e.g., generating migrations) — deferred until baseline taxonomy is landed.

## Open Question Handling
1. **Reserved option categories** → `ide`, `stack`, `infrastructure`, `capabilities`. Additional dimensions optional.
2. **Feature dependencies** → modeled through `requires` maps in metadata.
3. **Conflict resolution** → Implement `conflicts` at the dimension-value level; decide whether create-scaffold halts or offers suggestions.
4. **Runtime contract** → `ctx` guarantees: `projectName`, `projectDir`, `ide`, `authoringMode`, `options.byDimension`, `options.raw`. make-template only targets these fields.
5. **Author testing workflow** → Documented restore loop using `.template-undo.json`; create-scaffold usage becomes optional pre-release verification step.
6. **Template asset storage** → Standardize on `__scaffold__/` root for helper assets; CLI ignores it when copying.
7. **Doc synchronization** → Introduce shared glossary under `.kiro/steering` and reference it from both repos. Future tasks include automated doc linting.
