# Creating Templates

Learn how to create your own template repository for use with @m5nv/create.

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
export default function setup({ projectDirectory, projectName, cwd }) {
  console.log(`Setting up ${projectName}...`);
  
  // Replace placeholders in package.json
  import('fs').then(fs => {
    const packagePath = `${projectDirectory}/package.json`;
    let content = fs.readFileSync(packagePath, 'utf8');
    content = content.replace('{{PROJECT_NAME}}', projectName);
    fs.writeFileSync(packagePath, content);
    
    console.log('✅ Setup complete!');
    console.log(`Next steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm install`);
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

**_setup.mjs:**
```javascript
export default function setup({ projectDirectory, projectName }) {
  import('fs').then(fs => {
    const packagePath = `${projectDirectory}/package.json`;
    let content = fs.readFileSync(packagePath, 'utf8');
    content = content.replace('{{PROJECT_NAME}}', projectName);
    fs.writeFileSync(packagePath, content);
  });
}
```

## Using Your Templates

```bash
# Use latest version
npm create @m5nv/create my-project -- --template react-vite --repo yourusername/your-templates

# Use specific version
npm create @m5nv/create@1.0.0 my-project -- --template react-vite --repo yourusername/your-templates
```

## Common Setup Tasks

- Replace project name placeholders
- Install dependencies (`npm install`)
- Initialize git repository
- Create additional files
- Display next steps