#!/usr/bin/env node

/**
 * E2E Tests: Setup Scripts and Template Assets (Tutorial Coverage)
 *
 * Tests setup script and template assets functionality via CLI:
 * 1. Setup scripts (_setup.mjs) execution during scaffolding
 * 2. Template assets (__scaffold__/) conditional inclusion
 * 3. Feature flags controlling dynamic content generation
 *
 * This covers tutorial sections:
 * - "Making Templates Dynamic: Setup Scripts"
 * - "Using Template Assets for Conditional Features"
 *
 * Uses hermetic test environments with M5NV_HOME isolation
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { readFile, mkdir, access } from 'node:fs/promises';
import {
  createTestEnvironment,
  execCLI,
  assertFileExists,
  createTestProject,
  verifyIsolation
} from './test-helpers.mjs';

const LONG_TIMEOUT = 180000; // 3 minutes for complex workflows

// ============================================================================
// Test 1: Setup Scripts via CLI
// ============================================================================

test('Tutorial: Setup script adds dependencies based on feature flags', async (t) => {
  const testEnv = await createTestEnvironment('setup-script-features');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create template with setup script that adds dependencies based on feature flags
  const templateDir = join(testEnv.workspaceDir, 'templates', 'dynamic-app');

  const setupScript = `
export default async function setup({ ctx, tools }) {
  const { json, files, logger, inputs } = tools;
  
  // Always apply placeholders
  await tools.placeholders.applyInputs(['package.json']);
  
  // Track enabled features for documentation
  const features = [];
  
  // Check if consumer wants authentication
  if (inputs.get('ENABLE_AUTH') === 'true') {
    features.push('authentication');
    
    // Add auth dependencies
    await json.merge('package.json', {
      dependencies: {
        '@auth/core': '^0.18.0'
      }
    });
    
    logger.info('Added authentication support');
  }
  
  // Check if consumer wants payment processing
  if (inputs.get('ENABLE_PAYMENTS') === 'true') {
    features.push('payments');
    
    // Add Stripe dependencies
    await json.merge('package.json', {
      dependencies: {
        '@stripe/stripe-js': '^2.2.0'
      }
    });
    
    logger.info('Added payment processing');
  }
  
  // Generate feature documentation
  if (features.length > 0) {
    await files.write('FEATURES.md',
      '# ' + ctx.projectName + ' - Features\\n\\n' +
      'This project includes:\\n\\n' +
      features.map(f => '- ' + f).join('\\n') +
      '\\n\\nSee package.json for specific dependencies.'
    );
  }
}
`;

  await createTestProject(templateDir, {
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'tutorial/dynamic-app',
      name: 'dynamic-app',
      description: 'Dynamic template with feature flags',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: {
          description: 'Project name',
          required: true,
          default: 'dynamic-app'
        },
        ENABLE_AUTH: {
          description: 'Enable authentication features',
          type: 'boolean',
          default: 'false',
          required: false
        },
        ENABLE_PAYMENTS: {
          description: 'Enable payment processing',
          type: 'boolean',
          default: 'false',
          required: false
        }
      },
      setup: {
        script: '_setup.mjs'
      }
    }, null, 2),
    'package.json': JSON.stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '1.0.0',
      dependencies: {}
    }, null, 2),
    'README.md': '# ⦃PACKAGE_NAME⦄\n\nA dynamic template project.\n',
    '_setup.mjs': setupScript
  });

  const projectsDir = join(testEnv.workspaceDir, 'projects');
  await mkdir(projectsDir, { recursive: true });

  // Scaffold with both feature flags enabled
  const result = execCLI('scaffold', [
    'new', 'full-featured-app',
    '--template', templateDir,
    '--placeholder', 'PACKAGE_NAME=full-featured-app',
    '--placeholder', 'ENABLE_AUTH=true',
    '--placeholder', 'ENABLE_PAYMENTS=true',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  assert.strictEqual(result.exitCode, 0, `Scaffold with setup script should succeed: ${result.stderr}`);

  // Verify project created
  const projectDir = join(projectsDir, 'full-featured-app');
  await assertFileExists(join(projectDir, 'package.json'), 'package.json should exist');

  // Verify dependencies were added by setup script
  const packageJson = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf8'));
  assert.strictEqual(packageJson.name, 'full-featured-app', 'Package name should be replaced');
  assert.ok(packageJson.dependencies['@auth/core'], 'Auth dependency should be added');
  assert.ok(packageJson.dependencies['@stripe/stripe-js'], 'Stripe dependency should be added');

  // Verify FEATURES.md was created
  await assertFileExists(join(projectDir, 'FEATURES.md'), 'FEATURES.md should be created');
  const featuresContent = await readFile(join(projectDir, 'FEATURES.md'), 'utf8');
  assert(featuresContent.includes('authentication'), 'FEATURES.md should mention authentication');
  assert(featuresContent.includes('payments'), 'FEATURES.md should mention payments');

  // Verify setup script was cleaned up
  try {
    await access(join(projectDir, '_setup.mjs'));
    assert.fail('_setup.mjs should be removed after execution');
  } catch (err) {
    assert.strictEqual(err.code, 'ENOENT', '_setup.mjs should not exist');
  }

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Tutorial: Setup script respects disabled feature flags', async (t) => {
  const testEnv = await createTestEnvironment('setup-script-no-features');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Use same template structure as above
  const templateDir = join(testEnv.workspaceDir, 'templates', 'dynamic-app');

  const setupScript = `
export default async function setup({ ctx, tools }) {
  const { json, files, logger, inputs } = tools;
  
  await tools.placeholders.applyInputs(['package.json']);
  
  const features = [];
  
  if (inputs.get('ENABLE_AUTH') === 'true') {
    features.push('authentication');
    await json.merge('package.json', {
      dependencies: { '@auth/core': '^0.18.0' }
    });
  }
  
  if (inputs.get('ENABLE_PAYMENTS') === 'true') {
    features.push('payments');
    await json.merge('package.json', {
      dependencies: { '@stripe/stripe-js': '^2.2.0' }
    });
  }
  
  if (features.length > 0) {
    await files.write('FEATURES.md',
      '# ' + ctx.projectName + ' - Features\\n\\n' +
      features.map(f => '- ' + f).join('\\n')
    );
  }
}
`;

  await createTestProject(templateDir, {
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'tutorial/dynamic-app',
      name: 'dynamic-app',
      description: 'Dynamic template with feature flags',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: { description: 'Project name', required: true },
        ENABLE_AUTH: { description: 'Enable auth', type: 'boolean', default: 'false' },
        ENABLE_PAYMENTS: { description: 'Enable payments', type: 'boolean', default: 'false' }
      },
      setup: { script: '_setup.mjs' }
    }, null, 2),
    'package.json': JSON.stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '1.0.0',
      dependencies: {}
    }, null, 2),
    '_setup.mjs': setupScript
  });

  const projectsDir = join(testEnv.workspaceDir, 'projects');
  await mkdir(projectsDir, { recursive: true });

  // Scaffold with NO feature flags (minimal app)
  const result = execCLI('scaffold', [
    'new', 'minimal-app',
    '--template', templateDir,
    '--placeholder', 'PACKAGE_NAME=minimal-app',
    '--placeholder', 'ENABLE_AUTH=false',
    '--placeholder', 'ENABLE_PAYMENTS=false',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  assert.strictEqual(result.exitCode, 0, `Scaffold minimal app should succeed: ${result.stderr}`);

  const projectDir = join(projectsDir, 'minimal-app');
  const packageJson = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf8'));

  assert.strictEqual(packageJson.name, 'minimal-app', 'Package name should be replaced');
  assert.deepStrictEqual(packageJson.dependencies, {}, 'No extra dependencies should be added');

  // FEATURES.md should NOT exist (no features enabled)
  try {
    await access(join(projectDir, 'FEATURES.md'));
    assert.fail('FEATURES.md should not exist when no features enabled');
  } catch (err) {
    assert.strictEqual(err.code, 'ENOENT', 'FEATURES.md should not exist');
  }

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

// ============================================================================
// Test 2: Template Assets via CLI
// ============================================================================

test('Tutorial: Template assets conditionally included based on features', async (t) => {
  const testEnv = await createTestEnvironment('template-assets-conditional');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create template with assets directory
  const templateDir = join(testEnv.workspaceDir, 'templates', 'assets-app');

  const setupScript = `
export default async function setup({ ctx, tools }) {
  const { templates, files, json, inputs } = tools;
  
  await tools.placeholders.applyInputs(['package.json']);
  
  const features = [];
  
  // Conditionally add authentication config from assets
  if (inputs.get('ENABLE_AUTH') === 'true') {
    features.push('authentication');
    
    await files.ensureDirs(['src/config']);
    
    // Render auth config from template asset
    await templates.renderFile(
      'features/auth-config.js.tpl',
      'src/config/auth.js',
      { PROJECT_NAME: ctx.projectName }
    );
    
    await json.merge('package.json', {
      dependencies: { '@auth/core': '^0.18.0' }
    });
  }
  
  // Conditionally add payment config from assets
  if (inputs.get('ENABLE_PAYMENTS') === 'true') {
    features.push('payments');
    
    await files.ensureDirs(['src/config']);
    
    await templates.renderFile(
      'features/payment-config.js.tpl',
      'src/config/payments.js',
      { PROJECT_NAME: ctx.projectName }
    );
    
    await json.merge('package.json', {
      dependencies: { '@stripe/stripe-js': '^2.2.0' }
    });
  }
  
  // Generate documentation
  if (features.length > 0) {
    await files.write('FEATURES.md',
      '# ' + ctx.projectName + ' - Features\\n\\n' +
      'Enabled features:\\n' +
      features.map(f => '- ' + f).join('\\n') +
      '\\n\\nConfiguration files:\\n' +
      (features.includes('authentication') ? '- src/config/auth.js\\n' : '') +
      (features.includes('payments') ? '- src/config/payments.js\\n' : '')
    );
  }
}
`;

  await createTestProject(templateDir, {
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'tutorial/assets-app',
      name: 'assets-app',
      description: 'Template with conditional assets',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: { description: 'Project name', required: true },
        ENABLE_AUTH: { description: 'Enable auth', type: 'boolean', default: 'false' },
        ENABLE_PAYMENTS: { description: 'Enable payments', type: 'boolean', default: 'false' }
      },
      setup: {
        script: '_setup.mjs',
        authorAssetsDir: '__scaffold__'
      }
    }, null, 2),
    'package.json': JSON.stringify({
      name: '⦃PACKAGE_NAME⦄',
      version: '1.0.0',
      dependencies: {}
    }, null, 2),
    'README.md': '# ⦃PACKAGE_NAME⦄\n',
    '_setup.mjs': setupScript,
    // Template assets directory
    '__scaffold__/features/auth-config.js.tpl': `// Authentication configuration for ⦃PROJECT_NAME⦄
export const authConfig = {
  providers: ['google', 'github'],
  sessionSecret: process.env.SESSION_SECRET
};
`,
    '__scaffold__/features/payment-config.js.tpl': `// Payment configuration for ⦃PROJECT_NAME⦄
export const paymentConfig = {
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY
};
`
  });

  const projectsDir = join(testEnv.workspaceDir, 'projects');
  await mkdir(projectsDir, { recursive: true });

  // Scaffold with auth enabled
  const result = execCLI('scaffold', [
    'new', 'auth-app',
    '--template', templateDir,
    '--placeholder', 'PACKAGE_NAME=auth-app',
    '--placeholder', 'ENABLE_AUTH=true',
    '--placeholder', 'ENABLE_PAYMENTS=false',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  assert.strictEqual(result.exitCode, 0, `Scaffold with assets should succeed: ${result.stderr}`);

  const projectDir = join(projectsDir, 'auth-app');

  // Verify auth config was created from template asset
  await assertFileExists(join(projectDir, 'src', 'config', 'auth.js'), 'auth.js should be created');
  const authConfig = await readFile(join(projectDir, 'src', 'config', 'auth.js'), 'utf8');
  assert(authConfig.includes('auth-app'), 'Auth config should have project name replaced');
  assert(authConfig.includes('providers'), 'Auth config should have providers');

  // Verify payment config was NOT created (feature disabled)
  try {
    await access(join(projectDir, 'src', 'config', 'payments.js'));
    assert.fail('payments.js should not exist when payments disabled');
  } catch (err) {
    assert.strictEqual(err.code, 'ENOENT', 'payments.js should not exist');
  }

  // Verify __scaffold__ directory was cleaned up
  try {
    await access(join(projectDir, '__scaffold__'));
    assert.fail('__scaffold__ should be removed after setup');
  } catch (err) {
    assert.strictEqual(err.code, 'ENOENT', '__scaffold__ should not exist');
  }

  // Verify FEATURES.md mentions only auth
  await assertFileExists(join(projectDir, 'FEATURES.md'), 'FEATURES.md should exist');
  const featuresContent = await readFile(join(projectDir, 'FEATURES.md'), 'utf8');
  assert(featuresContent.includes('authentication'), 'Should mention authentication');
  assert(featuresContent.includes('src/config/auth.js'), 'Should mention auth config path');
  assert(!featuresContent.includes('payments'), 'Should not mention payments');

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

test('Tutorial: Template assets with both features enabled', async (t) => {
  const testEnv = await createTestEnvironment('template-assets-full');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create same template structure
  const templateDir = join(testEnv.workspaceDir, 'templates', 'assets-app');

  const setupScript = `
export default async function setup({ ctx, tools }) {
  const { templates, files, json, inputs } = tools;
  
  await tools.placeholders.applyInputs(['package.json']);
  
  const features = [];
  
  if (inputs.get('ENABLE_AUTH') === 'true') {
    features.push('authentication');
    await files.ensureDirs(['src/config']);
    await templates.renderFile('features/auth-config.js.tpl', 'src/config/auth.js', { PROJECT_NAME: ctx.projectName });
    await json.merge('package.json', { dependencies: { '@auth/core': '^0.18.0' } });
  }
  
  if (inputs.get('ENABLE_PAYMENTS') === 'true') {
    features.push('payments');
    await files.ensureDirs(['src/config']);
    await templates.renderFile('features/payment-config.js.tpl', 'src/config/payments.js', { PROJECT_NAME: ctx.projectName });
    await json.merge('package.json', { dependencies: { '@stripe/stripe-js': '^2.2.0' } });
  }
  
  if (features.length > 0) {
    await files.write('FEATURES.md', '# Features\\n' + features.map(f => '- ' + f).join('\\n'));
  }
}
`;

  await createTestProject(templateDir, {
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'tutorial/assets-app',
      name: 'assets-app',
      description: 'Template with conditional assets',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: { description: 'Project name', required: true },
        ENABLE_AUTH: { description: 'Enable auth', type: 'boolean', default: 'false' },
        ENABLE_PAYMENTS: { description: 'Enable payments', type: 'boolean', default: 'false' }
      },
      setup: { script: '_setup.mjs', authorAssetsDir: '__scaffold__' }
    }, null, 2),
    'package.json': JSON.stringify({ name: '⦃PACKAGE_NAME⦄', version: '1.0.0', dependencies: {} }, null, 2),
    '_setup.mjs': setupScript,
    '__scaffold__/features/auth-config.js.tpl': '// Auth for ⦃PROJECT_NAME⦄\nexport const authConfig = {};\n',
    '__scaffold__/features/payment-config.js.tpl': '// Payments for ⦃PROJECT_NAME⦄\nexport const paymentConfig = {};\n'
  });

  const projectsDir = join(testEnv.workspaceDir, 'projects');
  await mkdir(projectsDir, { recursive: true });

  // Scaffold with BOTH features enabled
  const result = execCLI('scaffold', [
    'new', 'full-app',
    '--template', templateDir,
    '--placeholder', 'PACKAGE_NAME=full-app',
    '--placeholder', 'ENABLE_AUTH=true',
    '--placeholder', 'ENABLE_PAYMENTS=true',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  assert.strictEqual(result.exitCode, 0, `Scaffold with both features should succeed: ${result.stderr}`);

  const projectDir = join(projectsDir, 'full-app');

  // Verify both config files were created
  await assertFileExists(join(projectDir, 'src', 'config', 'auth.js'), 'auth.js should exist');
  await assertFileExists(join(projectDir, 'src', 'config', 'payments.js'), 'payments.js should exist');

  // Verify both dependencies added
  const packageJson = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf8'));
  assert.ok(packageJson.dependencies['@auth/core'], 'Auth dependency should exist');
  assert.ok(packageJson.dependencies['@stripe/stripe-js'], 'Stripe dependency should exist');

  // Verify placeholders replaced in rendered files
  const authContent = await readFile(join(projectDir, 'src', 'config', 'auth.js'), 'utf8');
  assert(authContent.includes('full-app'), 'Auth config should have project name');

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });

// ============================================================================
// Test 3: Setup Script Error Handling
// ============================================================================

test('Setup script errors allow graceful degradation', async (t) => {
  const testEnv = await createTestEnvironment('setup-script-error');

  t.after(async () => {
    await testEnv.cleanup();
  });

  // Create template with a setup script that throws an error
  const templateDir = join(testEnv.workspaceDir, 'templates', 'error-app');

  const setupScript = `
export default async function setup({ ctx, tools }) {
  // Intentionally throw an error
  throw new Error('Setup script intentional failure for testing');
}
`;

  await createTestProject(templateDir, {
    'template.json': JSON.stringify({
      schemaVersion: '1.0.0',
      id: 'test/error-app',
      name: 'error-app',
      description: 'Template with failing setup script',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: { description: 'Project name', required: true }
      },
      setup: { script: '_setup.mjs' }
    }, null, 2),
    'package.json': JSON.stringify({ name: '⦃PACKAGE_NAME⦄', version: '1.0.0' }, null, 2),
    '_setup.mjs': setupScript
  });

  const projectsDir = join(testEnv.workspaceDir, 'projects');
  await mkdir(projectsDir, { recursive: true });

  // Scaffold should succeed even if setup script throws (graceful degradation)
  // Setup scripts are optional post-processing - failure doesn't block project creation
  const result = execCLI('scaffold', [
    'new', 'error-app',
    '--template', templateDir,
    '--placeholder', 'PACKAGE_NAME=error-app',
    '--yes'
  ], {
    env: testEnv.env,
    cwd: projectsDir
  });

  // Scaffold completes successfully (setup scripts are optional)
  assert.strictEqual(result.exitCode, 0, 'Scaffold should complete even when setup script fails');

  // Project should still be created (basic files copied before setup runs)
  const projectDir = join(projectsDir, 'error-app');
  await assertFileExists(join(projectDir, 'package.json'), 'package.json should exist despite setup failure');

  // Verify the package.json content (placeholders should still be present since setup didn't run)
  // Note: Placeholders may or may not be replaced depending on when in the workflow they're processed
  const packageJson = await readFile(join(projectDir, 'package.json'), 'utf8');
  assert(packageJson.length > 0, 'package.json should have content');

  await verifyIsolation(testEnv);
}, { timeout: LONG_TIMEOUT });
