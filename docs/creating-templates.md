# Creating Templates

Learn how to create your own template repository for use with @m5nv/create-scaffold.

## Repository Structure

Each template lives in its own subdirectory:

```
your-templates/
├── react-vite/
│   ├── package.json
│   ├── src/
│   └── _setup.mjs          # Optional
├── express-api/
│   ├── package.json
│   ├── server.js
│   └── _setup.mjs
└── nextjs-app/
    ├── package.json
    └── pages/
```

## Template Guidelines

- **One template per subdirectory** - Keep templates at the root level
- **Complete projects** - Each template should be ready to copy and run
- **Use kebab-case names** - `react-vite`, `express-api`, `nextjs-app`
- **Include package.json** - For Node.js projects with dependencies

## Setup Scripts

Add a `_setup.mjs` file for post-copy customization:

```javascript
// _setup.mjs
export default function setup(env) {
  console.log(`Setting up ${env.projectName}...`);
  console.log(`Target IDE: ${env.ide || "none specified"}`);
  console.log(`Features: ${env.features.join(", ") || "none"}`);

  // Replace placeholders in package.json
  import("fs").then((fs) => {
    const packagePath = `${env.projectDir}/package.json`;
    let content = fs.readFileSync(packagePath, "utf8");
    content = content.replace("{{PROJECT_NAME}}", env.projectName);
    fs.writeFileSync(packagePath, content);

    console.log("✅ Setup complete!");
    console.log(`Next steps:`);
    console.log(`  cd ${env.projectName}`);
    console.log(`  npm install`);
  });
}
```

### Environment Object Structure

The setup script receives a single `env` parameter with the following structure:

```javascript
{
  projectDir: '/absolute/path/to/project',    // Absolute path to project directory
  projectName: 'my-project',                 // Sanitized project name
  cwd: '/current/working/directory',         // Current working directory
  ide: 'kiro',                              // Target IDE (kiro, vscode, cursor, windsurf) or null
  features: ['auth', 'database', 'testing'] // Array of enabled features or empty array
}
```

### IDE-Specific Customization

You can customize templates based on the target IDE:

```javascript
export default function setup(env) {
  import("fs").then((fs) => {
    // Create IDE-specific configuration
    if (env.ide === "kiro") {
      // Create .kiro directory and settings
      fs.mkdirSync(`${env.projectDir}/.kiro`, { recursive: true });
      fs.writeFileSync(
        `${env.projectDir}/.kiro/settings.json`,
        JSON.stringify(
          {
            "editor.formatOnSave": true,
          },
          null,
          2
        )
      );
    } else if (env.ide === "vscode") {
      // Create .vscode directory and settings
      fs.mkdirSync(`${env.projectDir}/.vscode`, { recursive: true });
      fs.writeFileSync(
        `${env.projectDir}/.vscode/settings.json`,
        JSON.stringify(
          {
            "editor.formatOnSave": true,
          },
          null,
          2
        )
      );
    }

    // Feature-based customization
    if (env.features.includes("auth")) {
      // Add authentication setup
      console.log("🔐 Setting up authentication...");
    }

    if (env.features.includes("database")) {
      // Add database configuration
      console.log("🗄️ Setting up database...");
    }
  });
}
```

## Example Template

**package.json:**

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0"
  }
}
```

**\_setup.mjs:**

```javascript
export default function setup(env) {
  import("fs").then((fs) => {
    const packagePath = `${env.projectDir}/package.json`;
    let content = fs.readFileSync(packagePath, "utf8");
    content = content.replace("{{PROJECT_NAME}}", env.projectName);
    fs.writeFileSync(packagePath, content);
  });
}
```

## Using Your Templates

```bash
# Basic usage
npm create @m5nv/scaffold my-project -- --from-template react-vite --repo yourusername/your-templates

# With IDE-specific customization
npm create @m5nv/scaffold my-project -- --from-template react-vite --ide kiro --repo yourusername/your-templates

# With features enabled
npm create @m5nv/scaffold my-project -- --from-template react-vite --features "auth,database" --repo yourusername/your-templates

