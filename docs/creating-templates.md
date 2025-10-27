---
title: "How to Create Templates"
type: "guide"
audience: "intermediate"
estimated_time: "30 minutes"
prerequisites: 
  - "Basic familiarity with @m5nv/create-scaffold"
  - "Git repository management experience"
  - "Node.js and npm knowledge"
related_docs: 
  - "tutorial/getting-started.md"
  - "reference/cli-reference.md"
  - "reference/environment-object.md"
last_updated: "2024-01-15"
---

# How to Create Templates

## Overview

This guide shows you how to create template repositories for @m5nv/create-scaffold. Use this when you want to share reusable project structures with your team or the community.

## When to use this guide

Use this guide when you need to:
- Create standardized project templates for your team
- Share reusable project structures with the community
- Set up templates with IDE-specific configurations
- Build templates with conditional features based on user options
- Implement complex setup logic for project initialization

## Prerequisites

Before following this guide, ensure you have:

- A GitHub account (or access to another Git hosting service)
- Node.js (latest LTS) installed
- Basic understanding of @m5nv/create-scaffold usage
- Familiarity with JavaScript ES modules

## Step-by-step instructions

### Step 1: Create your template repository

Create a new Git repository to house your templates:

```bash
# Create and initialize repository
mkdir my-templates
cd my-templates
git init
```

Each template lives in its own subdirectory at the root level:

```
my-templates/
├── react-vite/
│   ├── package.json
│   ├── src/
│   │   └── App.jsx
│   └── _setup.mjs          # Optional setup script
├── express-api/
│   ├── package.json
│   ├── server.js
│   └── _setup.mjs
└── nextjs-app/
    ├── package.json
    ├── pages/
    │   └── index.js
    └── _setup.mjs
```

**Template naming conventions:**
- Use kebab-case names: `react-vite`, `express-api`, `nextjs-app`
- Keep names descriptive but concise
- Avoid special characters or spaces

### Step 2: Create your first template

Let's create a simple React template as an example:

```bash
# Create template directory
mkdir react-vite
cd react-vite
```

Create the basic project structure:

**package.json:**
```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

**src/App.jsx:**
```jsx
function App() {
  return (
    <div>
      <h1>Welcome to {{PROJECT_NAME}}</h1>
      <p>Your React app is ready!</p>
    </div>
  );
}

export default App;
```

**Template guidelines:**
- Each template should be a complete, runnable project
- Use `{{PROJECT_NAME}}` placeholder for dynamic project names
- Include all necessary dependencies in package.json
- Provide clear file structure and sensible defaults

### Step 3: Add setup script for customization

Create a `_setup.mjs` file for post-copy customization:

```javascript
// _setup.mjs
export default function setup(env) {
  console.log(`Setting up ${env.projectName}...`);
  console.log(`Target IDE: ${env.ide || "none specified"}`);
  console.log(`Options: ${env.options.join(", ") || "none"}`);

  // Replace placeholders in package.json
  import("fs").then((fs) => {
    const packagePath = `${env.projectDir}/package.json`;
    let content = fs.readFileSync(packagePath, "utf8");
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, env.projectName);
    fs.writeFileSync(packagePath, content);

    // Replace placeholders in source files
    const appPath = `${env.projectDir}/src/App.jsx`;
    if (fs.existsSync(appPath)) {
      let appContent = fs.readFileSync(appPath, "utf8");
      appContent = appContent.replace(/\{\{PROJECT_NAME\}\}/g, env.projectName);
      fs.writeFileSync(appPath, appContent);
    }

    console.log("✅ Setup complete!");
    console.log(`Next steps:`);
    console.log(`  cd ${env.projectName}`);
    console.log(`  npm install`);
    console.log(`  npm run dev`);
  });
}
```

### Step 4: Test your template

Before publishing, test your template locally:

```bash
# Navigate back to your templates repository root
cd ..

# Test the template (replace 'yourusername' with your GitHub username)
npm create @m5nv/scaffold test-project -- --from-template react-vite --repo yourusername/my-templates
```

Verify the template works correctly:
1. Check that `{{PROJECT_NAME}}` placeholders were replaced
2. Ensure all files were copied correctly
3. Test that the project runs: `cd test-project && npm install && npm run dev`

### Step 5: Publish your template repository

Commit and push your templates to make them available:

```bash
# Add and commit your templates
git add .
git commit -m "Add React Vite template"

