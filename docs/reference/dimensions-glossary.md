---
title: "Dimensions Glossary"
type: "reference"
audience: "template-authors"
estimated_time: "5 minutes"
prerequisites:
  - "Read reference/environment.md"
  - "Read creating-templates.md"
related_docs:
  - "../creating-templates.md"
  - "environment.md"
  - "../how-to/author-workflow.md"
last_updated: "2024-11-07"
---

# Dimensions Glossary

Templates declare option vocabularies through `setup.dimensions` in `template.json`. This glossary summarises the reserved dimensions and provides guidance for introducing your own.

## Reserved dimensions

| Name | Type | Description |
|------|------|-------------|
| `ide` | `single` | Populated by create-scaffold when users pass `--ide`. Values include `kiro`, `vscode`, `cursor`, `windsurf`. Mark this dimension with `"builtIn": true` if you mirror it in metadata. |
| `stack` | `single` | Optional hint describing the primary framework (e.g., `react-vite`, `express`, `nextjs`). Useful when a template repository contains multiple stacks. |
| `infrastructure` | `single` | Infrastructure target such as `cloudflare-d1`, `cloudflare-turso`, `none`. Surface defaults to keep scaffolds deterministic. |
| `capabilities` | `multi` | Default multi-select dimension for feature toggles. When present, create-scaffold treats it as the “catch-all” dimension for tokens that do not specify a dimension explicitly. |

## Naming conventions

- Use lowercase identifiers starting with a letter: `^[a-z][a-z0-9_-]{0,49}$`.
- Keep values short (≤ 50 characters) and descriptive: `auth`, `testing`, `observability`.
- Reserve `builtIn: true` for dimensions populated by create-scaffold (`ide`, future CLI flags). Custom dimensions should omit this flag.

## Dependency and conflict patterns

Use `requires` and `conflicts` to keep selections coherent:

```json
"capabilities": {
  "type": "multi",
  "values": ["auth", "testing", "docs"],
  "requires": {
    "testing": ["auth"]
  },
  "conflicts": {
    "docs": ["testing"]
  }
}
```

- `requires` enforces that whenever `testing` is selected, `auth` must also be present.
- `conflicts` prevents `docs` and `testing` from being selected together.
- combine with `policy: "strict"` (default) to fail fast when users pick unsupported values.

## Introducing new dimensions

1. Ensure the dimension aligns with a single authoring concern (e.g., `deployment`, `database`, `frontend`).
2. Provide defaults so users can omit the dimension without surprises.
3. Reference the dimension explicitly in `_setup.mjs` via `tools.options.in('dimension', 'value')`.
4. Update your template README to document available values and how they interact.

By following these conventions, template authors can extend the option taxonomy without surprising create-scaffold operators.
