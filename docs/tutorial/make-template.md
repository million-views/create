---
title: "make-template Tutorial"
type: "tutorial"
audience: "intermediate"
estimated_time: "30 minutes"
prerequisites:
  - "Node.js v22+ installed"
  - "Git installed and configured"
  - "Basic command line familiarity"
related_docs:
  - "../how-to/creating-templates.md"
  - "../reference/cli-reference.md"
  - "../tutorial/getting-started.md"
  - "../tutorial/create-scaffold.md"
  - "../how-to/author-workflow.md"
last_updated: "2025-11-12"
---

# make-template Tutorial

## What you'll learn

In this tutorial, you'll learn how to create three specific templates that demonstrate different project types and template features. These templates will be used in the [create-scaffold tutorial](create-scaffold.md) to show how developers can scaffold projects from templates.

## What you'll build

You'll create three templates that showcase different approaches:

1. **Basic React App** - Simple frontend application with modern tooling
2. **API Server** - Backend service with REST API and database integration
3. **Full-Stack App** - Complete application combining frontend and backend

Each template will demonstrate different template features like placeholders, setup scripts, and configuration options.

## Prerequisites

Before starting this tutorial, make sure you have:

- **Node.js v22+** installed ([Download here](https://nodejs.org/))
  - Verify: `node --version` should show v22 or higher
- **Git** installed and configured ([Setup guide](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup))
  - Verify: `git --version` should show git version info
- **30 minutes** available
- **Basic command line familiarity** (navigating directories, running commands)
- **Completed the [getting-started tutorial](getting-started.md)**

## Step 1: Create Basic React App Template

Let's start by creating a simple React application template that demonstrates basic template features.

### Instructions

1. **Create a new directory for your templates:**
   ```bash
   mkdir template-workshop
   cd template-workshop
   ```

2. **Create the basic React app project:**
   ```bash
   mkdir basic-react-app
   cd basic-react-app
   npm init -y
   npm install react react-dom
   npm install --save-dev @babel/core @babel/preset-react webpack webpack-cli webpack-dev-server html-webpack-plugin babel-loader
   ```

3. **Create the basic file structure:**
   ```bash
   mkdir src public
   touch src/index.js src/App.js public/index.html
   ```

4. **Add content to the files:**

   **src/index.js:**
   ```javascript
   import React from 'react';
   import ReactDOM from 'react-dom/client';
   import App from './App';

   const root = ReactDOM.createRoot(document.getElementById('root'));
   root.render(<App />);
   ```

   **src/App.js:**
   ```javascript
   import React from 'react';

   function App() {
     return (
       <div className="App">
         <header className="App-header">
           <h1>{{PROJECT_NAME}}</h1>
           <p>Welcome to your new React app!</p>
         </header>
       </div>
     );
   }

   export default App;
   ```

   **public/index.html:**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>{{PROJECT_NAME}}</title>
   </head>
   <body>
     <div id="root"></div>
   </body>
   </html>
   ```

5. **Update package.json with scripts and metadata:**
   ```json
   {
     "name": "basic-react-app",
     "version": "1.0.0",
     "description": "A basic React application template",
     "main": "src/index.js",
     "scripts": {
       "start": "webpack serve --mode development",
       "build": "webpack --mode production",
       "test": "echo \"No tests specified\""
     },
     "keywords": ["react", "frontend", "template"],
     "author": "{{AUTHOR_NAME}}",
     "license": "MIT"
   }
   ```

6. **Convert to template:**
   ```bash
   npx @m5nv/make-template convert --yes
   ```

### Expected Result

You should see:
```
🔄 Converting project to template...
📄 Generated template.json
⚙️  Generated _setup.mjs
🔄 Generated .template-undo.json
✅ Conversion complete!
```

The template is now ready and will be used in the create-scaffold tutorial.

## Step 2: Create API Server Template

Now let's create an API server template that demonstrates backend development patterns and database integration.

### Instructions

1. **Navigate back to the workshop directory:**
   ```bash
   cd ..
   ```

2. **Create the API server project:**
   ```bash
   mkdir api-server
   cd api-server
   npm init -y
   npm install express cors helmet dotenv
   npm install --save-dev nodemon
   ```

3. **Create the server structure:**
   ```bash
   mkdir src routes models middleware
   touch src/server.js routes/users.js models/User.js middleware/auth.js .env.example
   ```

4. **Add content to the files:**

   **src/server.js:**
   ```javascript
   const express = require('express');
   const cors = require('cors');
   const helmet = require('helmet');
   require('dotenv').config();

   const app = express();
   const PORT = process.env.PORT || 3001;

   // Middleware
   app.use(helmet());
   app.use(cors());
   app.use(express.json());

   // Routes
   app.use('/api/users', require('../routes/users'));

   // Health check
   app.get('/health', (req, res) => {
     res.json({ status: 'OK', service: '{{PROJECT_NAME}}' });
   });

   app.listen(PORT, () => {
     console.log(`🚀 {{PROJECT_NAME}} server running on port ${PORT}`);
   });

   module.exports = app;
   ```

   **routes/users.js:**
   ```javascript
   const express = require('express');
   const router = express.Router();

   // In-memory storage for demo (replace with real database)
   let users = [];
   let nextId = 1;

   router.get('/', (req, res) => {
     res.json(users);
   });

   router.post('/', (req, res) => {
     const { name, email } = req.body;
     if (!name || !email) {
       return res.status(400).json({ error: 'Name and email required' });
     }

     const user = { id: nextId++, name, email, createdAt: new Date() };
     users.push(user);
     res.status(201).json(user);
   });

   router.get('/:id', (req, res) => {
     const user = users.find(u => u.id === parseInt(req.params.id));
     if (!user) {
       return res.status(404).json({ error: 'User not found' });
     }
     res.json(user);
   });

   module.exports = router;
   ```

   **.env.example:**
   ```
   PORT=3001
   NODE_ENV=development
   DATABASE_URL=your_database_url_here
   JWT_SECRET=your_jwt_secret_here
   ```

5. **Update package.json:**
   ```json
   {
     "name": "api-server",
     "version": "1.0.0",
     "description": "A REST API server template with Express.js",
     "main": "src/server.js",
     "scripts": {
       "start": "node src/server.js",
       "dev": "nodemon src/server.js",
       "test": "echo \"No tests specified\""
     },
     "keywords": ["api", "express", "backend", "rest", "template"],
     "author": "{{AUTHOR_NAME}}",
     "license": "MIT"
   }
   ```

6. **Convert to template:**
   ```bash
   npx @m5nv/make-template convert --yes
   ```

### Expected Result

Another template created successfully, ready for use in scaffolding tutorials.

## Step 3: Create Full-Stack App Template

Finally, let's create a full-stack application template that combines frontend and backend, demonstrating advanced template features.

### Instructions

1. **Navigate back to the workshop directory:**
   ```bash
   cd ..
   ```

2. **Create the full-stack project:**
   ```bash
   mkdir fullstack-app
   cd fullstack-app
   npm init -y
   npm install express react react-dom cors helmet dotenv concurrently
   npm install --save-dev @babel/core @babel/preset-react webpack webpack-cli webpack-dev-server html-webpack-plugin babel-loader nodemon
   ```

3. **Create the project structure:**
   ```bash
   mkdir client server shared
   mkdir client/src client/public
   mkdir server/routes server/models server/middleware
   ```

4. **Create client files:**

   **client/src/index.js:**
   ```javascript
   import React from 'react';
   import ReactDOM from 'react-dom/client';
   import App from './App';

   const root = ReactDOM.createRoot(document.getElementById('root'));
   root.render(<App />);
   ```

   **client/src/App.js:**
   ```javascript
   import React, { useState, useEffect } from 'react';

   function App() {
     const [users, setUsers] = useState([]);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       fetch('/api/users')
         .then(res => res.json())
         .then(data => {
           setUsers(data);
           setLoading(false);
         })
         .catch(err => {
           console.error('Failed to fetch users:', err);
           setLoading(false);
         });
     }, []);

     return (
       <div className="App">
         <header>
           <h1>{{PROJECT_NAME}}</h1>
           <p>Full-Stack Application</p>
         </header>
         <main>
           <h2>Users</h2>
           {loading ? (
             <p>Loading users...</p>
           ) : (
             <ul>
               {users.map(user => (
                 <li key={user.id}>{user.name} - {user.email}</li>
               ))}
             </ul>
           )}
         </main>
       </div>
     );
   }

   export default App;
   ```

   **client/public/index.html:**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>{{PROJECT_NAME}}</title>
   </head>
   <body>
     <div id="root"></div>
   </body>
   </html>
   ```

