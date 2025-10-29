# Template Boundary Alignment — Requirements

## Context
- Tutorials such as `docs/tutorial/getting-started.md` and `docs/tutorial/first-template.md` instruct operators to pass option bundles like `--options "auth,database,testing"` without explaining how templates should implement and validate those options.
- Authoring guidance in `docs/creating-templates.md` demonstrates helpers like `tools.templates.renderFile('templates/smoke.spec.js.tpl', ...)` without clarifying where supporting assets live or how the runtime treats auxiliary template-only files. The implied workflow leans on @m5nv/create-scaffold for verification, which conflicts with the objective for @m5nv/make-template to keep authors productive within their source projects.
- The @m5nv/make-template spec (v0.1) positions that tool as a converter that discovers placeholders, generates `_setup.mjs`, and produces `template.json`, yet it assumes context values (e.g., `ctx.projectDescription`, `ctx.env.*`) that @m5nv/create-scaffold does not document or guarantee.
- Documentation between the two projects has diverged, leaving ambiguous ownership boundaries for responsibilities such as option vocabulary, feature toggles, testing workflows, and placeholder management.
- We now recognize two valid authoring styles: **WYSIWYG templates** (inline iteration, little to no runtime customization) and **Composable templates** (programmable assembly via `_setup.mjs` and snippets). Each needs purpose-built guidance and metadata support so authors understand trade-offs.

## Goals
- Define a clear division of responsibilities between template authors (make-template) and template consumers (create-scaffold) so each team can execute independently.
- Formalize an option taxonomy that yields deterministic behavior: which option labels the CLI understands globally, which are template-specific, and how unknown options are surfaced.
- Specify how auxiliary resources (e.g., `.tpl` files, documentation scaffolds) are organized so that authors know what lives inside a template versus what tooling generates.
- Document the expected development workflows for both template archetypes—WYSIWYG and Composable—including when to rely on make-template restore versus create-scaffold verification.
- Capture these decisions in updated documentation requirements so future sprints can harmonize tutorials, guides, and references.

## Non-Goals
- Implementing runtime changes to either CLI during this analysis. Engineering work will follow in later sprints.
- Redesigning the helper API surface (e.g., introducing new sandbox primitives) beyond describing ownership expectations.
- Resolving template feature architecture for every possible stack; focus is on establishing repeatable patterns and clear ownership, not authoring concrete templates.

## Success Criteria
- Stakeholders agree on the “cut” that delineates what make-template handles during template authoring versus what create-scaffold guarantees during instantiation.
- A documented option vocabulary exists with guidance on reserved dimensions, template-defined extensions, and validation/feedback loops.
- The location and treatment of template-only assets (e.g., `.tpl` sources, `.template-undo.json`) is unambiguous and consistent across docs.
- Tutorials and guides are mapped to their primary audience (template author vs. template user) with identified gaps ready for iterative updates.
- Requirements capture how WYSIWYG templates are supported (minimal runtime options, inline testing) alongside Composable templates (rich runtime customization, snippet assembly).
- Requirements surface outstanding questions or assumptions that need product input before implementation.

## Key Decisions
1. Reserve global dimensions for `ide`, `stack`, `infrastructure`, and `capabilities`; templates may add more dimensions with explicit policy flags.  
2. Express defaults, requirements, and conflicts declaratively in `template.json.setup.dimensions`, keeping `_setup.mjs` free of bespoke option validation.  
3. Freeze the runtime contract for `_setup.mjs`: `ctx.projectDir`, `ctx.projectName`, `ctx.ide`, `ctx.authoringMode`, `ctx.options.byDimension`, `ctx.options.raw`, plus the documented `tools` helpers.  
4. WYSIWYG authors iterate via make-template restore flows; Composable authors use both restore and create-scaffold dry runs for combination testing.  
5. Adopt `__scaffold__/` as the standard container for author-only assets and ensure both tooling stacks ignore it when generating projects or restoring sources.  
6. Cross-link between repos as needed; each project maintains only the docs required for its own code comprehension even if overlapping tutorials exist elsewhere.  
7. Guide authors to start with WYSIWYG templates and graduate to Composable once comfortable, enhancing recipe docs with clear input/output examples to support the transition.  
