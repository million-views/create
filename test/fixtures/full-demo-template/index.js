#!/usr/bin/env node

/**
 * Full Demo Project
 * This application demonstrates both IDE-specific and feature-based setup.
 */

console.log('Welcome to the Full Demo Project!');
console.log('This project was configured for your IDE and selected features.');

// Check for IDE-specific configuration
const fs = require('fs');
const path = require('path');

const ideConfigs = [
  { name: 'Kiro', dir: '.kiro' },
  { name: 'VSCode', dir: '.vscode' },
  { name: 'Cursor', dir: '.cursor' },
  { name: 'Windsurf', dir: '.windsurf' }
];

console.log('\\n🎯 IDE Configuration:');
let detectedIde = null;

for (const config of ideConfigs) {
  const configPath = path.join(__dirname, config.dir);
  if (fs.existsSync(configPath)) {
    console.log(`✅ ${config.name} configuration detected`);
    detectedIde = config.name;
    break;
  }
}

if (!detectedIde) {
  console.log('ℹ️  No IDE-specific configuration detected');
}

// Check for feature-specific modules
const features = [
  { name: 'Authentication', dir: 'src/auth' },
  { name: 'Database', dir: 'src/database' },
  { name: 'API', dir: 'src/api' },
  { name: 'Testing', dir: 'tests' },
  { name: 'Logging', dir: 'src/logging' },
  { name: 'Configuration', dir: 'config' }
];

console.log('\\n📦 Detected Features:');
let foundFeatures = 0;

for (const feature of features) {
  const featurePath = path.join(__dirname, feature.dir);
  if (fs.existsSync(featurePath)) {
    console.log(`✅ ${feature.name}`);
    foundFeatures++;
  }
}

if (foundFeatures === 0) {
  console.log('ℹ️  No optional features detected - using basic setup');
}

console.log('\\n🚀 Your project is ready!');
console.log('Run `npm start` to see this message again.');