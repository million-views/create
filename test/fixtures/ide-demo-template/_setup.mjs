#!/usr/bin/env node

/**
 * IDE Demo Template Setup Script
 * 
 * This setup script demonstrates IDE-specific customizations using the
 * Environment_Object interface. It creates appropriate configuration files
 * and directories based on the user's IDE preference.
 */

import fs from 'fs/promises';
import path from 'path';

export default async function setup(env) {
  console.log('🔧 Setting up IDE-specific configuration...');
  
  // Validate Environment_Object
  if (!env || typeof env !== 'object') {
    throw new Error('Setup script must receive Environment_Object parameter');
  }
  
  const { projectDir, projectName, ide, options } = env;
  
  console.log(`📁 Project: ${projectName}`);
  console.log(`🎯 IDE: ${ide || 'none specified'}`);
  console.log(`⚡ Options: ${options?.length ? options.join(', ') : 'none'}`);
  
  // Create IDE-specific configuration
  if (ide) {
    await createIdeConfiguration(projectDir, ide);
  } else {
    console.log('ℹ️  No IDE specified, skipping IDE-specific setup');
  }
  
  // Update package.json with IDE information
  await updatePackageJson(projectDir, ide);
  
  console.log('✅ IDE setup completed successfully!');
}

/**
 * Creates IDE-specific configuration files and directories
 */
async function createIdeConfiguration(projectDir, ide) {
  switch (ide.toLowerCase()) {
    case 'kiro':
      await createKiroConfig(projectDir);
      break;
    case 'vscode':
      await createVSCodeConfig(projectDir);
      break;
    case 'cursor':
      await createCursorConfig(projectDir);
      break;
    case 'windsurf':
      await createWindsurfConfig(projectDir);
      break;
    default:
      console.log(`⚠️  Unknown IDE: ${ide}, skipping IDE-specific setup`);
  }
}

/**
 * Creates Kiro-specific configuration
 */
async function createKiroConfig(projectDir) {
  const kiroDir = path.join(projectDir, '.kiro');
  await fs.mkdir(kiroDir, { recursive: true });
  
  // Kiro settings
  const settings = {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "files.autoSave": "afterDelay",
    "terminal.integrated.shell": "/bin/zsh"
  };
  
  await fs.writeFile(
    path.join(kiroDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  // Kiro tasks configuration
  const tasks = {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "npm start",
        "type": "shell",
        "command": "npm start",
        "group": "build"
      }
    ]
  };
  
  await fs.writeFile(
    path.join(kiroDir, 'tasks.json'),
    JSON.stringify(tasks, null, 2)
  );
  
  console.log('📝 Created Kiro configuration');
}

/**
 * Creates VSCode-specific configuration
 */
async function createVSCodeConfig(projectDir) {
  const vscodeDir = path.join(projectDir, '.vscode');
  await fs.mkdir(vscodeDir, { recursive: true });
  
  // VSCode settings
  const settings = {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "files.autoSave": "afterDelay",
    "terminal.integrated.defaultProfile.osx": "zsh"
  };
  
  await fs.writeFile(
    path.join(vscodeDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  // VSCode extensions recommendations
  const extensions = {
    "recommendations": [
      "ms-vscode.vscode-node-azure-pack",
      "esbenp.prettier-vscode",
      "ms-vscode.vscode-eslint"
    ]
  };
  
  await fs.writeFile(
    path.join(vscodeDir, 'extensions.json'),
    JSON.stringify(extensions, null, 2)
  );
  
  // VSCode launch configuration
  const launch = {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Launch Program",
        "program": "${workspaceFolder}/index.js",
        "request": "launch",
        "skipFiles": ["<node_internals>/**"],
        "type": "node"
      }
    ]
  };
  
  await fs.writeFile(
    path.join(vscodeDir, 'launch.json'),
    JSON.stringify(launch, null, 2)
  );
  
  console.log('📝 Created VSCode configuration');
}

/**
 * Creates Cursor-specific configuration
 */
async function createCursorConfig(projectDir) {
  const cursorDir = path.join(projectDir, '.cursor');
  await fs.mkdir(cursorDir, { recursive: true });
  
  // Cursor settings (similar to VSCode but with Cursor-specific options)
  const settings = {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "files.autoSave": "afterDelay",
    "cursor.ai.enabled": true,
    "cursor.ai.model": "gpt-4"
  };
  
  await fs.writeFile(
    path.join(cursorDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  // Cursor AI configuration
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
  
  await fs.writeFile(
    path.join(cursorDir, 'ai-config.json'),
    JSON.stringify(aiConfig, null, 2)
  );
  
  console.log('📝 Created Cursor configuration');
}

/**
 * Creates Windsurf-specific configuration
 */
async function createWindsurfConfig(projectDir) {
  const windsurfDir = path.join(projectDir, '.windsurf');
  await fs.mkdir(windsurfDir, { recursive: true });
  
  // Windsurf settings
  const settings = {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "files.autoSave": "afterDelay",
    "windsurf.ai.enabled": true,
    "windsurf.collaboration.enabled": true
  };
  
  await fs.writeFile(
    path.join(windsurfDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  // Windsurf project configuration
  const projectConfig = {
    "name": "IDE Demo Project",
    "type": "node",
    "entryPoint": "index.js",
    "collaboration": {
      "enabled": true,
      "shareSettings": true
    }
  };
  
  await fs.writeFile(
    path.join(windsurfDir, 'project.json'),
    JSON.stringify(projectConfig, null, 2)
  );
  
  console.log('📝 Created Windsurf configuration');
}

/**
 * Updates package.json with IDE information
 */
async function updatePackageJson(projectDir, ide) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  
  try {
    const packageContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    // Add IDE information to package.json
    packageJson.ideConfiguration = {
      preferredIde: ide || 'none',
      configuredAt: new Date().toISOString()
    };
    
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2)
    );
    
    console.log('📦 Updated package.json with IDE information');
  } catch (error) {
    console.warn('⚠️  Could not update package.json:', error.message);
  }
}