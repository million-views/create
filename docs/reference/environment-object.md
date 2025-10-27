---
title: "Environment Object Reference"
type: "reference"
audience: "template-authors"
estimated_time: "N/A (reference)"
prerequisites: 
  - "Basic JavaScript knowledge"
  - "Understanding of template setup scripts"
related_docs: 
  - "../creating-templates.md"
  - "cli-reference.md"
last_updated: "2024-01-15"
---

# Environment Object Reference

## Overview

The Environment Object is passed to template setup scripts (`_setup.mjs`) and provides validated, sanitized context about the project being created. It contains information about the target project, user preferences, and execution environment.

## Object Structure

```javascript
{
  projectDir: string,    // Absolute path to project directory
  projectName: string,   // Sanitized project name
  cwd: string,          // Current working directory (absolute path)
  ide: string | null,   // Target IDE or null
  options: string[]     // Array of contextual options
}
```

## Properties

### `projectDir`

**Type:** `string`  
**Description:** Absolute path to the project directory being created  
**Validation:** Sanitized and resolved to prevent path traversal attacks  
**Example:** `/Users/developer/my-projects/my-app`

```javascript
export default function setup(env) {
  console.log(`Creating project at: ${env.projectDir}`);
  
  // Safe to use for file operations within the project
  const configPath = path.join(env.projectDir, 'config.json');
}
```

### `projectName`

**Type:** `string`  
**Description:** Sanitized name of the project directory  
**Validation:** Contains only letters, numbers, hyphens, and underscores  
**Example:** `my-app`

```javascript
export default function setup(env) {
  // Use in package.json, README, or other configuration
  const packageJson = {
    name: env.projectName,
    version: '1.0.0',
    description: `${env.projectName} - Generated from template`
  };
}
```

### `cwd`

**Type:** `string`  
**Description:** Absolute path to the current working directory where the CLI was executed  
**Validation:** Normalized absolute path  
**Example:** `/Users/developer/workspace`

```javascript
export default function setup(env) {
  // Useful for relative path calculations or workspace detection
  const isInWorkspace = env.cwd.includes('workspace');
  const relativePath = path.relative(env.cwd, env.projectDir);
}
```

### `ide`

**Type:** `string | null`  
**Description:** Target IDE specified by the user, or `null` if not specified  
**Validation:** Must be one of: `kiro`, `vscode`, `cursor`, `windsurf`  
**Example:** `"kiro"` or `null`

```javascript
export default function setup(env) {
  if (env.ide === 'kiro') {
    // Add Kiro-specific configuration
    await createKiroConfig();
  } else if (env.ide === 'vscode') {
    // Add VS Code settings
    await createVSCodeSettings();
  }
  // Handle null case (no IDE specified)
}
```

### `options`

**Type:** `string[]`  
**Description:** Array of contextual options specified by the user  
**Validation:** Each option contains only letters, numbers, hyphens, and underscores  
**Example:** `["monorepo", "typescript", "testing-focused"]`

```javascript
export default function setup(env) {
  const hasTypeScript = env.options.includes('typescript');
  const isMonorepo = env.options.includes('monorepo');
  const skipGit = env.options.includes('no-git');
  
  if (hasTypeScript) {
    await setupTypeScript();
  }
  
  if (isMonorepo) {
    await configureForMonorepo();
  }
  
  if (!skipGit) {
    await initializeGit();
  }
}
```

## Usage Examples

### Basic Setup Script

```javascript
// _setup.mjs
import fs from 'fs/promises';
import path from 'path';

export default async function setup(env) {
  console.log(`Setting up ${env.projectName}...`);
  
  // Create package.json with project name
  const packageJson = {
    name: env.projectName,
    version: '1.0.0',
    description: `${env.projectName} - Generated from template`
  };
  
  await fs.writeFile(
    path.join(env.projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}
```

### IDE-Specific Configuration

