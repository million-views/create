#!/usr/bin/env node

/**
 * Features Demo Project
 * This is a simple Node.js application that demonstrates feature-based setup.
 */

console.log('Welcome to the Features Demo Project!');
console.log('This project was configured with your selected features.');

// Check for feature-specific modules
const fs = require('fs');
const path = require('path');

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

console.log('\\nRun `npm start` to see this message again.');