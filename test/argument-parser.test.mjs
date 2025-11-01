#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArguments,
  validateArguments,
  generateHelpText,
  ArgumentError
} from '../bin/argumentParser.mjs';

const BASE_ARGS = ['demo-app', '--from-template', 'basic'];

test('parseArguments captures IDE and options flags', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--ide', 'vscode',
    '--options', 'auth,database'
  ]);

  assert.equal(result.ide, 'vscode');
  assert.equal(result.options, 'auth,database');
});

test('parseArguments supports short flags for IDE and options', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '-i', 'cursor',
    '-o', 'ci-ready'
  ]);

  assert.equal(result.ide, 'cursor');
  assert.equal(result.options, 'ci-ready');
});

test('parseArguments leaves optional flags undefined when omitted', () => {
  const result = parseArguments(BASE_ARGS);

  assert.equal(result.ide, undefined);
  assert.equal(result.options, undefined);
  assert.equal(result.interactive, undefined);
  assert.equal(result.noInteractive, false);
});

test('parseArguments captures interactive flag when provided', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--interactive'
  ]);

  assert.equal(result.interactive, true);
  assert.equal(result.noInteractive, false);
});

test('parseArguments treats --interactive=false as opt-out', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--interactive=false'
  ]);

  assert.equal(result.interactive, false);
  assert.equal(result.noInteractive, true);
});

test('parseArguments maps --no-interactive to interactive false', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--no-interactive'
  ]);

  assert.equal(result.interactive, false);
  assert.equal(result.noInteractive, true);
});

test('parseArguments rejects unknown option', () => {
  assert.throws(
    () => parseArguments([...BASE_ARGS, '--unknown', 'value']),
    (error) => {
      assert.ok(error instanceof ArgumentError);
      assert.match(error.message, /Unknown option/i);
      return true;
    }
  );
});

test('validateArguments accepts standard payload', () => {
  const result = validateArguments({
    projectDirectory: 'demo-app',
    template: 'basic',
    ide: 'kiro',
    options: 'auth,database'
  });

  assert.ok(result.isValid);
  assert.equal(result.showHelp, false);
  assert.deepEqual(result.errors, []);
});

test('validateArguments surfaces invalid IDE errors', () => {
  const result = validateArguments({
    projectDirectory: 'demo-app',
    template: 'basic',
    ide: 'invalid-ide'
  });

  assert.equal(result.isValid, false);
  assert.match(result.errors.join('\n'), /IDE/i);
});

test('validateArguments aggregates multiple failures', () => {
  const result = validateArguments({
    projectDirectory: '../bad',
    template: '',
    ide: 'bad-ide',
    options: 'bad@option'
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.length >= 3);
});

test('validateArguments short-circuits when help is requested', () => {
  const result = validateArguments({ help: true });

  assert.ok(result.isValid);
  assert.equal(result.showHelp, true);
  assert.equal(result.errors, undefined);
});

test('generateHelpText documents IDE and options guidance', () => {
  const helpText = generateHelpText();

  assert.match(helpText, /--ide/);
  assert.match(helpText, /--options/);
  assert.match(helpText, /USAGE:/);
});
