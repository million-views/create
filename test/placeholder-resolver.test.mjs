#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlaceholders } from '../bin/placeholderResolver.mjs';

const BASE_DEFINITIONS = Object.freeze([
  {
    token: 'PROJECT_NAME',
    raw: '{{PROJECT_NAME}}',
    description: null,
    required: true,
    defaultValue: null,
    sensitive: false,
    type: 'string'
  },
  {
    token: 'AUTHOR',
    raw: '{{AUTHOR}}',
    description: null,
    required: false,
    defaultValue: 'Unknown Author',
    sensitive: false,
    type: 'string'
  },
  {
    token: 'MAX_WORKERS',
    raw: '{{MAX_WORKERS}}',
    description: null,
    required: false,
    defaultValue: 4,
    sensitive: false,
    type: 'number'
  },
  {
    token: 'ENABLE_LOGGING',
    raw: '{{ENABLE_LOGGING}}',
    description: null,
    required: false,
    defaultValue: true,
    sensitive: false,
    type: 'boolean'
  },
  {
    token: 'API_TOKEN',
    raw: '{{API_TOKEN}}',
    description: null,
    required: true,
    defaultValue: null,
    sensitive: true,
    type: 'string'
  }
]);

test('resolvePlaceholders merges flag, env, and default values with correct precedence', async () => {
  const result = await resolvePlaceholders({
    definitions: BASE_DEFINITIONS,
    flagInputs: ['PROJECT_NAME=cli-demo', 'MAX_WORKERS=8'],
    env: {
      CREATE_SCAFFOLD_PLACEHOLDER_AUTHOR: 'Env User',
      CREATE_SCAFFOLD_PLACEHOLDER_ENABLE_LOGGING: 'false',
      CREATE_SCAFFOLD_PLACEHOLDER_API_TOKEN: 'env-secret'
    },
    interactive: false
  });

  assert.equal(result.values.PROJECT_NAME, 'cli-demo');
  assert.equal(result.values.AUTHOR, 'Env User');
  assert.equal(result.values.MAX_WORKERS, 8);
  assert.equal(result.values.ENABLE_LOGGING, false);
  assert.equal(result.values.API_TOKEN, 'env-secret');

  const sources = Object.fromEntries(result.report.map(entry => [entry.token, entry.source]));
  assert.equal(sources.PROJECT_NAME, 'flag');
  assert.equal(sources.MAX_WORKERS, 'flag');
  assert.equal(sources.API_TOKEN, 'env');
  assert.equal(sources.AUTHOR, 'env');
  assert.equal(sources.ENABLE_LOGGING, 'env');
});

test('resolvePlaceholders prompts for missing required values when interactive', async () => {
  const prompts = [];
  const result = await resolvePlaceholders({
    definitions: BASE_DEFINITIONS,
    flagInputs: ['PROJECT_NAME=cli-demo'],
    env: {
      CREATE_SCAFFOLD_PLACEHOLDER_API_TOKEN: undefined
    },
    promptAdapter: async ({ placeholder }) => {
      prompts.push(placeholder.token);
      return placeholder.token === 'API_TOKEN' ? 'prompt-secret' : '';
    }
  });

  assert.deepEqual(prompts, ['API_TOKEN']);
  assert.equal(result.values.API_TOKEN, 'prompt-secret');
  assert.equal(result.report.find(entry => entry.token === 'API_TOKEN').source, 'prompt');
});

test('resolvePlaceholders fails when required values are missing and prompts disabled', async () => {
  await assert.rejects(
    () => resolvePlaceholders({
      definitions: BASE_DEFINITIONS,
      flagInputs: ['PROJECT_NAME=cli-demo'],
      env: {},
      interactive: false,
      noInputPrompts: true
    }),
    /Missing required placeholders: API_TOKEN/
  );
});

test('resolvePlaceholders reports unknown placeholder flags and ignores them', async () => {
  const result = await resolvePlaceholders({
    definitions: BASE_DEFINITIONS,
    flagInputs: ['UNKNOWN=value', 'PROJECT_NAME=cli-demo'],
    env: {
      CREATE_SCAFFOLD_PLACEHOLDER_API_TOKEN: 'env-secret'
    },
    interactive: false
  });

  assert.deepEqual(result.unknownTokens, ['UNKNOWN']);
  assert.equal(result.values.PROJECT_NAME, 'cli-demo');
});

test('resolvePlaceholders applies configuration defaults with correct precedence', async () => {
  const result = await resolvePlaceholders({
    definitions: BASE_DEFINITIONS,
    configDefaults: ['PROJECT_NAME=config-demo', 'API_TOKEN=config-secret'],
    env: {},
    interactive: false
  });

  assert.equal(result.values.PROJECT_NAME, 'config-demo');
  assert.equal(result.values.API_TOKEN, 'config-secret');

  const sources = Object.fromEntries(result.report.map(entry => [entry.token, entry.source]));
  assert.equal(sources.PROJECT_NAME, 'config');
  assert.equal(sources.API_TOKEN, 'config');
});

test('resolvePlaceholders allows environment overrides over configuration defaults', async () => {
  const result = await resolvePlaceholders({
    definitions: BASE_DEFINITIONS,
    configDefaults: ['PROJECT_NAME=config-demo', 'API_TOKEN=config-secret', 'AUTHOR=Config Author'],
    env: {
      CREATE_SCAFFOLD_PLACEHOLDER_AUTHOR: 'Env Author'
    },
    interactive: false
  });

  assert.equal(result.values.AUTHOR, 'Env Author');
  const sources = Object.fromEntries(result.report.map(entry => [entry.token, entry.source]));
  assert.equal(sources.AUTHOR, 'env');
});

test('resolvePlaceholders allows CLI overrides over configuration defaults and environment', async () => {
  const result = await resolvePlaceholders({
    definitions: BASE_DEFINITIONS,
    configDefaults: ['PROJECT_NAME=config-demo', 'API_TOKEN=config-secret', 'MAX_WORKERS=2'],
    env: {
      CREATE_SCAFFOLD_PLACEHOLDER_MAX_WORKERS: '6'
    },
    flagInputs: ['MAX_WORKERS=10'],
    interactive: false
  });

  assert.equal(result.values.MAX_WORKERS, 10);
  const sources = Object.fromEntries(result.report.map(entry => [entry.token, entry.source]));
  assert.equal(sources.MAX_WORKERS, 'flag');
});

test('resolvePlaceholders tracks unknown configuration tokens', async () => {
  const result = await resolvePlaceholders({
    definitions: BASE_DEFINITIONS,
    configDefaults: ['PROJECT_NAME=config-demo', 'API_TOKEN=config-secret', 'UNKNOWN=from-config'],
    env: {},
    interactive: false
  });

  assert.deepEqual(result.unknownTokens, ['UNKNOWN']);
});

test('resolvePlaceholders enforces NAME=value placeholder syntax', async () => {
  await assert.rejects(
    () => resolvePlaceholders({
      definitions: BASE_DEFINITIONS,
      flagInputs: ['MALFORMED'],
      env: {},
      interactive: false
    }),
    /must be provided as NAME=value/
  );
});
