# @m5nv/create

Project scaffolding CLI for Million Views template repositories or user-specified git-based template sources. ES Modules only.

## Features

- ESM-only Node.js CLI.
- Fetches templates via `git clone --depth 1`.
- Supports custom template repository: `--repo user/repo`.
- Uses subdirectory-per-template model.
- Optional `_setup.mjs` script for template-specific customization.
- Preflight checks (git availability, argument validation, directory collision).
- Cleans `.git` history before finalizing project folder.
- Automatically removes `_setup.mjs` after it runs (or attempts to run).

## Usage

```bash
# Preferred invocation
npm create @m5nv <project-directory> -- --template <template-name> [--repo <user/repo>] [--branch <branch>] [--force]

# Via npx
npx @m5nv/create@latest <project-directory> --template <template-name> [--repo <user/repo>] [--branch <branch>] [--force]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<project-directory>` | Yes | Directory to create for the new project. |
| `--template <template-name>` | Yes | Subdirectory inside the template repository. |
| `--repo <user/repo>` | No | Override template repository (default: `million-views/templates`). |
| `--branch <branch>` | No | Branch to clone (default: repo default). |
| `--force` | No | Overwrite existing directory if present. |

### Authentication

This tool relies on your local `git` configuration (SSH keys or HTTPS credentials). It does not manage authentication itself. If you need access to private templates, ensure your `git` auth is set up.

### Template Setup Script

If the template includes `_setup.mjs` at its root after copying:
- Executed automatically.
- May export a default function or `run()`; otherwise executed as a standalone Node script with environment variables:
  - `M5NV_PROJECT_PATH`
  - `M5NV_PROJECT_NAME`
  - `M5NV_TEMPLATE_NAME`
  - `M5NV_TEMPLATE_REPO`
  - `M5NV_TEMPLATE_BRANCH`
- After execution (even if it errors), `_setup.mjs` is removed.

Possible tasks:
- Rename files based on project name.
- Replace placeholders like `{{PROJECT_NAME}}`.
- Run `npm install`.
- Print final instructions.

### Roadmap / TODO

- [ ] Replace placeholder smoke test with real template validation.
- [ ] Add colorized output (chalk or ANSI manually) if desired.
- [ ] Implement interactive overwrite prompt (currently `--force` only).
- [ ] Support dry-run mode (`--dry-run`).
- [ ] Add tests (integration with a sample public template repo).
- [ ] Consider templated variable expansion system.
- [ ] Document writing custom `_setup.mjs`.

### License

MIT
