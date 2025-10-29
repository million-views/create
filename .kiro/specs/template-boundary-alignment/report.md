# Remaining Items — Template Boundary Alignment

## Pending Task
- **Teach make-template to emit authoring metadata** — Requires changes in the make-template repository to emit `setup.authoringMode`, `setup.authorAssetsDir`, and seed `setup.dimensions` during conversion. The updated brief (make-template-brief.md) outlines the implementation details, but we need the make-template team to schedule and ship the changes. Until then, create-scaffold relies on authors to add the metadata manually.

## Next Steps for Coordination
1. Review the brief with the make-template maintainers and assign ownership for the implementation.
2. Align release timelines so that create-scaffold and make-template updates roll out together.
3. Add cross-repo tests once make-template emits the new metadata to ensure interoperability.
