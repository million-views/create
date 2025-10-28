# Post-Install Next Steps — Requirements

## Context
- After project creation the CLI only prints `cd <projectDir>`, which leaves operators guessing the next logical actions (install dependencies, run scripts, review docs).
- Templates now ship with `template.json` metadata and many use `_setup.mjs` helpers to scaffold runnable projects. Our output should leverage that information.
- User-facing tutorials and guides highlight richer onboarding experiences; the CLI experience should match that guidance.

## Goals
- Enhance the “Next steps” section to provide actionable guidance immediately after scaffolding.
- Automatically detect common follow-up actions (e.g., install dependencies, run `npm run dev`) based on the scaffolded project.
- Allow templates to declare custom next-step instructions via metadata so authors can tailor guidance without modifying the CLI.
- Ensure the output remains concise, readable, and accessible in non-emoji terminals.

## Non-Goals
- Implementing an interactive prompt or wizard after scaffolding.
- Detecting or managing package managers beyond simple heuristics (e.g., no automatic pnpm/yarn detection in this iteration).
- Running post-create commands automatically; we only surface guidance.

## Success Criteria
- Default output lists multiple steps (change directory, install deps, start project) when applicable.
- Templates can specify additional steps in `template.json` (e.g., `nextSteps` array) that render in the CLI output.
- When metadata is absent, reasonable defaults are computed via project inspection (package.json scripts, README presence).
- Documentation (template authoring guide, CLI reference, tutorials) explains how next steps are generated and how authors can customize them.

## Decisions
1. When `template.json` is absent or the template does not ship an `_setup.mjs`, the CLI may inspect `package.json` to infer a sensible default script (for example, surface `npm run dev` when present). Otherwise we rely on template-provided guidance.
2. Templates surface custom instructions via a single-word `handoff` key in `template.json`. When present, this array of strings is rendered verbatim in the “Next steps” section.
3. If `handoff` metadata is missing, the CLI prints the minimal default (`cd <projectDir>` plus “See README.md for additional instructions”). We do not attempt to detect alternative package managers in this iteration.
