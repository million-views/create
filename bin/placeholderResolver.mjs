#!/usr/bin/env node

import readline from 'node:readline';
import { stdin as defaultStdin, stdout as defaultStdout } from 'node:process';

const ENV_PREFIX = 'CREATE_SCAFFOLD_PLACEHOLDER_';
const BOOLEAN_TRUE_VALUES = new Set(['true', '1', 'yes', 'y']);
const BOOLEAN_FALSE_VALUES = new Set(['false', '0', 'no', 'n']);

export class PlaceholderResolutionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PlaceholderResolutionError';
  }
}

/**
 * Resolve placeholder values from flags, environment variables, defaults, and interactive prompts.
 * @param {Object} params
 * @param {Array<Object>} params.definitions - Normalized placeholder definitions.
 * @param {Array<string>} [params.flagInputs] - Placeholder overrides supplied via CLI flags in NAME=value form.
 * @param {Record<string, string>} [params.env] - Environment variables to inspect.
 * @param {boolean} [params.interactive] - Force interactive prompting on/off. Defaults to TTY detection.
 * @param {boolean} [params.noInputPrompts] - Disable prompts even if interactive.
 * @param {Function} [params.promptAdapter] - Custom prompt implementation for testing.
 * @param {stream.Readable} [params.stdin]
 * @param {stream.Writable} [params.stdout]
 * @returns {Promise<{ values: Readonly<Record<string, any>>, report: ReadonlyArray<Object>, unknownTokens: ReadonlyArray<string> }>} resolved placeholder payload
 */
export async function resolvePlaceholders({
  definitions = [],
  flagInputs = [],
  configDefaults = [],
  env = process.env,
  interactive,
  noInputPrompts = false,
  promptAdapter,
  stdin = defaultStdin,
  stdout = defaultStdout
} = {}) {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    return {
      values: Object.freeze({}),
      report: Object.freeze([]),
      unknownTokens: Object.freeze([])
    };
  }

  const definitionsByToken = new Map();
  for (const definition of definitions) {
    definitionsByToken.set(definition.token, definition);
  }

  const resolvedValues = new Map();
  const sourcesByToken = new Map();
  const unknownTokens = [];

  // Seed defaults first so later sources override them.
  for (const definition of definitions) {
    if (definition.defaultValue !== undefined && definition.defaultValue !== null) {
      resolvedValues.set(definition.token, definition.defaultValue);
      sourcesByToken.set(definition.token, 'default');
    }
  }

  const configEntries = Array.isArray(configDefaults) ? configDefaults : [];

  for (const entry of configEntries) {
    if (typeof entry !== 'string') {
      continue;
    }

    const eqIndex = entry.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const name = entry.slice(0, eqIndex).trim();
    const valueSlice = entry.slice(eqIndex + 1);

    if (!name) {
      continue;
    }

    if (!definitionsByToken.has(name)) {
      unknownTokens.push(name);
      continue;
    }

    const coerced = coerceValue(definitionsByToken.get(name), valueSlice, 'configuration default');
    resolvedValues.set(name, coerced);
    sourcesByToken.set(name, 'config');
  }

  // Environment overrides
  for (const definition of definitions) {
    const envKey = ENV_PREFIX + definition.token;
    if (Object.prototype.hasOwnProperty.call(env, envKey)) {
      const raw = env[envKey];
      if (raw !== undefined && raw !== null) {
        const coerced = coerceValue(definition, raw, `environment variable ${envKey}`);
        resolvedValues.set(definition.token, coerced);
        sourcesByToken.set(definition.token, 'env');
      }
    }
  }

  // CLI flag overrides
  for (const entry of flagInputs) {
    if (typeof entry !== 'string') {
      throw new PlaceholderResolutionError('Placeholder overrides must be provided as NAME=value strings');
    }

    const eqIndex = entry.indexOf('=');
    if (eqIndex === -1) {
      throw new PlaceholderResolutionError('Placeholder overrides must be provided as NAME=value');
    }

    const name = entry.slice(0, eqIndex).trim();
    const valueSlice = entry.slice(eqIndex + 1);

    if (!name) {
      throw new PlaceholderResolutionError('Placeholder overrides must specify a token before the equal sign');
    }

    if (!definitionsByToken.has(name)) {
      unknownTokens.push(name);
      continue;
    }

    const coerced = coerceValue(definitionsByToken.get(name), valueSlice, '--placeholder flag');
    resolvedValues.set(name, coerced);
    sourcesByToken.set(name, 'flag');
  }

  const interactiveMode = typeof interactive === 'boolean'
    ? interactive
    : promptAdapter
      ? true
      : Boolean(stdin?.isTTY && stdout?.isTTY);

  const requiredMissing = definitions
    .filter(definition => definition.required)
    .filter(definition => !resolvedValues.has(definition.token));

  if (requiredMissing.length > 0) {
    if (!interactiveMode || noInputPrompts) {
      throw new PlaceholderResolutionError(
        `Missing required placeholders: ${requiredMissing.map(definition => definition.token).join(', ')}`
      );
    }

    const ask = promptAdapter ?? createDefaultPrompt({ stdin, stdout });

    for (const placeholder of requiredMissing) {
      const answer = await ask({ placeholder });
      const coerced = coerceValue(placeholder, answer, 'interactive prompt');
      resolvedValues.set(placeholder.token, coerced);
      sourcesByToken.set(placeholder.token, 'prompt');
    }
  }

  // Final verification to ensure required placeholders resolved after prompting.
  const unresolved = definitions
    .filter(definition => definition.required)
    .filter(definition => !resolvedValues.has(definition.token));

  if (unresolved.length > 0) {
    throw new PlaceholderResolutionError(
      `Missing required placeholders: ${unresolved.map(definition => definition.token).join(', ')}`
    );
  }

  const valuesObject = Object.create(null);
  const reportEntries = [];

  for (const definition of definitions) {
    if (!resolvedValues.has(definition.token)) {
      continue;
    }

    const value = resolvedValues.get(definition.token);
    valuesObject[definition.token] = value;
    reportEntries.push(Object.freeze({
      token: definition.token,
      source: sourcesByToken.get(definition.token) ?? 'default',
      sensitive: definition.sensitive === true,
      value
    }));
  }

  const uniqueUnknownTokens = Array.from(new Set(unknownTokens));

  return {
    values: Object.freeze(valuesObject),
    report: Object.freeze(reportEntries),
    unknownTokens: Object.freeze(uniqueUnknownTokens)
  };
}

