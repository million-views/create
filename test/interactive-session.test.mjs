#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import { InteractiveSession } from '../bin/interactiveSession.mjs';

class StubPrompt {
  constructor(responses) {
    this.responses = Array.isArray(responses) ? [...responses] : [];
    this.questions = [];
    this.messages = [];
    this.closed = false;
  }

  async question(message) {
    this.questions.push(message);
    if (this.responses.length === 0) {
      throw new Error(`No stub response configured for prompt: ${message}`);
    }
    return this.responses.shift();
  }

  async write(message) {
    this.messages.push(message);
  }

  async close() {
    this.closed = true;
  }
}

function createStubSession({
  prompt,
  cachePath = '/tmp/mock-template-cache',
  templates = []
} = {}) {
  const cacheManager = {
    async getCachedRepo() {
      return cachePath;
    },
    resolveRepoDirectory() {
      return { repoHash: 'hash', repoDir: cachePath };
    },
    async getCacheMetadata() {
      return null;
    },
    async populateCache() {
      return cachePath;
    }
  };

  const logger = {
    async logOperation() {},
    async logError() {}
  };

  const templateDiscovery = {
    async listTemplatesFromPath() {
      return templates;
    },
    formatTemplateOptions(entries) {
      return entries.map((template, index) => ({
        id: index + 1,
        name: template.name,
        description: template.description,
        tags: template.tags ?? [],
        canonicalVariables: template.canonicalVariables ?? [],
        handoffSteps: template.handoff ?? [],
        placeholders: template.placeholders ?? []
      }));
    }
  };

  const defaults = {
    repo: 'my-org/templates',
    branch: 'main'
  };

  return new InteractiveSession({
    cacheManager,
    logger,
    defaults,
    promptAdapter: prompt,
    templateDiscovery
  });
}

const BASE_TEMPLATE = {
  name: 'starter-kit',
  description: 'Starter project template',
  tags: ['web'],
  canonicalVariables: ['APP_NAME'],
  handoff: ['Review README'],
  placeholders: [
    {
      token: 'APP_NAME',
      type: 'string',
      required: true,
      description: 'Application display name'
    }
  ]
};

test('collectInputs gathers interactive responses and placeholder data', async () => {
  const uniqueDir = `interactive-project-${Date.now()}`;
  const prompt = new StubPrompt([
    '1',
    uniqueDir,
    '',
    '',
    'cursor',
    'auth,database',
    'logs/output.log',
    '12',
    'y',
    'Demo App'
  ]);

  const session = createStubSession({
    prompt,
    templates: [BASE_TEMPLATE]
  });

  const result = await session.collectInputs();

  assert.equal(result.template, 'starter-kit');
  assert.equal(result.projectDirectory, uniqueDir);
  assert.equal(result.repo, 'my-org/templates');
  assert.equal(result.branch, 'main');
  assert.equal(result.ide, 'cursor');
  assert.equal(result.options, 'auth,database');
  assert.equal(result.logFile, 'logs/output.log');
  assert.equal(result.cacheTtl, '12');
  assert.equal(result.noCache, false);
  assert.equal(result.dryRun, false);
  assert.equal(result.listTemplates, false);
  assert.equal(result.experimentalPlaceholderPrompts, true);
  assert.deepEqual(result.placeholders, ['APP_NAME=Demo App']);
  assert.equal(prompt.closed, true);
});

test('collectInputs respects initial arguments and skips redundant prompts', async () => {
  const prompt = new StubPrompt([
    '1',
    `interactive-project-${Date.now()}`
  ]);

  const session = createStubSession({
    prompt,
    templates: [BASE_TEMPLATE]
  });

  const result = await session.collectInputs({
    projectDirectory: `interactive-project-${Date.now() + 1}`,
    repo: 'custom/repo',
    branch: 'develop',
    ide: 'vscode',
    options: 'ci',
    logFile: 'scaffold.log',
    cacheTtl: '6',
    experimentalPlaceholderPrompts: true,
    placeholders: ['APP_NAME=Preseeded']
  });

  assert.equal(result.repo, 'custom/repo');
  assert.equal(result.branch, 'develop');
  assert.equal(result.ide, 'vscode');
  assert.equal(result.options, 'ci');
  assert.equal(result.logFile, 'scaffold.log');
  assert.equal(result.cacheTtl, '6');
  assert.equal(result.experimentalPlaceholderPrompts, true);
  assert.deepEqual(result.placeholders, ['APP_NAME=Preseeded']);
  assert.equal(prompt.questions.filter((q) => q.includes('Repository')).length, 0);
  assert.equal(prompt.closed, true);
});

test('collectInputs returns cancellation payload when user quits selection', async () => {
  const prompt = new StubPrompt(['q']);
  const session = createStubSession({
    prompt,
    templates: [BASE_TEMPLATE]
  });

  const result = await session.collectInputs();

  assert.deepEqual(result, { cancelled: true });
  assert.equal(prompt.closed, true);
});