# Push to GitHub (create repository first)
git remote add origin https://github.com/yourusername/my-templates.git
git push -u origin main
```

## Environment Object Reference

The setup script receives a single `env` parameter with the following structure:

```javascript
{
  projectDir: '/absolute/path/to/project',    // Absolute path to project directory
  projectName: 'my-project',                 // Sanitized project name (kebab-case)
  cwd: '/current/working/directory',         // Current working directory where CLI was run
  ide: 'kiro',                              // Target IDE (kiro, vscode, cursor, windsurf) or null
  options: ['auth', 'database', 'testing']  // Array of enabled options or empty array
}
```

**Property details:**

- **`projectDir`**: Absolute path where the project files are copied. Use this for all file operations.
- **`projectName`**: The sanitized project name (converted to kebab-case). Safe to use in file names and package.json.
- **`cwd`**: The directory where the user ran the CLI command. Useful for relative path operations.
- **`ide`**: The target IDE specified by the user. Can be `'kiro'`, `'vscode'`, `'cursor'`, `'windsurf'`, or `null`.
- **`options`**: Array of feature flags passed by the user. Use for conditional setup logic.

## IDE-Specific Customization

Customize templates based on the target IDE to provide optimal development experience:

```javascript
export default function setup(env) {
  import("fs").then((fs) => {
    import("path").then((path) => {
      // Always replace project name first
      replaceProjectName(env, fs);

      // Create IDE-specific configuration
      switch (env.ide) {
        case "kiro":
          setupKiroConfig(env, fs);
          break;
        case "vscode":
          setupVSCodeConfig(env, fs);
          break;
        case "cursor":
          setupCursorConfig(env, fs);
          break;
        case "windsurf":
          setupWindsurfConfig(env, fs);
          break;
        default:
          console.log("No IDE-specific setup performed");
      }

      // Apply option-based customizations
      applyOptions(env, fs);
    });
  });
}

