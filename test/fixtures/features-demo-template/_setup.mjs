#!/usr/bin/env node

/**
 * Features Demo Template Setup Script
 * 
 * This setup script demonstrates feature-based customizations using the
 * Environment_Object interface. It creates appropriate files and directories
 * based on the user's selected features.
 */

import fs from 'fs/promises';
import path from 'path';

export default async function setup(env) {
  console.log('🔧 Setting up feature-based configuration...');
  
  // Validate Environment_Object
  if (!env || typeof env !== 'object') {
    throw new Error('Setup script must receive Environment_Object parameter');
  }
  
  const { projectDir, projectName, ide, features } = env;
  
  console.log(`📁 Project: ${projectName}`);
  console.log(`🎯 IDE: ${ide || 'none specified'}`);
  console.log(`⚡ Features: ${features?.length ? features.join(', ') : 'none'}`);
  
  // Create feature-specific modules
  if (features && features.length > 0) {
    await createFeatureModules(projectDir, features);
  } else {
    console.log('ℹ️  No features specified, using basic setup');
  }
  
  // Update package.json with feature information
  await updatePackageJson(projectDir, features);
  
  console.log('✅ Features setup completed successfully!');
}/**
 * C
reates feature-specific modules and files
 */
async function createFeatureModules(projectDir, features) {
  const srcDir = path.join(projectDir, 'src');
  await fs.mkdir(srcDir, { recursive: true });
  
  for (const feature of features) {
    switch (feature.toLowerCase()) {
      case 'auth':
        await createAuthFeature(projectDir);
        break;
      case 'database':
        await createDatabaseFeature(projectDir);
        break;
      case 'api':
        await createApiFeature(projectDir);
        break;
      case 'testing':
        await createTestingFeature(projectDir);
        break;
      case 'logging':
        await createLoggingFeature(projectDir);
        break;
      case 'config':
        await createConfigFeature(projectDir);
        break;
      default:
        console.log(`⚠️  Unknown feature: ${feature}, skipping`);
    }
  }
}

/**
 * Creates authentication feature files
 */
async function createAuthFeature(projectDir) {
  const authDir = path.join(projectDir, 'src', 'auth');
  await fs.mkdir(authDir, { recursive: true });
  
  // Auth module
  const authModule = `/**
 * Authentication Module
 * Provides login/logout functionality
 */

class AuthService {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
  }
  
  async login(username, password) {
    // Simple demo implementation
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
  
  async register(username, password) {
    if (this.users.has(username)) {
      return { success: false, error: 'User already exists' };
    }
    this.users.set(username, { username, password });
    return { success: true };
  }
}

export default AuthService;
`;
  
  await fs.writeFile(path.join(authDir, 'auth.js'), authModule);
  
  // Auth middleware
  const middleware = `/**
 * Authentication Middleware
 */

export function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Add session validation logic here
  next();
}

export function optionalAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    // Add session validation logic here
    req.user = { sessionId };
  }
  next();
}
`;
  
  await fs.writeFile(path.join(authDir, 'middleware.js'), middleware);
  
  console.log('🔐 Created authentication feature');
}

/**
 * Creates database feature files
 */
async function createDatabaseFeature(projectDir) {
  const dbDir = path.join(projectDir, 'src', 'database');
  await fs.mkdir(dbDir, { recursive: true });
  
  // Database connection utility
  const dbModule = `/**
 * Database Connection Module
 * Provides database connectivity and utilities
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
  }
  
  async connect() {
    // Demo implementation - replace with actual database driver
    console.log('Connecting to database:', this.config);
    this.connected = true;
    return { success: true };
  }
  
  async disconnect() {
    this.connected = false;
    console.log('Disconnected from database');
  }
  
  async query(sql, params = []) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    // Demo implementation
    console.log('Executing query:', sql, params);
    return { rows: [], rowCount: 0 };
  }
  
  async transaction(callback) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    try {
      console.log('Starting transaction');
      const result = await callback(this);
      console.log('Committing transaction');
      return result;
    } catch (error) {
      console.log('Rolling back transaction');
      throw error;
    }
  }
}

export default DatabaseService;
`;
  
  await fs.writeFile(path.join(dbDir, 'database.js'), dbModule);
  
  // Database models
  const models = `/**
 * Database Models
 */

export class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.createdAt = data.createdAt || new Date();
  }
  
  static async findById(db, id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }
  
  static async findByUsername(db, username) {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }
  
  async save(db) {
    if (this.id) {
      // Update existing user
      await db.query(
        'UPDATE users SET username = $1, email = $2 WHERE id = $3',
        [this.username, this.email, this.id]
      );
    } else {
      // Create new user
      const result = await db.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id',
        [this.username, this.email]
      );
      this.id = result.rows[0].id;
    }
    return this;
  }
}
`;
  
  await fs.writeFile(path.join(dbDir, 'models.js'), models);
  
  console.log('🗄️  Created database feature');
}

/**
 * Creates API feature files
 */
