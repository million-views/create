# User-Facing Docs Neutral Tone — Requirements

## Context
- Project leadership wants user-facing material to communicate with clarity and humility—no hype, unverified superlatives, or marketing fluff.
- Current docs were written over multiple sprints and may contain comparative language, adjectives (“powerful”, “blazing fast”), or claims we cannot substantiate.
- We must still explain why the tool exists and how it differs from alternatives, but through factual, verifiable statements.

## Goals
- Audit every user-facing document (README, tutorial, guides, how-to articles, explanation pages, reference docs aimed at end users) and remove promotional adjectives or unverified claims.
- Rephrase comparative statements so they are evidence-based (cite behaviour, design choices, or measurable facts).
- Ensure tone is consistent: professional, informative, focused on actionable knowledge.
- Keep documentation accurate—no removal of essential guidance while adjusting tone.

## Non-Goals
- Reworking maintainers-only docs (e.g., `docs/how-to/development.md`) unless they contain user-facing sections.
- Expanding feature set or adding new comparisons with other tools.
- Writing formal competitive collateral; scope is limited to tone and factual accuracy inside existing docs.

## Success Criteria
- Each user-facing doc reads neutrally: statements are either descriptive (“The CLI caches repositories in `~/.m5nv/cache`”) or instructional (“Run `npm create …`”).
- Any comparisons to other tooling highlight concrete differences (e.g., caching, private repo support) without qualitative judgments.
- No occurrences of subjective adjectives like “powerful,” “blazing fast,” “best,” or “state-of-the-art” remain.
- Documentation still meets Diátaxis intent (tutorial vs. how-to vs. explanation vs. reference) after edits.

## Decisions
1. Treat `README.md` and the full `docs/` tree (all subdirectories) as user-facing content for this sweep.
2. Describe differentiators in neutral, factual terms without comparative callouts.