function setupKiroConfig(env, fs) {
  const kiroDir = path.join(env.projectDir, '.kiro');
  fs.mkdirSync(kiroDir, { recursive: true });

  const settings = {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": true
    },
    "typescript.preferences.importModuleSpecifier": "relative"
  };

  fs.writeFileSync(
    path.join(kiroDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  console.log("🎯 Kiro configuration created");
}

function setupVSCodeConfig(env, fs) {
  const vscodeDir = path.join(env.projectDir, '.vscode');
  fs.mkdirSync(vscodeDir, { recursive: true });

  const settings = {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "typescript.preferences.importModuleSpecifier": "relative"
  };

  const extensions = {
    "recommendations": [
      "esbenp.prettier-vscode",
      "bradlc.vscode-tailwindcss",
      "ms-vscode.vscode-typescript-next"
    ]
  };

  fs.writeFileSync(
    path.join(vscodeDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  fs.writeFileSync(
    path.join(vscodeDir, 'extensions.json'),
    JSON.stringify(extensions, null, 2)
  );
  
  console.log("📝 VS Code configuration created");
}
```

## Feature-Based Conditional Setup

Use the `options` array to enable/disable features based on user preferences:

```javascript
function applyOptions(env, fs) {
  const packagePath = path.join(env.projectDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  if (env.options.includes("auth")) {
    // Add authentication dependencies
    packageJson.dependencies = {
      ...packageJson.dependencies,
      "jsonwebtoken": "^9.0.0",
      "bcryptjs": "^2.4.3"
    };

    // Create auth directory and files
    const authDir = path.join(env.projectDir, 'src', 'auth');
    fs.mkdirSync(authDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(authDir, 'auth.js'),
      `// Authentication utilities\nexport const authenticate = () => {\n  // TODO: Implement authentication\n};\n`
    );
    
    console.log("🔐 Authentication setup added");
  }

  if (env.options.includes("database")) {
    // Add database dependencies
    packageJson.dependencies = {
      ...packageJson.dependencies,
      "mongoose": "^7.0.0"
    };

    // Create models directory
    const modelsDir = path.join(env.projectDir, 'src', 'models');
    fs.mkdirSync(modelsDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(modelsDir, 'index.js'),
      `// Database models\n// TODO: Add your models here\n`
    );
    
    console.log("🗄️ Database setup added");
  }

  if (env.options.includes("testing")) {
    // Add testing dependencies
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      "vitest": "^1.0.0",
      "@testing-library/react": "^14.0.0",
      "@testing-library/jest-dom": "^6.0.0"
    };

    // Add test scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      "test": "vitest",
      "test:ui": "vitest --ui",
      "test:coverage": "vitest --coverage"
    };

    // Create test directory
    const testDir = path.join(env.projectDir, 'src', '__tests__');
    fs.mkdirSync(testDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(testDir, 'App.test.jsx'),
      `import { render, screen } from '@testing-library/react';\nimport App from '../App';\n\ntest('renders welcome message', () => {\n  render(<App />);\n  expect(screen.getByText(/welcome/i)).toBeInTheDocument();\n});\n`
    );
    
    console.log("🧪 Testing setup added");
  }

  // Write updated package.json
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
}
```

## Multi-IDE Template Setup Patterns

For templates that need to support multiple IDEs effectively:

```javascript
export default function setup(env) {
  import("fs").then((fs) => {
    import("path").then((path) => {
      // Core setup that applies to all IDEs
      replaceProjectName(env, fs, path);
      
      // IDE-specific configurations
      const ideConfigs = {
        kiro: () => createKiroConfig(env, fs, path),
        vscode: () => createVSCodeConfig(env, fs, path),
        cursor: () => createCursorConfig(env, fs, path),
        windsurf: () => createWindsurfConfig(env, fs, path)
      };

      if (env.ide && ideConfigs[env.ide]) {
        ideConfigs[env.ide]();
      } else {
        console.log("💡 Tip: Use --ide flag for optimized IDE setup");
      }

      // Apply feature options
      applyFeatureOptions(env, fs, path);
      
      // Display completion message
      showCompletionMessage(env);
    });
  });
}

function createKiroConfig(env, fs, path) {
  const configDir = path.join(env.projectDir, '.kiro');
  fs.mkdirSync(configDir, { recursive: true });

  // Kiro-specific settings
  const settings = {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": true
    },
    "files.exclude": {
      "**/node_modules": true,
      "**/.git": true,
      "**/dist": true
    }
  };

  fs.writeFileSync(
    path.join(configDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );

  console.log("🎯 Kiro workspace configured");
}

function createVSCodeConfig(env, fs, path) {
  const configDir = path.join(env.projectDir, '.vscode');
  fs.mkdirSync(configDir, { recursive: true });

  // VS Code settings
  const settings = {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "files.exclude": {
      "**/node_modules": true,
      "**/.git": true,
      "**/dist": true
    }
  };

  // Recommended extensions
  const extensions = {
    "recommendations": [
      "esbenp.prettier-vscode",
      "ms-vscode.vscode-typescript-next",
      "bradlc.vscode-tailwindcss"
    ]
  };

  fs.writeFileSync(
    path.join(configDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  fs.writeFileSync(
    path.join(configDir, 'extensions.json'),
    JSON.stringify(extensions, null, 2)
  );

  console.log("📝 VS Code workspace configured");
}
```

## Best Practices and Common Pitfalls

### Best Practices

**Template Structure:**
- Keep templates focused on a single use case or technology stack
- Include comprehensive README.md files in each template
- Use consistent naming conventions across all templates
- Provide sensible defaults that work out of the box

**Setup Script Guidelines:**
- Always use async/await or Promises for file operations
- Include error handling for file operations
- Provide clear console output to guide users
- Use `path.join()` for cross-platform compatibility

**Placeholder Management:**
- Use consistent placeholder syntax: `{{PROJECT_NAME}}`
- Replace placeholders in all relevant files (package.json, README, source files)
- Consider case variations: `{{PROJECT_NAME}}`, `{{project_name}}`, `{{projectName}}`

### Common Pitfalls to Avoid

**❌ Synchronous File Operations:**
```javascript
// Don't do this
const content = fs.readFileSync(packagePath, 'utf8'); // Blocks execution
```

**✅ Use Async Operations:**
```javascript
// Do this instead
import("fs").then((fs) => {
  const content = fs.readFileSync(packagePath, 'utf8'); // Non-blocking in dynamic import
});
```

**❌ Hardcoded Paths:**
```javascript
// Don't do this
fs.writeFileSync(`${env.projectDir}/.vscode/settings.json`, content);
```

**✅ Use Path Module:**
```javascript
// Do this instead
import("path").then((path) => {
  fs.writeFileSync(path.join(env.projectDir, '.vscode', 'settings.json'), content);
});
```

**❌ Missing Error Handling:**
```javascript
// Don't do this
fs.writeFileSync(filePath, content); // Could fail silently
```

**✅ Include Error Handling:**
```javascript
// Do this instead
try {
  fs.writeFileSync(filePath, content);
  console.log("✅ File created successfully");
} catch (error) {
  console.error("❌ Failed to create file:", error.message);
}
```

## Using Your Templates

Once your templates are published, users can access them with:

```bash
# Basic usage
npm create @m5nv/scaffold my-project -- --from-template react-vite --repo yourusername/my-templates

# With IDE-specific customization
npm create @m5nv/scaffold my-project -- --from-template react-vite --ide kiro --repo yourusername/my-templates

# With feature options enabled
npm create @m5nv/scaffold my-project -- --from-template react-vite --options "auth,database,testing" --repo yourusername/my-templates

# Combined IDE and options
npm create @m5nv/scaffold my-project -- --from-template react-vite --ide vscode --options "auth,testing" --repo yourusername/my-templates
```

## Verification

To verify your template works correctly:

1. **Test locally before publishing:**
   ```bash
   npm create @m5nv/scaffold test-project -- --from-template your-template --repo yourusername/your-templates
   ```

2. **Check placeholder replacement:**
   - Verify `{{PROJECT_NAME}}` is replaced in all files
   - Ensure project name appears correctly in package.json
   - Check that source files contain the correct project name

3. **Test IDE configurations:**
   ```bash
   # Test with different IDEs
   npm create @m5nv/scaffold test-kiro -- --from-template your-template --ide kiro --repo yourusername/your-templates
   npm create @m5nv/scaffold test-vscode -- --from-template your-template --ide vscode --repo yourusername/your-templates
   ```

4. **Verify option handling:**
   ```bash
   # Test with various option combinations
   npm create @m5nv/scaffold test-options -- --from-template your-template --options "auth,database" --repo yourusername/your-templates
   ```

## Troubleshooting

### Template Not Found

**Symptoms:** Error message "Template 'template-name' not found in repository"
**Cause:** Template directory doesn't exist or is named incorrectly
**Solution:** 
1. Verify template directory exists at repository root
2. Check directory name matches exactly (case-sensitive)
3. Ensure repository is public or accessible

### Setup Script Fails

**Symptoms:** Template copies but setup script throws errors
**Cause:** Syntax errors or missing imports in `_setup.mjs`
**Solution:**
1. Test setup script syntax: `node _setup.mjs`
2. Ensure all imports use dynamic `import()` syntax
3. Add error handling around file operations
4. Check file paths are correct

### Placeholders Not Replaced

**Symptoms:** `{{PROJECT_NAME}}` appears in final project files
**Cause:** Setup script not replacing placeholders correctly
**Solution:**
1. Use global regex replacement: `/\{\{PROJECT_NAME\}\}/g`
2. Check all files that contain placeholders
3. Verify setup script is reading and writing files correctly

### IDE Configuration Not Created

**Symptoms:** No `.vscode` or `.kiro` directory in generated project
**Cause:** IDE-specific setup logic not executing
**Solution:**
1. Verify `env.ide` value in setup script
2. Check conditional logic for IDE detection
3. Ensure directory creation uses `{ recursive: true }`

### Options Not Applied

**Symptoms:** Features not added despite using `--options` flag
**Cause:** Setup script not checking `env.options` array correctly
**Solution:**
1. Use `env.options.includes('option-name')` for checking
2. Verify option names match exactly (case-sensitive)
3. Check that package.json modifications are saved

### Permission Errors

**Symptoms:** "EACCES" or "EPERM" errors during setup
**Cause:** Insufficient permissions or file locks
**Solution:**
1. Ensure target directory is writable
2. Close any editors that might lock files
3. Run with appropriate permissions

## Related Information

- 📖 [CLI Reference](reference/cli-reference.md) - Complete parameter documentation
- 📖 [Environment Object Reference](reference/environment-object.md) - Detailed env parameter documentation
- 💡 [Template System Architecture](explanation/template-system.md) - Understanding how templates work
- 🎯 [Getting Started Tutorial](tutorial/getting-started.md) - Learn to use templates before creating them
- 🎯 [Troubleshooting Guide](guides/troubleshooting.md) - Resolve template creation issues