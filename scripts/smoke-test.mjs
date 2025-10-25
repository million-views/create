#!/usr/bin/env node

/**
 * Comprehensive smoke test for @m5nv/create CLI tool
 * Tests the CLI tool end-to-end with real repositories and scenarios
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', 'bin', 'index.mjs');

class SmokeTestUtils {
  static async execCLI(args, options = {}) {
    return new Promise((resolve) => {
      const child = spawn('node', [CLI_PATH, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr + '\nTest timeout',
          timedOut: true
        });
      }, options.timeout || 30000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          exitCode: code,
          stdout,
          stderr,
          timedOut: false
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr + error.message,
          error: true
        });
      });
    });
  }

  static async cleanup(paths) {
    for (const p of Array.isArray(paths) ? paths : [paths]) {
      try {
        await fs.rm(p, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  static async createTempDir(suffix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const dirName = `smoke-test-${timestamp}-${random}${suffix}`;
    const tempPath = path.join(process.cwd(), dirName);
    await fs.mkdir(tempPath, { recursive: true });
    return tempPath;
  }

  static async createMockRepo(repoPath, templates = ['basic']) {
    await fs.mkdir(repoPath, { recursive: true });
    
    // Initialize git repo
    await this.execCommand('git', ['init'], { cwd: repoPath });
    await this.execCommand('git', ['config', 'user.name', 'Smoke Test'], { cwd: repoPath });
    await this.execCommand('git', ['config', 'user.email', 'smoke@test.com'], { cwd: repoPath });

    // Create template directories
    for (const template of templates) {
      const templatePath = path.join(repoPath, template);
      await fs.mkdir(templatePath, { recursive: true });
      
      // Create realistic template files
      await fs.writeFile(
        path.join(templatePath, 'package.json'),
        JSON.stringify({
          name: `${template}-project`,
          version: '1.0.0',
          description: `A ${template} project template`,
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            test: 'echo "No tests specified"'
          }
        }, null, 2)
      );
      
      await fs.writeFile(
        path.join(templatePath, 'index.js'),
        `console.log('Hello from ${template} template!');\n`
      );
      
      await fs.writeFile(
        path.join(templatePath, 'README.md'),
        `# ${template.charAt(0).toUpperCase() + template.slice(1)} Template\n\nThis is a ${template} project template.\n\n## Getting Started\n\n\`\`\`bash\nnpm start\n\`\`\`\n`
      );

      // Create a .gitignore file
      await fs.writeFile(
        path.join(templatePath, '.gitignore'),
        'node_modules/\n*.log\n.env\n'
      );
    }

    // Commit the templates
    await this.execCommand('git', ['add', '.'], { cwd: repoPath });
    await this.execCommand('git', ['commit', '-m', 'Initial template commit'], { cwd: repoPath });

    return repoPath;
  }

  static async execCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: options.cwd || process.cwd()
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || stdout || `Command failed with exit code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }
}

async function runSmokeTests() {
  console.log('🔥 Running Comprehensive Smoke Tests\n');
  
  const tempPaths = [];
  let passed = 0;
  let failed = 0;

  // Test 1: Help functionality
  try {
    console.log('  ▶ CLI help functionality');
    
    const result = await SmokeTestUtils.execCLI(['--help']);
    
    if (result.exitCode !== 0) {
      throw new Error(`Help command failed with exit code ${result.exitCode}`);
    }
    
    if (!result.stdout.includes('USAGE:') || !result.stdout.includes('--template')) {
      throw new Error('Help output missing expected content');
    }
    
    console.log('  ✅ CLI help functionality');
    passed++;
  } catch (error) {
    console.log('  ❌ CLI help functionality');
    console.log(`     Error: ${error.message}`);
    failed++;
  }

  // Test 2: Input validation
  try {
    console.log('  ▶ Input validation and security');
    
    const result = await SmokeTestUtils.execCLI(['../malicious-dir', '--template', '../../../etc/passwd']);
    
    if (result.exitCode !== 1) {
      throw new Error(`Expected validation failure, got exit code ${result.exitCode}`);
    }
    
    if (!result.stderr.includes('traversal') && !result.stderr.includes('path')) {
      throw new Error('Security validation not working properly');
    }
    
    console.log('  ✅ Input validation and security');
    passed++;
  } catch (error) {
    console.log('  ❌ Input validation and security');
    console.log(`     Error: ${error.message}`);
    failed++;
  }

  // Test 3: End-to-end project creation with local repository
  try {
    console.log('  ▶ End-to-end project creation');
    
    // Create a mock repository
    const mockRepoPath = await SmokeTestUtils.createTempDir('-mock-repo');
    tempPaths.push(mockRepoPath);
    
    await SmokeTestUtils.createMockRepo(mockRepoPath, ['basic', 'advanced', 'minimal']);
    
    // Create project using the mock repository
    const projectName = 'smoke-test-project';
    const result = await SmokeTestUtils.execCLI([
      projectName,
      '--template', 'basic',
      '--repo', mockRepoPath
    ]);
    
    if (result.exitCode !== 0) {
      throw new Error(`Project creation failed: ${result.stderr}`);
    }
    
    // Verify project was created correctly
    const projectPath = path.join(process.cwd(), projectName);
    tempPaths.push(projectPath);
    
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    if (packageJson.name !== 'basic-project') {
      throw new Error('Template files not copied correctly');
    }
    
    // Verify other template files exist
    await fs.access(path.join(projectPath, 'index.js'));
    await fs.access(path.join(projectPath, 'README.md'));
    await fs.access(path.join(projectPath, '.gitignore'));
    
    // Verify .git directory was removed from template
    try {
      await fs.access(path.join(projectPath, '.git'));
      throw new Error('.git directory should be removed from copied template');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Expected - .git should not exist
    }
    
    console.log('  ✅ End-to-end project creation');
    passed++;
  } catch (error) {
    console.log('  ❌ End-to-end project creation');
    console.log(`     Error: ${error.message}`);
    failed++;
  }

  // Test 4: Setup script execution
  try {
    console.log('  ▶ Setup script execution and cleanup');
    
    // Create a mock repository with setup script
    const mockRepoPath = await SmokeTestUtils.createTempDir('-setup-repo');
    tempPaths.push(mockRepoPath);
    
    await SmokeTestUtils.createMockRepo(mockRepoPath, ['with-setup']);
    
    // Add setup script to template
    const setupScriptPath = path.join(mockRepoPath, 'with-setup', '_setup.mjs');
    const setupScript = `
export default function setup({ projectDirectory, projectName, cwd }) {
  console.log('Setup script executed for:', projectName);
  // Create a marker file to prove setup ran
  import('fs').then(fs => {
    fs.writeFileSync(projectDirectory + '/setup-completed.txt', 'Setup completed successfully');
  });
}
`;
    await fs.writeFile(setupScriptPath, setupScript);
    
    // Commit the setup script
    await SmokeTestUtils.execCommand('git', ['add', '.'], { cwd: mockRepoPath });
    await SmokeTestUtils.execCommand('git', ['commit', '-m', 'Add setup script'], { cwd: mockRepoPath });
    
    const projectName = 'smoke-test-setup-project';
    const result = await SmokeTestUtils.execCLI([
      projectName,
      '--template', 'with-setup',
      '--repo', mockRepoPath
    ]);
    
    if (result.exitCode !== 0) {
      throw new Error(`Setup script test failed: ${result.stderr}`);
    }
    
    const projectPath = path.join(process.cwd(), projectName);
    tempPaths.push(projectPath);
    
    // Verify setup script ran
    const markerPath = path.join(projectPath, 'setup-completed.txt');
    const markerContent = await fs.readFile(markerPath, 'utf8');
    if (!markerContent.includes('Setup completed successfully')) {
      throw new Error('Setup script did not execute properly');
    }
    
    // Verify setup script was removed
    const setupScriptInProject = path.join(projectPath, '_setup.mjs');
    try {
      await fs.access(setupScriptInProject);
      throw new Error('Setup script was not removed after execution');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Expected - setup script should be removed
    }
    
    console.log('  ✅ Setup script execution and cleanup');
    passed++;
  } catch (error) {
    console.log('  ❌ Setup script execution and cleanup');
    console.log(`     Error: ${error.message}`);
    failed++;
  }

  // Test 5: Error handling and resource cleanup
  try {
    console.log('  ▶ Error handling and resource cleanup');
    
    // Test with nonexistent repository
    const result = await SmokeTestUtils.execCLI([
      'smoke-test-error-project',
      '--template', 'basic',
      '--repo', 'definitely-does-not-exist/no-such-repo'
    ], { timeout: 15000 });
    
    if (result.exitCode !== 1) {
      throw new Error(`Expected error exit code, got ${result.exitCode}`);
    }
    
    if (!result.stderr.includes('not found')) {
      throw new Error('Error message not appropriate');
    }
    
    // Verify no temporary directories were left behind
    const entries = await fs.readdir(process.cwd());
    const tempDirs = entries.filter(name => name.startsWith('.tmp-template-'));
    if (tempDirs.length > 0) {
      throw new Error(`Temporary directories not cleaned up: ${tempDirs.join(', ')}`);
    }
    
    console.log('  ✅ Error handling and resource cleanup');
    passed++;
  } catch (error) {
    console.log('  ❌ Error handling and resource cleanup');
    console.log(`     Error: ${error.message}`);
    failed++;
  }

  // Test 6: Spec requirements verification
  try {
    console.log('  ▶ Spec requirements verification');
    
    // Verify zero external dependencies
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
      throw new Error('CLI tool should have zero runtime dependencies');
    }
    
    // Verify correct bin entry
    if (!packageJson.bin || !packageJson.bin['m5nv-create'] || packageJson.bin['m5nv-create'] !== './bin/index.mjs') {
      throw new Error('Incorrect bin entry in package.json');
    }
    
    // Verify ESM configuration
    if (packageJson.type !== 'module') {
      throw new Error('Package should be configured as ESM module');
    }
    
    // Verify Node.js version requirement
    if (!packageJson.engines || !packageJson.engines.node || !packageJson.engines.node.includes('22')) {
      throw new Error('Should require Node.js 22+');
    }
    
    console.log('  ✅ Spec requirements verification');
    passed++;
  } catch (error) {
    console.log('  ❌ Spec requirements verification');
    console.log(`     Error: ${error.message}`);
    failed++;
  }

  // Cleanup
  await SmokeTestUtils.cleanup(tempPaths);

  console.log(`\n🔥 Smoke Test Results:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${passed + failed}`);

  if (failed > 0) {
    console.log('\n❌ Some smoke tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All smoke tests passed!');
    console.log('\n🎉 CLI tool is ready for production use!');
    process.exit(0);
  }
}

runSmokeTests().catch(error => {
  console.error('Smoke test runner failed:', error);
  process.exit(1);
});