async function createApiFeature(projectDir) {
  const apiDir = path.join(projectDir, 'src', 'api');
  await fs.mkdir(apiDir, { recursive: true });
  
  // API routes
  const routes = `/**
 * API Routes
 * RESTful API endpoints
 */

export class ApiRoutes {
  constructor(app) {
    this.app = app;
    this.setupRoutes();
  }
  
  setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // User endpoints
    this.app.get('/api/users', this.getUsers.bind(this));
    this.app.get('/api/users/:id', this.getUserById.bind(this));
    this.app.post('/api/users', this.createUser.bind(this));
    this.app.put('/api/users/:id', this.updateUser.bind(this));
    this.app.delete('/api/users/:id', this.deleteUser.bind(this));
  }
  
  async getUsers(req, res) {
    // Demo implementation
    res.json({ users: [], total: 0 });
  }
  
  async getUserById(req, res) {
    const { id } = req.params;
    // Demo implementation
    res.json({ user: { id, username: 'demo' } });
  }
  
  async createUser(req, res) {
    const userData = req.body;
    // Demo implementation
    res.status(201).json({ user: { id: Date.now(), ...userData } });
  }
  
  async updateUser(req, res) {
    const { id } = req.params;
    const userData = req.body;
    // Demo implementation
    res.json({ user: { id, ...userData } });
  }
  
  async deleteUser(req, res) {
    const { id } = req.params;
    // Demo implementation
    res.status(204).send();
  }
}
`;
  
  await fs.writeFile(path.join(apiDir, 'routes.js'), routes);
  
  // API middleware
  const middleware = `/**
 * API Middleware
 */

export function jsonParser(req, res, next) {
  // Simple JSON parser middleware
  if (req.headers['content-type'] === 'application/json') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        req.body = JSON.parse(body);
        next();
      } catch (error) {
        res.status(400).json({ error: 'Invalid JSON' });
      }
    });
  } else {
    next();
  }
}

export function corsMiddleware(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
  } else {
    next();
  }
}

export function errorHandler(err, req, res, next) {
  console.error('API Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
}
`;
  
  await fs.writeFile(path.join(apiDir, 'middleware.js'), middleware);
  
  console.log('🌐 Created API feature');
}

/**
 * Creates testing feature files
 */
async function createTestingFeature(projectDir) {
  const testsDir = path.join(projectDir, 'tests');
  await fs.mkdir(testsDir, { recursive: true });
  
  // Test utilities
  const testUtils = `/**
 * Test Utilities
 * Helper functions for testing
 */

export class TestUtils {
  static async createTestData() {
    return {
      users: [
        { id: 1, username: 'testuser1', email: 'test1@example.com' },
        { id: 2, username: 'testuser2', email: 'test2@example.com' }
      ]
    };
  }
  
  static async cleanupTestData() {
    // Cleanup test database, files, etc.
    console.log('Cleaning up test data');
  }
  
  static assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || 'Assertion failed: ' + actual + ' !== ' + expected);
    }
  }
  
  static assertDeepEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || 'Deep assertion failed');
    }
  }
  
  static async assertThrows(fn, expectedError, message) {
    try {
      await fn();
      throw new Error(message || 'Expected function to throw');
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error('Expected error containing: ' + expectedError + ', got: ' + error.message);
      }
    }
  }
}
`;
  
  await fs.writeFile(path.join(testsDir, 'utils.js'), testUtils);
  
  // Example test file
  const exampleTest = `/**
 * Example Test File
 * Demonstrates testing patterns
 */

import { TestUtils } from './utils.js';

class ExampleTests {
  async runAll() {
    console.log('🧪 Running example tests...');
    
    await this.testBasicFunctionality();
    await this.testErrorHandling();
    
    console.log('✅ All example tests passed!');
  }
  
  async testBasicFunctionality() {
    console.log('  ▶ Testing basic functionality');
    
    const testData = await TestUtils.createTestData();
    TestUtils.assertEqual(testData.users.length, 2, 'Should have 2 test users');
    TestUtils.assertEqual(testData.users[0].username, 'testuser1', 'First user should be testuser1');
    
    console.log('  ✅ Basic functionality test passed');
  }
  
  async testErrorHandling() {
    console.log('  ▶ Testing error handling');
    
    await TestUtils.assertThrows(
      () => { throw new Error('Test error'); },
      'Test error',
      'Should throw test error'
    );
    
    console.log('  ✅ Error handling test passed');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === 'file://' + process.argv[1]) {
  const tests = new ExampleTests();
  tests.runAll().catch(error => {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  });
}

export default ExampleTests;
`;
  
  await fs.writeFile(path.join(testsDir, 'example.test.js'), exampleTest);
  
  console.log('🧪 Created testing feature');
}/**

 * Creates logging feature files
 */
