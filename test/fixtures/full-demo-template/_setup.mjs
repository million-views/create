#!/usr/bin/env node

/**
 * Full Demo Template Setup Script
 * 
 * This setup script demonstrates comprehensive IDE and feature-based 
 * customizations using the Environment_Object interface. It intelligently
 * combines IDE-specific settings with feature-based modules.
 */

import fs from 'fs/promises';
import path from 'path';

export default async function setup(env) {
  console.log('🔧 Setting up comprehensive IDE and feature configuration...');
  
  // Validate Environment_Object
  if (!env || typeof env !== 'object') {
    throw new Error('Setup script must receive Environment_Object parameter');
  }
  
  const { projectDir, projectName, ide, features } = env;
  
  console.log(`📁 Project: ${projectName}`);
  console.log(`🎯 IDE: ${ide || 'none specified'}`);
  console.log(`⚡ Features: ${features?.length ? features.join(', ') : 'none'}`);
  
  // Create IDE-specific configuration
  if (ide) {
    await createIdeConfiguration(projectDir, ide, features);
  } else {
    console.log('ℹ️  No IDE specified, skipping IDE-specific setup');
  }
  
  // Create feature-specific modules
  if (features && features.length > 0) {
    await createFeatureModules(projectDir, features, ide);
  } else {
    console.log('ℹ️  No features specified, using basic setup');
  }
  
  // Create integrated configuration
  await createIntegratedConfig(projectDir, ide, features);
  
  // Update package.json with comprehensive information
  await updatePackageJson(projectDir, ide, features);
  
  console.log('✅ Comprehensive setup completed successfully!');
}/*
*
 * Creates IDE-specific configuration optimized for selected features
 */
async function createIdeConfiguration(projectDir, ide, features) {
  switch (ide.toLowerCase()) {
    case 'kiro':
      await createKiroConfig(projectDir, features);
      break;
    case 'vscode':
      await createVSCodeConfig(projectDir, features);
      break;
    case 'cursor':
      await createCursorConfig(projectDir, features);
      break;
    case 'windsurf':
      await createWindsurfConfig(projectDir, features);
      break;
    default:
      console.log(`⚠️  Unknown IDE: ${ide}, skipping IDE-specific setup`);
  }
}

/**
 * Creates Kiro-specific configuration with feature optimizations
 */
async function createKiroConfig(projectDir, features) {
  const kiroDir = path.join(projectDir, '.kiro');
  await fs.mkdir(kiroDir, { recursive: true });
  
  // Base Kiro settings
  const settings = {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "files.autoSave": "afterDelay",
    "terminal.integrated.shell": "/bin/zsh"
  };
  
  // Feature-specific settings
  if (features?.includes('testing')) {
    settings["kiro.testing.autoRun"] = true;
    settings["kiro.testing.framework"] = "custom";
  }
  
  if (features?.includes('api')) {
    settings["kiro.api.autoComplete"] = true;
    settings["kiro.api.linting"] = true;
  }
  
  await fs.writeFile(
    path.join(kiroDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  // Feature-optimized tasks
  const tasks = {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "Start Application",
        "type": "shell",
        "command": "npm start",
        "group": "build"
      }
    ]
  };
  
  if (features?.includes('testing')) {
    tasks.tasks.push({
      "label": "Run Tests",
      "type": "shell",
      "command": "npm test",
      "group": "test"
    });
  }
  
  if (features?.includes('api')) {
    tasks.tasks.push({
      "label": "Start API Server",
      "type": "shell",
      "command": "npm run api",
      "group": "build"
    });
  }
  
  await fs.writeFile(
    path.join(kiroDir, 'tasks.json'),
    JSON.stringify(tasks, null, 2)
  );
  
  console.log('📝 Created Kiro configuration with feature optimizations');
}

/**
 * Creates VSCode-specific configuration with feature optimizations
 */