```javascript
// _setup.mjs
import fs from 'fs/promises';
import path from 'path';

export default async function setup(env) {
  // Create IDE-specific configuration
  switch (env.ide) {
    case 'kiro':
      await createKiroConfig(env);
      break;
    case 'vscode':
      await createVSCodeConfig(env);
      break;
    case 'cursor':
      await createCursorConfig(env);
      break;
    case 'windsurf':
      await createWindsurfConfig(env);
      break;
    default:
      console.log('No IDE-specific configuration needed');
  }
}

async function createKiroConfig(env) {
  const kiroConfig = {
    name: env.projectName,
    type: 'web-app',
    features: env.options
  };
  
  const kiroDir = path.join(env.projectDir, '.kiro');
  await fs.mkdir(kiroDir, { recursive: true });
  await fs.writeFile(
    path.join(kiroDir, 'config.json'),
    JSON.stringify(kiroConfig, null, 2)
  );
}

async function createVSCodeConfig(env) {
  const vscodeConfig = {
    'typescript.preferences.includePackageJsonAutoImports': 'auto',
    'editor.formatOnSave': true
  };
  
  const vscodeDir = path.join(env.projectDir, '.vscode');
  await fs.mkdir(vscodeDir, { recursive: true });
  await fs.writeFile(
    path.join(vscodeDir, 'settings.json'),
    JSON.stringify(vscodeConfig, null, 2)
  );
}
```

### Options-Based Customization

```javascript
// _setup.mjs
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

export default async function setup(env) {
  const {
    hasTypeScript,
    isMonorepo,
    skipGit,
    isMinimal,
    needsTesting,
    needsDocker
  } = parseOptions(env.options);
  
  // Configure based on options
  if (hasTypeScript) {
    await setupTypeScript(env);
  }
  
  if (isMonorepo) {
    await configureMonorepo(env);
  }
  
  if (!skipGit) {
    await initializeGit(env);
  }
  
  if (needsTesting && !isMinimal) {
    await setupTesting(env);
  }
  
  if (needsDocker) {
    await createDockerConfig(env);
  }
}

function parseOptions(options) {
  return {
    hasTypeScript: options.includes('typescript'),
    isMonorepo: options.includes('monorepo'),
    skipGit: options.includes('no-git'),
    isMinimal: options.includes('minimal'),
    needsTesting: options.includes('testing-focused'),
    needsDocker: options.includes('docker-ready')
  };
}

async function setupTypeScript(env) {
  const tsConfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'node',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true
    }
  };
  
  await fs.writeFile(
    path.join(env.projectDir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );
}

async function initializeGit(env) {
  try {
    execSync('git init', { cwd: env.projectDir, stdio: 'inherit' });
    execSync('git add .', { cwd: env.projectDir, stdio: 'inherit' });
    execSync('git commit -m "Initial commit from template"', { 
      cwd: env.projectDir, 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.warn('Git initialization failed:', error.message);
  }
}
```

### Advanced Context Detection

```javascript
// _setup.mjs
import fs from 'fs/promises';
import path from 'path';

export default async function setup(env) {
  const context = await analyzeContext(env);
  
  console.log(`Detected context: ${context.type}`);
  console.log(`Workspace: ${context.workspace}`);
  console.log(`Package manager: ${context.packageManager}`);
  
  // Adapt setup based on detected context
  await adaptToContext(env, context);
}

async function analyzeContext(env) {
  const context = {
    type: 'standalone',
    workspace: null,
    packageManager: 'npm'
  };
  
  // Check if we're in a monorepo
  const isMonorepo = env.options.includes('monorepo');
  if (isMonorepo) {
    context.type = 'monorepo';
  }
  
  // Detect workspace root by looking for workspace indicators
  let currentDir = env.cwd;
  while (currentDir !== path.dirname(currentDir)) {
    try {
      const packageJsonPath = path.join(currentDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      if (packageJson.workspaces) {
        context.type = 'monorepo';
        context.workspace = currentDir;
        break;
      }
    } catch {
      // Continue searching up the directory tree
    }
    currentDir = path.dirname(currentDir);
  }
  
  // Detect package manager
  if (await fileExists(path.join(env.cwd, 'yarn.lock'))) {
    context.packageManager = 'yarn';
  } else if (await fileExists(path.join(env.cwd, 'pnpm-lock.yaml'))) {
    context.packageManager = 'pnpm';
  }
  
  return context;
}

async function adaptToContext(env, context) {
  if (context.type === 'monorepo') {
    await configureForMonorepo(env, context);
  } else {
    await configureStandalone(env, context);
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
```

