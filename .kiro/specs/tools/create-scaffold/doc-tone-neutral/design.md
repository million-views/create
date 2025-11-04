# User-Facing Docs Neutral Tone — Design

## Scope
- Review README.md.
- Review every file under docs/ (all subdirectories), excluding generated assets if any appear.
- For each document, remove or rephrase promotional adjectives, superlatives, or unverifiable claims.
- Replace comparative statements with factual descriptions; avoid direct comparison callouts altogether per guidance.

## Approach
1. Inventory the doc set to understand genre (tutorial/how-to/explanation/reference) so the rewritten tone still aligns with Diátaxis expectations.
2. For each doc:
   - Scan for subjective adjectives (“powerful”, “best”, “blazing”, etc.), for claims without evidence, and for marketing phrasing.
   - Reword to factual, instructional, or descriptive language. Use imperative or declarative sentences matching the doc type.
   - When describing features/differentiators, keep statements grounded (“The CLI caches repositories in `~/.m5nv/cache`”) without comparative language (“better than”, “faster than”).
   - Preserve structure, code samples, and procedural steps; only adjust prose tone unless fixing clarity issues encountered during edits.
3. Spot-check headings to ensure they are descriptive rather than promotional.
4. Ensure updated documents still meet project documentation standards (referencing `.kiro/steering/documentation-standards.md` and Diátaxis guidance).

## Output
- Updated README.md and relevant docs files with neutral tone.
- Task checklist reflecting completion status.
