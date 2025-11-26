#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeOptions } from '../../bin/create-scaffold/modules/options-processor.mts';

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
      const dimensions = {
        auth: {
          type: 'single',
          values: ['none', 'basic'],
          default: 'none'
        },
        features: {
          type: 'multi',
          values: ['api', 'ui'],
          default: ['ui']
        }
      };

      const result = normalizeOptions({ rawTokens: [], dimensions });

      assert.deepStrictEqual(result.byDimension, {
        auth: 'none',
        features: ['ui']
      });
      assert.deepStrictEqual(result.warnings, []);
      assert.deepStrictEqual(result.unknown, []);
    });

    it('handles single-value dimensions without defaults', () => {
      const dimensions = {
        auth: {
          type: 'single',
          values: ['none', 'basic']
        }
      };

      const result = normalizeOptions({ rawTokens: [], dimensions });

      assert.strictEqual(result.byDimension.auth, null);
    });

    it('handles multi-value dimensions without defaults', () => {
      const dimensions = {
        features: {
          type: 'multi',
          values: ['api', 'ui']
        }
      };

      const result = normalizeOptions({ rawTokens: [], dimensions });

      assert.deepStrictEqual(result.byDimension.features, []);
    });
  });

  describe('explicit dimension assignment', () => {
    it('handles single dimension assignment', () => {
      const dimensions = {
        auth: {
          type: 'single',
          values: ['none', 'basic'],
          default: 'none'
        }
      };

      const result = normalizeOptions({
        rawTokens: ['auth=basic'],
        dimensions
      });

      assert.strictEqual(result.byDimension.auth, 'basic');
      assert.deepStrictEqual(result.warnings, []);
      assert.deepStrictEqual(result.unknown, []);
    });

    it('handles multi-value dimension assignment', () => {
      const dimensions = {
        features: {
          type: 'multi',
          values: ['api', 'ui', 'db'],
          default: []
        }
      };

      const result = normalizeOptions({
        rawTokens: ['features=api+ui'],
        dimensions
      });

      assert.deepStrictEqual(result.byDimension.features, ['api', 'ui']);
      assert.deepStrictEqual(result.warnings, []);
      assert.deepStrictEqual(result.unknown, []);
    });

    it('handles multiple values in multi-dimension', () => {
      const dimensions = {
        features: {
          type: 'multi',
          values: ['api', 'ui', 'db'],
          default: []
        }
      };

      const result = normalizeOptions({
        rawTokens: ['features=api', 'features=ui'],
        dimensions
      });

      assert.deepStrictEqual(result.byDimension.features.sort(), ['api', 'ui']);
    });

    it('rejects multiple values for single dimension', () => {
      const dimensions = {
        auth: {
          type: 'single',
          values: ['none', 'basic']
        }
      };

      assert.throws(
        () => normalizeOptions({
          rawTokens: ['auth=basic+none'],
          dimensions
        }),
        /Dimension "auth" accepts a single value/
      );
    });

    it('rejects empty value assignment', () => {
      const dimensions = {
        auth: {
          type: 'single',
          values: ['none', 'basic']
        }
      };

      assert.throws(
        () => normalizeOptions({
          rawTokens: ['auth='],
          dimensions
        }),
        /Option "auth=" is missing a value/
      );
    });
  });

  describe('catch-all dimension handling', () => {
    it('uses capabilities as catch-all when present', () => {
      const dimensions = {
        capabilities: {
          type: 'multi',
          values: ['api', 'ui', 'db']
        },
        auth: {
          type: 'single',
          values: ['none', 'basic']
        }
      };

      const result = normalizeOptions({
        rawTokens: ['api', 'ui'],
        dimensions
      });

      assert.deepStrictEqual(result.byDimension.capabilities.sort(), ['api', 'ui']);
      assert.strictEqual(result.byDimension.auth, null);
    });

    it('uses first multi dimension as catch-all', () => {
      const dimensions = {
        features: {
          type: 'multi',
          values: ['api', 'ui', 'db']
        },
        auth: {
          type: 'single',
          values: ['none', 'basic']
        }
      };

      const result = normalizeOptions({
        rawTokens: ['api', 'ui'],
        dimensions
      });

      assert.deepStrictEqual(result.byDimension.features.sort(), ['api', 'ui']);
    });

    it('treats unknown tokens as unknown when no catch-all', () => {
      const dimensions = {
        auth: {
          type: 'single',
          values: ['none', 'basic']
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
        auth: {
          type: 'single',
          values: ['none', 'basic']
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
        auth: {
          type: 'single',
          values: ['none', 'basic']
        }
      };

      const result = normalizeOptions({
        rawTokens: ['auth=invalid'],
        dimensions
      });

      assert.deepStrictEqual(result.unknown, ['auth=invalid']);
    });

    it('warns for invalid value with warn policy', () => {
      const dimensions = {
        auth: {
          type: 'single',
          values: ['none', 'basic'],
          policy: 'warn'
        }
      };

      const result = normalizeOptions({
        rawTokens: ['auth=invalid'],
        dimensions
      });

      assert.deepStrictEqual(result.warnings, [
        'Dimension "auth" does not list value "invalid", but policy is "warn" so continuing.'
      ]);
      assert.deepStrictEqual(result.unknown, []);
    });
  });

  describe('dependency enforcement', () => {
    it('enforces single value dependencies', () => {
      const dimensions = {
        auth: {
          type: 'single',
          values: ['none', 'basic', 'jwt'],
          requires: {
            jwt: ['ssl']
          }
        },
        features: {
          type: 'multi',
          values: ['ssl', 'api']
        }
      };

      assert.throws(
        () => normalizeOptions({
          rawTokens: ['auth=jwt'],
          dimensions
        }),
        /Dimension "auth" value "jwt" requires "ssl"/
      );
    });

    it('allows dependencies when satisfied', () => {
      const dimensions = {
        features: {
          type: 'multi',
          values: ['api', 'ui', 'ssl', 'auth'],
          requires: {
            auth: ['ssl']
          }
        }
      };

      const result = normalizeOptions({
        rawTokens: ['features=auth+ssl'],
        dimensions
      });

      assert.deepStrictEqual(result.byDimension.features.sort(), ['auth', 'ssl']);
    });

    it('enforces multi-value dependencies', () => {
      const dimensions = {
        features: {
          type: 'multi',
          values: ['api', 'ui', 'auth'],
          requires: {
            auth: ['ssl'],
            api: ['ssl']
          }
        }
      };

      assert.throws(
        () => normalizeOptions({
          rawTokens: ['features=auth'],
          dimensions
        }),
        /Dimension "features" value "auth" requires "ssl"/
      );
    });
  });

  describe('conflict enforcement', () => {
    it('enforces single value conflicts', () => {
      const dimensions = {
        features: {
          type: 'multi',
          values: ['basic', 'jwt', 'anonymous'],
          conflicts: {
            basic: ['anonymous']
          }
        }
      };

      assert.throws(
        () => normalizeOptions({
          rawTokens: ['features=basic+anonymous'],
          dimensions
        }),
        /Dimension "features" value "basic" cannot be used with "anonymous"/
      );
    });

    it('enforces multi-value conflicts', () => {
      const dimensions = {
        features: {
          type: 'multi',
          values: ['api', 'ui', 'auth', 'anonymous'],
          conflicts: {
            auth: ['anonymous']
          }
        }
      };

      assert.throws(
        () => normalizeOptions({
          rawTokens: ['features=auth+anonymous'],
          dimensions
        }),
        /Dimension "features" value "auth" cannot be used with "anonymous"/
      );
    });
  });

  describe('edge cases', () => {
    it('handles whitespace in tokens', () => {
      const dimensions = {
        auth: {
          type: 'single',
          values: ['none', 'basic']
        }
      };

      const result = normalizeOptions({
        rawTokens: [' auth = basic '],
        dimensions
      });

      assert.strictEqual(result.byDimension.auth, 'basic');
    });

    it('handles empty values in multi-assignment', () => {
      const dimensions = {
        features: {
          type: 'multi',
          values: ['api', 'ui']
        }
      };

      const result = normalizeOptions({
        rawTokens: ['features=api++ui'],
        dimensions
      });

      assert.deepStrictEqual(result.byDimension.features.sort(), ['api', 'ui']);
    });

    it('maintains deterministic ordering for multi-values', () => {
      const dimensions = {
        features: {
          type: 'multi',
          values: ['z', 'a', 'm']
        }
      };

      const result = normalizeOptions({
        rawTokens: ['features=z', 'features=a', 'features=m'],
        dimensions
      });

      assert.deepStrictEqual(result.byDimension.features, ['a', 'm', 'z']);
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
  });
});