5. **Create server files:**

   **server/server.js:**
   ```javascript
   const express = require('express');
   const cors = require('cors');
   const helmet = require('helmet');
   const path = require('path');
   require('dotenv').config();

   const app = express();
   const PORT = process.env.PORT || 3000;

   // Middleware
   app.use(helmet());
   app.use(cors());
   app.use(express.json());

   // API Routes
   app.use('/api/users', require('./routes/users'));

   // Serve static files from React app in production
   if (process.env.NODE_ENV === 'production') {
     app.use(express.static(path.join(__dirname, '../client/dist')));
     app.get('*', (req, res) => {
       res.sendFile(path.join(__dirname, '../client/dist/index.html'));
     });
   }

   // Health check
   app.get('/health', (req, res) => {
     res.json({ status: 'OK', service: '{{PROJECT_NAME}}' });
   });

   app.listen(PORT, () => {
     console.log(`🚀 {{PROJECT_NAME}} server running on port ${PORT}`);
   });

   module.exports = app;
   ```

   **server/routes/users.js:**
   ```javascript
   const express = require('express');
   const router = express.Router();

   // In-memory storage for demo
   let users = [
     { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date() },
     { id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date() }
   ];
   let nextId = 3;

   router.get('/', (req, res) => {
     res.json(users);
   });

   router.post('/', (req, res) => {
     const { name, email } = req.body;
     if (!name || !email) {
       return res.status(400).json({ error: 'Name and email required' });
     }

     const user = { id: nextId++, name, email, createdAt: new Date() };
     users.push(user);
     res.status(201).json(user);
   });

   module.exports = router;
   ```

