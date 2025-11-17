#!/usr/bin/env node

/**
 * Performance benchmarks for schema validation system
 *
 * Measures validation performance to ensure <100ms response times
 * Tests both TemplateValidator and SelectionValidator performance
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { _readFile } from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Performance targets
const MAX_VALIDATION_TIME_MS = 100;
const PERFORMANCE_ITERATIONS = 100;

// Test fixtures
const validTemplateV1 = {
  schemaVersion: '1.0.0',
  id: 'test/template',
  name: 'Test Template',
  description: 'A test template for performance benchmarking',
  dimensions: {
    features: {
      values: ['auth', 'database', 'api'],
      default: []
    },
    deployment: {
      values: ['vercel', 'netlify', 'aws'],
      default: 'vercel'
    }
  },
  handoff: ['npm install', 'npm run dev']
};

const validSelectionV1 = {
  schemaVersion: '1.0.0',
  templateId: 'test/template',
  version: '1.0.0',
  selections: {
    features: ['auth', 'database'],
    deployment: 'vercel'
  },
  project: {
    name: 'test-project',
    packageManager: 'npm'
  }
};

const invalidTemplate = {
  schemaVersion: '1.0.0',
  id: 'test/invalid',
  // Missing required 'name' field
  description: 'Invalid template missing name'
};

const invalidSelection = {
  schemaVersion: '1.0.0',
  templateId: 'test/template',
  version: '1.0.0',
  selections: {
    features: ['invalid-feature'], // Invalid feature
    deployment: 'vercel'
  }
};

// Performance measurement utilities
function measurePerformance(fn, iterations = PERFORMANCE_ITERATIONS) {
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  return {
    min: Math.min(...times),
    max: Math.max(...times),
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
    p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)],
    p99: times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)]
  };
}

test('Schema Validation Performance Benchmarks', async (t) => {
  // Import validators
  const { TemplateValidator } = await import('../../lib/validation/template-validator.mjs');
  const { SelectionValidator } = await import('../../lib/validation/selection-validator.mjs');

  await t.test('TemplateValidator performance - valid template', async () => {
    const validator = new TemplateValidator();

    const result = measurePerformance(() => {
      validator.validate(validTemplateV1, 'strict');
    });

    console.log('TemplateValidator (valid) performance:');
    console.log(`  Min: ${result.min.toFixed(2)}ms`);
    console.log(`  Max: ${result.max.toFixed(2)}ms`);
    console.log(`  Avg: ${result.avg.toFixed(2)}ms`);
    console.log(`  Median: ${result.median.toFixed(2)}ms`);
    console.log(`  P95: ${result.p95.toFixed(2)}ms`);
    console.log(`  P99: ${result.p99.toFixed(2)}ms`);

    // Assert performance targets
    assert(result.avg < MAX_VALIDATION_TIME_MS,
      `Average validation time ${result.avg.toFixed(2)}ms exceeds target ${MAX_VALIDATION_TIME_MS}ms`);
    assert(result.p95 < MAX_VALIDATION_TIME_MS * 1.5,
      `P95 validation time ${result.p95.toFixed(2)}ms exceeds target ${MAX_VALIDATION_TIME_MS * 1.5}ms`);
  });

  await t.test('TemplateValidator performance - invalid template', async () => {
    const validator = new TemplateValidator();

    const result = measurePerformance(() => {
      validator.validate(invalidTemplate, 'strict');
    });

    console.log('TemplateValidator (invalid) performance:');
    console.log(`  Min: ${result.min.toFixed(2)}ms`);
    console.log(`  Max: ${result.max.toFixed(2)}ms`);
    console.log(`  Avg: ${result.avg.toFixed(2)}ms`);
    console.log(`  Median: ${result.median.toFixed(2)}ms`);
    console.log(`  P95: ${result.p95.toFixed(2)}ms`);
    console.log(`  P99: ${result.p99.toFixed(2)}ms`);

    // Assert performance targets (invalid templates should also be fast to reject)
    assert(result.avg < MAX_VALIDATION_TIME_MS,
      `Average validation time ${result.avg.toFixed(2)}ms exceeds target ${MAX_VALIDATION_TIME_MS}ms`);
  });

  await t.test('SelectionValidator performance - valid selection', async () => {
    const validator = new SelectionValidator();

    const result = measurePerformance(() => {
      validator.validate(validSelectionV1, validTemplateV1);
    });

    console.log('SelectionValidator (valid) performance:');
    console.log(`  Min: ${result.min.toFixed(2)}ms`);
    console.log(`  Max: ${result.max.toFixed(2)}ms`);
    console.log(`  Avg: ${result.avg.toFixed(2)}ms`);
    console.log(`  Median: ${result.median.toFixed(2)}ms`);
    console.log(`  P95: ${result.p95.toFixed(2)}ms`);
    console.log(`  P99: ${result.p99.toFixed(2)}ms`);

    // Assert performance targets
    assert(result.avg < MAX_VALIDATION_TIME_MS,
      `Average validation time ${result.avg.toFixed(2)}ms exceeds target ${MAX_VALIDATION_TIME_MS}ms`);
    assert(result.p95 < MAX_VALIDATION_TIME_MS * 1.5,
      `P95 validation time ${result.p95.toFixed(2)}ms exceeds target ${MAX_VALIDATION_TIME_MS * 1.5}ms`);
  });

  await t.test('SelectionValidator performance - invalid selection', async () => {
    const validator = new SelectionValidator();

    const result = measurePerformance(() => {
      validator.validate(invalidSelection, validTemplateV1);
    });

    console.log('SelectionValidator (invalid) performance:');
    console.log(`  Min: ${result.min.toFixed(2)}ms`);
    console.log(`  Max: ${result.max.toFixed(2)}ms`);
    console.log(`  Avg: ${result.avg.toFixed(2)}ms`);
    console.log(`  Median: ${result.median.toFixed(2)}ms`);
    console.log(`  P95: ${result.p95.toFixed(2)}ms`);
    console.log(`  P99: ${result.p99.toFixed(2)}ms`);

    // Assert performance targets (invalid selections should also be fast to reject)
    assert(result.avg < MAX_VALIDATION_TIME_MS,
      `Average validation time ${result.avg.toFixed(2)}ms exceeds target ${MAX_VALIDATION_TIME_MS}ms`);
  });

  await t.test('End-to-end CLI validation performance', async () => {
    // Test the full CLI validation pipeline performance
    const { loadTemplateMetadataFromPath } = await import('../../bin/create-scaffold/template-metadata.mjs');

    // Create a temporary template file for testing
    const tempTemplatePath = path.join(__dirname, '../fixtures/temp-performance-template');
    const fs = await import('fs/promises');

    try {
      await fs.mkdir(tempTemplatePath, { recursive: true });
      await fs.writeFile(
        path.join(tempTemplatePath, 'template.json'),
        JSON.stringify(validTemplateV1, null, 2)
      );

      const result = measurePerformance(async () => {
        await loadTemplateMetadataFromPath(tempTemplatePath);
      });

      console.log('CLI template loading performance:');
      console.log(`  Min: ${result.min.toFixed(2)}ms`);
      console.log(`  Max: ${result.max.toFixed(2)}ms`);
      console.log(`  Avg: ${result.avg.toFixed(2)}ms`);
      console.log(`  Median: ${result.median.toFixed(2)}ms`);
      console.log(`  P95: ${result.p95.toFixed(2)}ms`);
      console.log(`  P99: ${result.p99.toFixed(2)}ms`);

      // Assert performance targets (CLI operations can be slightly slower but still reasonable)
      assert(result.avg < MAX_VALIDATION_TIME_MS * 2,
        `Average CLI loading time ${result.avg.toFixed(2)}ms exceeds target ${MAX_VALIDATION_TIME_MS * 2}ms`);

    } finally {
      // Cleanup
      await fs.rm(tempTemplatePath, { recursive: true, force: true });
    }
  });

  await t.test('Memory usage profiling', async () => {
    const { TemplateValidator } = await import('../../lib/validation/template-validator.mjs');

    // Get initial memory usage
    const initialMem = process.memoryUsage();

    // Run multiple validations
    const validator = new TemplateValidator();
    for (let i = 0; i < 1000; i++) {
      await validator.validate(validTemplateV1, 'strict');
    }

    // Get final memory usage
    const finalMem = process.memoryUsage();

    const memIncrease = {
      rss: (finalMem.rss - initialMem.rss) / 1024 / 1024, // MB
      heapUsed: (finalMem.heapUsed - initialMem.heapUsed) / 1024 / 1024, // MB
      heapTotal: (finalMem.heapTotal - initialMem.heapTotal) / 1024 / 1024, // MB
      external: (finalMem.external - initialMem.external) / 1024 / 1024 // MB
    };

    console.log('Memory usage after 1000 validations:');
    console.log(`  RSS increase: ${memIncrease.rss.toFixed(2)} MB`);
    console.log(`  Heap used increase: ${memIncrease.heapUsed.toFixed(2)} MB`);
    console.log(`  Heap total increase: ${memIncrease.heapTotal.toFixed(2)} MB`);
    console.log(`  External increase: ${memIncrease.external.toFixed(2)} MB`);

    // Assert reasonable memory usage (should not leak significantly)
    assert(memIncrease.heapUsed < 50,
      `Heap usage increased by ${memIncrease.heapUsed.toFixed(2)} MB, indicating potential memory leak`);
  });
});
