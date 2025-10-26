#!/usr/bin/env node

/**
 * IDE Demo Project
 * This is a simple Node.js application that demonstrates IDE-specific setup.
 */

console.log('Welcome to the IDE Demo Project!');
console.log('This project was configured for your preferred IDE.');

// Check for IDE-specific configuration
const fs = require('fs');
const path = require('path');

const ideConfigs = [
  { name: 'Kiro', dir: '.kiro' },
  { name: 'VSCode', dir: '.vscode' },
  { name: 'Cursor', dir: '.cursor' },
  { name: 'Windsurf', dir: '.windsurf' }
];

for (const config of ideConfigs) {
  const configPath = path.join(__dirname, config.dir);
  if (fs.existsSync(configPath)) {
    console.log(`✅ ${config.name} configuration detected`);
    break;
  }
}

console.log('\\nRun `npm start` to see this message again.');