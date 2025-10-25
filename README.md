# @m5nv/create

A secure, zero-dependency project scaffolding CLI that creates new projects from git-based template repositories. Built with ES Modules and modern Node.js practices.

## Features

- **Zero Dependencies**: Uses only Node.js built-in modules for maximum security and minimal attack surface
- **Git-Based Templates**: Fetches templates via `git clone --depth 1` from any accessible git repository
- **Flexible Repository Support**: Works with GitHub, GitLab, Bitbucket, or any git repository (public or private)
- **Subdirectory Templates**: Each template lives in its own subdirectory within the template repository
- **Setup Script Automation**: Optional `_setup.mjs` scripts for post-copy customization and project initialization
- **Comprehensive Security**: Input validation, path traversal prevention, and secure temporary directory handling
- **Preflight Validation**: Checks git availability, argument validation, directory conflicts, and repository accessibility
- **Clean Output**: Automatically removes `.git` history and setup scripts from generated projects
- **Native Argument Parsing**: Uses Node.js `util.parseArgs` instead of external dependencies

## Installation

```bash
# Install globally
npm install -g @m5nv/create

# Or use directly without installation
npx @m5nv/create@latest
```

## Usage

```bash
# Using npm create (recommended)
npm create @m5nv <project-directory> -- --template <template-name>

# Using npx
npx @m5nv/create@latest <project-directory> --template <template-name>

# With custom repository
npm create @m5nv my-app -- --template react-vite --repo myorg/templates

# With specific branch
npm create @m5nv my-api -- --template express-api --repo myorg/templates --branch v2
```

### Arguments

| Argument              | Alias | Required | Description                                              |
| --------------------- | ----- | -------- | -------------------------------------------------------- |
| `<project-directory>` | -     | ✅       | Directory name to create for the new project             |
| `--template <name>`   | `-t`  | ✅       | Template subdirectory name within the repository         |
| `--repo <user/repo>`  | `-r`  | ❌       | Git repository (default: `million-views/templates`)      |
| `--branch <name>`     | `-b`  | ❌       | Git branch to clone (default: repository default branch) |
| `--help`              | `-h`  | ❌       | Display help information                                 |

### Examples

```bash
# Create a React project from default templates
npm create @m5nv my-react-app -- --template react-vite

# Create from your organization's templates
npm create @m5nv my-project -- --template nextjs --repo mycompany/project-templates

# Use a specific branch for beta templates
npm create @m5nv beta-app -- --template experimental --repo myorg/templates --branch beta

# Create from a private repository (requires git authentication)
npm create @m5nv private-app -- --template internal --repo myorg/private-templates

# Use short aliases
npm create @m5nv my-app -- -t react -r myorg/templates -b main
```

## Creating Your Own Template Repository

### Repository Structure

A template repository should follow this structure, with each template in its own subdirectory:

```
your-templates/
├── README.md
├── react-vite/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   └── components/
│   └── _setup.mjs              # Optional setup script
├── nextjs-app/
│   ├── package.json
│   ├── next.config.js
│   ├── pages/
│   │   ├── index.js
│   │   └── api/
│   ├── components/
│   └── _setup.mjs
├── express-api/
│   ├── package.json
│   ├── server.js
│   ├── routes/
│   ├── middleware/
│   └── _setup.mjs
└── vanilla-js/
    ├── package.json
    ├── index.html
    ├── src/
    │   ├── main.js
    │   └── styles.css
    └── _setup.mjs
```

### Template Guidelines

1. **Each template is a complete project** ready to be copied
2. **Template names** should be descriptive and use kebab-case
3. **No nested templates** - keep templates at the root level of subdirectories
4. **Include a package.json** for Node.js projects with appropriate dependencies
5. **Add a \_setup.mjs** for any post-copy customization needed

### Setup Script (`_setup.mjs`)

The setup script runs after the template is copied and receives project context:

```javascript
// _setup.mjs example
export default function setup({ projectDirectory, projectName, cwd }) {
  console.log(`Setting up ${projectName} in ${projectDirectory}`);

  // Example: Replace placeholders in files
  import("fs").then((fs) => {
    const packagePath = `${projectDirectory}/package.json`;
    let packageJson = fs.readFileSync(packagePath, "utf8");
    packageJson = packageJson.replace("{{PROJECT_NAME}}", projectName);
    fs.writeFileSync(packagePath, packageJson);

    console.log("✅ Project setup complete!");
    console.log(`Next steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm install`);
    console.log(`  npm run dev`);
  });
}
```

### Example Template Repository

Here's a complete example of a simple template repository:

```
my-templates/
├── README.md
└── react-starter/
    ├── package.json
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   └── App.jsx
    └── _setup.mjs
```

**package.json:**

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0"
  }
}
```

**\_setup.mjs:**

```javascript
export default function setup({ projectDirectory, projectName }) {
  import("fs").then((fs) => {
    // Replace project name placeholder
    const packagePath = `${projectDirectory}/package.json`;
    let content = fs.readFileSync(packagePath, "utf8");
    content = content.replace("{{PROJECT_NAME}}", projectName);
    fs.writeFileSync(packagePath, content);

    console.log(`✅ ${projectName} is ready!`);
    console.log(`Next steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm install`);
    console.log(`  npm run dev`);
  });
}
```

### Using Your Template Repository

Once you've created your template repository:

```bash
# Use your templates
npm create @m5nv my-project -- --template react-starter --repo yourusername/my-templates

