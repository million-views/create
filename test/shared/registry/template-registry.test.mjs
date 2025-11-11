#!/usr/bin/env node

/**
 * Template Registry Tests
 */

import { TemplateRegistry } from '../../../lib/shared/registry/template-registry.mjs';
import { LocalRegistry } from '../../../lib/shared/registry/registries/local-registry.mjs';
import { GitRegistry } from '../../../lib/shared/registry/registries/git-registry.mjs';
import { HttpRegistry } from '../../../lib/shared/registry/registries/http-registry.mjs';

/**
 * Test the template registry system
 */
async function testTemplateRegistry() {
  console.log('🧪 Testing Template Registry System...\n');

  try {
    // Test 1: Initialize registry
    console.log('Test 1: Initialize registry');
    const registry = new TemplateRegistry({
      cacheEnabled: false, // Disable for testing
      validationEnabled: false
    });

    await registry.initialize();
    console.log('✅ Registry initialized successfully\n');

    // Test 2: List registries
    console.log('Test 2: List registries');
    const registries = registry.listRegistries();
    console.log(`Found ${registries.length} registries:`);
    registries.forEach(r => console.log(`  - ${r.name} (${r.type}): ${r.description}`));
    console.log('');

    // Test 3: Register a custom local registry
    console.log('Test 3: Register custom local registry');
    await registry.registerRegistry('test-local', {
      type: 'local',
      description: 'Test local registry',
      basePath: '/tmp/test-templates'
    });
    console.log('✅ Custom registry registered\n');

    // Test 4: Test registry stats
    console.log('Test 4: Get registry stats');
    const stats = await registry.getStats();
    console.log('Registry stats:', JSON.stringify(stats, null, 2));
    console.log('');

    // Test 5: Test individual registry components
    console.log('Test 5: Test Local Registry');
    const localRegistry = new LocalRegistry({
      basePath: process.cwd()
    });

    console.log('Local registry config valid:', localRegistry.validateConfig());
    console.log('');

    // Test 6: Test Git Registry
    console.log('Test 6: Test Git Registry');
    const gitRegistry = new GitRegistry({
      repositories: [
        { url: 'https://github.com/example/templates', branch: 'main' }
      ]
    });

    console.log('Git registry config valid:', gitRegistry.validateConfig());
    console.log('');

    // Test 7: Test HTTP Registry
    console.log('Test 7: Test HTTP Registry');
    const httpRegistry = new HttpRegistry({
      endpoints: [
        { url: 'https://api.example.com/templates' }
      ]
    });

    console.log('HTTP registry config valid:', httpRegistry.validateConfig());
    console.log('');

    // Test 8: Shutdown registry
    console.log('Test 8: Shutdown registry');
    await registry.shutdown();
    console.log('✅ Registry shutdown successfully\n');

    console.log('🎉 All Template Registry tests passed!');

  } catch (error) {
    console.error('❌ Template Registry test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testTemplateRegistry().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}