function coerceValue(definition, rawValue, sourceLabel) {
  if (rawValue === undefined || rawValue === null) {
    throw new PlaceholderResolutionError(
      `Placeholder ${definition.token} from ${sourceLabel} is missing a value`
    );
  }

  if (definition.type === 'number') {
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return rawValue;
    }

    const numeric = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);
    if (numeric.length === 0) {
      throw new PlaceholderResolutionError(
        `Placeholder ${definition.token} from ${sourceLabel} requires a numeric value`
      );
    }

    const parsed = Number.parseFloat(numeric);
    if (!Number.isFinite(parsed)) {
      throw new PlaceholderResolutionError(
        `Placeholder ${definition.token} from ${sourceLabel} must be a valid number`
      );
    }
    return parsed;
  }

  if (definition.type === 'boolean') {
    if (typeof rawValue === 'boolean') {
      return rawValue;
    }

    const normalized = String(rawValue).trim().toLowerCase();
    if (BOOLEAN_TRUE_VALUES.has(normalized)) {
      return true;
    }
    if (BOOLEAN_FALSE_VALUES.has(normalized)) {
      return false;
    }
    throw new PlaceholderResolutionError(
      `Placeholder ${definition.token} from ${sourceLabel} must be a boolean (true/false)`
    );
  }

  // Default to strings
  if (typeof rawValue === 'string') {
    return rawValue;
  }

  return String(rawValue);
}

function createDefaultPrompt({ stdin, stdout }) {
  return async ({ placeholder }) => {
    const descriptor = placeholder.description
      ? `${placeholder.description} [${placeholder.token}]`
      : `Enter value for ${placeholder.token}`;
    const question = `${descriptor}: `;
    const masked = placeholder.sensitive === true;
    const answer = await askQuestion({ question, stdin, stdout, masked });
    return answer;
  };
}

function askQuestion({ question, stdin, stdout, masked }) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: stdin,
      output: stdout,
      terminal: true
    });

    if (masked) {
      const originalWrite = rl._writeToOutput;
      rl._writeToOutput = function writeToOutput(stringToWrite) {
        if (stringToWrite.startsWith(question)) {
          originalWrite.call(rl, stringToWrite);
          return;
        }
        rl.output.write('*');
      };
    }

    rl.question(question, (answer) => {
      rl.close();
      if (masked) {
        stdout?.write('\n');
      }
      resolve(answer);
    });
  });
}
