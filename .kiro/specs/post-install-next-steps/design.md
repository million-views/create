# Design Document

## Overview
Enhance the post-scaffold experience by replacing the single `cd <projectDir>` message with richer, template-aware “Next steps”. The CLI will look for a `handoff` array in `template.json` and render its entries. When metadata is missing, we fall back to a concise default that reminds users to inspect the README.

## Flow Changes (bin/index.mjs)
1. **Load template metadata**
   - After verifying the template path, read `<templatePath>/template.json` if it exists.
   - Parse JSON safely; ignore malformed files with a warning (sanitized for users, full detail in logs).
   - Extract `handoff` (array of strings). Only strings are allowed—filter out anything else.
2. **Carry metadata through scaffolding**
   - Store the parsed `handoff` instructions before copying files (metadata may be removed if `_setup.mjs` does cleanup).
3. **Render Next Steps**
   - Replace the fixed block with:
     - Always print `cd <projectDir>`.
     - If `handoff` contains entries, print them (one per line, prefixed with `•` and a space for readability; ensure pure ASCII fallback).
     - Otherwise, print a single fallback message: `• Review README.md for additional instructions`.
   - Keep output stable for non-emoji terminals (use plain bullets).
4. **Logging**
   - When a logger is active, log the resolved handoff instructions (`logger.logOperation('handoff_instructions', …)`).

## Metadata Contract
Template authors can add:

```json
{
  "name": "vite-react",
  "description": "Modern React starter",
  "handoff": [
    "npm install",
    "npm run dev",
    "Open README.md for IDE-specific tips"
  ],
  "setup": {
    "supportedOptions": ["docs"]
  }
}
```

Rules:
- `handoff` must be an array of non-empty strings.
- Empty or invalid entries are discarded silently.
- If the array is empty after validation, we fall back to the default message.

## Documentation Updates
1. **docs/how-to/creating-templates.md** – Introduce the `handoff` field under template metadata guidance and advise authors to list the most helpful commands.
2. **docs/reference/cli-reference.md** – Document how the CLI determines the “Next steps” block and mention the `handoff` metadata.
3. **docs/phase-1-features.md** – Update template metadata section to include the new key.
4. **docs/tutorial/getting-started.md** and **docs/tutorial/first-template.md** – Adjust screenshots/snippets of CLI output to reflect richer next steps.

## Test Strategy
- **Unit/Integration** (`test/cli.test.mjs`): scaffold using fixtures with and without `handoff`, assert the console output.
- **Fixtures**: Add `handoff` arrays to existing demo templates where appropriate.
- **Snapshot/Log**: Ensure log output captures handoff data when logging is enabled.

## Edge Cases
- Missing `template.json` → default fallback (cd + README reminder).
- Malformed JSON → warn (sanitized), keep fallback.
- Mixed-type arrays → filter to strings; if none remain, fallback.

## Non-Goals (restated)
- No automatic command execution.
- No detection of alternate package managers in this iteration.
- No interactive prompts post-scaffold.
