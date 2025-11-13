#!/usr/bin/env node

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArguments,
  validateArguments,
  generateHelpText,
  ArgumentError
} from '../../bin/create-scaffold/argument-parser.mjs';
import { TERMINOLOGY } from '../../lib/shared/ontology.mjs';

const BASE_ARGS = ['demo-app', '--template', 'registry/official/basic'];

test('parseArguments leaves optional flags undefined when omitted', () => {
  const result = parseArguments(BASE_ARGS);

  assert.equal(result[TERMINOLOGY.OPTION.INTERACTIVE], undefined);
  assert.equal(result[TERMINOLOGY.OPTION.NON_INTERACTIVE], false);
});

test('parseArguments captures interactive flag when provided', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--interactive'
  ]);

  assert.equal(result[TERMINOLOGY.OPTION.INTERACTIVE], true);
  assert.equal(result[TERMINOLOGY.OPTION.NON_INTERACTIVE], false);
});

test('parseArguments treats --interactive=false as opt-out', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--interactive=false'
  ]);

  assert.equal(result[TERMINOLOGY.OPTION.INTERACTIVE], false);
  assert.equal(result[TERMINOLOGY.OPTION.NON_INTERACTIVE], true);
});

test('parseArguments maps --no-interactive to interactive false', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--no-interactive'
  ]);

  assert.equal(result[TERMINOLOGY.OPTION.INTERACTIVE], false);
  assert.equal(result[TERMINOLOGY.OPTION.NON_INTERACTIVE], true);
});

test('parseArguments collects placeholder overrides', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--placeholder', 'AUTHOR=Jane Doe',
    '--placeholder', 'VERSION=1.0.0'
  ]);

  assert.deepEqual(result[TERMINOLOGY.OPTION.PLACEHOLDER], ['AUTHOR=Jane Doe', 'VERSION=1.0.0']);
});

test('parseArguments recognizes no-input-prompts flag', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--no-input-prompts'
  ]);

  assert.equal(result[TERMINOLOGY.OPTION.NO_INPUT_PROMPTS], true);
});

test('parseArguments recognizes no-config flag', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--no-config'
  ]);

  assert.equal(result[TERMINOLOGY.OPTION.NO_CONFIG], true);
});

test('parseArguments toggles verbose mode', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--verbose'
  ]);

  assert.equal(result[TERMINOLOGY.OPTION.VERBOSE], true);
});

test('parseArguments enables experimental placeholder prompts flag', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--experimental-placeholder-prompts'
  ]);

  assert.equal(result[TERMINOLOGY.OPTION.EXPERIMENTAL_PLACEHOLDER_PROMPTS], true);
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

test('validateArguments aggregates multiple failures', () => {
  const result = validateArguments({
    projectDirectory: '../bad',
    template: ''
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.length >= 2);
});

test('validateArguments short-circuits when help is requested', () => {
  const result = validateArguments({ help: true });

  assert.ok(result.isValid);
  assert.equal(result.showHelp, true);
  assert.equal(result.errors, undefined);
});

test('parseArguments recognizes selection flag', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--selection', './my-selections.json'
  ]);

  assert.equal(result[TERMINOLOGY.OPTION.SELECTION], './my-selections.json');
});

test('parseArguments handles selection flag with relative path', () => {
  const result = parseArguments([
    ...BASE_ARGS,
    '--selection', 'portfolio-api.selection.json'
  ]);

  assert.equal(result[TERMINOLOGY.OPTION.SELECTION], 'portfolio-api.selection.json');
});

test('generateHelpText documents available options', () => {
  const helpText = generateHelpText();

  assert.match(helpText, /--placeholder/);
  assert.match(helpText, /--no-input-prompts/);
  assert.match(helpText, /--no-config/);
  assert.match(helpText, /--selection/);
  assert.match(helpText, /USAGE:/);
});
