# @m5nv/create

A CLI tool for scaffolding new software projects using predefined templates.

## Features

- ✨ **ESM Only**: Built entirely with modern ES Modules
- 🔧 **Git-based**: Uses your local git installation for fetching templates
- 🔐 **Authentication**: Leverages your existing git credentials (SSH/HTTPS)
- 📦 **Flexible**: Supports custom template repositories
- ⚙️ **Customizable**: Templates can include setup scripts for post-creation tasks
- 🎯 **Clean**: Creates projects without template git history

## Prerequisites

- Node.js 20.0.0 or higher
- Git installed and configured

## Installation

You can use this tool without installation via `npm create` or `npx`:

```bash
# Using npm create (preferred)
npm create @m5nv <project-directory> -- --template <template-name>

# Using npx
npx @m5nv/create@latest <project-directory> --template <template-name>
```

## Usage

### Basic Usage

Create a project using the default template repository:

```bash
npm create @m5nv my-app -- --template react-vite
```

### Custom Repository

Use a custom template repository:

```bash
npm create @m5nv my-app -- --template express-api --repo myuser/my-templates
```

### Specific Branch

Clone from a specific branch:

```bash
npm create @m5nv my-app -- --template react-vite --branch develop
```

### Full Example

```bash
npm create @m5nv my-backend -- \
  --template express-api \
  --repo company/private-templates \
  --branch main
```

## Command Line Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `<project-directory>` | ✅ | Name of the directory to create | - |
| `--template <name>` | ✅ | Template subdirectory to use | - |
| `--repo <user/repo>` | ❌ | Custom template repository | `million-views/templates` |
| `--branch <name>` | ❌ | Branch to clone from | Repository's default branch |

## Authentication

This tool relies on your local git configuration for authentication. For private repositories, you'll need to set up one of the following:

### SSH (Recommended)

```bash
# Set up SSH keys
ssh-keygen -t ed25519 -C "your_email@example.com"
# Add key to GitHub: https://github.com/settings/keys
```

### Personal Access Token (HTTPS)

```bash
# Configure git credential helper
git config --global credential.helper store
# Then clone any repo and enter your PAT when prompted
```

For more information:
- [GitHub SSH Setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

## Template Structure

Templates are organized as subdirectories within a template repository:

```
my-templates/
├── react-vite/
│   ├── package.json
│   ├── src/
│   └── _setup.mjs (optional)
├── express-api/
│   ├── package.json
│   ├── src/
│   └── _setup.mjs (optional)
└── ...
```

### Setup Scripts

Templates can include an optional `_setup.mjs` file in their root directory. This script runs after the template is copied and receives context about the project:

```javascript
// _setup.mjs
import fs from 'fs/promises';
import path from 'path';

export default async function setup({ projectDirectory, projectName }) {
  // Replace placeholders in package.json
  const pkgPath = path.join(projectDirectory, 'package.json');
  let content = await fs.readFile(pkgPath, 'utf-8');
  content = content.replace(/{{PROJECT_NAME}}/g, projectName);
  await fs.writeFile(pkgPath, content);
  
  console.log('  ✓ Setup complete!');
}
```

The setup script:
- Receives `{ projectDirectory, projectName, cwd }` as parameters
- Can be async
- Is automatically removed after execution
- Should export a default function or a named `setup` function

## Error Handling

The tool provides clear error messages for common issues:

- ❌ Git not installed
- ❌ Missing required arguments
- ❌ Directory already exists
- ❌ Repository not found
- ❌ Authentication failure
- ❌ Branch not found
- ❌ Template not found

## Examples

### Create from Default Repository

```bash
npm create @m5nv my-react-app -- --template react-vite
cd my-react-app
npm install
npm run dev
```

### Create from Custom Repository

```bash
npm create @m5nv my-api -- --template express-api --repo acme/templates
cd my-api
npm install
npm start
```

### Create from Specific Branch

```bash
npm create @m5nv my-app -- --template beta-template --branch experimental
```

## Development

```bash
# Clone the repository
git clone https://github.com/million-views/create.git
cd create

# Install dependencies
npm install

# Test locally
node bin/index.mjs test-project --template basic-template --repo path/to/templates
```

## License

MIT
