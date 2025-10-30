#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createEnvironmentObject } from '../bin/environmentFactory.mjs';
import { validateSupportedOptionsMetadata, ValidationError } from '../bin/security.mjs';

const BASE_PARAMS = Object.freeze({
  projectDirectory: 'test-project',
  projectName: 'test-project',
  cwd: process.cwd(),
  ide: 'kiro',
  authoringMode: 'composable',
  options: {
    raw: ['capabilities=auth', 'capabilities=testing'],
    byDimension: {
      capabilities: ['auth', 'testing']
    }
  }
});

function buildParams(overrides = {}) {
  const { options: overrideOptions, ...rest } = overrides;
  const base = {
    ...BASE_PARAMS,
    ...rest
  };

  let options;
  if (overrideOptions === undefined) {
    options = {
      raw: [...BASE_PARAMS.options.raw],
      byDimension: {
        ...BASE_PARAMS.options.byDimension
      }
    };
  } else if (typeof overrideOptions === 'object' && overrideOptions !== null) {
    options = {
      raw: [...(overrideOptions.raw ?? [])],
      byDimension: {
        ...(overrideOptions.byDimension ?? {})
      }
    };
  } else {
    options = overrideOptions;
  }

  return {
    ...base,
    options
  };
}

test('validateSupportedOptionsMetadata normalizes and deduplicates values', () => {
  const result = validateSupportedOptionsMetadata(['auth', 'testing', 'auth']);
  assert.deepEqual(result, ['auth', 'testing']);
});

test('validateSupportedOptionsMetadata rejects invalid entries', () => {
  const invalidSamples = [123, 'bad option!', '', null];

  for (const sample of invalidSamples) {
    assert.throws(
      () => validateSupportedOptionsMetadata([sample]),
      (error) => {
        assert.ok(error instanceof ValidationError);
        return true;
      },
      `Expected ValidationError for ${String(sample)}`
    );
  }
});

test('createEnvironmentObject returns expected structure', () => {
  const env = createEnvironmentObject(buildParams());

  assert.equal(env.projectName, BASE_PARAMS.projectName);
  assert.equal(env.ide, BASE_PARAMS.ide);
  assert.deepEqual(env.options.raw, BASE_PARAMS.options.raw);
  assert.deepEqual(env.options.byDimension.capabilities, BASE_PARAMS.options.byDimension.capabilities);
});

test('createEnvironmentObject handles optional IDE and options', () => {
  const params = buildParams({
    ide: null,
    options: {
      raw: [],
      byDimension: {}
    },
    authoringMode: 'wysiwyg'
  });

  const env = createEnvironmentObject(params);
  assert.equal(env.ide, null);
  assert.deepEqual(env.options.raw, []);
  assert.deepEqual(env.options.byDimension, {});
});

test('createEnvironmentObject freezes returned object', () => {
  const env = createEnvironmentObject(buildParams());

  assert.ok(Object.isFrozen(env));
  assert.throws(() => {
    env.projectName = 'modified';
  }, TypeError);
  assert.equal(env.projectName, BASE_PARAMS.projectName);
});

test('createEnvironmentObject rejects invalid parameters', () => {
  const invalidCases = [
    {
      name: 'project directory traversal',
      overrides: { projectDirectory: '../invalid' }
    },
    {
      name: 'project name with path segment',
      overrides: { projectName: 'invalid/name' }
    },
    {
      name: 'unsupported IDE',
      overrides: { ide: 'invalid-ide' }
    },
    {
      name: 'options with non-string entries',
      overrides: {
        options: {
          raw: ['capabilities=auth', 123],
          byDimension: {
            capabilities: ['auth']
          }
        }
      }
    }
  ];

  for (const { name, overrides } of invalidCases) {
    assert.throws(
      () => createEnvironmentObject(buildParams(overrides)),
      (error) => {
        assert.ok(error instanceof ValidationError, `${name} should raise ValidationError`);
        return true;
      }
    );
  }
});

test('createEnvironmentObject resolves absolute paths', () => {
  const customCwd = path.join(process.cwd(), 'tmp-env-cwd');
  const params = buildParams({
    cwd: customCwd,
    projectDirectory: 'example-project'
  });

  const env = createEnvironmentObject(params);
  assert.equal(env.projectDir, path.resolve('example-project'));
  assert.equal(env.cwd, path.normalize(customCwd));
});
