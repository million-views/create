#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert';
import { TemplateResolver } from '../../bin/create-scaffold/template-resolver.mjs';

test('TemplateResolver', async (t) => {
  const resolver = new TemplateResolver();

  await t.test('validates template URLs', async () => {
    // Valid URLs should not throw
    assert.doesNotThrow(() => resolver.validateTemplateUrl('registry/official/express-api'));
    assert.doesNotThrow(() => resolver.validateTemplateUrl('user/repo'));
    assert.doesNotThrow(() => resolver.validateTemplateUrl('./local/path'));
    assert.doesNotThrow(() => resolver.validateTemplateUrl('https://github.com/user/repo'));

    // Invalid URLs should throw
    assert.throws(() => resolver.validateTemplateUrl(''), /must be a non-empty string/);
    assert.throws(() => resolver.validateTemplateUrl(null), /must be a non-empty string/);
  });

  await t.test('parses registry URLs', () => {
    const parsed = resolver.parseTemplateUrl('registry/official/express-api');
    assert.deepEqual(parsed, {
      type: 'registry',
      namespace: 'official',
      template: 'express-api',
      parameters: []
    });
  });

  await t.test('parses GitHub shorthand', () => {
    const parsed = resolver.parseTemplateUrl('user/repo');
    assert.deepEqual(parsed, {
      type: 'github-shorthand',
      owner: 'user',
      repo: 'repo',
      subpath: '',
      parameters: []
    });
  });

  await t.test('parses local paths', () => {
    const parsed = resolver.parseTemplateUrl('./templates/my-app');
    assert.deepEqual(parsed, {
      type: 'local',
      path: './templates/my-app',
      parameters: []
    });
  });

  await t.test('parses full URLs', () => {
    const parsed = resolver.parseTemplateUrl('https://github.com/user/repo');
    assert.equal(parsed.type, 'url');
    assert.equal(parsed.protocol, 'https:');
    assert.equal(parsed.hostname, 'github.com');
    assert.equal(parsed.pathname, '/user/repo');
  });

  await t.test('extracts parameters from URLs', () => {
    const parsed = resolver.parseTemplateUrl('https://example.com/template?key=value&other=test');
    const params = resolver.extractParameters(parsed);
    assert.deepEqual(params, { key: 'value', other: 'test' });
  });
});
