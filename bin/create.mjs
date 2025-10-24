#!/usr/bin/env node
/**
 * @m5nv/create CLI entrypoint (ESM only).
 *
 * Responsibilities:
 *  - Parse arguments
 *  - Preflight checks (git, required args, existing directory logic)
 *  - Clone template repo (depth=1) to a temp location
 *  - Verify template subdirectory
 *  - Copy template to target project directory (excluding .git)
 *  - Run optional _setup.mjs with context
 *  - Remove _setup.mjs after execution
 *  - Clean up temp directory
 */

import { spawnSync, spawn } from 'child_process';
import { rm, stat, mkdir, cp } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath, pathToFileURL } from 'url';
import minimist from 'minimist';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TEMPLATE_REPO = 'million-views/templates';

async function main() {
  const args = minimist(process.argv.slice(2), {
    string: ['template', 'repo', 'branch'],
    boolean: ['force', 'help'],
    alias: { h: 'help' },
    '--': true
  });

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const projectDirectory = args._[0];
  const templateName = args.template;
  const repo = args.repo || DEFAULT_TEMPLATE_REPO;
  const branch = args.branch;
  const force = args.force || false;

  if (!projectDirectory || !templateName) {
    console.error('Error: Missing required arguments <project-directory> and/or --template <template-name>.');
    printHelp();
    process.exit(1);
  }

  if (!gitAvailable()) {
    console.error('Error: git is not installed or not found in PATH. Please install git and retry.');
    process.exit(1);
  }

  const projectPath = path.resolve(process.cwd(), projectDirectory);

  if (existsSync(projectPath)) {
    if (!force) {
      console.error(`Error: Target directory \