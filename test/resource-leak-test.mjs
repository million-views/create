#!/usr/bin/env node

/**
 * Focused test for resource leak detection functionality
 * Tests the new resource management features added to the CLI tool
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', 'bin', 'index.mjs');

// Test utilities for resource leak detection
class ResourceTestUtils {
  static async getResourceSnapshot() {
    const cwd = process.cwd();
    const entries = await fs.readdir(cwd);
    
    return {
      tempDirs: entries.filter(name => name.startsWith('.tmp-template-')),
      testDirs: entries.filter(name => name.startsWith('test-') && !name.includes('cli-')),
      allEntries: entries.length
    };
  }

  static async detectResourceLeaks(beforeSnapshot, afterSnapshot, context = '') {
    const leaks = [];
    
    // Check for new temporary directories (these should always be cleaned up)
    const newTempDirs = afterSnapshot.tempDirs.filter(
      dir => !beforeSnapshot.tempDirs.includes(dir)
    );
    if (newTempDirs.length > 0) {
      leaks.push(`Temporary directories not cleaned up: ${newTempDirs.join(', ')}`);
    }

    if (leaks.length > 0) {
      throw new Error(`Resource leaks detected${context ? ` in ${context}` : ''}:\n  ${leaks.join('\n  ')}`);
    }
  }

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
      }, options.timeout || 10000);

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
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

async function runResourceLeakTests() {
  console.log('🧪 Running Resource Leak Detection Tests\n');
  
  const tempPaths = [];
  let passed = 0;
  let failed = 0;

  // Test 1: Temp directory cleanup on invalid template
  try {
    console.log('  ▶ Temp directory cleanup on invalid template');
    
    const beforeSnapshot = await ResourceTestUtils.getResourceSnapshot();
    
    const result = await ResourceTestUtils.execCLI([
      'test-invalid-template',
      '--template', '../invalid-template'
    ]);
    
    if (result.exitCode !== 1) {
      throw new Error(`Expected exit code 1, got ${result.exitCode}`);
    }
    
    if (!result.stderr.includes('traversal')) {
      throw new Error('Should show path traversal error');
    }
    
    // Check for resource leaks
    const afterSnapshot = await ResourceTestUtils.getResourceSnapshot();
    await ResourceTestUtils.detectResourceLeaks(beforeSnapshot, afterSnapshot, 'invalid template test');
    
    console.log('  ✅ Temp directory cleanup on invalid template');
    passed++;
  } catch (error) {
    console.log('  ❌ Temp directory cleanup on invalid template');
    console.log(`     Error: ${error.message}`);
    failed++;
  }

  // Test 2: Temp directory cleanup on invalid repository
  try {
    console.log('  ▶ Temp directory cleanup on invalid repository');
    
    const beforeSnapshot = await ResourceTestUtils.getResourceSnapshot();
    
    const result = await ResourceTestUtils.execCLI([
      'test-invalid-repo',
      '--template', 'basic',
      '--repo', 'invalid-repo-format!'
    ]);
    
    if (result.exitCode !== 1) {
      throw new Error(`Expected exit code 1, got ${result.exitCode}`);
    }
    
    if (!result.stderr.includes('Repository format')) {
      throw new Error('Should show repository format error');
    }
    
    // Check for resource leaks
    const afterSnapshot = await ResourceTestUtils.getResourceSnapshot();
    await ResourceTestUtils.detectResourceLeaks(beforeSnapshot, afterSnapshot, 'invalid repository test');
    
    console.log('  ✅ Temp directory cleanup on invalid repository');
    passed++;
  } catch (error) {
    console.log('  ❌ Temp directory cleanup on invalid repository');
    console.log(`     Error: ${error.message}`);
    failed++;
  }

  // Test 3: Temp directory cleanup on nonexistent repository
  try {
    console.log('  ▶ Temp directory cleanup on nonexistent repository');
    
    const beforeSnapshot = await ResourceTestUtils.getResourceSnapshot();
    
    const result = await ResourceTestUtils.execCLI([
      'test-nonexistent-repo',
      '--template', 'basic',
      '--repo', 'definitely-does-not-exist/no-such-repo'
    ], { timeout: 15000 });
    
    if (result.exitCode !== 1) {
      throw new Error(`Expected exit code 1, got ${result.exitCode}`);
    }
    
    if (!result.stderr.includes('not found')) {
      throw new Error('Should show repository not found error');
    }
    
    // Check for resource leaks
    const afterSnapshot = await ResourceTestUtils.getResourceSnapshot();
    await ResourceTestUtils.detectResourceLeaks(beforeSnapshot, afterSnapshot, 'nonexistent repository test');
    
    console.log('  ✅ Temp directory cleanup on nonexistent repository');
    passed++;
  } catch (error) {
    console.log('  ❌ Temp directory cleanup on nonexistent repository');
    console.log(`     Error: ${error.message}`);
    failed++;
  }

  // Test 4: Multiple failure scenarios
  try {
    console.log('  ▶ Multiple failure scenarios resource cleanup');
    
    const beforeSnapshot = await ResourceTestUtils.getResourceSnapshot();
    
    const scenarios = [
      ['test-multi-1', '--template', '../invalid'],
      ['test-multi-2', '--template', 'basic', '--repo', 'invalid!'],
      ['test-multi-3', '--template', 'basic', '--branch', 'invalid; branch']
    ];
    
    for (const args of scenarios) {
      const result = await ResourceTestUtils.execCLI(args);
      if (result.exitCode !== 1) {
        throw new Error(`Scenario ${args[0]}: Expected exit code 1, got ${result.exitCode}`);
      }
    }
    
    // Check for resource leaks after all scenarios
    const afterSnapshot = await ResourceTestUtils.getResourceSnapshot();
    await ResourceTestUtils.detectResourceLeaks(beforeSnapshot, afterSnapshot, 'multiple failure scenarios');
    
    console.log('  ✅ Multiple failure scenarios resource cleanup');
    passed++;
  } catch (error) {
    console.log('  ❌ Multiple failure scenarios resource cleanup');
    console.log(`     Error: ${error.message}`);
    failed++;
  }

  // Cleanup any remaining test artifacts
  await ResourceTestUtils.cleanup(tempPaths);

  console.log(`\n📊 Resource Leak Test Results:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${passed + failed}`);

  if (failed > 0) {
    console.log('\n❌ Some resource leak tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All resource leak tests passed!');
    process.exit(0);
  }
}

runResourceLeakTests().catch(error => {
  console.error('Resource leak test runner failed:', error);
  process.exit(1);
});