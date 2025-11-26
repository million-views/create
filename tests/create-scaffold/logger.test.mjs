#!/usr/bin/env node


import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Logger } from '@m5nv/create-scaffold/lib/util/logger.mts';
import { createTempDir } from '../utils/temp.js';

async function readLogEntries(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('Logger construction', async (t) => {
  await t.test('stores provided log path', async (t) => {
    const tempDir = await createTempDir(t, 'logger-construct');
    const logFile = path.join(tempDir, 'log.jsonl');
    const logger = new Logger('file', 'info', logFile);

    assert.ok(logger instanceof Logger);
    assert.equal(logger.logFilePath, logFile);
  });

  await t.test('creates nested directories when writing', async (t) => {
    const tempDir = await createTempDir(t, 'logger-nested');
    const logFile = path.join(tempDir, 'nested', 'deep', 'log.jsonl');
    const logger = new Logger('file', 'info', logFile);

    await logger.logOperation('smoke', { ok: true });
    const stats = await fs.stat(logFile);
    assert.ok(stats.isFile());
  });
});

test('Timestamp formatting', async (t) => {
  await t.test('emits ISO 8601 timestamps', async (t) => {
    const tempDir = await createTempDir(t, 'logger-ts');
    const logger = new Logger(path.join(tempDir, 'log.jsonl'));
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const timestamp = logger.formatTimestamp();

    assert.ok(isoPattern.test(timestamp), `Expected ISO timestamp, received ${timestamp}`);
  });

  await t.test('reflects current time window', async (t) => {
    const tempDir = await createTempDir(t, 'logger-ts-window');
    const logger = new Logger('file', 'info', path.join(tempDir, 'log.jsonl'));
    const before = new Date();
    const timestamp = logger.formatTimestamp();
    const after = new Date();
    const parsed = new Date(timestamp);

    assert.ok(parsed >= before && parsed <= after);
  });
});

test('Log entry formatting', async (t) => {
  await t.test('writes structured entries in order', async (t) => {
    const tempDir = await createTempDir(t, 'logger-entry');
    const logFile = path.join(tempDir, 'log.jsonl');
    const logger = new Logger('file', 'info', logFile);

    await Promise.all([
      logger.logOperation('first', { idx: 1 }),
      logger.logOperation('second', { idx: 2 }),
      logger.logOperation('third', { idx: 3 })
    ]);

    const entries = await readLogEntries(logFile);
    assert.equal(entries.length, 3);
    assert.deepEqual(entries.map((entry) => entry.operation), ['first', 'second', 'third']);
  });
});

test('Data sanitization', async (t) => {
  await t.test('redacts sensitive top-level fields', async (t) => {
    const tempDir = await createTempDir(t, 'logger-sanitize');
    const logger = new Logger('file', 'info', path.join(tempDir, 'log.jsonl'));

    const sanitized = logger.sanitizeLogData({
      password: 'secret',
      token: 'abc123',
      apiKey: 'key-456',
      authorization: 'Bearer token',
      secret: 'hidden',
      safe: 'value'
    });

    assert.equal(sanitized.password, '[REDACTED]');
    assert.equal(sanitized.token, '[REDACTED]');
    assert.equal(sanitized.apiKey, '[REDACTED]');
    assert.equal(sanitized.authorization, '[REDACTED]');
    assert.equal(sanitized.secret, '[REDACTED]');
    assert.equal(sanitized.safe, 'value');
  });

  await t.test('redacts nested secrets', async (t) => {
    const tempDir = await createTempDir(t, 'logger-sanitize-nested');
    const logger = new Logger('file', 'info', path.join(tempDir, 'log.jsonl'));

    const sanitized = logger.sanitizeLogData({
      user: { name: 'Ada', password: 'secret' },
      config: { apiKey: 'key-789', timeout: 10 }
    });

    assert.equal(sanitized.user.name, 'Ada');
    assert.equal(sanitized.user.password, '[REDACTED]');
    assert.equal(sanitized.config.apiKey, '[REDACTED]');
    assert.equal(sanitized.config.timeout, 10);
  });
});

test('Operation helpers', async (t) => {
  await t.test('logGitClone emits repository metadata', async (t) => {
    const tempDir = await createTempDir(t, 'logger-git');
    const logFile = path.join(tempDir, 'log.jsonl');
    const logger = new Logger('file', 'info', logFile);

    await logger.logGitClone('https://example.com/repo.git', 'main', '/tmp/dest');
    const [entry] = await readLogEntries(logFile);

    assert.equal(entry.operation, 'git_clone');
    assert.deepEqual(entry.details, {
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      destination: '/tmp/dest'
    });
  });

  await t.test('logError stores stack and context', async (t) => {
    const tempDir = await createTempDir(t, 'logger-error');
    const logFile = path.join(tempDir, 'log.jsonl');
    const logger = new Logger('file', 'info', logFile);

    const sampleError = new Error('boom');
    await logger.logError(sampleError, { step: 'validate' });
    const [entry] = await readLogEntries(logFile);

    assert.equal(entry.operation, 'error');
    assert.equal(entry.details.message, 'boom');
    assert.deepEqual(entry.details.context, { step: 'validate' });
    assert.ok(entry.details.stack);
  });
});

test('Error handling safeguards', async (t) => {
  await t.test('invalid path surfaces failure', async () => {
    const invalidPath = '/invalid\x00path/log.jsonl';
    const logger = new Logger('file', 'info', invalidPath);

    await assert.rejects(
      () => logger.logOperation('unsafe', { ok: false }),
      (error) => {
        assert.ok(/Failed to write log entry/i.test(error.message));
        return true;
      }
    );
  });

  await t.test('normal write succeeds', async (t) => {
    const tempDir = await createTempDir(t, 'logger-normal');
    const logFile = path.join(tempDir, 'log.jsonl');
    const logger = new Logger('file', 'info', logFile);

    await logger.logOperation('safe', { ok: true });
    const entries = await readLogEntries(logFile);

    assert.equal(entries.length, 1);
    assert.equal(entries[0].operation, 'safe');
  });
});