6. **Update package.json with full-stack scripts:**
   ```json
   {
     "name": "fullstack-app",
     "version": "1.0.0",
     "description": "A full-stack application template with React frontend and Express backend",
     "main": "server/server.js",
     "scripts": {
       "start": "NODE_ENV=production node server/server.js",
       "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
       "dev:server": "nodemon server/server.js",
       "dev:client": "cd client && webpack serve --mode development",
       "build": "cd client && webpack --mode production",
       "test": "echo \"No tests specified\""
     },
     "keywords": ["fullstack", "react", "express", "frontend", "backend", "template"],
     "author": "{{AUTHOR_NAME}}",
     "license": "MIT"
   }
   ```

7. **Convert to template:**
   ```bash
   npx @m5nv/make-template convert --yes
   ```

### Expected Result

Your third and final template is created, completing the set of templates that will be used in the create-scaffold tutorial.

## What you accomplished

You successfully created three templates that demonstrate different project types:

1. **Basic React App** - Frontend-focused template with modern React setup
2. **API Server** - Backend service template with REST API patterns
3. **Full-Stack App** - Complete application combining frontend and backend

Each template includes:
- Proper project structure and dependencies
- Placeholder variables for customization ({{PROJECT_NAME}}, {{AUTHOR_NAME}})
- Working npm scripts and configuration
- Template metadata and setup scripts

## Next steps

Now that you've created these templates, learn how to use them:

- **[Create Scaffold Tutorial](create-scaffold.md)** — Learn how to scaffold new projects using the templates you just created
- [How to Create Templates](../how-to/creating-templates.md) — Advanced template authoring techniques
- [Author Workflow](../how-to/author-workflow.md) — Professional template development practices
- [Template Validation](../reference/cli-reference.md#make-template-validate) — Ensure template quality

## Template locations

Your templates are now ready in the `template-workshop` directory:
- `template-workshop/basic-react-app/` - React frontend template
- `template-workshop/api-server/` - Express API backend template  
- `template-workshop/fullstack-app/` - Full-stack application template

These will be used in the next tutorial to demonstrate scaffolding from templates.

## Troubleshooting

### Template conversion fails

**Problem:** `make-template convert` fails with errors
**Solution:**
1. Ensure you're in a Node.js project directory with `package.json`
2. Check for file permission issues
3. Clean the project of build artifacts and temporary files
4. Use `--yes` flag to skip development repository warnings

### Missing dependencies

**Problem:** Template creation fails due to missing npm packages
**Solution:**
1. Run `npm install` in each project directory before conversion
2. Ensure all required dependencies are listed in `package.json`
3. Check that package names are spelled correctly

### Placeholder variables not working

**Problem:** Placeholders like `{{PROJECT_NAME}}` aren't being replaced
**Solution:**
1. Verify placeholders use double curly braces: `{{VARIABLE_NAME}}`
2. Check that variables are defined in the template's `template.json`
3. Ensure placeholders are in the correct file types (not binary files)

### Template structure issues

**Problem:** Converted template doesn't have expected structure
**Solution:**
1. Review the generated `template.json` for correct metadata
2. Check that `_setup.mjs` was created properly
3. Verify all source files are included in the template
4. Use `make-template validate` to check template integrity</content>
<parameter name="filePath">/Users/vijay/workspaces/ws-million-views/create/docs/tutorial/make-template.md