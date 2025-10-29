# Follow-on Sprint Proposal — Feature Composition

## Objective
Explore higher-level feature composition now that template metadata, tooling, and documentation are aligned. The goal is to make it easy for template authors to express feature bundles (e.g., "api+auth") without duplicating snippets or setup logic.

## Questions to answer
- What common feature bundles exist across current templates (auth + database, api + logging, etc.)?
- Should bundles live purely in metadata (e.g., derived dimensions) or in reusable code modules?
- How do we expose bundle choices to operators without expanding the CLI surface area excessively?
- What guardrails prevent conflicting bundles from being selected together?

## Proposed work items
1. Audit existing templates to catalogue recurring feature combinations.
2. Prototype a `bundles` stanza in `template.json` that expands into dimension selections.
3. Extend `tools.options` with helper(s) for bundle checks (e.g., `tools.options.bundleSelected('secure-api')`).
4. Add dry-run output cues when bundles expand into multiple capabilities.
5. Document author workflow for defining and testing bundles, including migration guidance for existing templates.

## Dependencies & Risks
- Requires collaboration with the make-template team to emit bundle metadata.
- Needs additional validation logic in create-scaffold to avoid ambiguous selections.
- Must remain backwards-compatible with templates that do not declare bundles.

## Exit Criteria
- Approved schema extension for bundle declarations.
- Prototype template demonstrating bundle usage end-to-end.
- Draft documentation outlining author and operator experience.