async function createVSCodeConfig(projectDir, features) {
  const vscodeDir = path.join(projectDir, '.vscode');
  await fs.mkdir(vscodeDir, { recursive: true });
  
  // Base VSCode settings
  const settings = {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "files.autoSave": "afterDelay",
    "terminal.integrated.defaultProfile.osx": "zsh"
  };
  
  // Feature-specific settings
  if (features?.includes('database')) {
    settings["sqltools.connections"] = [];
    settings["sqltools.useNodeRuntime"] = true;
  }
  
  if (features?.includes('api')) {
    settings["rest-client.enableTelemetry"] = false;
    settings["thunder-client.saveToWorkspace"] = true;
  }
  
  await fs.writeFile(
    path.join(vscodeDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  // Feature-optimized extensions
  const extensions = {
    "recommendations": [
      "ms-vscode.vscode-node-azure-pack",
      "esbenp.prettier-vscode"
    ]
  };
  
  if (features?.includes('database')) {
    extensions.recommendations.push("mtxr.sqltools");
  }
  
  if (features?.includes('api')) {
    extensions.recommendations.push("rangav.vscode-thunder-client");
  }
  
  if (features?.includes('testing')) {
    extensions.recommendations.push("ms-vscode.test-adapter-converter");
  }
  
  await fs.writeFile(
    path.join(vscodeDir, 'extensions.json'),
    JSON.stringify(extensions, null, 2)
  );
  
  console.log('📝 Created VSCode configuration with feature optimizations');
}

/**
 * Creates Cursor-specific configuration with feature optimizations
 */
async function createCursorConfig(projectDir, features) {
  const cursorDir = path.join(projectDir, '.cursor');
  await fs.mkdir(cursorDir, { recursive: true });
  
  // Base Cursor settings
  const settings = {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "files.autoSave": "afterDelay",
    "cursor.ai.enabled": true,
    "cursor.ai.model": "gpt-4"
  };
  
  // Feature-specific AI context
  const aiConfig = {
    "rules": [
      "Use modern JavaScript/Node.js patterns",
      "Prefer async/await over callbacks",
      "Use ES modules syntax"
    ],
    "context": {
      "includeFiles": ["*.js", "*.mjs", "*.json"],
      "excludeFiles": ["node_modules/**"]
    }
  };
  
  if (features?.includes('auth')) {
    aiConfig.rules.push("Implement secure authentication patterns");
    aiConfig.rules.push("Use proper session management");
  }
  
  if (features?.includes('database')) {
    aiConfig.rules.push("Use parameterized queries to prevent SQL injection");
    aiConfig.rules.push("Implement proper database connection pooling");
  }
  
  if (features?.includes('api')) {
    aiConfig.rules.push("Follow RESTful API design principles");
    aiConfig.rules.push("Implement proper error handling for API endpoints");
  }
  
  await fs.writeFile(
    path.join(cursorDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  await fs.writeFile(
    path.join(cursorDir, 'ai-config.json'),
    JSON.stringify(aiConfig, null, 2)
  );
  
  console.log('📝 Created Cursor configuration with feature optimizations');
}

/**
 * Creates Windsurf-specific configuration with feature optimizations
 */
async function createWindsurfConfig(projectDir, features) {
  const windsurfDir = path.join(projectDir, '.windsurf');
  await fs.mkdir(windsurfDir, { recursive: true });
  
  // Base Windsurf settings
  const settings = {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "files.autoSave": "afterDelay",
    "windsurf.ai.enabled": true,
    "windsurf.collaboration.enabled": true
  };
  
  // Feature-specific project configuration
  const projectConfig = {
    "name": "Full Demo Project",
    "type": "node",
    "entryPoint": "index.js",
    "collaboration": {
      "enabled": true,
      "shareSettings": true
    },
    "features": features || []
  };
  
  if (features?.includes('api')) {
    projectConfig.apiEndpoints = "/api";
    projectConfig.serverPort = 3000;
  }
  
  if (features?.includes('database')) {
    projectConfig.database = {
      "type": "postgresql",
      "migrations": "migrations/"
    };
  }
  
  await fs.writeFile(
    path.join(windsurfDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  await fs.writeFile(
    path.join(windsurfDir, 'project.json'),
    JSON.stringify(projectConfig, null, 2)
  );
  
  console.log('📝 Created Windsurf configuration with feature optimizations');
}/**
 * C
reates feature-specific modules optimized for the selected IDE
 */
async function createFeatureModules(projectDir, features, ide) {
  const srcDir = path.join(projectDir, 'src');
  await fs.mkdir(srcDir, { recursive: true });
  
  for (const feature of features) {
    switch (feature.toLowerCase()) {
      case 'auth':
        await createAuthFeature(projectDir, ide);
        break;
      case 'database':
        await createDatabaseFeature(projectDir, ide);
        break;
      case 'api':
        await createApiFeature(projectDir, ide);
        break;
      case 'testing':
        await createTestingFeature(projectDir, ide);
        break;
      case 'logging':
        await createLoggingFeature(projectDir, ide);
        break;
      case 'config':
        await createConfigFeature(projectDir, ide);
        break;
      default:
        console.log(`⚠️  Unknown feature: ${feature}, skipping`);
    }
  }
}

/**
 * Creates authentication feature with IDE-specific optimizations
 */
async function createAuthFeature(projectDir, ide) {
  const authDir = path.join(projectDir, 'src', 'auth');
  await fs.mkdir(authDir, { recursive: true });
  
  // IDE-optimized auth module
  let authModule = `/**
 * Authentication Module
 * IDE: ${ide || 'generic'}
 * Provides login/logout functionality with IDE-specific optimizations
 */

class AuthService {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
  }
  
  async login(username, password) {
    // Enhanced logging for different IDEs
    ${ide === 'kiro' ? 'console.log("[KIRO-AUTH] Login attempt for:", username);' : ''}
    ${ide === 'cursor' ? '// Cursor AI: This method handles user authentication' : ''}
    
    if (this.users.has(username)) {
      const user = this.users.get(username);
      if (user.password === password) {
        const sessionId = Math.random().toString(36).slice(2);
        this.sessions.set(sessionId, { username, loginTime: new Date() });
        return { success: true, sessionId };
      }
    }
    return { success: false, error: 'Invalid credentials' };
  }
  
  async logout(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      return { success: true };
    }
    return { success: false, error: 'Invalid session' };
  }
}

export default AuthService;
`;
  
  await fs.writeFile(path.join(authDir, 'auth.js'), authModule);
  console.log('🔐 Created authentication feature with IDE optimizations');
}

/**
 * Creates database feature with IDE-specific optimizations
 */
async function createDatabaseFeature(projectDir, ide) {
  const dbDir = path.join(projectDir, 'src', 'database');
  await fs.mkdir(dbDir, { recursive: true });
  
  // IDE-optimized database module
  const dbModule = `/**
 * Database Module
 * IDE: ${ide || 'generic'}
 * Provides database connectivity with IDE-specific debugging
 */

class DatabaseService {
  constructor(config = {}) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || 'myapp',
      ...config
    };
    this.connected = false;
    
    ${ide === 'vscode' ? '// VSCode: Use SQLTools extension for database management' : ''}
    ${ide === 'windsurf' ? '// Windsurf: Collaboration-friendly database setup' : ''}
  }
  
  async connect() {
    console.log('Connecting to database:', this.config);
    this.connected = true;
    return { success: true };
  }
  
  async query(sql, params = []) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    ${ide === 'cursor' ? '// Cursor AI: This method executes SQL queries safely' : ''}
    console.log('Executing query:', sql, params);
    return { rows: [], rowCount: 0 };
  }
}

export default DatabaseService;
`;
  
  await fs.writeFile(path.join(dbDir, 'database.js'), dbModule);
  console.log('🗄️  Created database feature with IDE optimizations');
}

/**
 * Creates API feature with IDE-specific optimizations
 */
async function createApiFeature(projectDir, ide) {
  const apiDir = path.join(projectDir, 'src', 'api');
  await fs.mkdir(apiDir, { recursive: true });
  
  // IDE-optimized API routes
  const routes = `/**
 * API Routes
 * IDE: ${ide || 'generic'}
 * RESTful API endpoints with IDE-specific features
 */

export class ApiRoutes {
  constructor(app) {
    this.app = app;
    this.setupRoutes();
    
    ${ide === 'vscode' ? '// VSCode: Use Thunder Client extension for API testing' : ''}
    ${ide === 'cursor' ? '// Cursor AI: RESTful endpoints with intelligent completion' : ''}
  }
  
  setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        ide: '${ide || 'generic'}'
      });
    });
    
    // User endpoints with IDE-specific logging
    this.app.get('/api/users', this.getUsers.bind(this));
    this.app.post('/api/users', this.createUser.bind(this));
  }
  
  async getUsers(req, res) {
    ${ide === 'kiro' ? 'console.log("[KIRO-API] Fetching users");' : ''}
    res.json({ users: [], total: 0 });
  }
  
  async createUser(req, res) {
    const userData = req.body;
    ${ide === 'windsurf' ? '// Windsurf: Collaborative user creation' : ''}
    res.status(201).json({ user: { id: Date.now(), ...userData } });
  }
}
`;
  
  await fs.writeFile(path.join(apiDir, 'routes.js'), routes);
  console.log('🌐 Created API feature with IDE optimizations');
}

/**
 * Creates testing feature with IDE-specific optimizations
 */
async function createTestingFeature(projectDir, ide) {
  const testsDir = path.join(projectDir, 'tests');
  await fs.mkdir(testsDir, { recursive: true });
  
  // IDE-optimized test utilities
  const testUtils = `/**
 * Test Utilities
 * IDE: ${ide || 'generic'}
 * Testing framework optimized for ${ide || 'generic development'}
 */

export class TestUtils {
  static async createTestData() {
    ${ide === 'kiro' ? 'console.log("[KIRO-TEST] Creating test data");' : ''}
    return {
      users: [
        { id: 1, username: 'testuser1', email: 'test1@example.com' },
        { id: 2, username: 'testuser2', email: 'test2@example.com' }
      ]
    };
  }
  
  static assertEqual(actual, expected, message) {
    if (actual !== expected) {
      ${ide === 'cursor' ? '// Cursor AI: Assertion failed - check test logic' : ''}
      throw new Error(message || 'Assertion failed: ' + actual + ' !== ' + expected);
    }
    ${ide === 'vscode' ? '// VSCode: Use Test Explorer for better test management' : ''}
  }
}
`;
  
  await fs.writeFile(path.join(testsDir, 'utils.js'), testUtils);
  console.log('🧪 Created testing feature with IDE optimizations');
}

/**
 * Creates logging feature with IDE-specific optimizations
 */
async function createLoggingFeature(projectDir, ide) {
  const loggingDir = path.join(projectDir, 'src', 'logging');
  await fs.mkdir(loggingDir, { recursive: true });
  
  // IDE-optimized logger
  const logger = `/**
 * Logging Module
 * IDE: ${ide || 'generic'}
 * Structured logging optimized for ${ide || 'generic development'}
 */

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.format = options.format || 'json';
    this.ide = '${ide || 'generic'}';
    
    ${ide === 'kiro' ? 'this.format = "kiro"; // Kiro-specific log format' : ''}
    ${ide === 'vscode' ? 'this.enableVSCodeIntegration = true;' : ''}
  }
  
  log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ide: this.ide,
      ...meta
    };
    
    ${ide === 'windsurf' ? '// Windsurf: Collaborative logging for team debugging' : ''}
    console.log(JSON.stringify(logEntry));
  }
  
  info(message, meta) {
    this.log('info', message, meta);
  }
  
  error(message, meta) {
    this.log('error', message, meta);
  }
}

export const logger = new Logger();
export default Logger;
`;
  
  await fs.writeFile(path.join(loggingDir, 'logger.js'), logger);
  console.log('📝 Created logging feature with IDE optimizations');
}

/**
 * Creates configuration feature with IDE-specific optimizations
 */
async function createConfigFeature(projectDir, ide) {
  const configDir = path.join(projectDir, 'config');
  await fs.mkdir(configDir, { recursive: true });
  
  // IDE-optimized configuration
  const defaultConfig = {
    app: {
      name: "Full Demo App",
      version: "1.0.0",
      ide: ide || "generic"
    },
    server: {
      host: "0.0.0.0",
      port: 3000
    },
    ide: {
      name: ide || "generic",
      optimizations: ide ? `${ide}-specific optimizations enabled` : "generic setup"
    }
  };
  
  // IDE-specific configuration adjustments
  if (ide === 'kiro') {
    defaultConfig.kiro = {
      autoReload: true,
      debugMode: true
    };
  } else if (ide === 'vscode') {
    defaultConfig.vscode = {
      extensionsEnabled: true,
      debuggerIntegration: true
    };
  } else if (ide === 'cursor') {
    defaultConfig.cursor = {
      aiAssistance: true,
      contextAware: true
    };
  } else if (ide === 'windsurf') {
    defaultConfig.windsurf = {
      collaboration: true,
      realTimeSync: true
    };
  }
  
  await fs.writeFile(
    path.join(configDir, 'default.json'),
    JSON.stringify(defaultConfig, null, 2)
  );
  
  console.log('⚙️  Created configuration feature with IDE optimizations');
}

/**
 * Creates integrated configuration that combines IDE and feature settings
 */
async function createIntegratedConfig(projectDir, ide, features) {
  const integratedConfig = {
    project: {
      name: "Full Demo Project",
      ide: ide || null,
      features: features || [],
      setupDate: new Date().toISOString()
    },
    integration: {
      ideFeatureOptimizations: [],
      crossFeatureIntegrations: []
    }
  };
  
  // Add IDE-feature integration notes
  if (ide && features?.length > 0) {
    if (features.includes('testing') && ide === 'vscode') {
      integratedConfig.integration.ideFeatureOptimizations.push(
        "VSCode Test Explorer integration enabled for testing feature"
      );
    }
    
    if (features.includes('database') && ide === 'vscode') {
      integratedConfig.integration.ideFeatureOptimizations.push(
        "SQLTools extension recommended for database feature"
      );
    }
    
    if (features.includes('api') && ide === 'cursor') {
      integratedConfig.integration.ideFeatureOptimizations.push(
        "Cursor AI context optimized for API development patterns"
      );
    }
  }
  
  // Add cross-feature integrations
  if (features?.includes('auth') && features?.includes('api')) {
    integratedConfig.integration.crossFeatureIntegrations.push(
      "Authentication middleware integrated with API routes"
    );
  }
  
  if (features?.includes('database') && features?.includes('auth')) {
    integratedConfig.integration.crossFeatureIntegrations.push(
      "User authentication backed by database storage"
    );
  }
  
  await fs.writeFile(
    path.join(projectDir, 'integration-config.json'),
    JSON.stringify(integratedConfig, null, 2)
  );
  
  console.log('🔗 Created integrated configuration');
}

/**
 * Updates package.json with comprehensive IDE and feature information
 */
async function updatePackageJson(projectDir, ide, features) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  
  try {
    const packageContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    // Add comprehensive configuration
    packageJson.ideConfiguration = {
      preferredIde: ide || 'none',
      configuredAt: new Date().toISOString()
    };
    
    packageJson.features = {
      enabled: features || [],
      configuredAt: new Date().toISOString()
    };
    
    // Add IDE and feature-specific scripts
    packageJson.scripts = packageJson.scripts || {};
    
    if (features?.includes('testing')) {
      packageJson.scripts.test = 'node tests/utils.js';
    }
    
    if (features?.includes('api')) {
      packageJson.scripts.api = 'node src/api/routes.js';
    }
    
    if (ide === 'kiro') {
      packageJson.scripts['kiro:debug'] = 'node --inspect index.js';
    } else if (ide === 'vscode') {
      packageJson.scripts['vscode:debug'] = 'node --inspect-brk index.js';
    }
    
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2)
    );
    
    console.log('📦 Updated package.json with comprehensive configuration');
  } catch (error) {
    console.warn('⚠️  Could not update package.json:', error.message);
  }
}