async function createLoggingFeature(projectDir) {
  const loggingDir = path.join(projectDir, 'src', 'logging');
  await fs.mkdir(loggingDir, { recursive: true });
  
  // Logger module
  const logger = `/**
 * Logging Module
 * Structured logging with different levels
 */

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.format = options.format || 'json';
    this.output = options.output || 'console';
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }
  
  log(level, message, meta = {}) {
    if (this.levels[level] > this.levels[this.level]) {
      return; // Skip if level is below threshold
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    };
    
    if (this.format === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log('[' + logEntry.timestamp + '] ' + level.toUpperCase() + ': ' + message);
    }
  }
  
  error(message, meta) {
    this.log('error', message, meta);
  }
  
  warn(message, meta) {
    this.log('warn', message, meta);
  }
  
  info(message, meta) {
    this.log('info', message, meta);
  }
  
  debug(message, meta) {
    this.log('debug', message, meta);
  }
}

// Create default logger instance
export const logger = new Logger();

export default Logger;
`;
  
  await fs.writeFile(path.join(loggingDir, 'logger.js'), logger);
  
  console.log('📝 Created logging feature');
}

/**
 * Creates configuration feature files
 */
async function createConfigFeature(projectDir) {
  const configDir = path.join(projectDir, 'config');
  await fs.mkdir(configDir, { recursive: true });
  
  // Configuration manager
  const configManager = `/**
 * Configuration Manager
 * Handles application configuration from multiple sources
 */

import fs from 'fs/promises';
import path from 'path';

class ConfigManager {
  constructor() {
    this.config = {};
    this.loaded = false;
  }
  
  async load(configPath = null) {
    // Load from environment variables
    this.loadFromEnv();
    
    // Load from config file if provided
    if (configPath) {
      await this.loadFromFile(configPath);
    }
    
    // Set defaults
    this.setDefaults();
    
    this.loaded = true;
    return this.config;
  }
  
  loadFromEnv() {
    this.config.port = process.env.PORT || 3000;
    this.config.nodeEnv = process.env.NODE_ENV || 'development';
    this.config.logLevel = process.env.LOG_LEVEL || 'info';
    
    // Database configuration
    this.config.database = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      name: process.env.DB_NAME || 'myapp',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };
  }
  
  async loadFromFile(configPath) {
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      const fileConfig = JSON.parse(configContent);
      
      // Merge file config with existing config
      this.config = { ...this.config, ...fileConfig };
    } catch (error) {
      console.warn('Could not load config file:', error.message);
    }
  }
  
  setDefaults() {
    this.config.app = {
      name: 'Features Demo App',
      version: '1.0.0',
      ...this.config.app
    };
    
    this.config.server = {
      host: '0.0.0.0',
      port: this.config.port,
      ...this.config.server
    };
  }
  
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }
  
  set(key, value) {
    const keys = key.split('.');
    let target = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    target[keys[keys.length - 1]] = value;
  }
}

// Create default config manager instance
export const config = new ConfigManager();

export default ConfigManager;
`;
  
  await fs.writeFile(path.join(configDir, 'config.js'), configManager);
  
  // Default configuration file
  const defaultConfig = {
    app: {
      name: "Features Demo App",
      version: "1.0.0"
    },
    server: {
      host: "0.0.0.0",
      port: 3000
    },
    database: {
      host: "localhost",
      port: 5432,
      name: "myapp"
    },
    logging: {
      level: "info",
      format: "json"
    }
  };
  
  await fs.writeFile(
    path.join(configDir, 'default.json'),
    JSON.stringify(defaultConfig, null, 2)
  );
  
  // Environment-specific configs
  const developmentConfig = {
    ...defaultConfig,
    logging: {
      level: "debug",
      format: "text"
    },
    database: {
      ...defaultConfig.database,
      name: "myapp_dev"
    }
  };
  
  await fs.writeFile(
    path.join(configDir, 'development.json'),
    JSON.stringify(developmentConfig, null, 2)
  );
  
  const productionConfig = {
    ...defaultConfig,
    logging: {
      level: "warn",
      format: "json"
    },
    database: {
      ...defaultConfig.database,
      name: "myapp_prod"
    }
  };
  
  await fs.writeFile(
    path.join(configDir, 'production.json'),
    JSON.stringify(productionConfig, null, 2)
  );
  
  console.log('⚙️  Created configuration feature');
}

/**
 * Updates package.json with feature information
 */
async function updatePackageJson(projectDir, features) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  
  try {
    const packageContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    // Add feature information to package.json
    packageJson.features = {
      enabled: features || [],
      configuredAt: new Date().toISOString()
    };
    
    // Add feature-specific dependencies and scripts
    if (features && features.length > 0) {
      packageJson.scripts = packageJson.scripts || {};
      
      if (features.includes('testing')) {
        packageJson.scripts.test = 'node tests/example.test.js';
      }
      
      if (features.includes('api')) {
        packageJson.scripts.api = 'node src/api/server.js';
      }
    }
    
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2)
    );
    
    console.log('📦 Updated package.json with feature information');
  } catch (error) {
    console.warn('⚠️  Could not update package.json:', error.message);
  }
}