# Combined IDE and features
npm create @m5nv/scaffold my-project -- --from-template react-vite --ide vscode --features "auth,testing,dark-theme" --repo yourusername/your-templates

# Using npx directly
npx @m5nv/create-scaffold@latest my-project --from-template react-vite --repo yourusername/your-templates
```

## Common Setup Tasks

- Replace project name placeholders using `env.projectName`
- Create IDE-specific configuration files based on `env.ide`
- Enable/disable features based on `env.features` array
- Install dependencies (`npm install`)
- Initialize git repository
- Create additional files
- Display next steps

## Advanced Examples

### Multi-IDE Template Setup

```javascript
export default function setup(env) {
  import("fs").then((fs) => {
    import("path").then((path) => {
      // Replace project name in package.json
      const packagePath = path.join(env.projectDir, "package.json");
      let content = fs.readFileSync(packagePath, "utf8");
      content = content.replace("{{PROJECT_NAME}}", env.projectName);
      fs.writeFileSync(packagePath, content);

      // IDE-specific setup
      switch (env.ide) {
        case "kiro":
          setupKiro(env, fs);
          break;
        case "vscode":
          setupVSCode(env, fs);
          break;
        case "cursor":
          setupCursor(env, fs);
          break;
        case "windsurf":
          setupWindsurf(env, fs);
          break;
        default:
          console.log("No IDE-specific setup performed");
      }

      // Feature-based setup
      if (env.features.includes("auth")) {
        setupAuthentication(env, fs);
      }

      if (env.features.includes("database")) {
        setupDatabase(env, fs);
      }

      if (env.features.includes("testing")) {
        setupTesting(env, fs);
      }
    });
  });
}

function setupKiro(env, fs) {
  const kiroDir = `${env.projectDir}/.kiro`;
  fs.mkdirSync(kiroDir, { recursive: true });

  const settings = {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": true,
    },
  };

  fs.writeFileSync(
    `${kiroDir}/settings.json`,
    JSON.stringify(settings, null, 2)
  );
  console.log("🎯 Kiro configuration created");
}

function setupVSCode(env, fs) {
  const vscodeDir = `${env.projectDir}/.vscode`;
  fs.mkdirSync(vscodeDir, { recursive: true });

  const settings = {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true,
    },
  };

  fs.writeFileSync(
    `${vscodeDir}/settings.json`,
    JSON.stringify(settings, null, 2)
  );
  console.log("📝 VS Code configuration created");
}
```

### Feature-Based Conditional Setup

```javascript
export default function setup(env) {
  console.log(
    `Setting up ${env.projectName} with features: ${env.features.join(", ")}`
  );

  import("fs").then((fs) => {
    // Always replace project name
    const packagePath = `${env.projectDir}/package.json`;
    let packageContent = fs.readFileSync(packagePath, "utf8");
    packageContent = packageContent.replace(
      "{{PROJECT_NAME}}",
      env.projectName
    );

    // Conditionally add dependencies based on features
    const packageJson = JSON.parse(packageContent);

    if (env.features.includes("auth")) {
      packageJson.dependencies = {
        ...packageJson.dependencies,
        jsonwebtoken: "^9.0.0",
        bcryptjs: "^2.4.3",
      };

      // Create auth directory
      fs.mkdirSync(`${env.projectDir}/src/auth`, { recursive: true });
      console.log("🔐 Authentication setup added");
    }

    if (env.features.includes("database")) {
      packageJson.dependencies = {
        ...packageJson.dependencies,
        mongoose: "^7.0.0",
      };

      // Create models directory
      fs.mkdirSync(`${env.projectDir}/src/models`, { recursive: true });
      console.log("🗄️ Database setup added");
    }

    if (env.features.includes("testing")) {
      packageJson.devDependencies = {
        ...packageJson.devDependencies,
        vitest: "^1.0.0",
        "@testing-library/react": "^14.0.0",
      };

      packageJson.scripts = {
        ...packageJson.scripts,
        test: "vitest",
        "test:ui": "vitest --ui",
      };

      console.log("🧪 Testing setup added");
    }

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  });
}
```
