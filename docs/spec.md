---
title: "CLI Tool Specification"
type: "reference"
audience: "advanced"
estimated_time: "N/A (reference)"
prerequisites: 
  - "Software development experience"
  - "Understanding of CLI tools and scaffolding"
related_docs: 
  - "spec-driven-development.md"
  - "development.md"
  - "reference/cli-reference.md"
last_updated: "2024-10-26"
---

## Specification: `@m5nv/create-scaffold` Scaffolding Tool

### 1. Overview 📜

`@m5nv/create-scaffold` is a public command-line interface (CLI) tool for scaffolding new software projects using predefined templates. It prioritizes modern JavaScript (ESM only) and leverages the user's local `git` installation for fetching templates. While it defaults to using private templates from the `million-views` organization, it allows users to specify their own public or private template repositories.

  * **Public Package:** `@m5nv/create-scaffold` (on npm)
  * **Source Code Repo (Public, currently private during alpha):** `https://github.com/million-views/create`
  * **Default Template Repo (Private):** `https://github.com/million-views/templates`

-----

### 2. Core Features ✨

  * **Template Fetching via Git:** Uses `git clone --depth 1` to fetch templates, relying on the user's local `git` installation and authentication setup.
  * **Custom Template Repositories:** Users can override the default template source by providing a `--repo` flag.
  * **Subdirectory Templates:** Assumes each template resides in a distinct subdirectory within the template repository.
  * **Template-Specific Setup:** Supports executing an optional setup script (`_setup.mjs`) within the chosen template after copying, allowing for customization (e.g., renaming files, installing dependencies, updating placeholders).
  * **Preflight Checks:** Verifies `git` installation, argument validity, target directory status, and potentially basic auth configuration before proceeding. Fails fast with clear error messages.
  * **Clean Output:** Creates the project directory with only the template files, removing the `.git` history from the template clone.

-----

### 3. Usage (CLI) 💻

The tool will be invoked using `npm create` or `npx`.

```bash
# Using npm create (preferred)
npm create @m5nv <project-directory> -- --from-template <template-name> [--repo <user/repo>] [--branch <branch-name>]

# Using npm create
npm create @m5nv/scaffold <project-directory> -- --from-template <template-name> [--repo <user/repo>] [--branch <branch-name>]

# Using npx
npx @m5nv/create-scaffold@latest <project-directory> --from-template <template-name> [--repo <user/repo>] [--branch <branch-name>]
```

**Arguments:**

  * `<project-directory>`: (Required) The name of the directory to create for the new project.
  * `--from-template <template-name>`: (Required) The name of the subdirectory within the template repository to use.
  * `--repo <user/repo>`: (Optional) Specifies a custom template repository (e.g., `my-github-user/my-private-templates`). Defaults to `million-views/templates`. Accepts standard GitHub `<user>/<repo>` format.
  * `--branch <branch-name>`: (Optional) Specifies a branch within the template repository to clone from. Defaults to the repository's default branch (usually `main`).

-----

### 4. Technology Stack 🛠️
  * **ESM Only:** Built entirely with ES Modules for Node.js (latest stable version as of late 2025). No CommonJS support.
  * **Runtime:** Node.js (latest stable LTS version)
  * **Language:** JavaScript (ES Modules / ESM)
  * **Core Modules:** `child_process`, `fs/promises`, `path`, `url` (`import.meta.url`)
  * **Argument Parsing:** native `process.argv` parsing using `util.parseArgs`
  * **Package Manager:** `npm` (for developing the tool itself)

-----

### 5. Dependencies 🔗

  * **System:** `git` (must be installed and available in the user's PATH).
  * **npm (Development):** Standard Node.js development dependencies (e.g., linters, testing frameworks).
  * **npm (Runtime):** Minimal or zero runtime npm dependencies preferred. Use built-in Node modules where possible.

-----

### 6. Error Handling & Preflight Checks ⚠️

  * Check if `git` command is available. If not, exit with instructions.
  * Validate required arguments (`<project-directory>`, `--from-template`) are provided.
  * Check if `<project-directory>` already exists. Prompt user to overwrite or exit.
  * When cloning, catch errors related to:
      * Repository not found (invalid `--repo` or default repo issue).
      * Authentication failure (user's `git` credentials lack access).
      * Branch not found (invalid `--branch`).
      * Network issues.
  * Verify the specified `<template-name>` subdirectory exists after cloning.
  * Provide clear, user-friendly error messages for all failure points.

-----

### 7. Template Structure & Setup Needs 📁

  * Templates reside as subdirectories within the specified template repository (e.g., `/react-vite`, `/express-api`).
  * After copying the template files, the script **must** look for an optional setup file named `_setup.mjs` within the **root** of the *copied* template directory.
  * Setup scripts run inside the managed sandbox. Each script **must** export a default async function with signature `(ctx, tools)` and may only use the provided helper APIs.
  * The sandbox provides the context (`ctx.projectDir`, `ctx.projectName`, `ctx.ide`, `ctx.options`) and the curated helper toolkit (`tools.placeholders`, `tools.text`, `tools.files`, `tools.json`, `tools.ide`, `tools.options`, `tools.logger`, `tools.templates`).
  * Typical setup responsibilities include:
      * Replacing placeholder tokens such as `{{PROJECT_NAME}}` across files.
      * Moving or generating files based on options/IDE selections.
      * Printing template-specific follow-up steps.

-----

### 8. Authentication 🔑

  * The script **will not** handle authentication directly.
  * It relies entirely on the user's pre-configured local `git` setup (SSH keys, HTTPS PAT via credential manager or environment variables) to access private repositories specified via `--repo` or the default `million-views/templates`.
  * Documentation should clearly state this requirement and link to GitHub's guides on setting up authentication.