## Security Considerations

The Environment Object is designed with security in mind:

### Input Sanitization

- All paths are sanitized to prevent directory traversal attacks
- Project names are validated to contain only safe characters
- IDE values are restricted to known, safe options
- Options are validated against injection attempts

### Path Safety

- `projectDir` is always an absolute path within safe boundaries
- `cwd` is normalized and validated
- All paths are resolved to prevent symbolic link attacks

### Immutability

The Environment Object is frozen using `Object.freeze()` to prevent modification:

```javascript
export default function setup(env) {
  // This will throw an error in strict mode
  env.projectName = 'hacked'; // TypeError: Cannot assign to read only property
  
  // This will also fail
  env.options.push('malicious'); // TypeError: Cannot add property
}
```

## Error Handling

Setup scripts should handle errors gracefully:

```javascript
export default async function setup(env) {
  try {
    await performSetup(env);
  } catch (error) {
    console.error(`Setup failed for ${env.projectName}:`, error.message);
    
    // Don't throw - let the CLI continue
    // The CLI will log the error and clean up the setup script
  }
}
```

## Best Practices

### 1. Validate Environment

```javascript
export default async function setup(env) {
  // Validate required properties
  if (!env.projectDir || !env.projectName) {
    throw new Error('Invalid environment object');
  }
  
  // Check if we're in the expected directory
  if (!process.cwd().endsWith(env.projectName)) {
    console.warn('Setup script not running in expected directory');
  }
}
```

### 2. Use Path Utilities

```javascript
import path from 'path';

export default async function setup(env) {
  // Always use path.join for file paths
  const configPath = path.join(env.projectDir, 'config', 'app.json');
  
  // Use path.relative for relative paths
  const relativePath = path.relative(env.cwd, env.projectDir);
}
```

### 3. Handle Missing Options

```javascript
export default async function setup(env) {
  // Provide defaults for missing options
  const options = {
    typescript: env.options.includes('typescript'),
    testing: env.options.includes('testing-focused'),
    docker: env.options.includes('docker-ready'),
    // Default to false if not specified
    minimal: env.options.includes('minimal') || false
  };
}
```

### 4. Log Progress

```javascript
export default async function setup(env) {
  console.log(`🚀 Setting up ${env.projectName}...`);
  
  if (env.ide) {
    console.log(`🎯 Configuring for ${env.ide}`);
  }
  
  if (env.options.length > 0) {
    console.log(`⚙️  Applying options: ${env.options.join(', ')}`);
  }
  
  // Perform setup...
  
  console.log(`✅ Setup complete!`);
}
```

## Common Patterns

### Option Parsing

```javascript
function parseOptions(options) {
  const config = {
    // Development stage
    isPoc: options.includes('poc'),
    isPrototype: options.includes('prototype'),
    isMvp: options.includes('mvp'),
    isProduction: options.includes('production'),
    
    // Environment
    isMonorepo: options.includes('monorepo'),
    isStandalone: options.includes('standalone'),
    isExistingProject: options.includes('existing-project'),
    
    // Features
    skipGit: options.includes('no-git'),
    isMinimal: options.includes('minimal'),
    isFullFeatured: options.includes('full-featured'),
    hasTypeScript: options.includes('typescript'),
    needsTesting: options.includes('testing-focused'),
    needsCI: options.includes('ci-ready'),
    needsDocker: options.includes('docker-ready')
  };
  
  return config;
}
```

### File Template Processing

```javascript
async function processTemplate(templatePath, outputPath, env) {
  let content = await fs.readFile(templatePath, 'utf8');
  
  // Replace template variables
  content = content
    .replace(/{{PROJECT_NAME}}/g, env.projectName)
    .replace(/{{PROJECT_DIR}}/g, env.projectDir)
    .replace(/{{IDE}}/g, env.ide || 'none')
    .replace(/{{OPTIONS}}/g, env.options.join(','));
  
  await fs.writeFile(outputPath, content);
}
```

## See Also

- [CLI Reference](cli-reference.md) - Complete CLI parameter documentation
- [Creating Templates Guide](../creating-templates.md) - How to create templates with setup scripts
- [Error Codes Reference](error-codes.md) - Setup script error handling