# Or set it as default in your team
npm create @m5nv my-app -- --template nextjs-app --repo mycompany/project-templates
```

## Authentication

This tool uses your local `git` configuration for repository access. For private repositories, ensure your git authentication is properly configured:

### SSH Authentication (Recommended)

```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to your git provider (GitHub, GitLab, etc.)
cat ~/.ssh/id_ed25519.pub
```

### HTTPS with Personal Access Token

```bash
# Configure git to use your token
git config --global credential.helper store

# First clone will prompt for credentials
# Username: your-username
# Password: your-personal-access-token
```

## How It Works

1. **Validation**: Validates arguments, checks git installation, and verifies repository accessibility
2. **Clone**: Performs a shallow clone (`--depth 1`) of the template repository to a secure temporary directory
3. **Copy**: Copies the specified template subdirectory to your project directory
4. **Setup**: Executes the optional `_setup.mjs` script with project context
5. **Cleanup**: Removes `.git` directory and `_setup.mjs` file, cleans up temporary files

### Setup Script Execution

If a template includes `_setup.mjs`, it will be executed automatically with this context:

```javascript
{
  projectDirectory: "my-project",    // The created project directory name
  projectName: "my-project",         // Same as projectDirectory
  cwd: "/current/working/directory"  // Where the command was run
}
```

The setup script should export a default function or named `setup` function:

```javascript
// Option 1: Default export
export default function setup(context) {
  // Your setup logic
}

// Option 2: Named export
export function setup(context) {
  // Your setup logic
}
```

**Common setup tasks:**

- Replace placeholders in files (project name, author, etc.)
- Install dependencies (`npm install`, `yarn install`)
- Initialize git repository
- Create additional files or directories
- Display next steps to the user

## Testing

This project includes comprehensive test coverage across multiple test suites:

### Test Suites

| Test Suite                | Purpose                                         | Command                   |
| ------------------------- | ----------------------------------------------- | ------------------------- |
| **Functional Tests**      | End-to-end CLI behavior validation              | `npm run test:functional` |
| **Spec Compliance Tests** | Verification against specification requirements | `npm run test:spec`       |
| **Resource Leak Tests**   | Resource management and cleanup validation      | `npm run test:leaks`      |
| **Smoke Tests**           | Production readiness and integration validation | `npm run test:smoke`      |

### Running Tests

```bash
# Run all test suites with unified reporting
npm test

# Run all test suites (same as above)
npm run test:all

# Run quick validation (functional + smoke tests only)
npm run test:quick

# Run individual test suites
npm run test:functional
npm run test:spec
npm run test:leaks
npm run test:smoke
```

### Test Coverage

- **36 functional tests** - CLI argument parsing, validation, security, git operations, file operations, error handling
- **32 spec compliance tests** - Verification of all specification requirements
- **4 resource leak tests** - Temporary directory cleanup, resource management
- **6 smoke tests** - End-to-end integration and production readiness

All tests use zero external dependencies and run entirely with Node.js built-ins.

### Development

```bash
# Lint code
npm run lint

# Run tests during development
npm run test:quick
```

## Security Features

This CLI tool is built with security as a primary concern:

- **Zero External Dependencies**: Eliminates supply chain attack vectors
- **Input Validation**: All user inputs are validated and sanitized
- **Path Traversal Prevention**: Blocks attempts to escape project boundaries
- **Repository URL Validation**: Prevents malicious redirects and injection attacks
- **Secure Temporary Directories**: Uses secure temporary directory creation with proper cleanup
- **Error Message Sanitization**: Prevents information disclosure through error messages
- **Command Injection Prevention**: All git operations use safe argument passing

## Requirements

- **Node.js**: Version 22.0.0 or higher
- **Git**: Must be installed and available in PATH
- **Operating System**: macOS, Linux, or Windows with WSL

## Troubleshooting

### Common Issues

**Git not found:**

```bash
# Install git on macOS
brew install git

# Install git on Ubuntu/Debian
sudo apt install git

# Install git on Windows
# Download from https://git-scm.com/download/win
```

**Repository not found:**

- Verify the repository exists and you have access
- Check your git authentication for private repositories
- Ensure the repository URL format is correct

**Template not found:**

- Verify the template name matches a subdirectory in the repository
- Check that the template exists in the specified branch
- Template names are case-sensitive

**Permission denied:**

- Ensure you have write permissions in the current directory
- Check that the project directory name doesn't conflict with existing files

### Getting Help

```bash
# Display help information
npm create @m5nv -- --help

# Or with npx
npx @m5nv/create@latest --help
```

## Contributing

This project follows strict security and quality standards:

1. **Zero Dependencies**: No external runtime dependencies allowed
2. **Comprehensive Testing**: All changes must pass 78+ tests across 4 test suites
3. **Security First**: All code changes undergo security review
4. **ES Modules Only**: Modern JavaScript patterns and Node.js built-ins

### Development Setup

```bash
# Clone the repository
git clone https://github.com/million-views/create.git
cd create

# Install development dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint
```

### License

MIT
