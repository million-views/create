#!/usr/bin/env node

/**
 * Options Processor Tests - V1.0.0 Schema Compliant
 *
 * V1.0.0 Schema: All dimensions are single-select with 'options' array structure.
 * Valid dimensions: deployment, database, storage, identity, billing, analytics, monitoring
 *
 * @see schema/template.v1.json
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeOptions } from '../../bin/create/domains/scaffold/modules/options-processor.mts';

describe('normalizeOptions', () => {
  describe('basic functionality', () => {
    it('returns empty result for empty inputs', () => {
      const result = normalizeOptions({ rawTokens: [], dimensions: {} });
      assert.deepStrictEqual(result, {
        byDimension: {},
        warnings: [],
        unknown: []
      });
    });

    it('initializes dimensions with defaults', () => {
      // V1.0.0: All dimensions are single-select with 'options' array
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
            { id: 'deno-deploy', label: 'Deno Deploy' }
          ],
          default: 'cloudflare-workers'
        },
        database: {
          options: [
            { id: 'd1', label: 'Cloudflare D1' },
            { id: 'postgres', label: 'PostgreSQL' }
          ],
          default: 'd1'
        }
      };

      const result = normalizeOptions({ rawTokens: [], dimensions });

      assert.deepStrictEqual(result.byDimension, {
        deployment: 'cloudflare-workers',
        database: 'd1'
      });
      assert.deepStrictEqual(result.warnings, []);
      assert.deepStrictEqual(result.unknown, []);
    });

    it('handles dimensions without defaults', () => {
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
            { id: 'deno-deploy', label: 'Deno Deploy' }
          ]
        }
      };

      const result = normalizeOptions({ rawTokens: [], dimensions });

      assert.strictEqual(result.byDimension.deployment, null);
    });
  });

  describe('explicit dimension assignment', () => {
    it('handles single dimension assignment', () => {
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
            { id: 'deno-deploy', label: 'Deno Deploy' }
          ],
          default: 'cloudflare-workers'
        }
      };

      const result = normalizeOptions({
        rawTokens: ['deployment=deno-deploy'],
        dimensions
      });

      assert.strictEqual(result.byDimension.deployment, 'deno-deploy');
      assert.deepStrictEqual(result.warnings, []);
      assert.deepStrictEqual(result.unknown, []);
    });

    it('rejects multiple values for single-select dimension', () => {
      // V1.0.0: All dimensions are single-select
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
            { id: 'deno-deploy', label: 'Deno Deploy' }
          ]
        }
      };

      assert.throws(
        () => normalizeOptions({
          rawTokens: ['deployment=cloudflare-workers+deno-deploy'],
          dimensions
        }),
        /Dimension "deployment" accepts a single value/
      );
    });

    it('rejects empty value assignment', () => {
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' }
          ]
        }
      };

      assert.throws(
        () => normalizeOptions({
          rawTokens: ['deployment='],
          dimensions
        }),
        /Option "deployment=" is missing a value/
      );
    });
  });

  describe('bare tokens handling', () => {
    it('treats bare tokens as unknown in V1.0.0', () => {
      // V1.0.0: No multi-select catch-all, bare tokens are unknown
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' }
          ]
        }
      };

      const result = normalizeOptions({
        rawTokens: ['unknown-token'],
        dimensions
      });

      assert.deepStrictEqual(result.unknown, ['unknown-token']);
    });

    it('treats unknown tokens as unknown', () => {
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' }
          ]
        }
      };

      const result = normalizeOptions({
        rawTokens: ['unknown'],
        dimensions
      });

      assert.deepStrictEqual(result.unknown, ['unknown']);
    });
  });

  describe('value validation', () => {
    it('rejects unknown dimension', () => {
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' }
          ]
        }
      };

      const result = normalizeOptions({
        rawTokens: ['unknown=value'],
        dimensions
      });

      assert.deepStrictEqual(result.unknown, ['unknown=value']);
    });

    it('rejects invalid value for strict policy', () => {
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
            { id: 'deno-deploy', label: 'Deno Deploy' }
          ],
          policy: 'strict'
        }
      };

      const result = normalizeOptions({
        rawTokens: ['deployment=invalid'],
        dimensions
      });

      assert.deepStrictEqual(result.unknown, ['deployment=invalid']);
    });

    it('warns for invalid value with warn policy', () => {
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' }
          ],
          policy: 'warn'
        }
      };

      const result = normalizeOptions({
        rawTokens: ['deployment=invalid'],
        dimensions
      });

      assert.deepStrictEqual(result.warnings, [
        'Dimension "deployment" does not list value "invalid", but policy is "warn" so continuing.'
      ]);
      assert.deepStrictEqual(result.unknown, []);
    });
  });

  describe('multiple dimensions', () => {
    it('handles multiple dimension assignments', () => {
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
            { id: 'deno-deploy', label: 'Deno Deploy' }
          ],
          default: 'cloudflare-workers'
        },
        database: {
          options: [
            { id: 'd1', label: 'Cloudflare D1' },
            { id: 'postgres', label: 'PostgreSQL' }
          ],
          default: 'd1'
        },
        identity: {
          options: [
            { id: 'github', label: 'GitHub OAuth' },
            { id: 'google', label: 'Google OAuth' }
          ]
        }
      };

      const result = normalizeOptions({
        rawTokens: ['deployment=deno-deploy', 'database=postgres', 'identity=github'],
        dimensions
      });

      assert.deepStrictEqual(result.byDimension, {
        deployment: 'deno-deploy',
        database: 'postgres',
        identity: 'github'
      });
    });

    it('later assignment overrides earlier for same dimension', () => {
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' },
            { id: 'deno-deploy', label: 'Deno Deploy' }
          ]
        }
      };

      const result = normalizeOptions({
        rawTokens: ['deployment=cloudflare-workers', 'deployment=deno-deploy'],
        dimensions
      });

      assert.strictEqual(result.byDimension.deployment, 'deno-deploy');
    });
  });

  describe('edge cases', () => {
    it('handles whitespace in tokens', () => {
      const dimensions = {
        deployment: {
          options: [
            { id: 'cloudflare-workers', label: 'Cloudflare Workers' }
          ]
        }
      };

      const result = normalizeOptions({
        rawTokens: [' deployment = cloudflare-workers '],
        dimensions
      });

      assert.strictEqual(result.byDimension.deployment, 'cloudflare-workers');
    });

    it('handles undefined dimensions parameter', () => {
      const result = normalizeOptions({ rawTokens: ['test'] });
      assert.deepStrictEqual(result, {
        byDimension: {},
        warnings: [],
        unknown: ['test']
      });
    });

    it('handles undefined rawTokens parameter', () => {
      const result = normalizeOptions({ dimensions: {} });
      assert.deepStrictEqual(result, {
        byDimension: {},
        warnings: [],
        unknown: []
      });
    });

    it('handles empty options array', () => {
      const dimensions = {
        deployment: {
          options: []
        }
      };

      const result = normalizeOptions({
        rawTokens: ['deployment=anything'],
        dimensions
      });

      // Empty options means any value is accepted (no validation)
      assert.strictEqual(result.byDimension.deployment, 'anything');
    });
  });
});
